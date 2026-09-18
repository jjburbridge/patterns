import type {ReactNode} from 'react'
import {
  diagBar,
  halves,
  hBar,
  lineProps,
  vBar,
  type ShapeOpts,
  type ShapeRenderer,
} from './shapePrimitives'
import {KNIT_SHAPES} from './knitShapes'

/**
 * Shape renderers for every stitch symbol.
 *
 * Crochet symbols are defined in this file; knit symbols live in
 * `knitShapes.tsx` and are merged into the registry below. The drawing
 * primitives both sets share are in `shapePrimitives.tsx`.
 *
 * The set of keys in `SHAPES` is the definitive `SymbolType` union — every
 * renderable stitch on a chart must have a renderer here. `SymbolType` is
 * derived below via `keyof typeof SHAPES`, so adding a stitch means:
 *
 *   1. Write a `ShapeRenderer` in this file (crochet) or `knitShapes.tsx`.
 *   2. Register it in the corresponding shapes object.
 *   3. Create/patch a `stitchType` document in Sanity whose `chartSymbol`
 *      equals the new key. All metadata (name, group, aliases, yield, …)
 *      lives on the doc, not here.
 */

export type {ShapeOpts, ShapeRenderer} from './shapePrimitives'

// -----------------------------------------------------------------------------
// Basic vertical stitches

const chShape: ShapeRenderer = (o) => {
  const {halfW} = halves(o)
  return (
    <ellipse
      cx={0}
      cy={0}
      rx={halfW * 0.85}
      ry={2.4}
      fill="none"
      {...lineProps(o.color, o.strokeWidth)}
    />
  )
}

const slStShape: ShapeRenderer = (o) => <circle cx={0} cy={0} r={2.4} fill={o.color} />

const scShape: ShapeRenderer = (o) => {
  // The US "sc" chart symbol is a plus sign.
  const {half, halfW} = halves(o)
  const h = half * 0.7
  const w = halfW * 0.7
  return (
    <>
      {vBar(-h, h, o)}
      {hBar(0, w, o)}
    </>
  )
}

const hdcShape: ShapeRenderer = (o) => {
  // Vertical bar with a top cap only (no crossbar).
  const {half, halfW} = halves(o)
  return (
    <>
      {vBar(-half, half, o)}
      {hBar(-half, halfW, o)}
    </>
  )
}

/** Vertical stitch with N horizontal crossbars — dc=1, tr=2, dtr=3. */
function crossbarStitch(crossbars: number): ShapeRenderer {
  return (o) => {
    const {half, halfW} = halves(o)
    const nodes: ReactNode[] = [vBar(-half, half, o), hBar(-half, halfW, o)]
    // Distribute crossbars evenly across the shaft between top and bottom.
    const span = half * 1.5
    const start = -half + span / (crossbars + 1)
    const step = span / (crossbars + 1)
    for (let i = 0; i < crossbars; i++) {
      const y = start + i * step
      nodes.push(hBar(y, halfW, o, 0.85))
    }
    return <>{nodes}</>
  }
}

const dcShape = crossbarStitch(1)
const trShape = crossbarStitch(2)
const dtrShape = crossbarStitch(3)

// -----------------------------------------------------------------------------
// Post stitches — base stitch (usually dc/tr) plus a hooked foot at the base.

function postHook(direction: 'front' | 'back', o: ShapeOpts): ReactNode {
  const {half, halfW} = halves(o)
  const sign = direction === 'front' ? 1 : -1
  const y0 = half
  const cx = sign * halfW * 0.9
  const cy = half - halfW * 0.6
  // Quadratic curve from the base of the shaft, out and up to form a hook.
  const d = `M 0 ${y0} Q ${sign * halfW * 1.2} ${y0} ${cx} ${cy}`
  return <path d={d} fill="none" {...lineProps(o.color, o.strokeWidth)} />
}

function postStitch(direction: 'front' | 'back', crossbars: number): ShapeRenderer {
  const base = crossbarStitch(crossbars)
  return (o) => (
    <>
      {base(o)}
      {postHook(direction, o)}
    </>
  )
}

