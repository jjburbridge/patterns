import type {ReactNode} from 'react'
import {diagBar, hBar, lineProps, vBar, type ShapeOpts, type ShapeRenderer} from './shapePrimitives'

/**
 * Knit chart symbols following the Craft Yarn Council standard.
 * https://www.craftyarncouncil.com/standards/knit-chart-symbols
 *
 * Where the CYC publishes two accepted variants for a stitch we draw the
 * compact one, because chart cells are small and the compact forms stay
 * legible at palette-chip size. The main departure is the increase family:
 * CYC draws k1fb as a branched vertical, but that is near-identical to the
 * lifted increases at this scale, so k1fb uses the "1 becomes N" arrow form
 * that CYC also lists — giving one readable family across k1fb and
 * inc 1-to-3/4/5.
 *
 * Unlike crochet symbols, which radiate around a ring, knit symbols are
 * always read upright inside a square cell. `box()` is the half-extent of
 * that square.
 */

const GLYPH_FONT = 'ui-sans-serif, system-ui, -apple-system, sans-serif'

/** Half-extent of the square a knit glyph is drawn inside. */
function box(o: ShapeOpts): number {
  return Math.max(3, o.length * 0.36)
}

// -----------------------------------------------------------------------------
// Building blocks

/**
 * A letter drawn in the middle of the cell. CYC uses these for the make-one
 * family and for bobbles, where a pictorial symbol would be ambiguous.
 */
function textGlyph(label: string, o: ShapeOpts, opts?: {bold?: boolean}): ReactNode {
  const b = box(o)
  // Multi-letter glyphs have to shrink to stay inside the cell.
  const size = b * (label.length > 1 ? 1.05 : 1.6)
  return (
    <text
      x={0}
      y={0}
      fill={o.color}
      fontSize={size}
      fontFamily={GLYPH_FONT}
      fontWeight={opts?.bold ? 700 : 500}
      textAnchor="middle"
      dominantBaseline="central"
      style={{userSelect: 'none'}}
    >
      {label}
    </text>
  )
}

/** The small digit that annotates the multi-stitch increases and decreases. */
function digit(value: number, o: ShapeOpts, y: number): ReactNode {
  const b = box(o)
  return (
    <text
      x={0}
      y={y}
      fill={o.color}
      fontSize={b * 0.9}
      fontFamily={GLYPH_FONT}
      textAnchor="middle"
      dominantBaseline="central"
      style={{userSelect: 'none'}}
    >
      {value}
    </text>
  )
}

type Lean = 'left' | 'right'

/** The single diagonal used for two-stitch decreases: "/" right, "\" left. */
function slash(lean: Lean, o: ShapeOpts): ReactNode {
  const b = box(o)
  return lean === 'right' ? diagBar(-b, b, b, -b, o) : diagBar(-b, -b, b, b, o)
}

/**
 * A short bar crossing the slash at right angles, marking a decrease that
 * consumes three stitches rather than two.
 */
function tripleTick(lean: Lean, o: ShapeOpts): ReactNode {
  const t = box(o) * 0.34
  return lean === 'right' ? diagBar(-t, -t, t, t, o) : diagBar(-t, t, t, -t, o)
}

/**
 * The filled dot that marks a stitch as purled. It sits in whichever corner
 * the slash leaves free so the two never overlap.
 */
function purlDot(lean: Lean, o: ShapeOpts): ReactNode {
  const b = box(o)
  const x = lean === 'right' ? -b * 0.5 : b * 0.5
  return <circle cx={x} cy={-b * 0.5} r={Math.max(1.1, b * 0.17)} fill={o.color} />
}

/** Chevron pointing up — stitches converging into one. `apexX` slants it. */
function upChevron(o: ShapeOpts, apexX: number): ReactNode {
  const b = box(o)
  return (
    <>
      {diagBar(-b, b * 0.1, apexX, -b, o)}
      {diagBar(b, b * 0.1, apexX, -b, o)}
    </>
  )
}

/** Chevron pointing down — one stitch opening out into several. */
function downChevron(o: ShapeOpts): ReactNode {
  const b = box(o)
  return (
    <>
      {diagBar(-b, -b * 0.1, 0, b, o)}
      {diagBar(b, -b * 0.1, 0, b, o)}
    </>
  )
}

// -----------------------------------------------------------------------------
// Basic stitches

