import fs from 'node:fs';

let src = fs.readFileSync('legacy/art.js', 'utf8');

const startMarker = '(function (global) {';
const start = src.indexOf(startMarker);
if (start === -1) throw new Error('IIFE opening not found');
const header = src.slice(0, start);
let body = src.slice(start + startMarker.length);

const tailMarker = '  global.GGArt = {';
const tail = body.indexOf(tailMarker);
if (tail === -1) throw new Error('export block not found');
body = body.slice(0, tail);

// Drop the "use strict" line (ES modules are strict already) and dedent by two.
body = body.replace(/^\s*\n\s*'use strict';\n/, '\n');
body = body
  .split('\n')
  .map((line) => (line.startsWith('  ') ? line.slice(2) : line))
  .join('\n');

// The original exposed `dishArt` from inside the IIFE; the trailing copy in the
// module body is replaced by the exported one below.
const dishArtStart = body.indexOf('function dishArt(sectionId, name, opts) {');
if (dishArtStart === -1) throw new Error('dishArt not found');
const beforeDishArt = body.slice(0, dishArtStart);

const prelude = `${header.trimEnd()}

/*
 * MIGRATED VERBATIM from the original \`art.js\`, which the static site loaded
 * with a <script> tag and which hung \`GGArt\` off \`window\`. The drawing code
 * below is unchanged — same hash, same seeded RNG, same compositions — so a
 * dish that had a particular picture on the old site still has that picture.
 * Only the module wrapper changed: an IIFE over \`window\` became ES module
 * exports, so the same code runs on the server for the initial render and in
 * the browser for anything drawn after it.
 *
 * Deliberately plain JavaScript with a typed boundary in \`dish-art.d.ts\`:
 * annotating five hundred lines of vector maths would touch every line of a
 * file whose whole value is that it is the artwork that already shipped.
 */
`;

const exportBlock = `
/* ------------------------------------------------------------------------
   Public API
   ---------------------------------------------------------------------- */

/**
 * Deterministic SVG artwork for one dish.
 *
 * The same category and name always produce the same picture, so a card does
 * not change between the server render and a client re-render, and no two
 * dishes look alike.
 */
export function dishArt(sectionId, name, opts) {
  opts = opts || {};
  var seed = hash(sectionId + '|' + name);
  var rand = rng(seed);
  var kind = opts.kind || kindFor(sectionId, name);
  var ground = GROUNDS[seed % GROUNDS.length];
  var draw = KINDS[kind] || KINDS.plate;

  var inner = '<rect width="200" height="200" fill="' + ground + '"/>';
  // faint rosette behind the plate, rotated per dish
  inner += '<g opacity=".07" transform="translate(100 100) rotate(' + (seed % 90) +
           ') scale(.19) translate(-500 -500)">' +
           '<use href="#gg-sil" fill="' + P.ink + '"/></g>';
  inner += draw(rand);

  return '<svg viewBox="0 0 200 200" role="img" aria-label="' + esc(name) +
         '" preserveAspectRatio="xMidYMid slice">' + inner + '</svg>';
}

export { kindFor };

/** The house palette, so components can tint a placeholder to match. */
export const palette = P;

/** The whole API in one object, matching the old \`window.GGArt\`. */
export const GGArt = { dishArt: dishArt, kindFor: kindFor, palette: P };
export default GGArt;
`;

fs.mkdirSync('lib/menu', { recursive: true });
fs.writeFileSync(
  'lib/menu/dish-art.js',
  `${prelude}${beforeDishArt.replace(/\n{3,}$/, '\n')}${exportBlock}`,
  'utf8',
);
console.log('written', fs.statSync('lib/menu/dish-art.js').size, 'bytes');