const fpdcShape = postStitch('front', 1)
const bpdcShape = postStitch('back', 1)
const fptrShape = postStitch('front', 2)
const bptrShape = postStitch('back', 2)

// -----------------------------------------------------------------------------
// Back loop only — base stitch plus a filled bar at the very bottom.

function bloStitch(base: ShapeRenderer): ShapeRenderer {
  return (o) => {
    const {half, halfW} = halves(o)
    return (
      <>
        {base(o)}
        <rect
          x={-halfW * 0.95}
          y={half - 1.5}
          width={halfW * 1.9}
          height={2.2}
          fill={o.color}
          stroke="none"
        />
      </>
    )
  }
}

const scBloShape = bloStitch(scShape)
const hdcBloShape = bloStitch(hdcShape)
const dcBloShape = bloStitch(dcShape)
const trBloShape = bloStitch(trShape)

// -----------------------------------------------------------------------------
// Decreases — multiple slanted bars converging at the top.

function decreaseStitch(count: number, crossbars: number): ShapeRenderer {
  return (o) => {
    const {half, halfW} = halves(o)
    const spread = halfW * 1.2
    const nodes: ReactNode[] = []
    for (let i = 0; i < count; i++) {
      const xBottom = count === 1 ? 0 : -spread + (2 * spread * i) / (count - 1)
      nodes.push(diagBar(0, -half, xBottom, half, o))
    }
    nodes.push(hBar(-half, halfW, o))
    if (crossbars >= 1) {
      // One wide crossbar spanning the fan indicates dc/tr-level height.
      nodes.push(hBar(0, spread, o, 1))
    }
    return <>{nodes}</>
  }
}

const sc2togShape = decreaseStitch(2, 0)
const sc3togShape = decreaseStitch(3, 0)
const dc2togShape = decreaseStitch(2, 1)
const dc3togShape = decreaseStitch(3, 1)

// -----------------------------------------------------------------------------
// Increases — multiple bars fanning outward from a shared bottom point.

function increaseStitch(count: number, crossbars: number): ShapeRenderer {
  return (o) => {
    const {half, halfW} = halves(o)
    const spread = halfW * 1.4
    const nodes: ReactNode[] = []
    for (let i = 0; i < count; i++) {
      const xTop = count === 1 ? 0 : -spread + (2 * spread * i) / (count - 1)
      nodes.push(diagBar(0, half, xTop, -half, o))
      // per-stitch top cap
      const capW = halfW * 0.35
      nodes.push(
        <line
          key={`cap-${i}`}
          x1={xTop - capW}
          y1={-half}
          x2={xTop + capW}
          y2={-half}
          {...lineProps(o.color, o.strokeWidth)}
        />,
      )
      if (crossbars >= 1) {
        // Draw a short crossbar at the midpoint of each slanted shaft.
        const midX = xTop / 2
        const midY = 0
        const bar = halfW * 0.28
        nodes.push(
          <line
            key={`cb-${i}`}
            x1={midX - bar}
            y1={midY}
            x2={midX + bar}
            y2={midY}
            {...lineProps(o.color, o.strokeWidth)}
          />,
        )
      }
    }
    return <>{nodes}</>
  }
}

const sc2IncShape = increaseStitch(2, 0)
const dc2IncShape = increaseStitch(2, 1)
const dc3IncShape = increaseStitch(3, 1)
const dc4IncShape = increaseStitch(4, 1)

// -----------------------------------------------------------------------------
// Clusters — multiple stitches joined at BOTH top and bottom (bowtie).

function clusterStitch(count: number, crossbars: number): ShapeRenderer {
  return (o) => {
    const {half, halfW} = halves(o)
    const spread = halfW * 1.1
    const nodes: ReactNode[] = []
    for (let i = 0; i < count; i++) {
      const midX = count === 1 ? 0 : -spread + (2 * spread * i) / (count - 1)
      const d = `M 0 ${-half} L ${midX} 0 L 0 ${half}`
      nodes.push(<path key={i} d={d} fill="none" {...lineProps(o.color, o.strokeWidth)} />)
    }
    nodes.push(hBar(-half, halfW, o))
    // Bottom "cluster point" marker
    nodes.push(<circle key="pt" cx={0} cy={half} r={1.6} fill={o.color} />)
    if (crossbars >= 1) {
      nodes.push(hBar(0, spread, o, 1))
    }
    return <>{nodes}</>
  }
}

