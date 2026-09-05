# Google reviews

The landing page currently displays a verified, dated snapshot from Google Maps,
checked on 5 September 2026: 4.7 / 5, 3,446 reviews. The three excerpts are selected
recent reviews, not an exhaustive latest-review feed.

Automatic updates use Google's official Business Profile Reviews API. The
restaurant must own/manage a verified location and have an approved API project.
Configure GOOGLE_BUSINESS_CLIENT_ID, GOOGLE_BUSINESS_CLIENT_SECRET,
GOOGLE_BUSINESS_REFRESH_TOKEN and GOOGLE_BUSINESS_LOCATION on the server.
The last value is accounts/ACCOUNT_ID/locations/LOCATION_ID, not a Maps place ID.
The refresh token must be issued through the owner's normal OAuth consent flow
with the business.manage scope and offline access. Never paste credentials in
chat or expose them through NEXT_PUBLIC_ variables. Restart after configuration.

The adapter requests updateTime descending, displays the first three valid text
reviews irrespective of rating, and caches the public result for an hour.
Google does not support creation-time sorting on this endpoint; the UI therefore
says recently posted or updated. Star-only reviews are skipped. Owner replies
are not displayed. Text is rendered as plain text and limited to an excerpt.
The live average and count also update the page's structured data.

If configuration is missing, Google fails, or its response is invalid, the dated
snapshot remains. Its checked date is never silently advanced. API failures are
logged without response bodies or credentials. Live connectivity is not yet
verified because this project has no Business Profile credentials configured.

References:
- https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/list
- https://developers.google.com/identity/protocols/oauth2/web-server#offline
- https://maps.app.goo.gl/3WL53ikiXv6bY1CJ7
