import type {Ref} from 'react'
import type {Grid, GridCell} from '../types'
import {
  CELL_EMPTY,
  CELL_WORKED,
  CHART_BG,
  GRID_STROKE,
  LABEL_COLOR,
  MONO,
  SYMBOL_STROKE,
} from '../constants'
import {isBlankSymbol} from '../data/symbolShapes'
import {StitchSymbol} from './StitchSymbol'

export type GridClick = {r: number; c: number; erase: boolean}

export type GridChartSvgProps = {
  svgRef: Ref<SVGSVGElement>
  cells: Grid
  width: number
  height: number
  cellSize: number
  padTop: number
  padLeft: number
  gridInnerW: number
  gridInnerH: number
  svgWidth: number
  svgHeight: number
  colStride: number
  rowStride: number
  onCellClick: (click: GridClick) => void
}

export function GridChartSvg({
  svgRef,
  cells,
  width,
  height,
  cellSize,
  padTop,
  padLeft,
  gridInnerW,
  gridInnerH,
  svgWidth,
  svgHeight,
  colStride,
  rowStride,
  onCellClick,
}: GridChartSvgProps) {
  return (
    <svg
      ref={svgRef}
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      style={{display: 'block', background: CHART_BG}}
      aria-label={`Stitch chart, ${width} by ${height}`}
    >
      {cells.map((row, r) =>
        row.map((cell, c) => (
          <Cell
            key={`c-${r}-${c}`}
            cell={cell}
            r={r}
            c={c}
            width={width}
            height={height}
            cellSize={cellSize}
            padTop={padTop}
            padLeft={padLeft}
            onClick={onCellClick}
          />
        )),
      )}
      <AxisLabels
        axis="col"
        count={width}
        stride={colStride}
        padTop={padTop}
        padLeft={padLeft}
        cellSize={cellSize}
        gridInnerW={gridInnerW}
        gridInnerH={gridInnerH}
      />
      <AxisLabels
        axis="row"
        count={height}
        stride={rowStride}
        padTop={padTop}
        padLeft={padLeft}
        cellSize={cellSize}
        gridInnerW={gridInnerW}
        gridInnerH={gridInnerH}
      />
    </svg>
  )
}

type CellProps = {
  cell: GridCell
  r: number
  c: number
  width: number
  height: number
  cellSize: number
  padTop: number
  padLeft: number
  onClick: (click: GridClick) => void
}

function Cell({cell, r, c, width, height, cellSize, padTop, padLeft, onClick}: CellProps) {
  const x = padLeft + c * cellSize
  const y = padTop + r * cellSize
  const fill = cell.color ?? (worksButDrawsNothing(cell) ? CELL_WORKED : CELL_EMPTY)

  return (
    <g
      style={{cursor: 'pointer'}}
      onClick={(e) => onClick({r, c, erase: e.shiftKey || e.altKey})}
      onContextMenu={(e) => {
        e.preventDefault()
        onClick({r, c, erase: true})
      }}
    >
      <rect
        x={x}
        y={y}
        width={cellSize}
        height={cellSize}
        fill={fill}
        stroke={GRID_STROKE}
        strokeWidth={1}
      />
      {cell.stitch && !isBlankSymbol(cell.stitch) && (
        <StitchSymbol
          type={cell.stitch}
          cx={x + cellSize / 2}
          cy={y + cellSize / 2}
          rotationDeg={0}
          length={Math.max(8, cellSize - 6)}
          color={contrastInk(cell.color)}
        />
      )}
      <title>
        {`Round ${height - r}, stitch ${width - c}${describeCell(cell)}`}
      </title>
    </g>
  )
}

/**
 * True for a cell holding a real stitch whose symbol is, by convention, an
 * empty cell — knit on the right side being the one that matters.
 *
 * On paper that's unambiguous, but here an empty cell also means "nothing
 * charted yet", so a stockinette chart would be indistinguishable from a
 * blank canvas. Tinting these keeps the notation (no symbol is drawn) while
 * still showing that the cell is worked. `blank` is excluded: it is the
 * palette's explicit "colour only, no stitch" choice, not a stitch.
 */
function worksButDrawsNothing(cell: GridCell): boolean {
  return Boolean(cell.stitch && cell.stitch !== 'blank' && isBlankSymbol(cell.stitch))
}

function describeCell(cell: GridCell): string {
  const parts: string[] = []
  if (cell.color) parts.push(cell.color)
  if (cell.stitch) parts.push(cell.stitch)
  return parts.length ? ` — ${parts.join(', ')}` : ''
}

/** Pick a stitch-overlay ink that contrasts with a filled cell background. */
function contrastInk(background: string | null): string {
  if (!background) return SYMBOL_STROKE
  const hex = background.replace('#', '')
  if (hex.length !== 6) return SYMBOL_STROKE
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luma > 0.6 ? SYMBOL_STROKE : '#ffffff'
}

type AxisLabelsProps = {
  axis: 'col' | 'row'
  count: number
  stride: number
  padTop: number
  padLeft: number
  cellSize: number
  gridInnerW: number
  gridInnerH: number
}

function AxisLabels({
  axis,
  count,
  stride,
  padTop,
  padLeft,
  cellSize,
  gridInnerW,
  gridInnerH,
}: AxisLabelsProps) {
  return (
    <>
      {Array.from({length: count}, (_, i) => {
        // Both axes are numbered from the far end so that stitch 1 sits at the
        // right of the grid and round 1 sits at the bottom.
        const num = count - i
        const show = num === 1 || num === count || num % stride === 0
        if (!show) return null
        if (axis === 'col') {
          return (
            <text
              key={`col-${i}`}
              x={padLeft + i * cellSize + cellSize / 2}
              y={padTop + gridInnerH + 14}
              fill={LABEL_COLOR}
              fontSize={10}
              textAnchor="middle"
              fontFamily={MONO}
            >
              {num}
            </text>
          )
        }
        return (
          <text
            key={`row-${i}`}
            x={padLeft + gridInnerW + 8}
            y={padTop + i * cellSize + cellSize / 2 + 4}
            fill={LABEL_COLOR}
            fontSize={10}
            fontFamily={MONO}
          >
            {num}
          </text>
        )
      })}
    </>
  )
}