const dc3ClusterShape = clusterStitch(3, 1)
const dc5ClusterShape = clusterStitch(5, 1)

const hdc3PuffShape: ShapeRenderer = (o) => {
  // A rounded top with three bars from a shared bottom point.
  const {half, halfW} = halves(o)
  const spread = halfW * 0.9
  return (
    <>
      <ellipse
        cx={0}
        cy={-half * 0.55}
        rx={spread}
        ry={spread * 0.7}
        fill="none"
        {...lineProps(o.color, o.strokeWidth)}
      />
      <circle cx={0} cy={half} r={1.6} fill={o.color} />
      {[-1, 0, 1].map((factor, i) => {
        const xTop = spread * 0.55 * factor
        const yTop = -half * 0.55 + spread * 0.7
        return (
          <line
            key={i}
            x1={0}
            y1={half}
            x2={xTop}
            y2={yTop}
            {...lineProps(o.color, o.strokeWidth)}
          />
        )
      })}
    </>
  )
}

// -----------------------------------------------------------------------------
// Popcorns — a filled ball on top of a short base stitch.

function popcornStitch(crossbars: number): ShapeRenderer {
  return (o) => {
    const {half, halfW} = halves(o)
    const ballR = halfW * 0.9
    return (
      <>
        {vBar(0, half, o)}
        {crossbars >= 1 && hBar(half * 0.5, halfW, o, 0.8)}
        <circle
          cx={0}
          cy={-half * 0.25}
          r={ballR}
          fill={o.color}
          {...lineProps(o.color, o.strokeWidth)}
        />
      </>
    )
  }
}

const dc5PopcornShape = popcornStitch(1)
const hdc5PopcornShape = popcornStitch(0)

// -----------------------------------------------------------------------------
// Specials

const picotShape: ShapeRenderer = (o) => {
  const s = Math.min(o.length * 0.4, 12)
  return (
    <path
      d={`M 0 ${-s} L ${-s * 0.7} 0 L ${s * 0.7} 0 Z`}
      fill="none"
      {...lineProps(o.color, o.strokeWidth)}
    />
  )
}

const vStitchShape: ShapeRenderer = (o) => {
  const {half, halfW} = halves(o)
  const spread = halfW * 1.2
  return (
    <>
      {diagBar(0, half, -spread, -half, o)}
      {diagBar(0, half, spread, -half, o)}
      {/* per-arm top cap */}
      <line
        x1={-spread - halfW * 0.4}
        y1={-half}
        x2={-spread + halfW * 0.4}
        y2={-half}
        {...lineProps(o.color, o.strokeWidth)}
      />
      <line
        x1={spread - halfW * 0.4}
        y1={-half}
        x2={spread + halfW * 0.4}
        y2={-half}
        {...lineProps(o.color, o.strokeWidth)}
      />
      {/* central chain oval */}
      <ellipse
        cx={0}
        cy={-half + 3}
        rx={3}
        ry={1.8}
        fill="none"
        {...lineProps(o.color, o.strokeWidth)}
      />
      {/* dc crossbars on each arm */}
      {[-1, 1].map((sign) => (
        <line
          key={sign}
          x1={(sign * spread) / 2 - halfW * 0.25}
          y1={0}
          x2={(sign * spread) / 2 + halfW * 0.25}
          y2={0}
          {...lineProps(o.color, o.strokeWidth)}
        />
      ))}
    </>
  )
}

const shellShape: ShapeRenderer = (o) => {
  const {half, halfW} = halves(o)
  const spread = halfW * 1.6
  const arms = [-1, -0.4, 0.4, 1]
  return (
    <>
      {arms.map((factor, i) => (
        <line
          key={i}
          x1={0}
          y1={half}
          x2={factor * spread}
          y2={-half}
          {...lineProps(o.color, o.strokeWidth)}
        />
      ))}
      {/* per-arm cap */}
      {arms.map((factor, i) => (
        <line
          key={`cap-${i}`}
          x1={factor * spread - halfW * 0.25}
          y1={-half}
          x2={factor * spread + halfW * 0.25}
          y2={-half}
          {...lineProps(o.color, o.strokeWidth)}
        />
      ))}
    </>
  )
}

