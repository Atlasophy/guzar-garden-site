import type { MetadataRoute } from 'next';

const baseUrl = new URL(process.env.APP_BASE_URL ?? 'http://localhost:3000');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/manage/', '/reservation/', '/staff/'],
    },
    sitemap: new URL('/sitemap.xml', baseUrl).toString(),
    host: baseUrl.origin,
  };
}
