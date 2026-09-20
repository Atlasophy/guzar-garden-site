import type { NextResponse } from 'next/server';
import { AuthorizationError } from '@/lib/auth/staff';
import { EnvironmentError } from '@/lib/config/env';
import { logEvent } from '@/lib/security/redact';
import { checkRateLimit, type RateLimitName } from '@/lib/security/rate-limit';
import { isMutating, isSameOrigin } from '@/lib/security/request';
import { ApiErrors } from './response';

/**
 * The wrapper every route handler goes through.
 *
 * It applies, in order: the same-origin check on state-changing requests, the
 * rate limit, then the handler — and turns anything that escapes into a generic
 * 500 with the real cause logged (redacted) rather than returned. A route
 * handler can therefore be written as if nothing goes wrong, and still cannot
 * leak an internal error to a browser.
 */

export interface RouteOptions {
  rateLimit?: RateLimitName;
  /** Extra discriminator for the rate-limit key — a table id, an email. */
  rateLimitKey?: (request: Request) => string;
  /** Skip the origin check (webhooks and cron endpoints authenticate instead). */
  skipOriginCheck?: boolean;
}

type Handler = (request: Request, context: never) => Promise<NextResponse> | NextResponse;

export function route<H extends Handler>(handler: H, options: RouteOptions = {}): H {
  const wrapped = async (request: Request, context: never) => {
    try {
      if (!options.skipOriginCheck && isMutating(request) && !isSameOrigin(request)) {
        logEvent('warn', 'api.cross_origin_blocked', {
          method: request.method,
          origin: request.headers.get('origin'),
        });
        return ApiErrors.forbidden();
      }

      if (options.rateLimit) {
        const extra = options.rateLimitKey?.(request) ?? '';
        const result = await checkRateLimit(options.rateLimit, request, extra);
        if (!result.allowed) {
          return ApiErrors.rateLimited(result.retryAfterSeconds);
        }
      }

      return await handler(request, context);
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return error.status === 401 ? ApiErrors.unauthenticated() : ApiErrors.forbidden();
      }
      if (error instanceof EnvironmentError) {
        // Misconfiguration, not a client's fault, and the message names the
        // variables — never send it to a browser.
        logEvent('error', 'api.misconfigured', { message: error.message });
        return ApiErrors.unavailable();
      }

      logEvent('error', 'api.unhandled', {
        method: request.method,
        path: new URL(request.url).pathname,
        message: (error as Error)?.message ?? 'unknown',
        stack: process.env.NODE_ENV === 'production' ? undefined : (error as Error)?.stack,
      });
      return ApiErrors.serverError();
    }
  };

  return wrapped as unknown as H;
}

/** Parse a JSON body, tolerating an empty or malformed one. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    const text = await request.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch {
    return null;
  }
}
