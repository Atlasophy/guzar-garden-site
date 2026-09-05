/**
 * The restaurant's own details, as the public pages use them.
 *
 * These are presentation constants — the telephone number as it is written on
 * the page, the map embed, the social links — not booking policy. Anything that
 * decides whether a table can be booked lives in the database, where the
 * restaurant can change it.
 */

export const SITE = {
  name: 'Guzar Garden',
  phoneE164: '+48570088888',
  phoneDisplay: '+48 570 088 888',
  addressLine: 'al. Zieleniecka 6/8',
  postalCode: '03-727',
  city: 'Warszawa',
  district: 'Praga-Południe',
  latitude: 52.2441,
  longitude: 21.0497,
  coordsLabel: '52.2441° N · 21.0497° E',
  established: 2024,
  googleRating: 4.7,
  googleReviews: 3446,

  mapsEmbed:
    'https://maps.google.com/maps?q=Guzar%20Garden%2C%20aleja%20Zieleniecka%206%2F8%2C%2003-727%20Warszawa&z=16&output=embed&hl=',
  mapsDirections:
    'https://www.google.com/maps/dir/?api=1&destination=Guzar+Garden+aleja+Zieleniecka+6%2F8+03-727+Warszawa',
  mapsPlace: 'https://maps.app.goo.gl/3WL53ikiXv6bY1CJ7',

  instagram: 'https://www.instagram.com/guzar_garden_restauracja/',
  instagramHandle: '@guzar_garden_restauracja',
  facebook: 'https://www.facebook.com/p/Guzar-Garden-Restauracja-Uzbecka-Grill-61579770369680/',
  tripadvisor:
    'https://www.tripadvisor.com/Restaurant_Review-g274856-d34611526-Reviews-Guzar_Garden-Warsaw_Mazovia_Province_Central_Poland.html',
} as const;

export const TEL_HREF = `tel:${SITE.phoneE164}`;
