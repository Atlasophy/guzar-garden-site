/** Public Google Maps snapshot, checked 2026-09-05 using Newest sorting.
 * Selected recent excerpts, not a live feed or an exhaustive list.
 * Source: https://maps.app.goo.gl/3WL53ikiXv6bY1CJ7
 * Original wording and ratings retained. Do not advance checkedAt without
 * rechecking Google, or describe these records as automatically refreshed.
 */
export interface GoogleReviewFeed {
  checkedAt: string;
  rating: number;
  count: number;
  live: boolean;
  reviews: { author: string; rating: number; date: string; language?: string; text: string }[];
}

export const GOOGLE_REVIEWS: GoogleReviewFeed = {
  live: false,
  checkedAt: '2026-09-05',
  rating: 4.7,
  count: 3446,
  reviews: [
    {
      author: 'Abdulrahman Khalifa',
      rating: 5,
      date: '2026-09-04',
      language: 'en',
      text: 'every single dish i tried is amazing and friendly staff',
    },
    {
      author: 'Bartosz Krysiak',
      rating: 4,
      date: '2026-09-04',
      language: 'pl',
      text: 'Miejsce z dużym potencjałem. […] Obsługa top.',
    },
    {
      author: 'Женя хех',
      rating: 5,
      date: '2026-09-04',
      language: 'ru',
      text: 'Плов божественный)) рекомендую',
    },
  ],
};
