import { getSupabaseAdmin } from '@/lib/supabase/server';
import Link from 'next/link';
import ReportViewer from '../../../components/report-viewer';

export const dynamic = 'force-dynamic';

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getSupabaseAdmin();

  // Fetch lead and report
  const { data: lead, error: leadError } = await db
    .from('leads')
    .select('*')
    .eq('id', id)
    .single();

  const { data: report } = await db
    .from('audit_reports')
    .select('*')
    .eq('lead_id', id)
    .single();

  if (leadError || !lead) {
    return (
      <div className="admin-content">
        <div className="admin-alert admin-alert-error">
          Lead not found or error loading data.
        </div>
        <Link href="/admin/dashboard" className="admin-btn admin-btn-secondary">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const hasReport = !!report?.report_content;
  const hasPdf = lead.pdf_generated && !!report?.pdf_url;
  const isSent = lead.pdf_sent || lead.status === 'sent';

  return (
    <div className="admin-content">
      <Link href="/admin/dashboard" className="admin-back-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to Dashboard
      </Link>

      <div className="admin-lead-header">
        <div>
          <h1 className="admin-page-title">{lead.brand_name || lead.company_name || lead.name || 'Unknown Lead'}</h1>
          <p className="admin-page-subtitle" style={{ marginBottom: 0 }}>
            {lead.email} • Submitted on {new Date(lead.created_at).toLocaleDateString()}
          </p>
        </div>

        <div className="admin-actions">
          {hasReport && !hasPdf && !isSent && (
            <button className="admin-btn admin-btn-secondary admin-btn-sm" disabled title="Generate PDF from Dashboard">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              PDF Not Generated
            </button>
          )}

          {hasPdf && report?.pdf_url && (
            <a
              href={report.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-btn admin-btn-secondary admin-btn-sm"
              style={{ color: '#1d4ed8', borderColor: '#bfdbfe', background: '#eff6ff' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download PDF
            </a>
          )}
          
          {hasPdf && !isSent && (
            <button className="admin-btn admin-btn-success admin-btn-sm" disabled title="Send Email from Dashboard">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Email Not Sent
            </button>
          )}
          
          {isSent && (
            <span className="admin-badge admin-badge-sent" style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}>
              ✓ Email Sent
            </span>
          )}
        </div>
      </div>

      <div className="admin-lead-meta">
        <div className="admin-meta-item">
          <div className="admin-meta-label">Name</div>
          <div className="admin-meta-value">{lead.name || '—'}</div>
        </div>
        <div className="admin-meta-item">
          <div className="admin-meta-label">Email</div>
          <div className="admin-meta-value">{lead.email || '—'}</div>
        </div>
        <div className="admin-meta-item">
          <div className="admin-meta-label">Phone</div>
          <div className="admin-meta-value">{lead.phone || '—'}</div>
        </div>
        <div className="admin-meta-item">
          <div className="admin-meta-label">Company</div>
          <div className="admin-meta-value">{lead.company_name || '—'}</div>
        </div>
        <div className="admin-meta-item">
          <div className="admin-meta-label">Brand Name</div>
          <div className="admin-meta-value">{lead.brand_name || '—'}</div>
        </div>
        <div className="admin-meta-item">
          <div className="admin-meta-label">Industry</div>
          <div className="admin-meta-value">{lead.industry || '—'}</div>
        </div>
        <div className="admin-meta-item">
          <div className="admin-meta-label">Input Type</div>
          <div className="admin-meta-value" style={{ textTransform: 'capitalize' }}>{lead.input_type}</div>
        </div>
        <div className="admin-meta-item">
          <div className="admin-meta-label">Identifier</div>
          <div className="admin-meta-value" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{lead.identifier}</div>
        </div>
        <div className="admin-meta-item">
          <div className="admin-meta-label">Status</div>
          <div className="admin-meta-value">
            <span className={`admin-badge admin-badge-${lead.status}`}>
              {lead.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      <ReportViewer
        reportContent={report?.report_content}
        rawData={report?.raw_data}
      />
    </div>
  );
}
