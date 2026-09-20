import { z } from 'zod';
import type { GoogleReviewFeed } from './google-reviews';

const reviewSchema = z.object({
  reviewer: z.object({ displayName: z.string().trim().min(1) }),
  starRating: z.enum(['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE']),
  comment: z.string().trim().min(1),
  createTime: z.iso.datetime({ offset: true }),
  updateTime: z.iso.datetime({ offset: true }),
});
const responseSchema = z.object({
  averageRating: z.number().min(1).max(5),
  totalReviewCount: z.number().int().positive(),
  reviews: z.array(z.unknown()).default([]),
});
const stars = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

/** Strip owner replies and other fields; preserve review wording and ratings. */
export function normalizeGoogleReviews(payload: unknown, checkedAt: string): GoogleReviewFeed {
  const data = responseSchema.parse(payload);
  const reviews = data.reviews
    .flatMap((entry) => {
      const parsed = reviewSchema.safeParse(entry);
      return parsed.success ? [parsed.data] : [];
    })
    .sort((a, b) => Date.parse(b.updateTime) - Date.parse(a.updateTime))
    .slice(0, 3);
  return {
    checkedAt,
    live: true,
    rating: data.averageRating,
    count: data.totalReviewCount,
    reviews: reviews.map((review) => ({
      author: review.reviewer.displayName,
      rating: stars[review.starRating],
      date: review.updateTime.slice(0, 10),
      text:
        review.comment.length > 240 ? review.comment.slice(0, 237).trimEnd() + '…' : review.comment,
    })),
  };
}

export interface GoogleReviewCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  location: string;
}

/** Read-only Google Business Profile request. Credentials stay on the server. */
export async function fetchGoogleReviews(
  credentials: GoogleReviewCredentials,
  request: typeof fetch = fetch,
): Promise<GoogleReviewFeed> {
  if (!/^accounts\/[A-Za-z0-9_-]+\/locations\/[A-Za-z0-9_-]+$/.test(credentials.location)) {
    throw new Error('Invalid Google Business Profile location resource');
  }
  const tokenResponse = await request('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: credentials.refreshToken,
      grant_type: 'refresh_token',
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  if (!tokenResponse.ok) throw new Error('Google review authorization failed');
  const token = z.object({ access_token: z.string().min(1) }).parse(await tokenResponse.json());
  const response = await request(
    `https://mybusiness.googleapis.com/v4/${credentials.location}/reviews?pageSize=10&orderBy=updateTime%20desc`,
    {
      headers: { Authorization: `Bearer ${token.access_token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    },
  );
  if (!response.ok) throw new Error('Google review request failed');
  return normalizeGoogleReviews(await response.json(), new Date().toISOString().slice(0, 10));
}
