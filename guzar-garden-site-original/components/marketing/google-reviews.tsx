'use client';

import { useLocale } from '@/components/shared/locale-provider';
import { SITE } from '@/components/shared/site-config';
import type { GoogleReviewFeed } from '@/lib/venue/google-reviews';

export function GoogleReviews({ feed }: { feed: GoogleReviewFeed }) {
  const { dictionary, locale } = useLocale();
  const t = dictionary.reviews;
  const date = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(value + 'T12:00:00Z'));
  return (
    <section className="sec google-reviews-section" id="reviews" aria-labelledby="reviews-title">
      <div className="wrap">
        <div className="reviews-intro">
          <div>
            <p className="eyebrow">{t.eyebrow}</p>
            <h2 id="reviews-title">{t.heading}</h2>
            <p className="lede">{feed.live ? t.liveIntro : t.intro}</p>
          </div>
          <a
            className="google-rating"
            href={SITE.mapsPlace}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="google-source">Google</span>
            <span className="rating-number">
              {feed.rating.toLocaleString(locale, { maximumFractionDigits: 1 })}
              <small>/ 5</small>
            </span>
            <span className="review-stars" aria-hidden="true">
              ★★★★★
            </span>
            <span>
              {feed.count.toLocaleString(locale)} {t.count} ↗
            </span>
          </a>
        </div>
        <div className="review-cards">
          {feed.reviews.map((review) => (
            <article className="review-card" key={review.author}>
              <header>
                <span className="review-avatar" aria-hidden="true">
                  {review.author.slice(0, 1)}
                </span>
                <div>
                  <h3>{review.author}</h3>
                  <time dateTime={review.date}>{date(review.date)}</time>
                </div>
                <span className="review-google">Google</span>
              </header>
              <span className="review-stars" aria-label={`${review.rating} / 5`}>
                {'★'.repeat(review.rating)}
                <span aria-hidden="true">{'☆'.repeat(5 - review.rating)}</span>
              </span>
              <blockquote lang={review.language}>“{review.text}”</blockquote>
              <footer>
                <span>{t.excerpt}</span>
                <a href={SITE.mapsPlace} target="_blank" rel="noopener noreferrer">
                  {t.onGoogle} ↗
                </a>
              </footer>
            </article>
          ))}
        </div>
        <div className="reviews-bottom">
          <span>
            {t.checked} <time dateTime={feed.checkedAt}>{date(feed.checkedAt)}</time>
          </span>
          <a href={SITE.mapsPlace} target="_blank" rel="noopener noreferrer">
            {t.all} ↗
          </a>
        </div>
      </div>
    </section>
  );
}
