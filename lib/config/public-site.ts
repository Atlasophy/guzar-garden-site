export const PUBLIC_SITE_URL =
  process.env.APP_BASE_URL ??
  (process.env.NODE_ENV === 'production' ? 'https://guzargarden.pl' : 'http://localhost:3000');
