import type {Ref} from 'react'
import type {PatternRound, RingOverride, RingOverrides, SymbolType} from '../types'
import {
  CHART_BG,
  DEFAULT_INK,
  GRID_STROKE,
  LABEL_COLOR,
  MONO,
  RING_NUMBER_COLOR,
  SYMBOL_STROKE,
} from '../constants'
import {computeRingGeometry, symbolLenForRound, type RingGeometry} from '../data/geometry'
import {isBlankSymbol} from '../data/symbolShapes'
import {normalizeAbbr} from '../data/symbols'
import {useCatalog} from '../context/StitchCatalogContext'
import type {StitchCatalog} from '../data/stitchCatalog'
import {StitchSymbol} from './StitchSymbol'

export type RingClick = {roundIndex: number; stitchIndex: number; erase: boolean}

export type RingChartSvgProps = {
  svgRef: Ref<SVGSVGElement>
  rounds: PatternRound[]
  overrides: RingOverrides
  onStitchClick: (click: RingClick) => void
}

export function RingChartSvg({svgRef, rounds, overrides, onStitchClick}: RingChartSvgProps) {
  const catalog = useCatalog()
  const geom = computeRingGeometry(rounds)
  const {size, cx, cy, magicRadius} = geom

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{display: 'block', background: CHART_BG}}
      aria-label="Ring symbol chart"
    >
      <MagicRing cx={cx} cy={cy} r={magicRadius} />
      {rounds.length === 0 ? (
        <EmptyMessage cx={cx} cy={cy} />
      ) : (
        rounds.map((round, ri) => (
          <Round
            key={round.key}
            round={round}
            ringIndex={ri}
            geom={geom}
            catalog={catalog}
            overrides={overrides}
            onStitchClick={onStitchClick}
          />
        ))
      )}
    </svg>
  )
}

function MagicRing({cx, cy, r}: {cx: number; cy: number; r: number}) {
  return <circle cx={cx} cy={cy} r={r} fill="none" stroke={SYMBOL_STROKE} strokeWidth={1.4} />
}

function EmptyMessage({cx, cy}: {cx: number; cy: number}) {
  return (
    <text x={cx} y={cy} fill={LABEL_COLOR} fontSize={12} textAnchor="middle">
      Set the number of rounds to start charting.
    </text>
  )
}

type RoundProps = {
  round: PatternRound
  ringIndex: number
  geom: RingGeometry
  catalog: StitchCatalog
  overrides: RingOverrides
  onStitchClick: (click: RingClick) => void
}

function Round({round, ringIndex, geom, catalog, overrides, onStitchClick}: RoundProps) {
  const {cx, cy, magicRadius, spacing} = geom
  const symbolLen = symbolLenForRound(geom, ringIndex, round.totalSts)
  const outerR = magicRadius + (ringIndex + 1) * spacing
  const anchorR = outerR - geom.symbolLen
  const centerR = anchorR + geom.symbolLen / 2
  const fallbackType = round.primarySymbol ?? normalizeAbbr(catalog, round.primaryAbbr)

  return (
    <g>
      <SeamChains
        count={round.chStart}
        cx={cx}
        cy={cy}
        anchorR={anchorR}
        magicRadius={magicRadius}
      />
      <RoundStitches
        round={round}
        fallbackType={fallbackType}
        cx={cx}
        cy={cy}
        centerR={centerR}
        symbolLen={symbolLen}
        overrides={overrides}
        onStitchClick={onStitchClick}
      />
      <RoundNumber index={round.index} cx={cx} cy={cy} centerR={centerR} />
    </g>
  )
}

function SeamChains({
  count,
  cx,
  cy,
  anchorR,
  magicRadius,
}: {
  count: number
  cx: number
  cy: number
  anchorR: number
  magicRadius: number
}) {
  const chains = []
  for (let k = 0; k < count; k++) {
    const chainR = anchorR - 4 - k * 6
    if (chainR <= magicRadius + 2) break
    chains.push(
      <StitchSymbol key={k} type="ch" cx={cx} cy={cy - chainR} rotationDeg={0} length={12} />,
    )
  }
  return <>{chains}</>
}

