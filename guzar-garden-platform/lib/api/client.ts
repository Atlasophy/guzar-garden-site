/**
 * The browser's side of the API contract.
 *
 * One place that knows the response envelope, so no component has to remember
 * to look at `ok` before reaching for `data`. Failures come back as a value
 * rather than a thrown exception: a lost table race and a dropped connection
 * are both ordinary things that happen during a booking, and a `try/catch`
 * around every call is how they end up being handled inconsistently.
 */

export interface ApiFailure {
  ok: false;
  code: string;
  message: string;
  status: number;
  fields?: Record<string, string>;
  retryAfterSeconds?: number;
}

export type ApiResult<T> = ({ ok: true } & { data: T }) | ApiFailure;

interface RawSuccess<T> {
  ok: true;
  data: T;
}

interface RawFailure {
  ok: false;
  error: { code: string; message: string; fields?: Record<string, string> };
}

export async function apiFetch<T>(
  input: string,
  init: RequestInit = {},
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(input, {
      ...init,
      headers: {
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...init.headers,
      },
      // The booking session cookie has to travel with every call.
      credentials: 'same-origin',
    });
  } catch {
    // No response at all: offline, DNS, a tunnel that died mid-flight.
    return { ok: false, code: 'network', message: 'Network request failed.', status: 0 };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return {
      ok: false,
      code: 'malformed_response',
      message: 'The server sent something unreadable.',
      status: response.status,
    };
  }

  if (response.ok && (body as RawSuccess<T>)?.ok) {
    return { ok: true, data: (body as RawSuccess<T>).data };
  }

  const failure = body as RawFailure;
  const retryAfter = response.headers.get('retry-after');

  return {
    ok: false,
    code: failure?.error?.code ?? 'server_error',
    message: failure?.error?.message ?? 'Something went wrong.',
    status: response.status,
    ...(failure?.error?.fields ? { fields: failure.error.fields } : {}),
    ...(retryAfter ? { retryAfterSeconds: Number(retryAfter) } : {}),
  };
}

export function apiPost<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  return apiFetch<T>(url, { method: 'POST', body: JSON.stringify(body) });
}

export function apiPatch<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  return apiFetch<T>(url, { method: 'PATCH', body: JSON.stringify(body) });
}

export function apiDelete<T>(url: string): Promise<ApiResult<T>> {
  return apiFetch<T>(url, { method: 'DELETE' });
}
