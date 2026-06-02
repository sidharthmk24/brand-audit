import { getSupabaseAdmin } from '@/lib/supabase/server';

// GET /api/admin/leads/[id] — Fetch single lead with full audit report
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const db = getSupabaseAdmin();

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

  const { data: report } = await db
    .from('audit_reports')
    .select('*')
    .eq('lead_id', id)
    .single();

  return Response.json({
    success: true,
    lead,
    report,
  });
}
