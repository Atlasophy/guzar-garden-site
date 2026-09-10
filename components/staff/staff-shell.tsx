'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { StaffLanguageSwitcher } from './staff-language-switcher';
import { useStaffDictionary } from './use-staff-dictionary';
import type { StaffRole } from '@/lib/database/types';

export function StaffShell({
  children,
  name,
  role,
}: {
  children: ReactNode;
  name: string;
  role: StaffRole;
}) {
  const router = useRouter();
  const dictionary = useStaffDictionary();
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
            <small>{dictionary.panel}</small>
          </span>
        </Link>
        <nav className="staff-nav" aria-label={dictionary.navigation}>
          <Link href="/staff">{dictionary.today}</Link>
          <Link href="/staff/calendar">{dictionary.calendar}</Link>
          <Link href="/staff/floor">{dictionary.floor}</Link>
          <Link href="/staff/menu">{dictionary.menu}</Link>
          <Link href="/staff/settings">{dictionary.settings}</Link>
          {role === 'admin' ? <Link href="/staff/team">{dictionary.team}</Link> : null}
          <Link href="/">{dictionary.website}</Link>
        </nav>
        <div className="staff-user">
          <StaffLanguageSwitcher />
          <strong>{name}</strong>
          <small>
            {role === 'admin'
              ? dictionary.roleAdmin
              : role === 'manager'
                ? dictionary.roleManager
                : dictionary.roleHost}
          </small>
          <button className="staff-button secondary" onClick={() => void signOut()}>
            {dictionary.signOut}
          </button>
        </div>
      </aside>
      <main className="staff-main">{children}</main>
    </div>
  );
}
