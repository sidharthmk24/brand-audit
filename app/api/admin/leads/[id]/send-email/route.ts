import { getSupabaseAdmin } from '@/lib/supabase/server';
import { sendAuditEmail } from '@/lib/email/sender';

// POST /api/admin/leads/[id]/send-email — Admin-triggered email sending
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getSupabaseAdmin();

  try {
    // Fetch lead
    const { data: lead, error: leadError } = await db
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (leadError || !lead) {
      return Response.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    if (!lead.email) {
      return Response.json(
        { success: false, error: 'No email address on file for this lead' },
        { status: 400 }
      );
    }

    // Fetch audit report with PDF URL
    const { data: report } = await db
      .from('audit_reports')
      .select('*')
      .eq('lead_id', id)
      .single();

    if (!report?.pdf_url) {
      return Response.json(
        { success: false, error: 'PDF has not been generated yet. Generate the PDF first.' },
        { status: 400 }
      );
    }

    console.log(`[Admin Email] Sending PDF to ${lead.email} for lead ${id}`);

    // Download the PDF from Supabase storage to get the buffer for attachment
    const pdfResponse = await fetch(report.pdf_url);
    if (!pdfResponse.ok) {
      throw new Error('Failed to download PDF from storage');
    }
    const pdfArrayBuffer = await pdfResponse.arrayBuffer();
    const pdfBuffer = Buffer.from(pdfArrayBuffer);

    // Send email
    const emailResult = await sendAuditEmail(
      lead.email,
      lead.name || '',
      report.pdf_url,
      pdfBuffer
    );

    if (!emailResult.success) {
      throw new Error('Email sending failed');
    }

    console.log(`[Admin Email] Email sent successfully to ${lead.email}`);

    // Update lead status
    await db.from('leads').update({
      status: 'sent',
      pdf_sent: true,
    }).eq('id', id);

    return Response.json({
      success: true,
      message: `Email sent to ${lead.email}`,
    });
  } catch (error) {
    console.error(`[Admin Email] Error sending email for lead ${id}:`, error);
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Email sending failed' },
      { status: 500 }
    );
  }
}
