import { publicEnv } from '@/lib/config/env';
import { getSignatureDishes } from '@/lib/menu/repository';
import { getPublicVenueInfo, type PublicHours } from '@/lib/venue/public-info';
import { SITE } from '@/components/shared/site-config';
import { SiteHeader } from '@/components/shared/site-header';
import { SiteFooter } from '@/components/shared/site-footer';
import { IntroOverlay } from '@/components/marketing/intro-overlay';
import { PageEffects } from '@/components/marketing/page-effects';
import { Hero } from '@/components/marketing/hero';
import { GallerySection } from '@/components/marketing/gallery-section';
import { GalleryHighlights } from '@/components/marketing/gallery-highlights';
import { GoogleReviews } from '@/components/marketing/google-reviews';
import { getGoogleReviews } from '@/lib/venue/google-review-service';
import {
  AboutSection,
  KitchenSection,
  LocationSection,
  Marquee,
  VenueSection,
} from '@/components/marketing/sections';
import { SignatureSection } from '@/components/marketing/signature-section';

/**
 * The landing page.
 *
 * Server-rendered, so the copy, the structured data and the signature dishes
 * are all in the first response — this page's job is to be found, and a menu
 * that only exists after hydration is a menu a search engine never reads.
 *
 * Two things now come out of the database rather than out of the markup: the
 * opening hours (so changing Sunday is a form, not a deploy) and the five
 * signature dishes with their prices (so the landing page and the menu cannot
 * disagree about what plov costs, which they did).
 */

// The menu is cached under a tag and purged on every staff change, so the page
// itself can be rendered per request without hitting the database each time.
export const revalidate = 3600;

/** Fallback hours, used only if the venue row is unreachable. */
const FALLBACK_HOURS: PublicHours[] = Array.from({ length: 7 }, (_, weekday) => ({
  weekday,
  opensAt: '09:00',
  closesAt: '24:00',
}));

export default async function HomePage() {
  const [signatures, venue, reviews] = await Promise.all([
    getSignatureDishes(publicEnv.venueSlug).catch(() => []),
    getPublicVenueInfo(publicEnv.venueSlug).catch(() => null),
    getGoogleReviews(),
  ]);

  const hours = venue?.hours.length ? venue.hours : FALLBACK_HOURS;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: SITE.name,
    servesCuisine: ['Uzbek', 'Halal', 'Central Asian'],
    priceRange: '$$',
    telephone: SITE.phoneE164,
    url: process.env.APP_BASE_URL ?? 'http://localhost:3000',
    hasMenu: `${process.env.APP_BASE_URL ?? ''}/menu`,
    acceptsReservations: `${process.env.APP_BASE_URL ?? ''}/reserve`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE.addressLine,
      postalCode: SITE.postalCode,
      addressLocality: SITE.city,
      addressCountry: 'PL',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: SITE.latitude,
      longitude: SITE.longitude,
    },
    openingHoursSpecification: hours.map((row) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][
        row.weekday
      ],
      opens: row.opensAt,
      closes: row.closesAt === '24:00' ? '23:59' : row.closesAt,
    })),
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: reviews.rating,
      reviewCount: reviews.count,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="grain" aria-hidden="true" />
      <IntroOverlay />
      <a className="skip-link" href="#o-nas">
        Przejdź do treści
      </a>

      <SiteHeader variant="emerald" anchorsAreLocal showProgress />

      <main>
        <Hero hours={hours} rating={reviews.rating} />
        <GalleryHighlights />
        <Marquee />
        <AboutSection rating={reviews.rating} reviewCount={reviews.count} />
        <GallerySection />
        <KitchenSection />
        <SignatureSection items={signatures} />
        <VenueSection />
        <GoogleReviews feed={reviews} />
        <LocationSection hours={hours} />
      </main>

      <SiteFooter variant="emerald" />
      <PageEffects />
    </>
  );
}
