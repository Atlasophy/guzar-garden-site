import { afterEach, describe, expect, it } from 'vitest';
import { getServerEnv, isEmailEnabled, resetServerEnvCache } from '../../lib/config/env';

/**
 * Same guard as env-sms-modes.test.ts, one channel over: production must
 * never boot with the console adapter, 'resend' requires real credentials,
 * and 'disabled' is an honest, bootable third state.
 */

const BASE = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
  SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_test',
  APP_BASE_URL: 'https://guzargarden.pl',
  RESERVATION_TOKEN_SECRET: 'a'.repeat(48),
  CRON_SECRET: 'b'.repeat(32),
  SMS_PROVIDER: 'disabled',
};

const saved = { ...process.env };

function withEnv(overrides: Record<string, string>) {
  for (const key of Object.keys(process.env)) {
    if (
      key.startsWith('RESEND_') ||
      key === 'EMAIL_PROVIDER' ||
      key === 'EMAIL_FROM_ADDRESS' ||
      key === 'RESERVATION_PREVIEW_MODE'
    ) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, BASE, overrides);
  resetServerEnvCache();
}

afterEach(() => {
  process.env = { ...saved };
  resetServerEnvCache();
});

describe('production email configuration', () => {
  it('refuses to boot with the console adapter', () => {
    withEnv({ NODE_ENV: 'production', EMAIL_PROVIDER: 'console' });
    expect(() => getServerEnv()).toThrow(/resend.*disabled|disabled.*resend/i);
  });

  it('refuses to boot with EMAIL_PROVIDER=resend but no API key', () => {
    withEnv({ NODE_ENV: 'production', EMAIL_PROVIDER: 'resend' });
    expect(() => getServerEnv()).toThrow(/RESEND_API_KEY/);
  });

  it('refuses to boot with a Resend API key but no From address', () => {
    withEnv({
      NODE_ENV: 'production',
      EMAIL_PROVIDER: 'resend',
      RESEND_API_KEY: 're_test',
    });
    expect(() => getServerEnv()).toThrow(/EMAIL_FROM_ADDRESS/);
  });

  it('boots with EMAIL_PROVIDER=disabled and reports email as unavailable', () => {
    withEnv({ NODE_ENV: 'production', EMAIL_PROVIDER: 'disabled' });
    expect(() => getServerEnv()).not.toThrow();
    expect(isEmailEnabled()).toBe(false);
  });

  it('boots with full Resend credentials and reports email as available', () => {
    withEnv({
      NODE_ENV: 'production',
      EMAIL_PROVIDER: 'resend',
      RESEND_API_KEY: 're_test',
      EMAIL_FROM_ADDRESS: 'Guzar Garden <rezerwacje@guzargarden.pl>',
    });
    expect(() => getServerEnv()).not.toThrow();
    expect(isEmailEnabled()).toBe(true);
  });
});
