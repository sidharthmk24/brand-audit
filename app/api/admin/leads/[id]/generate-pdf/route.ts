import { getSupabaseAdmin } from '@/lib/supabase/server';
import { generatePdfBuffer } from '@/lib/pdf/generator';
import { uploadAuditPdf } from '@/lib/supabase/storage';

export const maxDuration = 300;

// POST /api/admin/leads/[id]/generate-pdf — Admin-triggered PDF generation
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

    // Fetch audit report
    const { data: report, error: reportError } = await db
      .from('audit_reports')
      .select('*')
      .eq('lead_id', id)
      .single();

    if (reportError || !report || !report.report_content) {
      return Response.json(
        { success: false, error: 'No audit report found. The AI analysis may still be processing.' },
        { status: 400 }
      );
    }

    console.log(`[Admin PDF] Generating PDF for lead ${id}`);

    // Generate PDF — pass brand_name through the lead object, and full report for screenshots
    const pdfBuffer = await generatePdfBuffer(lead as any, report.report_content as any, report);

    console.log(`[Admin PDF] PDF generated (${pdfBuffer.length} bytes), uploading...`);

    // Upload to Supabase storage
    const pdfUrl = await uploadAuditPdf(id, pdfBuffer);

    console.log(`[Admin PDF] PDF uploaded: ${pdfUrl}`);

    // Update audit report with PDF URL
    await db.from('audit_reports').update({ pdf_url: pdfUrl }).eq('lead_id', id);

    // Update lead status
    await db.from('leads').update({
      status: 'pdf_ready',
      pdf_generated: true,
    }).eq('id', id);

    return Response.json({
      success: true,
      pdf_url: pdfUrl,
      message: 'PDF generated successfully',
    });
  } catch (error) {
    console.error(`[Admin PDF] Error generating PDF for lead ${id}:`, error);
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'PDF generation failed' },
      { status: 500 }
    );
  }
}
