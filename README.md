# Guzar Garden — website concept

Landing page concept by [Atlasophy](https://atlasophy.co) for **Guzar Garden**, an Uzbek restaurant
and halal grill at al. Zieleniecka 6/8, Warsaw (Praga-Południe, by Park Skaryszewski).

This is a **pitch/spec concept**, not a commissioned or published site.

## Open it

Clone the repo and open `index.html` in any browser — no build step, no dependencies.

```bash
git clone https://github.com/Atlasophy/guzar-garden-site.git
```

It needs an internet connection for two things only: the Cormorant Garamond / Inter
webfonts and the Google Maps embed.

## What's in it

| File | |
|---|---|
| `index.html` | Landing page — markup, CSS and JS in one file |
| `menu.html` | The menu — browse by category, search, dish detail. Data lives in the `SECTIONS` array in the page |
| `art.js` | Generates the dish artwork. Shared by both pages |

## The logo

The restaurant's own rosette mark was traced from their artwork into vector, and split into
the three inks the printed mark actually uses:

| `<path>` | covers | colour |
|---|---|---|
| `#gg-sil` | full silhouette — spirals, clouds, centre disc | `--logo-red` |
| `#gg-dark` | outer wedges and the small teardrops | `--logo-navy` |
| `#gg-light` | the eight inner star petals and the top/bottom chevrons | `--logo-teal` |

Painted in that order (`#gg-logo` does exactly this) they rebuild the full-colour mark.
Used on its own, `#gg-sil` is the single-colour watermark that the whole background system
is built from — the drifting rosettes behind the page, the section watermarks, and the small
rosette bullets in the marquee and on the pillar cards (via a CSS `mask`).

Because it is real geometry rather than an approximation, it stays crisp at any size, and
recolouring is a matter of changing the three custom properties in `:root`.

**If the colour assignment is wrong**, it is a three-line fix: `--logo-red`, `--logo-navy`
and `--logo-teal` at the top of each page. The shapes are correct regardless.

## Palette

The Uzbek suzani triad — red, teal and gold on cream — with teal used across the page and not
only inside the logo, so the scheme actually reads as the triad rather than as red-and-gold.

The ground is three tonal steps (`--cream`, `--cream-2`, `--cream-3`) rather than one flat tint,
so sections can alternate and cards lift off the page. Shadows are warm-tinted; a neutral grey
shadow over cream reads as dirt.

Every text pairing clears WCAG AA: ink 15.2:1, ink-soft 7.2:1, clay 5.6:1 and teal 5.4:1 on
cream, saffron 5.2:1 on the dark green band.

## Dish artwork

Every dish gets generated artwork rather than a stock photograph. Each category maps to a
composition — a bowl, a skewer, a piala of tea, the tandoor loaf stamped with the house
rosette — and the dish name is hashed into a seed, so a dish always draws the same picture
but no two dishes look alike. It is folk illustration on purpose, not a grey placeholder box.

**Swapping in real photography** is per-dish and needs no code change. Add `img` to any item
in `SECTIONS`:

```js
{n:'Plow', p:'39 zł', img:'photos/plow.jpg', d:{pl:'…', en:'…', ru:'…'}}
```

The card renders the photograph and ignores the artwork. Dishes without `img` keep drawing.
So a shoot can land one plate at a time.

## Menu structure

The old menu was one long scroll through 127 items. It is now two stages:

1. **Home** — five signature plates, then the 14 category cards with item count and lowest price.
2. **Category** — one category at a time, with previous/next at the foot.

Plus a search that matches across names, descriptions and category names in all three
languages at once (diacritic-insensitive, so `salat` finds `Sałaty`), and a detail sheet on
any dish. The category is mirrored into the URL hash, so `menu.html#grill` deep-links and the
browser back button works.

## Features

- **Three languages** — PL / EN / RU, switched client-side, choice persisted in `localStorage`
  and shared between the two pages. The Maps embed reloads with a matching `hl=`.
- **Live open/closed badge**, computed against the 9:00–24:00 schedule.
- Scroll-linked parallax on the background rosettes, masked word reveals on headings,
  animated stat counters, magnetic buttons, and a logo bloom on first load.
- Full `prefers-reduced-motion` support — every animation and transition is disabled.
- Reveal animations are guarded behind an `html.js` class and backed by a fallback, so the
  page can never end up blank if scripting or the observer fails.

## Data caveats

Figures on the page were gathered from public listings in August 2026 and should be confirmed
with the restaurant before anything ships:

- **Rating / review count** (4.7★, 2900+) — scraped from Google/Restaurant Guru; varies by source and date.
- **Hours** — 9:00–24:00 per Google and Restaurant Guru; Corner lists 08:00.
- **Phone** — 570 088 888 per Google; Restaurant Guru also lists 734 055 009.
- **Menu prices** — transcribed from the flipbook card at `heyzine.com/flip-book/8c9dec8ec8`, read page by page in August 2026. The card is image-only (no text layer), so the Polish was transcribed by eye — worth a proof-read against the printed menu before it ships. English and Russian are our translations.

## Still to do

- Real photography (drop it in per dish via `img`, see above).
- Confirm the logo's three ink colours against the restaurant's own artwork.
- Decide whether the rating stats stay hardcoded, get pulled live, or get dropped.
