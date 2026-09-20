import { cookies } from 'next/headers';
import { getServerEnv } from '@/lib/config/env';
import { generateSessionId } from './tokens';

/**
 * Request-level guards and the anonymous booking session.
 */

export const BOOKING_SESSION_COOKIE = 'gg_booking_session';
const BOOKING_SESSION_MAX_AGE = 60 * 60 * 6; // six hours — one long evening

/**
 * Same-origin check for state-changing requests.
 *
 * Modern browsers send `Origin` on every cross-origin POST/PATCH/DELETE, so
 * comparing it against the configured base URL rejects a form posted from
 * somebody else's page. Requests without an Origin (server-to-server, curl) are
 * allowed through here because they are handled by the endpoint's own
 * authentication — the webhook checks a Twilio signature, the cron endpoints
 * check a bearer secret.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  const allowed = new Set<string>();
  try {
    allowed.add(new URL(getServerEnv().APP_BASE_URL).origin);
  } catch {
    // A malformed APP_BASE_URL is caught by env validation at boot.
  }
  // The host the request actually arrived on, so preview deployments work.
  const host = request.headers.get('host');
  if (host) {
    allowed.add(`https://${host}`);
    allowed.add(`http://${host}`);
  }

  try {
    return allowed.has(new URL(origin).origin);
  } catch {
    return false;
  }
}

export function isMutating(request: Request): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase());
}

/**
 * Read the anonymous booking session, creating one if the guest does not have
 * it yet. Http-only so no script can read it, `lax` so a normal navigation to
 * /reserve carries it, `secure` outside development.
 */
export async function getOrCreateBookingSession(): Promise<string> {
  const store = await cookies();
  const existing = store.get(BOOKING_SESSION_COOKIE)?.value;
  if (existing && existing.length >= 20) return existing;

  const sessionId = generateSessionId();
  store.set(BOOKING_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: getServerEnv().NODE_ENV === 'production',
    path: '/',
    maxAge: BOOKING_SESSION_MAX_AGE,
  });
  return sessionId;
}

/** Read-only: returns null rather than minting a session. */
export async function readBookingSession(): Promise<string | null> {
  const store = await cookies();
  return store.get(BOOKING_SESSION_COOKIE)?.value ?? null;
}

/**
 * Bearer-token check for the scheduled-job endpoints.
 *
 * Compared in constant time so the endpoint cannot be used as an oracle to
 * recover CRON_SECRET one byte at a time.
 */
export function hasValidCronSecret(request: Request): boolean {
  const header = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${getServerEnv().CRON_SECRET}`;
  if (header.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < header.length; i += 1) {
    mismatch |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}
