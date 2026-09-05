import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../styles/staff.css';

export const metadata: Metadata = {
  title: 'Guzar Garden Staff',
  robots: { index: false, follow: false },
};

export default function StaffRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl">
      <body className="theme-staff">{children}</body>
    </html>
  );
}
