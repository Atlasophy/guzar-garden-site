import 'server-only';
import { unstable_cache } from 'next/cache';
import { GOOGLE_REVIEWS } from './google-reviews';
import { fetchGoogleReviews } from './google-review-client';

export async function getGoogleReviews() {
  const clientId = process.env.GOOGLE_BUSINESS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_BUSINESS_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_BUSINESS_REFRESH_TOKEN;
  const location = process.env.GOOGLE_BUSINESS_LOCATION;
  if (!clientId || !clientSecret || !refreshToken || !location) return GOOGLE_REVIEWS;
  try {
    // Cache only the public result. Never put credentials into cache arguments.
    return await unstable_cache(
      () => fetchGoogleReviews({ clientId, clientSecret, refreshToken, location }),
      ['google-reviews-v1', location],
      { revalidate: 3600 },
    )();
  } catch {
    // Keep the real snapshot's original date; do not make stale reviews look new.
    console.warn('Google reviews unavailable; displaying the dated verified snapshot.');
    return GOOGLE_REVIEWS;
  }
}
