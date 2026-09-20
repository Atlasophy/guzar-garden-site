import { createHash } from 'node:crypto';

/**
 * Rate limiting.
 *
 * The default store is an in-process sliding-window counter. That is honest
 * about what it is: it protects a single instance against a single noisy
 * client, and on a horizontally scaled deployment each instance counts its own
 * traffic. For a one-restaurant booking site behind Vercel that is a reasonable
 * first line, and the login limiter has a second line underneath it (Supabase
 * Auth's own throttling).
 *
 * `setRateLimitStore` exists so a shared store (Upstash Redis, Vercel KV) can be
 * dropped in without touching a single route handler — see README ▸ Deployment.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window frees up. Sent as Retry-After. */
  retryAfterSeconds: number;
}

export interface RateLimitStore {
  hit(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
}

interface Bucket {
  timestamps: number[];
}

class MemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, Bucket>();
  private lastSweep = Date.now();

  async hit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    this.sweep(now, windowMs);

    const bucket = this.buckets.get(key) ?? { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

    if (bucket.timestamps.length >= limit) {
      const oldest = bucket.timestamps[0] ?? now;
      this.buckets.set(key, bucket);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)),
      };
    }

    bucket.timestamps.push(now);
    this.buckets.set(key, bucket);
    return {
      allowed: true,
      remaining: limit - bucket.timestamps.length,
      retryAfterSeconds: 0,
    };
  }

  /** Drop cold buckets occasionally so a long-lived process does not grow. */
  private sweep(now: number, windowMs: number): void {
    if (now - this.lastSweep < 60_000) return;
    this.lastSweep = now;
    for (const [key, bucket] of this.buckets) {
      const live = bucket.timestamps.filter((t) => now - t < windowMs);
      if (live.length === 0) this.buckets.delete(key);
      else bucket.timestamps = live;
    }
  }
}

let store: RateLimitStore = new MemoryRateLimitStore();

export function setRateLimitStore(next: RateLimitStore): void {
  store = next;
}

/** The limits, in one place so they can be read as a policy rather than hunted for. */
export const RATE_LIMITS = {
  /** Availability is cheap and gets polled by the floor plan. */
  availability: { limit: 120, windowMs: 60_000 },
  /** A hold takes a table out of circulation, so it is the tighter one. */
  holdCreate: { limit: 12, windowMs: 60_000 },
  holdRelease: { limit: 30, windowMs: 60_000 },
  /** Confirmations are idempotent, but a flood is still a flood. */
  reservationCreate: { limit: 8, windowMs: 300_000 },
  reservationManage: { limit: 20, windowMs: 300_000 },
  /** Guessing a management token should be hopeless and slow. */
  managementLookup: { limit: 20, windowMs: 300_000 },
  /** Login: the number that matters most. */
  staffLogin: { limit: 8, windowMs: 900_000 },
  staffApi: { limit: 300, windowMs: 60_000 },
  imageUpload: { limit: 30, windowMs: 300_000 },
  webhook: { limit: 600, windowMs: 60_000 },
} as const;

export type RateLimitName = keyof typeof RATE_LIMITS;

/**
 * Client identity for limiting purposes.
 *
 * Hashed, because a raw IP in a rate-limit key is still personal data sitting
 * in memory, and the limiter only ever needs to compare keys for equality.
 */
export function clientKey(request: Request, extra = ''): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip =
    forwarded?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    request.headers.get('cf-connecting-ip') ??
    'unknown';
  return createHash('sha256').update(`${ip}|${extra}`).digest('hex').slice(0, 32);
}

export async function checkRateLimit(
  name: RateLimitName,
  request: Request,
  extra = '',
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[name];
  return store.hit(`${name}:${clientKey(request, extra)}`, config.limit, config.windowMs);
}

/** Test helper — a clean limiter between cases. */
export function resetRateLimits(): void {
  store = new MemoryRateLimitStore();
}
