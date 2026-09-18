import type {Grid, GridCell, Preset} from '../types'
import {DEFAULT_INK, MAX_DIM, MIN_DIM} from '../constants'

export const BLANK: GridCell = {color: null, stitch: null}

export function blankCell(): GridCell {
  return {color: null, stitch: null}
}

export function isBlank(cell: GridCell): boolean {
  return cell.color === null && cell.stitch === null
}

/** True if anything at all has been painted into the grid. */
export function gridHasContent(g: Grid): boolean {
  return g.some((row) => row.some((cell) => !isBlank(cell)))
}

export function makeBlank(w: number, h: number): Grid {
  return Array.from({length: h}, () => Array.from({length: w}, blankCell))
}

export function cloneGrid(g: Grid): Grid {
  return g.map((row) => row.map((cell) => ({...cell})))
}

export function resizeGrid(prev: Grid, w: number, h: number): Grid {
  return Array.from({length: h}, (_, r) =>
    Array.from({length: w}, (_, c) => {
      const cell = prev[r]?.[c]
      return cell ? {...cell} : blankCell()
    }),
  )
}

export function setGridCell(g: Grid, r: number, c: number, next: GridCell): Grid {
  if (r < 0 || r >= g.length) return g
  const row = g[r]
  if (!row || c < 0 || c >= row.length) return g
  const nextGrid = cloneGrid(g)
  nextGrid[r][c] = {...next}
  return nextGrid
}

export function clampDim(raw: string | number, fallback: number): number {
  const n = Math.round(Number(raw))
  if (!Number.isFinite(n)) return fallback
  return Math.max(MIN_DIM, Math.min(MAX_DIM, n))
}

export function pickCellSize(width: number): number {
  return Math.max(10, Math.min(36, Math.floor(640 / Math.max(width, 1))))
}

export function pickLabelStride(dim: number): number {
  if (dim <= 12) return 1
  if (dim <= 25) return 2
  if (dim <= 50) return 5
  return 10
}

// -----------------------------------------------------------------------------
// Preset shapes
//
// The shapes are described as 0/1 templates for readability. `shapeToGrid`
// paints filled positions with the default ink color, producing a Grid.

type Shape = (0 | 1)[][]

function shapeToGrid(shape: Shape, color: string): Grid {
  return shape.map((row) =>
    row.map<GridCell>((v) => (v === 1 ? {color, stitch: null} : blankCell())),
  )
}

const LETTER_A_SHAPE: Shape = [
  [0, 0, 0, 1, 1, 1, 0, 0, 0],
  [0, 0, 1, 1, 0, 1, 1, 0, 0],
  [0, 1, 1, 0, 0, 0, 1, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 1, 0, 0, 0, 1, 1, 0],
  [1, 1, 0, 0, 0, 0, 0, 1, 1],
]

const HEART_SHAPE: Shape = [
  [0, 1, 1, 0, 0, 0, 1, 1, 0],
  [1, 1, 1, 1, 0, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 0],
]

export const LETTER_A_9x6: Grid = shapeToGrid(LETTER_A_SHAPE, DEFAULT_INK)
export const HEART_9x8: Grid = shapeToGrid(HEART_SHAPE, DEFAULT_INK)

export const PRESETS: Preset[] = [
  {id: 'blank-9x6', label: 'Blank · 9 × 6', width: 9, height: 6, cells: makeBlank(9, 6)},
  {id: 'blank-12x12', label: 'Blank · 12 × 12', width: 12, height: 12, cells: makeBlank(12, 12)},
  {id: 'letter-a', label: 'Letter A · 9 × 6', width: 9, height: 6, cells: LETTER_A_9x6},
  {id: 'heart', label: 'Heart · 9 × 8', width: 9, height: 8, cells: HEART_9x8},
]
