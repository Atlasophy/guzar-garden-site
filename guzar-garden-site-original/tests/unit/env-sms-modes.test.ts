import { afterEach, describe, expect, it } from 'vitest';
import { getServerEnv, isSmsEnabled, resetServerEnvCache } from '../../lib/config/env';

/**
 * The production guard in lib/config/env.ts is what stopped this venue
 * deploying: it refused to boot without Twilio, deliberately, so that a booking
 * system could never quietly fail to send. Guzar Garden launched without a
 * Twilio account, so 'disabled' was added as an explicit, honest third state.
 *
 * These cases pin all three, because the difference between them is the
 * difference between "tells the guest the truth" and "does not boot".
 */

const BASE = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
  SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_test',
  APP_BASE_URL: 'https://guzargarden.pl',
  RESERVATION_TOKEN_SECRET: 'a'.repeat(48),
  CRON_SECRET: 'b'.repeat(32),
};

const saved = { ...process.env };

function withEnv(overrides: Record<string, string>) {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('TWILIO_') || key === 'SMS_PROVIDER' || key === 'RESERVATION_PREVIEW_MODE') {
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

describe('production SMS configuration', () => {
  it('refuses to boot with the console adapter', () => {
    withEnv({ NODE_ENV: 'production', SMS_PROVIDER: 'console' });
    expect(() => getServerEnv()).toThrow(/twilio.*disabled|disabled.*twilio/i);
  });

  it('refuses to boot with SMS_PROVIDER=twilio but no credentials', () => {
    withEnv({ NODE_ENV: 'production', SMS_PROVIDER: 'twilio' });
    expect(() => getServerEnv()).toThrow(/TWILIO_ACCOUNT_SID/);
  });

  it('boots with SMS_PROVIDER=disabled and reports SMS as unavailable', () => {
    withEnv({ NODE_ENV: 'production', SMS_PROVIDER: 'disabled' });
    expect(() => getServerEnv()).not.toThrow();
    expect(isSmsEnabled()).toBe(false);
  });

  it('boots with full Twilio credentials and reports SMS as available', () => {
    withEnv({
      NODE_ENV: 'production',
      SMS_PROVIDER: 'twilio',
      TWILIO_ACCOUNT_SID: 'AC-test',
      TWILIO_AUTH_TOKEN: 'token-test',
      TWILIO_MESSAGING_SERVICE_SID: 'MG-test',
    });
    expect(() => getServerEnv()).not.toThrow();
    expect(isSmsEnabled()).toBe(true);
  });

  it('still refuses a production build that points at localhost', () => {
    withEnv({
      NODE_ENV: 'production',
      SMS_PROVIDER: 'disabled',
      APP_BASE_URL: 'http://localhost:3000',
    });
    expect(() => getServerEnv()).toThrow(/localhost/);
  });
});
