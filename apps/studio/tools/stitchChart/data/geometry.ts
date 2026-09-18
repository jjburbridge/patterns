import type {PatternRound} from '../types'

export type RingGeometry = {
  size: number
  cx: number
  cy: number
  magicRadius: number
  spacing: number
  symbolLen: number
}

export function computeRingGeometry(rounds: PatternRound[]): RingGeometry {
  const magicRadius = 18
  const spacing = 34
  const symbolLen = 20
  const outer = magicRadius + Math.max(1, rounds.length) * spacing + symbolLen
  const padding = 24
  const size = Math.round(outer * 2 + padding * 2)
  const cx = size / 2
  const cy = size / 2
  return {size, cx, cy, magicRadius, spacing, symbolLen}
}

/**
 * How large a symbol can be on one round before neighbours start to collide.
 *
 * Rings hold more stitches the further out they go, but not always in
 * proportion to their circumference — a round that increases sharply, or an
 * inner round of a tube, can be crowded enough that full-size symbols overlap
 * into unreadable ink. Sizing each round to its own arc spacing keeps every
 * stitch distinct without shrinking the roomy rounds.
 */
export function symbolLenForRound(
  geom: RingGeometry,
  ringIndex: number,
  totalSts: number,
): number {
  if (totalSts <= 0) return geom.symbolLen
  const centerR = geom.magicRadius + (ringIndex + 1) * geom.spacing - geom.symbolLen / 2
  const arc = (2 * Math.PI * centerR) / totalSts
  // Leave a little air between neighbours, and never shrink past legibility.
  return Math.max(6, Math.min(geom.symbolLen, arc * 0.92))
}
