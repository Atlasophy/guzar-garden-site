import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { getServerEnv } from '@/lib/config/env';

/**
 * Public tokens: hold tokens and guest management tokens.
 *
 * The rule both follow — the raw token exists exactly once, in the URL or the
 * response handed to the guest. What is stored is an HMAC of it. So a dump of
 * the database does not let anybody open somebody else's booking, and the
 * lookup is still a single indexed equality on the hash.
 *
 * HMAC rather than a bare hash because these are high-entropy secrets, not
 * passwords: the secret key is what stops an attacker who has the table from
 * grinding candidate tokens offline, and a slow KDF would buy nothing against
 * 256 bits of randomness while costing a hash on every request.
 */

const TOKEN_BYTES = 32; // 256 bits

/** A new opaque token, URL-safe, no padding. */
export function generateToken(bytes = TOKEN_BYTES): string {
  return randomBytes(bytes).toString('base64url');
}

/** Stable, keyed hash of a token. Hex, so it drops straight into a text column. */
export function hashToken(token: string): string {
  const secret = getServerEnv().RESERVATION_TOKEN_SECRET;
  return createHmac('sha256', secret).update(token, 'utf8').digest('hex');
}

/** Constant-time comparison of two hex digests. */
export function tokensMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * The anonymous booking session.
 *
 * A hold belongs to the browser that made it, not merely to whoever knows the
 * token, so confirming needs both. This is what stops one guest's hold being
 * confirmed by another guest who happened to see the token.
 */
export function generateSessionId(): string {
  return generateToken(24);
}

export function hashSessionId(sessionId: string): string {
  return hashToken(`session:${sessionId}`);
}

/**
 * Idempotency key for a reservation submission.
 *
 * Generated in the browser when the guest reaches the review step and reused
 * for every retry of that submission, so a double tap, a flaky network or a
 * proxy replay all land on the same reservation.
 */
export function generateIdempotencyKey(): string {
  return generateToken(16);
}

/** Cheap shape check before a token ever reaches the database. */
export function looksLikeToken(value: unknown, minLength = 20): value is string {
  return typeof value === 'string' && value.length >= minLength && /^[A-Za-z0-9_-]+$/.test(value);
}
