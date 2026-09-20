import type { TableStateName } from '@/lib/database/types';

/**
 * How a table looks, per state.
 *
 * Colour is never the only signal. Each state also differs in height, in
 * emissive lift and — in the legend and the list beside the canvas — in shape
 * and in words. Someone who cannot separate the emerald from the brass can
 * still tell a free table from a taken one, and someone using a screen reader
 * never touches the canvas at all.
 */

export interface TableAppearance {
  /** Table top. */
  top: string;
  /** Base and legs. */
  base: string;
  /** Emissive lift — how much the table glows out of the floor. */
  glow: number;
  /** Metres above the floor, so state reads in silhouette as well as in colour. */
  lift: number;
  opacity: number;
  selectable: boolean;
}

export const FLOOR_APPEARANCE: Record<TableStateName, TableAppearance> = {
  available: { top: '#6fd3a1', base: '#2c7a54', glow: 0.34, lift: 0, opacity: 1, selectable: true },
  held_by_you: {
    top: '#f6e3b4',
    base: '#c69745',
    glow: 0.75,
    lift: 0.06,
    opacity: 1,
    selectable: true,
  },
  held: { top: '#b98873', base: '#6d4638', glow: 0.16, lift: 0, opacity: 0.85, selectable: false },
  reserved: { top: '#8b5f4d', base: '#54342a', glow: 0.1, lift: 0, opacity: 0.85, selectable: false },
  blocked: { top: '#6b6255', base: '#3c372f', glow: 0.05, lift: 0, opacity: 0.8, selectable: false },
  too_small: {
    top: '#3d5a4c',
    base: '#26382f',
    glow: 0.02,
    lift: -0.02,
    opacity: 0.55,
    selectable: false,
  },
  too_large: {
    top: '#3d5a4c',
    base: '#26382f',
    glow: 0.02,
    lift: -0.02,
    opacity: 0.55,
    selectable: false,
  },
  area_closed: {
    top: '#33413a',
    base: '#222c27',
    glow: 0,
    lift: -0.04,
    opacity: 0.4,
    selectable: false,
  },
  inactive: {
    top: '#2b3630',
    base: '#1d2621',
    glow: 0,
    lift: -0.06,
    opacity: 0.3,
    selectable: false,
  },
};

/** The gold the selected table is struck in — the same brass as the wordmark. */
export const SELECTED = {
  top: '#f6e3b4',
  base: '#9c7130',
  glow: 1.1,
  lift: 0.12,
};

export const FLOOR = {
  ground: '#08221733',
  areaEdge: '#dcb06955',
  areaLabel: '#f2ead8',
  chair: '#2a4436',
  chairSelected: '#c69745',
};
