interface StatsCardsProps {
  totalLeads: number;
  awaitingReview: number;
  pdfReady: number;
  emailsSent: number;
}

export default function StatsCards({ totalLeads, awaitingReview, pdfReady, emailsSent }: StatsCardsProps) {
  const stats = [
    {
      label: 'Total Leads',
      value: totalLeads,
      color: '#6366f1',
      bg: '#eef2ff',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      label: 'Awaiting Review',
      value: awaitingReview,
      color: '#d97706',
      bg: '#fffbeb',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      label: 'PDF Ready',
      value: pdfReady,
      color: '#0d9488',
      bg: '#f0fdfa',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
    {
      label: 'Emails Sent',
      value: emailsSent,
      color: '#16a34a',
      bg: '#f0fdf4',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      ),
    },
  ];

  return (
    <div className="admin-stats-grid">
      {stats.map((stat) => (
        <div key={stat.label} className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: stat.bg, color: stat.color }}>
            {stat.icon}
          </div>
          <div className="admin-stat-label">{stat.label}</div>
          <div className="admin-stat-value">{stat.value}</div>
        </div>
      ))}
    </div>
  );
}
