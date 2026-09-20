'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPatch, apiPost } from '@/lib/api/client';
import type { StaffProfileRow, StaffRole } from '@/lib/database/types';
import { useLocale } from '@/components/shared/locale-provider';
import { useStaffDictionary } from './use-staff-dictionary';

type BusyAccount = 'new' | string | null;

export function StaffAccountsAdmin({
  accounts,
  currentUserId,
}: {
  accounts: StaffProfileRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const dictionary = useStaffDictionary();
  const [busy, setBusy] = useState<BusyAccount>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const roleLabel = (role: StaffRole) =>
    role === 'admin'
      ? dictionary.roleAdmin
      : role === 'manager'
        ? dictionary.roleManager
        : dictionary.roleHost;

  const errorMessage = (code: string, fallback: string) => {
    if (code === 'staff_email_taken') return dictionary.accountEmailTaken;
    if (code === 'staff_self_deactivate') return dictionary.accountSelfDeactivate;
    if (code === 'staff_self_demote') return dictionary.accountSelfDemote;
    if (code === 'staff_last_admin') return dictionary.accountLastAdmin;
    if (code === 'validation_failed') return dictionary.accountValidationFailed;
    return fallback || dictionary.saveFailed;
  };

  const create = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy('new');
    setMessage('');
    setError('');
    const result = await apiPost<{ account: StaffProfileRow }>('/api/staff/accounts', {
      fullName: String(data.get('fullName') ?? ''),
      email: String(data.get('email') ?? ''),
      password: String(data.get('password') ?? ''),
      phone: String(data.get('phone') ?? ''),
      role: String(data.get('role') ?? 'host'),
    });
    setBusy(null);
    if (!result.ok) {
      setError(errorMessage(result.code, result.message));
      return;
    }
    form.reset();
    setMessage(dictionary.accountCreated);
    router.refresh();
  };

  const update = async (event: React.FormEvent<HTMLFormElement>, account: StaffProfileRow) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const isActive = data.get('isActive') === 'on';
    if (account.is_active && !isActive && !window.confirm(dictionary.deactivateAccountConfirm)) {
      return;
    }

    const password = String(data.get('password') ?? '');
    setBusy(account.id);
    setMessage('');
    setError('');
    const result = await apiPatch<{ account: StaffProfileRow }>(
      `/api/staff/accounts/${account.id}`,
      {
        fullName: String(data.get('fullName') ?? ''),
        email: String(data.get('email') ?? ''),
        phone: String(data.get('phone') ?? ''),
        role: String(data.get('role') ?? 'host'),
        isActive,
        ...(password ? { password } : {}),
      },
    );
    setBusy(null);
    if (!result.ok) {
      setError(errorMessage(result.code, result.message));
      return;
    }
    form.reset();
    setMessage(dictionary.accountUpdated);
    router.refresh();
  };

  return (
    <>
      {message ? (
        <div className="staff-notice ok" role="status">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="staff-notice error" role="alert">
          {error}
        </div>
      ) : null}

      <form className="staff-card" onSubmit={(event) => void create(event)}>
        <h2>{dictionary.createAccount}</h2>
        <p className="staff-muted">{dictionary.createAccountHelp}</p>
        <div className="staff-field-row">
          <label className="staff-field">
            <span>{dictionary.fullName}</span>
            <input name="fullName" maxLength={80} autoComplete="off" required />
          </label>
          <label className="staff-field">
            <span>{dictionary.loginEmail}</span>
            <input name="email" type="email" maxLength={254} autoComplete="off" required />
          </label>
          <label className="staff-field">
            <span>{dictionary.temporaryPassword}</span>
            <input
              name="password"
              type="password"
              minLength={12}
              maxLength={200}
              autoComplete="new-password"
              required
            />
          </label>
          <label className="staff-field">
            <span>{dictionary.phoneOptional}</span>
            <input name="phone" type="tel" maxLength={32} autoComplete="off" />
          </label>
          <label className="staff-field">
            <span>{dictionary.role}</span>
            <select name="role" defaultValue="host">
              <option value="host">{dictionary.roleHost}</option>
              <option value="manager">{dictionary.roleManager}</option>
              <option value="admin">{dictionary.roleAdmin}</option>
            </select>
          </label>
        </div>
        <button className="staff-button" disabled={busy !== null}>
          {busy === 'new' ? dictionary.creatingAccount : dictionary.createAccount}
        </button>
      </form>

      <section className="staff-account-list" aria-label={dictionary.existingAccounts}>
        <h2>{dictionary.existingAccounts}</h2>
        {accounts.map((account) => (
          <form
            className="staff-card staff-account-card"
            key={account.id}
            onSubmit={(event) => void update(event, account)}
          >
            <div className="staff-account-heading">
              <div>
                <h3>{account.full_name}</h3>
                <p>
                  {roleLabel(account.role)}
                  {account.id === currentUserId ? ` · ${dictionary.you}` : ''}
                </p>
              </div>
              <span className={`badge ${account.is_active ? 'available' : 'cancelled'}`}>
                {account.is_active ? dictionary.activeAccount : dictionary.inactiveAccount}
              </span>
            </div>
            <div className="staff-field-row">
              <label className="staff-field">
                <span>{dictionary.fullName}</span>
                <input name="fullName" defaultValue={account.full_name} maxLength={80} required />
              </label>
              <label className="staff-field">
                <span>{dictionary.loginEmail}</span>
                <input
                  name="email"
                  type="email"
                  defaultValue={account.email}
                  maxLength={254}
                  required
                />
              </label>
              <label className="staff-field">
                <span>{dictionary.newPasswordOptional}</span>
                <input
                  name="password"
                  type="password"
                  minLength={12}
                  maxLength={200}
                  autoComplete="new-password"
                />
              </label>
              <label className="staff-field">
                <span>{dictionary.phoneOptional}</span>
                <input
                  name="phone"
                  type="tel"
                  defaultValue={account.phone_e164 ?? ''}
                  maxLength={32}
                />
              </label>
              <label className="staff-field">
                <span>{dictionary.role}</span>
                <select name="role" defaultValue={account.role}>
                  <option value="host">{dictionary.roleHost}</option>
                  <option value="manager">{dictionary.roleManager}</option>
                  <option value="admin">{dictionary.roleAdmin}</option>
                </select>
              </label>
            </div>
            <label className="staff-check">
              <input name="isActive" type="checkbox" defaultChecked={account.is_active} />
              {dictionary.accountCanSignIn}
            </label>
            <p className="staff-account-meta">
              {dictionary.lastSeen}:{' '}
              {account.last_seen_at
                ? new Intl.DateTimeFormat(locale, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(account.last_seen_at))
                : dictionary.never}
            </p>
            <button className="staff-button" disabled={busy !== null}>
              {busy === account.id ? dictionary.saving : dictionary.saveAccount}
            </button>
          </form>
        ))}
      </section>
    </>
  );
}
