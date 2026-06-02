'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';

export default function AdminHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  // Don't show header on login page
  if (pathname === '/admin') return null;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/admin');
    } catch {
      setLoggingOut(false);
    }
  };

  return (
    <header className="admin-header">
      <div className="admin-header-left">
        <div className="admin-header-logo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <span className="admin-header-title">Brand Audit</span>
        <span className="admin-header-badge">Admin</span>
      </div>

      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="admin-btn admin-btn-ghost admin-btn-sm"
      >
        {loggingOut ? (
          <span className="admin-spinner" />
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        )}
        Sign Out
      </button>
    </header>
  );
}
