export function buildContentSecurityPolicy(options?: {
  allowUnsafeEval?: boolean;
  supabaseHost?: string | null;
}) {
  const supabaseHost = options?.supabaseHost;

  return [
    "default-src 'self'",
    // Next.js and vinext both use a small inline bootstrap on rendered pages.
    `script-src 'self' 'unsafe-inline'${options?.allowUnsafeEval ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    `img-src 'self' data: blob:${supabaseHost ? ` https://${supabaseHost}` : ''} https://*.supabase.co`,
    `connect-src 'self'${supabaseHost ? ` https://${supabaseHost} wss://${supabaseHost}` : ''} https://*.supabase.co wss://*.supabase.co`,
    'frame-src https://maps.google.com https://www.google.com',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

export function buildSecurityHeaders(options?: {
  allowUnsafeEval?: boolean;
  supabaseHost?: string | null;
}) {
  return [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'DENY' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
    },
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload',
    },
    { key: 'Content-Security-Policy', value: buildContentSecurityPolicy(options) },
  ];
}
