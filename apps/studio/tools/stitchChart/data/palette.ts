/**
 * Colour palette for the chart tool.
 *
 * Stitch metadata (which stitches appear in the palette, their groupings,
 * labels, and abbreviation aliases) lives in Sanity and is exposed through
 * `StitchCatalog` — see `./stitchCatalog.ts`. This file only owns the fixed
 * colour swatches and their friendly names.
 */

/** Available paint colors. Ordering drives the chip row. */
export const PALETTE_COLORS: string[] = [
  '#111111',
  '#ffffff',
  '#e74c3c',
  '#f39c12',
  '#f1c40f',
  '#2ecc71',
  '#3498db',
  '#9b59b6',
  '#ff6b9d',
]

export const COLOR_LABELS: Record<string, string> = {
  '#111111': 'Black',
  '#ffffff': 'White',
  '#e74c3c': 'Red',
  '#f39c12': 'Orange',
  '#f1c40f': 'Yellow',
  '#2ecc71': 'Green',
  '#3498db': 'Blue',
  '#9b59b6': 'Purple',
  '#ff6b9d': 'Pink',
}

export function colorLabel(color: string | null): string {
  if (color === null) return 'Blank'
  return COLOR_LABELS[color] ?? color
}
