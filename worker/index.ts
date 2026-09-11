import app from 'vinext/server/fetch-handler';

import { buildSecurityHeaders } from '../lib/security/response-headers';

type VinextEnv = NonNullable<Parameters<typeof app.fetch>[1]>;
type GuzarWorkerEnv = VinextEnv & { NEXT_PUBLIC_SUPABASE_URL?: string };
type VinextExecutionContext = NonNullable<Parameters<typeof app.fetch>[2]>;

function supabaseHostname(env: GuzarWorkerEnv) {
  if (!env.NEXT_PUBLIC_SUPABASE_URL) return null;
  try {
    return new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname;
  } catch {
    return null;
  }
}

const worker = {
  async fetch(
    request: Request,
    env: GuzarWorkerEnv,
    ctx: VinextExecutionContext,
  ): Promise<Response> {
    const response = await app.fetch(request, env, ctx);
    const headers = new Headers(response.headers);

    for (const header of buildSecurityHeaders({ supabaseHost: supabaseHostname(env) })) {
      headers.set(header.key, header.value);
    }

    const url = new URL(request.url);
    const pathname = url.pathname;
    if (pathname.startsWith('/api/') || pathname.startsWith('/staff/')) {
      headers.set('Cache-Control', 'no-store, max-age=0');
    }

    // Cloudflare's temporary preview hostname is for release checks only. The
    // restaurant's custom domain remains the one canonical, indexable website.
    if (url.hostname.endsWith('.workers.dev')) {
      headers.set('X-Robots-Tag', 'noindex, nofollow');
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};

export default worker;
