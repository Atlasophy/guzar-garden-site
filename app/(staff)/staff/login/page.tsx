import { Suspense } from 'react';
import { StaffLoginForm } from '@/components/staff/login-form';

export default function StaffLoginPage() {
  return (
    <main className="staff-login">
      <section className="staff-login-card">
        <h1>Guzar Garden</h1>
        <p>Panel rezerwacji i menu</p>
        <Suspense fallback={<p>Ładowanie…</p>}>
          <StaffLoginForm />
        </Suspense>
      </section>
    </main>
  );
}
