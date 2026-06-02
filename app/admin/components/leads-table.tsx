'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface AuditReport {
  id: string;
  lead_id: string;
  report_content: any;
  pdf_url: string | null;
  raw_data: any;
  error_stage: string | null;
  error_message: string | null;
}

interface LeadWithReport {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  brand_name: string | null;
  industry: string | null;
  identifier: string;
  input_type: string;
  status: string;
  pdf_generated: boolean;
  pdf_sent: boolean;
  audit_reports: AuditReport[];
}

interface ActionState {
  loading: boolean;
  success: string | null;
  error: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  awaiting_review: 'Awaiting Review',
  pdf_ready: 'PDF Ready',
  sent: 'Sent',
  failed: 'Failed',
};

export default function LeadsTable({ initialLeads }: { initialLeads: LeadWithReport[] }) {
  const router = useRouter();
  const [leads, setLeads] = useState<LeadWithReport[]>(initialLeads);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionStates, setActionStates] = useState<Record<string, ActionState>>({});

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Status filter
      if (statusFilter !== 'all' && lead.status !== statusFilter) return false;

      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          lead.name?.toLowerCase().includes(q) ||
          lead.email?.toLowerCase().includes(q) ||
          lead.company_name?.toLowerCase().includes(q) ||
          lead.brand_name?.toLowerCase().includes(q) ||
          lead.identifier?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [leads, searchQuery, statusFilter]);

  const setAction = (leadId: string, state: Partial<ActionState>) => {
    setActionStates((prev) => ({
      ...prev,
      [leadId]: { ...({ loading: false, success: null, error: null }), ...prev[leadId], ...state },
    }));
  };

  const handleGeneratePdf = async (leadId: string) => {
    setAction(leadId, { loading: true, success: null, error: null });
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/generate-pdf`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setAction(leadId, { loading: false, error: data.error || 'PDF generation failed' });
        return;
      }

      // Update local state
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? { ...l, status: 'pdf_ready', pdf_generated: true, audit_reports: l.audit_reports.map(r => ({ ...r, pdf_url: data.pdf_url })) }
            : l
        )
      );
      setAction(leadId, { loading: false, success: 'PDF generated!' });

      // Clear success after 3s
      setTimeout(() => setAction(leadId, { success: null }), 3000);
    } catch {
      setAction(leadId, { loading: false, error: 'Network error' });
    }
  };

  const handleSendEmail = async (leadId: string) => {
    setAction(leadId, { loading: true, success: null, error: null });
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/send-email`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setAction(leadId, { loading: false, error: data.error || 'Email sending failed' });
        return;
      }

      // Update local state
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? { ...l, status: 'sent', pdf_sent: true }
            : l
        )
      );
      setAction(leadId, { loading: false, success: 'Email sent!' });

      setTimeout(() => setAction(leadId, { success: null }), 3000);
    } catch {
      setAction(leadId, { loading: false, error: 'Network error' });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="admin-table-wrapper">
      {/* Toolbar */}
      <div className="admin-table-toolbar">
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="admin-search-input"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="admin-input"
          style={{ width: 'auto', minWidth: '160px', fontSize: '0.8125rem', padding: '0.5rem 0.75rem' }}
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="awaiting_review">Awaiting Review</option>
          <option value="pdf_ready">PDF Ready</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Table */}
      {filteredLeads.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">📋</div>
          <div className="admin-empty-title">No leads found</div>
          <p style={{ fontSize: '0.8125rem' }}>
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filter'
              : 'Leads will appear here when clients submit their brands'}
          </p>
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Brand / Company</th>
              <th>Industry</th>
              <th>Type</th>
              <th>Status</th>
              <th>Date</th>
              <th>Upsell Alerts</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((lead) => {
              const report = lead.audit_reports?.[0];
              const hasReport = !!report?.report_content;
              const hasPdf = lead.pdf_generated && !!report?.pdf_url;
              const isSent = lead.pdf_sent || lead.status === 'sent';
              const action = actionStates[lead.id] || { loading: false, success: null, error: null };

              return (
                <tr key={lead.id}>
                  {/* Lead Name + Email */}
                  <td>
                    <div className="cell-name">{lead.name || '—'}</div>
                    <div className="cell-email">{lead.email || '—'}</div>
                  </td>

                  {/* Brand / Company */}
                  <td>
                    <div style={{ fontWeight: 500 }}>{lead.brand_name || lead.company_name || '—'}</div>
                    <div className="cell-email" style={{ fontFamily: 'monospace', fontSize: '0.6875rem' }}>
                      {lead.identifier}
                    </div>
                  </td>

                  {/* Industry */}
                  <td style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)' }}>
                    {lead.industry || '—'}
                  </td>

                  {/* Type */}
                  <td>
                    <span className="admin-badge" style={{ background: lead.input_type === 'website' ? '#eff6ff' : '#fdf4ff', color: lead.input_type === 'website' ? '#2563eb' : '#a855f7' }}>
                      {lead.input_type === 'website' ? '🌐 Web' : '📱 Social'}
                    </span>
                  </td>

                  {/* Status */}
                  <td>
                    <span className={`admin-badge admin-badge-${lead.status}`}>
                      {STATUS_LABELS[lead.status] || lead.status}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="cell-date">
                    {formatDate(lead.created_at)}
                  </td>

                  {/* Upsells */}
                  <td>
                    {hasReport && report?.report_content?.admin_insights ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        {report.report_content.admin_insights.pitch_website_dev && (
                          <span style={{ fontSize: '0.625rem', padding: '2px 6px', background: '#fee2e2', color: '#b91c1c', borderRadius: '4px', fontWeight: 600 }}>Pitch Web</span>
                        )}
                        {report.report_content.admin_insights.pitch_seo && (
                          <span style={{ fontSize: '0.625rem', padding: '2px 6px', background: '#dbeafe', color: '#1d4ed8', borderRadius: '4px', fontWeight: 600 }}>Pitch SEO</span>
                        )}
                        {report.report_content.admin_insights.pitch_social_management && (
                          <span style={{ fontSize: '0.625rem', padding: '2px 6px', background: '#fae8ff', color: '#a21caf', borderRadius: '4px', fontWeight: 600 }}>Pitch Social</span>
                        )}
                        {report.report_content.admin_insights.pitch_rebranding && (
                          <span style={{ fontSize: '0.625rem', padding: '2px 6px', background: '#fef3c7', color: '#b45309', borderRadius: '4px', fontWeight: 600 }}>Pitch Branding</span>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td>
                    <div className="admin-actions">
                      {/* View Report */}
                      <button
                        className="admin-action-btn admin-action-view"
                        onClick={() => router.push(`/admin/dashboard/leads/${lead.id}`)}
                        title="View full report"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        View
                      </button>

                      {/* Generate PDF - show when report exists but no PDF yet */}
                      {hasReport && !hasPdf && !isSent && (
                        <button
                          className="admin-action-btn admin-action-pdf"
                          onClick={() => handleGeneratePdf(lead.id)}
                          disabled={action.loading}
                          title="Generate PDF"
                        >
                          {action.loading ? (
                            <span className="admin-spinner" />
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                          )}
                          {action.loading ? 'Generating...' : 'Gen PDF'}
                        </button>
                      )}

                      {/* Download PDF */}
                      {hasPdf && report?.pdf_url && (
                        <a
                          href={report.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-action-btn admin-action-download"
                          title="Download PDF"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          PDF
                        </a>
                      )}

                      {/* Send Email - show when PDF exists but not sent */}
                      {hasPdf && !isSent && (
                        <button
                          className="admin-action-btn admin-action-send"
                          onClick={() => handleSendEmail(lead.id)}
                          disabled={action.loading}
                          title={`Send PDF to ${lead.email}`}
                        >
                          {action.loading ? (
                            <span className="admin-spinner" />
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="22" y1="2" x2="11" y2="13" />
                              <polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                          )}
                          {action.loading ? 'Sending...' : 'Send'}
                        </button>
                      )}

                      {/* Success/Error indicators */}
                      {action.success && (
                        <span style={{ fontSize: '0.6875rem', color: 'var(--admin-success)', fontWeight: 600 }}>
                          ✓ {action.success}
                        </span>
                      )}
                      {action.error && (
                        <span style={{ fontSize: '0.6875rem', color: 'var(--admin-error)', fontWeight: 600 }} title={action.error}>
                          ✕ Error
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
