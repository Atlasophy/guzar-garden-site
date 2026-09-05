import { NextResponse } from 'next/server';

/**
 * One response shape for every API route.
 *
 * Success is `{ ok: true, data }`, failure is `{ ok: false, error: { code, message } }`.
 * `code` is a stable machine string the client maps to a translated sentence;
 * `message` is a short English fallback for a developer reading a network tab.
 *
 * Nothing here ever carries a stack trace, a SQL error or a provider message.
 * A guest who loses a table race is told the table is unavailable — not which
 * constraint rejected them, and never anything about the guest who won.
 */

export interface ApiErrorBody {
  ok: false;
  error: {
    code: string;
    message: string;
    /** Field-level messages, for form validation only. */
    fields?: Record<string, string>;
  };
}

export interface ApiSuccessBody<T> {
  ok: true;
  data: T;
}

export function apiSuccess<T>(data: T, init?: ResponseInit): NextResponse<ApiSuccessBody<T>> {
  return NextResponse.json(
    { ok: true, data },
    { status: 200, ...init, headers: { 'cache-control': 'no-store', ...init?.headers } },
  );
}

export function apiError(
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { ok: false, error: fields ? { code, message, fields } : { code, message } },
    { status, headers: { 'cache-control': 'no-store' } },
  );
}

/** The handful of failures every route can produce, with the right status. */
export const ApiErrors = {
  badRequest: (code = 'bad_request', message = 'The request could not be understood.') =>
    apiError(400, code, message),
  validation: (fields: Record<string, string>) =>
    apiError(422, 'validation_failed', 'Some fields need attention.', fields),
  unauthenticated: () => apiError(401, 'unauthenticated', 'Sign in to continue.'),
  forbidden: () => apiError(403, 'forbidden', 'You do not have access to this.'),
  notFound: (code = 'not_found') => apiError(404, code, 'Not found.'),
  conflict: (code: string, message = 'That is no longer available.') =>
    apiError(409, code, message),
  rateLimited: (retryAfterSeconds: number) =>
    NextResponse.json(
      {
        ok: false,
        error: { code: 'rate_limited', message: 'Too many requests. Please slow down.' },
      },
      {
        status: 429,
        headers: {
          'retry-after': String(retryAfterSeconds),
          'cache-control': 'no-store',
        },
      },
    ),
  serverError: () => apiError(500, 'server_error', 'Something went wrong. Please try again.'),
  unavailable: () =>
    apiError(503, 'service_unavailable', 'Temporarily unavailable. Please try again shortly.'),
} as const;

/** Zod issues → `{ fieldPath: message }`, for a form to render inline. */
export function zodFields(
  issues: { path: PropertyKey[]; message: string }[],
): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || '_';
    fields[key] ??= issue.message;
  }
  return fields;
}
