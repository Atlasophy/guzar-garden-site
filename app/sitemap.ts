import type { MetadataRoute } from 'next';
import { PUBLIC_SITE_URL } from '@/lib/config/public-site';

const baseUrl = new URL(PUBLIC_SITE_URL);

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: new URL('/', baseUrl).toString(), changeFrequency: 'weekly', priority: 1 },
    { url: new URL('/menu', baseUrl).toString(), changeFrequency: 'daily', priority: 0.9 },
    {
      url: new URL('/reserve', baseUrl).toString(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: new URL('/privacy', baseUrl).toString(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
