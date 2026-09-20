'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { useStaffDictionary } from './use-staff-dictionary';

export function StaffLoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const dictionary = useStaffDictionary();
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
        setError(dictionary.invalidLogin);
        setBusy(false);
        return;
      }
      const next = search.get('next');
      router.replace(next?.startsWith('/staff') ? next : '/staff');
      router.refresh();
    } catch {
      setError(dictionary.loginUnavailable);
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
        <span>{dictionary.email}</span>
        <input
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="staff-field">
        <span>{dictionary.password}</span>
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
        {busy ? dictionary.signingIn : dictionary.signIn}
      </button>
    </form>
  );
}
