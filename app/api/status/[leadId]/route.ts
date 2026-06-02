import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params;

    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Lead ID required' }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('leads')
      .select('status, pipeline_step')
      .eq('id', leadId)
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      status: data.status,
      pipeline_step: data.pipeline_step,
    });
  } catch (err) {
    console.error('[Status API] Error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
