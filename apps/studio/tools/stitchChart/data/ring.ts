import type {PatternRound, RingSpec, SymbolType} from '../types'

/**
 * Freehand ring charts.
 *
 * A ring chart normally gets its rounds from a pattern section. Without one
 * there is nothing to derive, so the user describes the ring instead — how
 * many rounds, how many stitches to start with, and whether it grows — and
 * this module turns that description into the same `PatternRound[]` the
 * renderer already knows how to draw. Individual stitches are then changed by
 * painting them, which is stored as ring overrides exactly as for a pattern.
 */

export const MIN_ROUNDS = 1
export const MAX_ROUNDS = 24
export const MIN_START_STS = 3
export const MAX_START_STS = 48

/**
 * Every stitch is its own SVG group, and a growing circle adds `startSts`
 * more of them each round, so a wide start compounds fast. Capping the total
 * rather than each field lets a tube be as wide as a hat body while stopping
 * a circle from running away.
 */
export const MAX_TOTAL_STITCHES = 1200

export const RING_SHAPE_LABELS: Record<RingSpec['shape'], string> = {
  circle: 'Flat circle — increases each round',
  tube: 'Tube — same count every round',
}

/** Six single crochet in a magic ring, doubling outward: the standard start. */
export const DEFAULT_RING_SPEC: RingSpec = {rounds: 6, startSts: 6, shape: 'circle'}

export function normaliseRingSpec(spec: RingSpec): RingSpec {
  const shape = spec.shape === 'tube' ? 'tube' : 'circle'
  const startSts = clamp(spec.startSts, MIN_START_STS, MAX_START_STS, DEFAULT_RING_SPEC.startSts)
  let rounds = clamp(spec.rounds, MIN_ROUNDS, MAX_ROUNDS, DEFAULT_RING_SPEC.rounds)
  // Trim rounds rather than the stitch count, since the count is the thing
  // the user is usually being precise about.
  while (rounds > MIN_ROUNDS && totalStitches({rounds, startSts, shape}) > MAX_TOTAL_STITCHES) {
    rounds--
  }
  return {rounds, startSts, shape}
}

/** Stitches on round `index` (0-based). */
export function stitchesOnRound(spec: RingSpec, index: number): number {
  return spec.shape === 'circle' ? spec.startSts * (index + 1) : spec.startSts
}

export function totalStitches(spec: RingSpec): number {
  let total = 0
  for (let i = 0; i < spec.rounds; i++) total += stitchesOnRound(spec, i)
  return total
}

/**
 * Build the rounds for a freehand ring. Every position starts as
 * `baseStitch`, so the chart reads as a plain circle worked in one stitch
 * until the user paints something else over it.
 */
export function makeFreehandRounds(spec: RingSpec, baseStitch: SymbolType): PatternRound[] {
  const rounds: PatternRound[] = []
  for (let i = 0; i < spec.rounds; i++) {
    const totalSts = stitchesOnRound(spec, i)
    rounds.push({
      key: `freehand-rnd-${i + 1}`,
      index: i + 1,
      label: `Round ${i + 1}`,
      totalSts,
      positions: Array.from({length: totalSts}, () => baseStitch),
      primaryAbbr: baseStitch,
      primarySymbol: baseStitch,
      chStart: 0,
      slStEnd: 0,
    })
  }
  return rounds
}

function clamp(raw: number, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(raw))
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, n))
}
