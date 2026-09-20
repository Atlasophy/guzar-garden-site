import type { NextConfig } from 'next';

import { buildSecurityHeaders } from './lib/security/response-headers';

/**
 * The public site is server-rendered on purpose: menu content, availability and
 * every reservation operation need a server runtime, so static export is not an
 * option here (see README ▸ Architecture).
 */
const supabaseHost = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }]
      : [],
  },
  async redirects() {
    return [
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/menu.html', destination: '/menu', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: buildSecurityHeaders({
          allowUnsafeEval: process.env.NODE_ENV === 'development',
          supabaseHost,
        }),
      },
      {
        // Never let a shared cache hold on to anything staff- or guest-specific.
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }],
      },
      {
        source: '/staff/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }],
      },
    ];
  },
};

export default nextConfig;
