import { Suspense } from 'react';
import Link from 'next/link';
import { StaffLoginForm } from '@/components/staff/login-form';
import { StaffLanguageSwitcher } from '@/components/staff/staff-language-switcher';
import { getServerStaffDictionary } from '@/lib/i18n/staff-server';

export default async function StaffLoginPage() {
  const dictionary = await getServerStaffDictionary();
  return (
    <main className="staff-login">
      <section className="staff-login-card">
        <h1>Guzar Garden</h1>
        <p>{dictionary.loginSubtitle}</p>
        <StaffLanguageSwitcher />
        <Suspense fallback={<p>{dictionary.loading}</p>}>
          <StaffLoginForm />
        </Suspense>
        <Link className="staff-back-link" href="/">
          {dictionary.backToWebsite}
        </Link>
      </section>
    </main>
  );
}
