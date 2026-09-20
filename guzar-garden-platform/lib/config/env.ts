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
  SMS_PROVIDER: z.enum(['console', 'twilio']).default('console'),

  MENU_IMAGE_BUCKET: nonEmpty.default('menu-images'),
  MAX_MENU_IMAGE_BYTES: z.coerce.number().int().positive().default(8 * 1024 * 1024),

  NEXT_PUBLIC_VENUE_SLUG: nonEmpty.default('guzar-garden'),
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
    if (env.SMS_PROVIDER === 'twilio') {
      if (!env.TWILIO_ACCOUNT_SID) missing.push('TWILIO_ACCOUNT_SID is required when SMS_PROVIDER=twilio');
      if (!env.TWILIO_AUTH_TOKEN) missing.push('TWILIO_AUTH_TOKEN is required when SMS_PROVIDER=twilio');
      if (!env.TWILIO_MESSAGING_SERVICE_SID)
        missing.push('TWILIO_MESSAGING_SERVICE_SID is required when SMS_PROVIDER=twilio');
    } else {
      missing.push(
        'SMS_PROVIDER must be "twilio" in production — the console adapter never sends a message',
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
