'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getBrowserSupabase } from '@/lib/supabase/client';

export function StaffLoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { error: authError } = await getBrowserSupabase().auth.signInWithPassword({
        email,
        password,
      });
      if (authError) {
        setError('Nieprawidłowy adres e-mail lub hasło.');
        setBusy(false);
        return;
      }
      const next = search.get('next');
      router.replace(next?.startsWith('/staff') ? next : '/staff');
      router.refresh();
    } catch {
      setError('Logowanie jest chwilowo niedostępne. Sprawdź konfigurację Supabase.');
      setBusy(false);
    }
  };
  return (
    <form onSubmit={(event) => void submit(event)}>
      {error ? (
        <div className="staff-notice error" role="alert">
          {error}
        </div>
      ) : null}
      <label className="staff-field">
        <span>E-mail</span>
        <input
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="staff-field">
        <span>Hasło</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button className="staff-button" style={{ width: '100%' }} disabled={busy}>
        {busy ? 'Logowanie…' : 'Zaloguj się'}
      </button>
    </form>
  );
}
