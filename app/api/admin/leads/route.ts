import { type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

// GET /api/admin/leads — Fetch all leads with their audit reports
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  const db = getSupabaseAdmin();

  let query = db
    .from('leads')
    .select('*, audit_reports(*)')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%,brand_name.ilike.%${search}%,identifier.ilike.%${search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Admin Leads] Error fetching leads:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }

  return Response.json({ success: true, leads: data });
}
