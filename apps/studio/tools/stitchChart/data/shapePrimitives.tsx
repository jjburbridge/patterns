import type {ReactNode} from 'react'

/**
 * Drawing primitives shared by the crochet and knit symbol renderers.
 *
 * All shapes are drawn in local coordinates centred on (0, 0) with the "top"
 * of the stitch pointing to -y. The outer `StitchSymbol` component is
 * responsible for translating and rotating each shape into place.
 *
 * Keeping these as functions rather than tiny React components avoids extra
 * <g> wrappers and keeps the rendered SVG readable.
 */

export type ShapeOpts = {
  length: number
  color: string
  strokeWidth: number
}

export type ShapeRenderer = (opts: ShapeOpts) => ReactNode

export const lineProps = (color: string, strokeWidth: number) => ({
  stroke: color,
  strokeWidth,
  strokeLinecap: 'round' as const,
})

export function vBar(from: number, to: number, o: ShapeOpts, x = 0): ReactNode {
  return <line x1={x} y1={from} x2={x} y2={to} {...lineProps(o.color, o.strokeWidth)} />
}

export function hBar(y: number, halfW: number, o: ShapeOpts, scale = 1): ReactNode {
  return (
    <line
      x1={-halfW * scale}
      y1={y}
      x2={halfW * scale}
      y2={y}
      {...lineProps(o.color, o.strokeWidth)}
    />
  )
}

export function diagBar(x1: number, y1: number, x2: number, y2: number, o: ShapeOpts): ReactNode {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} {...lineProps(o.color, o.strokeWidth)} />
}

export function halves(o: ShapeOpts) {
  return {half: o.length / 2, halfW: Math.max(3, o.length / 3)}
}
