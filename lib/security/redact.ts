/**
 * Redaction for logs, audit payloads and error reports.
 *
 * The standing rule: a log line may say *which* guest something happened to
 * well enough for staff to find the booking, and never well enough to contact
 * them or to reconstruct a token. So a phone keeps its country code and last
 * two digits, an e-mail keeps its first letter and domain, and a token keeps
 * nothing but a short prefix that is useless on its own.
 */

/** "+48570088888" → "+48•••••••88" */
export function redactPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const trimmed = phone.trim();
  if (trimmed.length <= 6) return '•'.repeat(trimmed.length);
  const prefix = trimmed.startsWith('+') ? trimmed.slice(0, 3) : trimmed.slice(0, 2);
  const suffix = trimmed.slice(-2);
  return `${prefix}${'•'.repeat(Math.max(trimmed.length - prefix.length - 2, 1))}${suffix}`;
}

/** "anna.kowalska@example.com" → "a•••@example.com" */
export function redactEmail(email: string | null | undefined): string {
  if (!email) return '—';
  const at = email.indexOf('@');
  if (at <= 0) return '•••';
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const head = local.slice(0, 1);
  return `${head}${'•'.repeat(Math.max(local.length - 1, 1))}${domain}`;
}

/** "AbCdEf…" — enough to correlate two log lines, not enough to replay. */
export function redactToken(token: string | null | undefined): string {
  if (!token) return '—';
  return `${token.slice(0, 4)}…(${token.length})`;
}

/** "Anna Przykładowa" → "Anna P." */
export function shortenName(first: string, last: string): string {
  const initial = last.trim().slice(0, 1);
  return initial ? `${first.trim()} ${initial}.` : first.trim();
}

const SENSITIVE_KEYS = [
  'phone',
  'phone_e164',
  'guest_phone_e164',
  'recipient',
  'email',
  'guest_email',
  'token',
  'hold_token',
  'hold_token_hash',
  'management_token',
  'management_token_hash',
  'session',
  'session_id',
  'authorization',
  'password',
  'auth_token',
  'service_role_key',
  'apikey',
  'api_key',
  'secret',
];

/**
 * Walk an arbitrary object and redact anything that looks sensitive by name.
 *
 * Used before writing an audit payload or logging a failure: a route handler
 * should not have to remember which of its fields are private, because the one
 * time it forgets is the time the value ends up in a log aggregator.
 */
export function redactDeep(value: unknown, depth = 0): unknown {
  if (depth > 6) return '…';
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((item) => redactDeep(item, depth + 1));
  if (typeof value !== 'object') return value;

  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const lower = key.toLowerCase();
    if (
      SENSITIVE_KEYS.some((sensitive) => lower === sensitive || lower.endsWith(`_${sensitive}`))
    ) {
      if (typeof entry === 'string') {
        result[key] = lower.includes('email')
          ? redactEmail(entry)
          : lower.includes('phone') || lower.includes('recipient')
            ? redactPhone(entry)
            : redactToken(entry);
      } else {
        result[key] = '•••';
      }
      continue;
    }
    result[key] = redactDeep(entry, depth + 1);
  }
  return result;
}

/**
 * Structured, already-redacted logging.
 *
 * One shape for every server-side log line, so a log pipeline can parse it and
 * so nothing has to remember to redact at the call site.
 */
export function logEvent(
  level: 'info' | 'warn' | 'error',
  event: string,
  data: Record<string, unknown> = {},
): void {
  const line = JSON.stringify({
    level,
    event,
    at: new Date().toISOString(),
    ...(redactDeep(data) as Record<string, unknown>),
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.warn(line);
}
