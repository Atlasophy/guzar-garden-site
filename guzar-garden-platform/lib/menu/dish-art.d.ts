/**
 * Typed boundary for the migrated generated-artwork module (`dish-art.js`).
 *
 * The implementation is the original `art.js`, carried over unchanged; this
 * file is the only part of it the rest of the application sees.
 */

/** The composition a dish is drawn as. */
export type DishArtKind =
  | 'bowl'
  | 'soup'
  | 'plate'
  | 'pastry'
  | 'skewer'
  | 'dumpling'
  | 'platter'
  | 'bread'
  | 'sauce'
  | 'sweet'
  | 'glass'
  | 'cup';

export interface DishArtOptions {
  /** Force a composition instead of deriving one from the category and name. */
  kind?: DishArtKind;
}

/**
 * A complete `<svg>` element as a string, 200×200, deterministic in
 * `(sectionId, name)`.
 *
 * The markup is generated here and contains no caller-supplied HTML: the dish
 * name only ever reaches it through the module's own escaping, into an
 * `aria-label`. That is what makes it safe to render with
 * `dangerouslySetInnerHTML`, which is the only way to get an SVG string into
 * the DOM without re-parsing it into React elements on every card.
 */
export function dishArt(sectionId: string, name: string, opts?: DishArtOptions): string;

/** Which composition a dish would be drawn as. */
export function kindFor(sectionId: string, name: string): DishArtKind;

/** The house palette the artwork is drawn in. */
export const palette: Record<string, string>;

export const GGArt: {
  dishArt: typeof dishArt;
  kindFor: typeof kindFor;
  palette: typeof palette;
};

export default GGArt;