/**
 * Knit on RS / purl on WS is an empty cell in the CYC standard — the absence
 * of a symbol is the symbol. The grid still draws the cell outline, and the
 * palette chip labels it, so nothing is lost by rendering nothing.
 */
const knitShape = null

const purlShape: ShapeRenderer = (o) => {
  const b = box(o)
  return (
    <line
      x1={-b * 0.7}
      y1={0}
      x2={b * 0.7}
      y2={0}
      {...lineProps(o.color, o.strokeWidth * 1.5)}
    />
  )
}

const yoShape: ShapeRenderer = (o) => (
  <circle cx={0} cy={0} r={box(o) * 0.55} fill="none" {...lineProps(o.color, o.strokeWidth)} />
)

/** A twisted stitch: the loop of the stitch with its legs crossed beneath. */
const k1TblShape: ShapeRenderer = (o) => {
  const b = box(o)
  const r = b * 0.42
  const legTop = -b * 0.3 + r * 0.95
  return (
    <>
      <ellipse
        cx={0}
        cy={-b * 0.3}
        rx={r}
        ry={r * 1.15}
        fill="none"
        {...lineProps(o.color, o.strokeWidth)}
      />
      {diagBar(-r * 0.7, legTop, r * 0.8, b, o)}
      {diagBar(r * 0.7, legTop, -r * 0.8, b, o)}
    </>
  )
}

const p1TblShape: ShapeRenderer = (o) => (
  <>
    {k1TblShape(o)}
    <circle cx={-box(o) * 0.7} cy={-box(o) * 0.7} r={Math.max(1.1, box(o) * 0.17)} fill={o.color} />
  </>
)

/** K1 wrapping the yarn twice — an elongated stitch, drawn as a circled 2. */
const k1Wrap2Shape: ShapeRenderer = (o) => {
  const b = box(o)
  return (
    <>
      <circle
        cx={0}
        cy={0}
        r={b * 0.82}
        fill="none"
        {...lineProps(o.color, o.strokeWidth * 0.85)}
      />
      {digit(2, o, 0)}
    </>
  )
}

// -----------------------------------------------------------------------------
// Decreases

function twoIntoOne(lean: Lean, purl: boolean): ShapeRenderer {
  return (o) => (
    <>
      {slash(lean, o)}
      {purl && purlDot(lean, o)}
    </>
  )
}

function threeIntoOne(lean: Lean, purl: boolean): ShapeRenderer {
  return (o) => (
    <>
      {slash(lean, o)}
      {tripleTick(lean, o)}
      {purl && purlDot(lean, o)}
    </>
  )
}

const k2togShape = twoIntoOne('right', false)
const sskShape = twoIntoOne('left', false)
const p2togShape = twoIntoOne('right', true)
const sspShape = twoIntoOne('left', true)
const k3togShape = threeIntoOne('right', false)
const p3togShape = threeIntoOne('right', true)
const ssspShape = threeIntoOne('left', true)

/** Slip 1, k2tog, psso — a left-leaning double decrease with a stem. */
const sk2pShape: ShapeRenderer = (o) => {
  const b = box(o)
  return (
    <>
      {slash('right', o)}
      {vBar(0, b, o, 0)}
    </>
  )
}

/** Centred double decrease — the stitch that stays sits on top of the others. */
const s2kp2Shape: ShapeRenderer = (o) => {
  const b = box(o)
  return (
    <>
      {vBar(-b, b, o)}
      {diagBar(0, -b * 0.25, -b * 0.85, b, o)}
      {diagBar(0, -b * 0.25, b * 0.85, b, o)}
    </>
  )
}

/**
 * Four or five stitches worked together, with the count spelled out. The
 * apex is pushed well off centre for the slanting versions — at chart-cell
 * size a subtle lean is impossible to tell apart from a centred one.
 */
function manyIntoOne(count: number, lean: 'left' | 'center' | 'right'): ShapeRenderer {
  return (o) => {
    const b = box(o)
    const apexX = lean === 'left' ? -b * 0.65 : lean === 'right' ? b * 0.65 : 0
    return (
      <>
        {upChevron(o, apexX)}
        {digit(count, o, b * 0.55)}
      </>
    )
  }
}

// -----------------------------------------------------------------------------
// Increases

/** One stitch opening out into `count`, with the count spelled out. */
function oneIntoMany(count: number): ShapeRenderer {
  return (o) => (
    <>
      {downChevron(o)}
      {digit(count, o, -box(o) * 0.55)}
    </>
  )
}

