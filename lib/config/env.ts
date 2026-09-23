import { z } from 'zod';

/**
 * One place that decides what configuration exists and what is mandatory.
 *
 * The rule the deployment checklist depends on: in production every secret that
 * makes persistence and messaging real must be present. There is deliberately
 * no fallback to an in-memory store or to a fake SMS sender — a missing secret
 * fails the boot loudly rather than quietly pretending to work.
 */

const nonEmpty = z.string().trim().min(1);

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: nonEmpty,
  SUPABASE_SERVICE_ROLE_KEY: nonEmpty,
  DATABASE_URL: z.string().optional(),

  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_MESSAGING_SERVICE_SID: z.string().optional(),
  TWILIO_STATUS_CALLBACK_URL: z.string().optional(),

  APP_BASE_URL: z.url(),
  RESERVATION_TOKEN_SECRET: nonEmpty.min(24, 'RESERVATION_TOKEN_SECRET must be at least 24 chars'),
  CRON_SECRET: nonEmpty.min(16, 'CRON_SECRET must be at least 16 chars'),
  // 'console' prints a redacted preview and is development-only. 'twilio' sends.
  // 'disabled' is the deliberate "this venue has no SMS channel" setting: it is
  // allowed in production precisely because it does not pretend — nothing is
  // queued as sendable, and the booking UI stops promising the guest a text.
  SMS_PROVIDER: z.enum(['console', 'twilio', 'disabled']).default('console'),

  // Same contract as SMS_PROVIDER, one channel over. No real sender exists yet
  // — 'disabled' is the honest launch setting, same as SMS was before Twilio.
  EMAIL_PROVIDER: z.enum(['console', 'disabled']).default('disabled'),
  // Used as the From: address once a real provider is added. Not required
  // while EMAIL_PROVIDER=disabled, since nothing is ever sent.
  EMAIL_FROM_ADDRESS: z.string().optional(),

  MENU_IMAGE_BUCKET: nonEmpty.default('menu-images'),
  MAX_MENU_IMAGE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(8 * 1024 * 1024),

  NEXT_PUBLIC_VENUE_SLUG: nonEmpty.default('guzar-garden'),
  RESERVATION_PREVIEW_MODE: z
    .string()
    .optional()
    .transform((v) => v === '1' || v === 'true'),
  SMS_DEBUG: z
    .string()
    .optional()
    .transform((v) => v === '1' || v === 'true'),
});

export type ServerEnv = z.infer<typeof serverSchema>;

export class EnvironmentError extends Error {
  constructor(issues: string[]) {
    super(
      `Invalid environment configuration:\n${issues.map((i) => `  • ${i}`).join('\n')}\n` +
        `Copy .env.example to .env.local and fill in the missing values.`,
    );
    this.name = 'EnvironmentError';
  }
}

let cached: ServerEnv | null = null;

/** Parse (once) and return the server environment. Throws on invalid config. */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new EnvironmentError(
      parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
    );
  }

  const env = parsed.data;

  // Production-only hard requirements. Development is allowed to run against a
  // local Supabase with the console SMS adapter.
  if (env.NODE_ENV === 'production') {
    const missing: string[] = [];
    if (env.RESERVATION_PREVIEW_MODE)
      missing.push('RESERVATION_PREVIEW_MODE must be disabled in production');
    if (env.SMS_PROVIDER === 'twilio') {
      if (!env.TWILIO_ACCOUNT_SID)
        missing.push('TWILIO_ACCOUNT_SID is required when SMS_PROVIDER=twilio');
      if (!env.TWILIO_AUTH_TOKEN)
        missing.push('TWILIO_AUTH_TOKEN is required when SMS_PROVIDER=twilio');
      if (!env.TWILIO_MESSAGING_SERVICE_SID)
        missing.push('TWILIO_MESSAGING_SERVICE_SID is required when SMS_PROVIDER=twilio');
    } else if (env.SMS_PROVIDER !== 'disabled') {
      // 'console' stays banned in production: it logs a preview and returns
      // success, which is exactly the "quietly pretending to work" this file
      // exists to prevent. 'disabled' is allowed because it claims nothing —
      // the guest is never told a text is coming, and every queued message is
      // recorded as undelivered rather than sent.
      missing.push(
        'SMS_PROVIDER must be "twilio" or "disabled" in production — ' +
          'the console adapter never sends a message',
      );
    }
    if (env.EMAIL_PROVIDER !== 'disabled') {
      // Mirrors the SMS rule above. There is no real email adapter wired up
      // yet, so 'disabled' is currently the only production-safe value; a
      // real provider gains its own branch here the same way Twilio did.
      missing.push(
        'EMAIL_PROVIDER must be "disabled" in production until a real provider is configured — ' +
          'the console adapter never sends a message',
      );
    }
    if (env.RESERVATION_TOKEN_SECRET.startsWith('replace-me'))
      missing.push('RESERVATION_TOKEN_SECRET is still the placeholder from .env.example');
    if (env.CRON_SECRET.startsWith('replace-me'))
      missing.push('CRON_SECRET is still the placeholder from .env.example');
    if (env.APP_BASE_URL.startsWith('http://localhost'))
      missing.push('APP_BASE_URL still points at localhost');
    if (missing.length) throw new EnvironmentError(missing);
  }

  cached = env;
  return env;
}

/**
 * Whether this deployment has a real SMS channel.
 *
 * False means the venue launched without one: the booking form must not promise
 * a confirmation text, and the outbox records messages as undelivered instead
 * of sending them. Turning Twilio on later flips this with no code change.
 */
export function isSmsEnabled(): boolean {
  return getServerEnv().SMS_PROVIDER !== 'disabled';
}

/**
 * Whether this deployment has a real email channel.
 *
 * False means no confirmation email is promised or sent, and the outbox
 * records queued email messages as undelivered rather than sending them —
 * same contract as `isSmsEnabled()`, one channel over.
 */
export function isEmailEnabled(): boolean {
  return getServerEnv().EMAIL_PROVIDER !== 'disabled';
}

/** Local-only adapter used when hosted Supabase is unreachable during visual review. */
export function isReservationPreviewMode(): boolean {
  const env = getServerEnv();
  return env.NODE_ENV !== 'production' && env.RESERVATION_PREVIEW_MODE;
}

/** Test helper — drops the memoised environment. */
export function resetServerEnvCache(): void {
  cached = null;
}

/**
 * Values that are safe in the browser. Next inlines `process.env.NEXT_PUBLIC_*`
 * at build time, so these must be referenced literally rather than by index.
 */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
  venueSlug: process.env.NEXT_PUBLIC_VENUE_SLUG ?? 'guzar-garden',
} as const;
