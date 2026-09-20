import 'server-only';
import { logEvent } from '@/lib/security/redact';

/**
 * Failures that are deliberately swallowed, but must never be silent.
 *
 * The public pages degrade rather than crash: if the menu cannot be read the
 * visitor sees "the menu is temporarily unavailable" and a phone number, which
 * is the right thing to show them. The wrong thing — and what actually
 * happened — is for that to be the *only* consequence.
 *
 * A `catch {}` in app/(menu)/menu/page.tsx hid a TypeError for the entire life
 * of the platform. Every visitor in every language saw the fallback notice, and
 * because nothing was ever logged it read as "Supabase content isn't set up
 * yet" rather than as a crash. It was found only by editing the catch by hand.
 *
 * So: still degrade, but say so, once, in a parseable line an operator can
 * alert on.
 *
 * Error text is sanitised here rather than trusted. `redactDeep` in
 * lib/security/redact.ts redacts by key *name*, which cannot help with a free
 * -form message — a PostgREST error can quote a row, and a fetch failure can
 * quote a URL carrying a management token.
 */

/** Anything long enough and random enough to be a token, key or hash. */
const TOKEN_LIKE = /\b[A-Za-z0-9_-]{24,}\b/g;
const QUERY_STRING = /\?[^\s"']*/g;
const EMAIL_LIKE = /\b[^\s@]+@[^\s@]+\.[A-Za-z]{2,}\b/g;
const MAX_MESSAGE = 300;

export function sanitizeErrorMessage(input: unknown): string {
  const raw =
    input instanceof Error ? input.message : typeof input === 'string' ? input : String(input);
  return raw
    .replace(QUERY_STRING, '?…')
    .replace(EMAIL_LIKE, '«email»')
    .replace(TOKEN_LIKE, '«redacted»')
    .slice(0, MAX_MESSAGE);
}

/**
 * Log a suppressed failure. Never throws — a reporting bug must not become the
 * outage it was meant to describe.
 */
export function reportSuppressed(event: string, error: unknown): void {
  try {
    logEvent('error', event, {
      error_name: error instanceof Error ? error.name : typeof error,
      error_message: sanitizeErrorMessage(error),
      // PostgREST and node-postgres both use `code`; it is the most useful
      // single field for telling "misconfigured" apart from "broken".
      error_code:
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code: unknown }).code).slice(0, 60)
          : undefined,
    });
  } catch {
    // Deliberately empty: see above.
  }
}

/**
 * Run an operation that is allowed to fail, returning `fallback` if it does and
 * reporting why. Replaces `.catch(() => fallback)` at the public-page call
 * sites, which is the shape that hid the menu outage.
 */
export async function withReportedFallback<T>(
  event: string,
  fallback: T,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    reportSuppressed(event, error);
    return fallback;
  }
}
