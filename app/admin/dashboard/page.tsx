import { getSupabaseAdmin } from '@/lib/supabase/server';
import LeadsTable from '../components/leads-table';
import StatsCards from '../components/stats-cards';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const db = getSupabaseAdmin();

  // Fetch all leads with their reports
  const { data: leads, error } = await db
    .from('leads')
    .select('*, audit_reports(*)')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="admin-content">
        <div className="admin-alert admin-alert-error">
          Error loading dashboard: {error.message}
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalLeads = leads?.length || 0;
  const awaitingReview = leads?.filter((l) => l.status === 'awaiting_review')?.length || 0;
  const pdfReady = leads?.filter((l) => l.status === 'pdf_ready' || l.status === 'sent' || l.pdf_generated)?.length || 0;
  const emailsSent = leads?.filter((l) => l.status === 'sent' || l.pdf_sent)?.length || 0;

  return (
    <div className="admin-content">
      <h1 className="admin-page-title">Dashboard</h1>
      <p className="admin-page-subtitle">Overview of all brand audit submissions</p>

      <StatsCards
        totalLeads={totalLeads}
        awaitingReview={awaitingReview}
        pdfReady={pdfReady}
        emailsSent={emailsSent}
      />

      <LeadsTable initialLeads={leads || []} />
    </div>
  );
}