/**
 * A lifted increase: a new stitch branching off the running stitch. The
 * running stitch sits opposite the branch so the two directions read as
 * mirror images rather than near-identical forks.
 */
function liftedInc(lean: Lean): ShapeRenderer {
  return (o) => {
    const b = box(o)
    const sign = lean === 'right' ? 1 : -1
    const stemX = -sign * b * 0.4
    return (
      <>
        {vBar(-b, b, o, stemX)}
        {diagBar(stemX, b * 0.1, sign * b * 0.75, -b, o)}
      </>
    )
  }
}

// -----------------------------------------------------------------------------
// Slipped stitches

const sl1WybShape: ShapeRenderer = (o) => {
  const b = box(o)
  return (
    <>
      {diagBar(-b * 0.75, -b * 0.7, 0, b * 0.7, o)}
      {diagBar(b * 0.75, -b * 0.7, 0, b * 0.7, o)}
    </>
  )
}

/** Same slip, but with the yarn held in front — shown by a bar across it. */
const sl1WyfShape: ShapeRenderer = (o) => (
  <>
    {sl1WybShape(o)}
    {hBar(-box(o) * 0.1, box(o) * 0.85, o)}
  </>
)

// -----------------------------------------------------------------------------
// Edges and gaps

const castOnShape: ShapeRenderer = (o) => {
  const b = box(o)
  const d = `M ${-b * 0.7} ${-b * 0.75} L ${-b * 0.7} ${b * 0.1} Q ${-b * 0.7} ${b * 0.8} 0 ${b * 0.8} Q ${b * 0.7} ${b * 0.8} ${b * 0.7} ${b * 0.1} L ${b * 0.7} ${-b * 0.75}`
  return <path d={d} fill="none" {...lineProps(o.color, o.strokeWidth)} />
}

const bindOffShape: ShapeRenderer = (o) => {
  const b = box(o)
  const d = `M ${-b * 0.85} ${b * 0.45} Q 0 ${-b * 0.95} ${b * 0.85} ${b * 0.45}`
  return <path d={d} fill="none" {...lineProps(o.color, o.strokeWidth)} />
}

/** The stitch left on the right needle once the bind-off row is finished. */
const stRemShape: ShapeRenderer = (o) => textGlyph('L', o, {bold: true})

/**
 * Shaded filler for chart areas where no stitch exists — used to keep a
 * shaped chart rectangular. Distinct from the crochet `no-stitch` diamond.
 */
const noStitchBoxShape: ShapeRenderer = (o) => {
  const b = box(o) * 1.2
  return <rect x={-b} y={-b} width={b * 2} height={b * 2} fill="#c8c8c8" stroke="none" />
}

// -----------------------------------------------------------------------------
// Registry

export const KNIT_SHAPES = {
  k: knitShape,
  p: purlShape,
  yo: yoShape,
  'k1-tbl': k1TblShape,
  'p1-tbl': p1TblShape,
  'k1-wrap2': k1Wrap2Shape,

  k2tog: k2togShape,
  ssk: sskShape,
  p2tog: p2togShape,
  ssp: sspShape,
  k3tog: k3togShape,
  p3tog: p3togShape,
  sssp: ssspShape,
  sk2p: sk2pShape,
  s2kp2: s2kp2Shape,
  'dec4-1-r': manyIntoOne(4, 'right'),
  'dec4-1-l': manyIntoOne(4, 'left'),
  'dec4-1-c': manyIntoOne(4, 'center'),
  'dec5-1': manyIntoOne(5, 'center'),

  k1fb: oneIntoMany(2),
  'inc1-3': oneIntoMany(3),
  'inc1-4': oneIntoMany(4),
  'inc1-5': oneIntoMany(5),
  m1: (o: ShapeOpts) => textGlyph('M', o),
  m1p: (o: ShapeOpts) => textGlyph('MP', o),
  m1r: (o: ShapeOpts) => textGlyph('MR', o),
  m1l: (o: ShapeOpts) => textGlyph('ML', o),
  rli: liftedInc('right'),
  lli: liftedInc('left'),

  'sl1-wyb': sl1WybShape,
  'sl1-wyf': sl1WyfShape,
  bobble: (o: ShapeOpts) => textGlyph('B', o, {bold: true}),

  'cast-on': castOnShape,
  'bind-off': bindOffShape,
  'st-rem': stRemShape,
  'no-stitch-box': noStitchBoxShape,
} satisfies Record<string, ShapeRenderer | null>
