# Guzar Garden — website concept

Landing page concept by [Atlasophy](https://atlasophy.co) for **Guzar Garden**, an Uzbek restaurant
and halal grill at al. Zieleniecka 6/8, Warsaw (Praga-Południe, by Park Skaryszewski).

This is a **pitch/spec concept**, not a commissioned or published site.

## Open it

Clone the repo and open `index.html` in any browser — no build step, no dependencies.

```bash
git clone https://github.com/Atlasophy/guzar-garden-site.git
```

Everything is in one self-contained file. It needs an internet connection for two things only:
the Cormorant Garamond / Inter webfonts and the Google Maps embed.

## What's in it

| File | |
|---|---|
| `index.html` | The whole page — markup, CSS and JS in one file |
| `menu-data.json` | The restaurant's full menu (57 items with prices), extracted from their flipbook menu. Not used by the page; kept for a future dedicated menu page |

## Features

- **Three languages** — PL / EN / RU, switched client-side, choice persisted in `localStorage`.
  The Google Maps embed reloads with a matching `hl=` so map labels follow the language.
- **Live open/closed badge** in the hero, computed against the 9:00–24:00 schedule.
- **Weekly opening hours** with today's row highlighted.
- **Editorial section on Uzbek cooking** — kazan, tandoor, charcoal, dastarkhan. No prices, by design.
- **Menu links out** to the restaurant's existing Heyzine flipbook rather than duplicating it on-page.
- **Google Maps embed** with a warm colour treatment that snaps to full colour on hover.
- Suzani-inspired SVG pattern, scroll reveals, mobile nav, `prefers-reduced-motion` support.

## Data caveats

Figures on the page were gathered from public listings in August 2026 and should be confirmed
with the restaurant before anything ships:

- **Rating / review count** (4.7★, 2900+) — scraped from Google/Restaurant Guru; varies by source and date.
- **Hours** — 9:00–24:00 per Google and Restaurant Guru; Corner lists 08:00.
- **Phone** — 570 088 888 per Google; Restaurant Guru also lists 734 055 009.
- **Menu prices** — from the flipbook menu, accurate as of extraction. Re-extract if the card changes.

## Still to do

- Real photography (the design has slots for a hero image and a gallery band).
- Decide whether the rating stats stay hardcoded, get pulled live, or get dropped.
