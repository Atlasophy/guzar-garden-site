import type { MetadataRoute } from 'next';
import { PUBLIC_SITE_URL } from '@/lib/config/public-site';

const baseUrl = new URL(PUBLIC_SITE_URL);

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
