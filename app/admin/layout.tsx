import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import AdminHeader from './components/admin-header';
import './admin.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Admin Dashboard — Brand Audit',
  description: 'Manage and review brand audit leads',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${inter.variable} admin-root`} style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
      <AdminHeader />
      {children}
    </div>
  );
}
