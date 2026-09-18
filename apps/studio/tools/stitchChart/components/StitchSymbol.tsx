import {Flex, Text} from '@sanity/ui'
import type {SymbolType} from '../types'
import {DEFAULT_INK, SYMBOL_STROKE} from '../constants'
import {normalizeAbbr} from '../data/symbols'
import {renderShape} from '../data/symbolShapes'
import {useCatalog} from '../context/StitchCatalogContext'

export type StitchSymbolProps = {
  type: SymbolType
  cx: number
  cy: number
  rotationDeg: number
  length: number
  /** Stroke color for the symbol. Defaults to SYMBOL_STROKE. */
  color?: string
  /** Stroke width — override for very small or very large targets. */
  strokeWidth?: number
}

export function StitchSymbol({
  type,
  cx,
  cy,
  rotationDeg,
  length,
  color = SYMBOL_STROKE,
  strokeWidth = 1.3,
}: StitchSymbolProps) {
  const shape = renderShape(type, {length, color, strokeWidth})
  if (!shape) return null
  return <g transform={`translate(${cx} ${cy}) rotate(${rotationDeg})`}>{shape}</g>
}

export function SymbolLegendItem({abbr, description}: {abbr: string; description: string}) {
  const catalog = useCatalog()
  const type = normalizeAbbr(catalog, abbr)
  return (
    <Flex align="center" gap={3}>
      <svg width={24} height={24} viewBox="-12 -12 24 24">
        <StitchSymbol type={type} cx={0} cy={0} rotationDeg={0} length={18} color={DEFAULT_INK} />
      </svg>
      <Text size={1}>
        <Text as="span" weight="semibold">
          {abbr}
        </Text>{' '}
        — {description}
      </Text>
    </Flex>
  )
}
