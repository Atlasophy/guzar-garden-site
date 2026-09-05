'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { getBrowserSupabase } from '@/lib/supabase/client';

export function StaffShell({
  children,
  name,
  role,
}: {
  children: ReactNode;
  name: string;
  role: string;
}) {
  const router = useRouter();
  const signOut = async () => {
    await getBrowserSupabase().auth.signOut();
    router.replace('/staff/login');
    router.refresh();
  };
  return (
    <div className="staff-layout">
      <aside className="staff-side">
        <Link className="staff-brand" href="/staff">
          <Image src="/assets/brand/guzar-mark-transparent.png" alt="" width={64} height={64} />
          <span>
            <b>GUZAR</b>
            <small>Panel obsługi</small>
          </span>
        </Link>
        <nav className="staff-nav" aria-label="Panel obsługi">
          <Link href="/staff">Dzisiaj</Link>
          <Link href="/staff/calendar">Kalendarz</Link>
          <Link href="/staff/floor">Sala</Link>
          <Link href="/staff/menu">Menu</Link>
          <Link href="/staff/settings">Ustawienia</Link>
          <Link href="/">Strona</Link>
        </nav>
        <div className="staff-user">
          <strong>{name}</strong>
          <small>{role}</small>
          <button className="staff-button secondary" onClick={() => void signOut()}>
            Wyloguj
          </button>
        </div>
      </aside>
      <main className="staff-main">{children}</main>
    </div>
  );
}