const crabShape: ShapeRenderer = (o) => {
  const {half, halfW} = halves(o)
  const h = half * 0.7
  const w = halfW * 0.7
  return (
    <>
      {vBar(-h, h, o)}
      {hBar(0, w, o)}
      {/* Small curl at the top-right indicating reverse direction. */}
      <path
        d={`M ${w} ${-h * 0.2} Q ${w + 3} ${-h * 0.6} ${w - 1} ${-h}`}
        fill="none"
        {...lineProps(o.color, o.strokeWidth)}
      />
    </>
  )
}

const magicRingShape: ShapeRenderer = (o) => {
  const r = o.length * 0.4
  return (
    <>
      <circle cx={0} cy={0} r={r} fill="none" {...lineProps(o.color, o.strokeWidth)} />
      {/* Tail indicating the adjustable end */}
      <line
        x1={0}
        y1={r}
        x2={0}
        y2={r + 5}
        {...lineProps(o.color, o.strokeWidth)}
      />
    </>
  )
}

const noStitchShape: ShapeRenderer = (o) => {
  const s = o.length * 0.35
  return (
    <path
      d={`M 0 ${-s} L ${s} 0 L 0 ${s} L ${-s} 0 Z`}
      fill="#e0e0e0"
      stroke={o.color}
      strokeWidth={o.strokeWidth * 0.6}
    />
  )
}

const unknownShape: ShapeRenderer = (o) => {
  const {half} = halves(o)
  return vBar(-half, half, o)
}

// -----------------------------------------------------------------------------
// Registry

const CROCHET_SHAPES = {
  ch: chShape,
  'sl st': slStShape,
  sc: scShape,
  hdc: hdcShape,
  dc: dcShape,
  tr: trShape,
  dtr: dtrShape,
  fpdc: fpdcShape,
  bpdc: bpdcShape,
  fptr: fptrShape,
  bptr: bptrShape,
  'sc-blo': scBloShape,
  'hdc-blo': hdcBloShape,
  'dc-blo': dcBloShape,
  'tr-blo': trBloShape,
  sc2tog: sc2togShape,
  sc3tog: sc3togShape,
  dc2tog: dc2togShape,
  dc3tog: dc3togShape,
  '2sc-inc': sc2IncShape,
  '2dc-inc': dc2IncShape,
  '3dc-inc': dc3IncShape,
  '4dc-inc': dc4IncShape,
  '3dc-cluster': dc3ClusterShape,
  '5dc-cluster': dc5ClusterShape,
  '3hdc-puff': hdc3PuffShape,
  '5dc-popcorn': dc5PopcornShape,
  '5hdc-popcorn': hdc5PopcornShape,
  picot: picotShape,
  'v-stitch': vStitchShape,
  shell: shellShape,
  crab: crabShape,
  'magic-ring': magicRingShape,
  'no-stitch': noStitchShape,
  unknown: unknownShape,
  blank: null,
} satisfies Record<string, ShapeRenderer | null>

export const SHAPES = {
  ...CROCHET_SHAPES,
  ...KNIT_SHAPES,
} satisfies Record<string, ShapeRenderer | null>

/** Every renderable stitch symbol key. Derived from the SHAPES registry above. */
export type SymbolType = keyof typeof SHAPES

/** True if `key` is a known symbol we have a renderer for. */
export function isRenderableSymbol(key: string): key is SymbolType {
  return Object.prototype.hasOwnProperty.call(SHAPES, key)
}

/**
 * True for symbols that deliberately draw nothing — knit-on-RS, whose
 * standard notation is an empty cell, and the plain colour-only `blank`.
 * A grid delimits these with its cell outlines; anywhere else needs to
 * supply its own placeholder or they vanish.
 */
export function isBlankSymbol(type: SymbolType): boolean {
  return SHAPES[type] === null
}

export function renderShape(type: SymbolType, opts: ShapeOpts): ReactNode {
  const shape = SHAPES[type]
  return shape ? shape(opts) : null
}
