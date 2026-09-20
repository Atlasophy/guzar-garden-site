import app from 'vinext/server/fetch-handler';

import { buildSecurityHeaders } from '../lib/security/response-headers';

type VinextEnv = NonNullable<Parameters<typeof app.fetch>[1]>;
type GuzarWorkerEnv = VinextEnv & {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  PUBLIC_INDEXING_ENABLED?: string;
};
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
    const url = new URL(request.url);

    if (url.hostname === 'www.guzargarden.pl') {
      url.hostname = 'guzargarden.pl';
      return Response.redirect(url.toString(), 308);
    }

    const response = await app.fetch(request, env, ctx);
    const headers = new Headers(response.headers);

    for (const header of buildSecurityHeaders({ supabaseHost: supabaseHostname(env) })) {
      headers.set(header.key, header.value);
    }

    const pathname = url.pathname;
    if (pathname.startsWith('/api/') || pathname.startsWith('/staff/')) {
      headers.set('Cache-Control', 'no-store, max-age=0');
    }

    // Keep search engines away from the temporary preview and from the public
    // prelaunch while reservations, the menu data and legal details are being
    // connected. Flip the binding to "true" only for the final indexed launch.
    if (url.hostname.endsWith('.workers.dev') || env.PUBLIC_INDEXING_ENABLED !== 'true') {
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
