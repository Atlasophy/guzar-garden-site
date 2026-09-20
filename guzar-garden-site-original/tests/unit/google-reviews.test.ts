import { describe, expect, it, vi } from 'vitest';
import { fetchGoogleReviews, normalizeGoogleReviews } from '@/lib/venue/google-review-client';

const review = (name: string, rating: string, updated: string) => ({
  reviewer: { displayName: name },
  starRating: rating,
  comment: 'A guest review.',
  createTime: '2026-09-01T12:00:00Z',
  updateTime: updated,
  reviewReply: { comment: 'Private owner response fields must not leak.' },
});

describe('Google review feed', () => {
  it('orders by update time, retains low ratings, and strips owner replies', () => {
    const feed = normalizeGoogleReviews(
      {
        averageRating: 4.7,
        totalReviewCount: 3446,
        reviews: [
          review('Earlier', 'FIVE', '2026-09-02T12:00:00Z'),
          review('Newest', 'ONE', '2026-09-05T12:00:00Z'),
          { starRating: 'FIVE' },
        ],
      },
      '2026-09-05',
    );
    expect(feed.reviews.map((r) => r.author)).toEqual(['Newest', 'Earlier']);
    expect(feed.reviews[0]?.rating).toBe(1);
    expect(JSON.stringify(feed)).not.toContain('owner response');
    expect(feed.checkedAt).toBe('2026-09-05');
  });
  it('rejects invalid aggregate data instead of showing invented ratings', () => {
    expect(() =>
      normalizeGoogleReviews({ averageRating: 8, totalReviewCount: 5 }, '2026-09-05'),
    ).toThrow();
  });
  it('does not send credentials when the location is invalid', async () => {
    const request = vi.fn();
    await expect(
      fetchGoogleReviews(
        {
          clientId: 'test',
          clientSecret: 'test',
          refreshToken: 'test',
          location: 'https://other.example',
        },
        request,
      ),
    ).rejects.toThrow('Invalid Google');
    expect(request).not.toHaveBeenCalled();
  });
  it('stops on expired authorization without forwarding response secrets', async () => {
    const request = vi.fn().mockResolvedValue(new Response('secret error body', { status: 401 }));
    await expect(
      fetchGoogleReviews(
        {
          clientId: 'test',
          clientSecret: 'test',
          refreshToken: 'test',
          location: 'accounts/1/locations/2',
        },
        request,
      ),
    ).rejects.toThrow('Google review authorization failed');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('uses the official endpoint and newest-update order after token refresh', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ access_token: 'test-access' }))
      .mockResolvedValueOnce(
        Response.json({
          averageRating: 4.7,
          totalReviewCount: 3446,
          reviews: [review('Guest', 'FOUR', '2026-09-05T12:00:00Z')],
        }),
      );
    const feed = await fetchGoogleReviews(
      {
        clientId: 'test',
        clientSecret: 'test',
        refreshToken: 'test',
        location: 'accounts/1/locations/2',
      },
      request,
    );
    expect(request.mock.calls[1]?.[0]).toBe(
      'https://mybusiness.googleapis.com/v4/accounts/1/locations/2/reviews?pageSize=10&orderBy=updateTime%20desc',
    );
    expect(feed.live).toBe(true);
    expect(feed.reviews[0]?.rating).toBe(4);
    expect(JSON.stringify(feed)).not.toContain('test-access');
  });
});