function RoundStitches({
  round,
  fallbackType,
  cx,
  cy,
  centerR,
  symbolLen,
  overrides,
  onStitchClick,
}: {
  round: PatternRound
  fallbackType: SymbolType
  cx: number
  cy: number
  centerR: number
  symbolLen: number
  overrides: RingOverrides
  onStitchClick: (click: RingClick) => void
}) {
  const stitches = []
  for (let s = 0; s < round.totalSts; s++) {
    const angleDeg = (360 * s) / round.totalSts
    const angleRad = (angleDeg * Math.PI) / 180
    const x = cx + centerR * Math.sin(angleRad)
    const y = cy - centerR * Math.cos(angleRad)
    const override = overrides[`${round.index}:${s}`]
    const patternType = round.positions[s] ?? fallbackType
    const type = resolveType(override, patternType)
    const color = override?.color ?? DEFAULT_INK
    stitches.push(
      <ClickableStitch
        key={s}
        roundIndex={round.index}
        stitchIndex={s}
        type={type}
        cx={x}
        cy={y}
        rotationDeg={angleDeg}
        symbolLen={symbolLen}
        color={color}
        override={override}
        onClick={onStitchClick}
      />,
    )
  }
  return <>{stitches}</>
}

function resolveType(override: RingOverride | undefined, patternType: SymbolType): SymbolType {
  if (!override) return patternType
  return override.stitch ?? patternType
}

function ClickableStitch({
  roundIndex,
  stitchIndex,
  type,
  cx,
  cy,
  rotationDeg,
  symbolLen,
  color,
  override,
  onClick,
}: {
  roundIndex: number
  stitchIndex: number
  type: SymbolType
  cx: number
  cy: number
  rotationDeg: number
  symbolLen: number
  color: string
  override: RingOverride | undefined
  onClick: (click: RingClick) => void
}) {
  const hitSize = symbolLen + 6
  return (
    <g
      style={{cursor: 'pointer'}}
      onClick={(e) => onClick({roundIndex, stitchIndex, erase: e.shiftKey || e.altKey})}
      onContextMenu={(e) => {
        e.preventDefault()
        onClick({roundIndex, stitchIndex, erase: true})
      }}
    >
      {/* Transparent hit target so the entire cell is clickable. */}
      <rect
        x={cx - hitSize / 2}
        y={cy - hitSize / 2}
        width={hitSize}
        height={hitSize}
        fill="transparent"
        transform={`rotate(${rotationDeg} ${cx} ${cy})`}
      >
        <title>
          Rnd {roundIndex} · st {stitchIndex + 1} — {type}
          {override ? ' (painted)' : ''}
        </title>
      </rect>
      {isBlankSymbol(type) ? (
        <EmptyStitchCell cx={cx} cy={cy} rotationDeg={rotationDeg} size={symbolLen} />
      ) : (
        <StitchSymbol
          type={type}
          cx={cx}
          cy={cy}
          rotationDeg={rotationDeg}
          length={symbolLen}
          color={color}
        />
      )}
    </g>
  )
}

/**
 * Stand-in for a symbol that draws nothing, so a round of knit stitches reads
 * as a row of cells rather than as empty space.
 */
function EmptyStitchCell({
  cx,
  cy,
  rotationDeg,
  size,
}: {
  cx: number
  cy: number
  rotationDeg: number
  size: number
}) {
  const half = (size * 0.62) / 2
  return (
    <rect
      x={cx - half}
      y={cy - half}
      width={half * 2}
      height={half * 2}
      fill="none"
      stroke={GRID_STROKE}
      strokeWidth={1}
      transform={`rotate(${rotationDeg} ${cx} ${cy})`}
    />
  )
}

function RoundNumber({
  index,
  cx,
  cy,
  centerR,
}: {
  index: number
  cx: number
  cy: number
  centerR: number
}) {
  const angleDeg = 22
  const angleRad = (angleDeg * Math.PI) / 180
  return (
    <text
      x={cx + centerR * Math.sin(angleRad)}
      y={cy - centerR * Math.cos(angleRad) + 4}
      fill={RING_NUMBER_COLOR}
      fontSize={11}
      fontFamily={MONO}
      textAnchor="middle"
      style={{pointerEvents: 'none'}}
    >
      {index}
    </text>
  )
}
