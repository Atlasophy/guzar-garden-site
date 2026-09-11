import type { MetadataRoute } from 'next';

const baseUrl = new URL(process.env.APP_BASE_URL ?? 'http://localhost:3000');

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
