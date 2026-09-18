import {Badge, Card, Flex, Heading, Stack, Text} from '@sanity/ui'
import type {ChartController} from '../hooks/useChartController'
import type {SymbolType} from '../types'
import {GRID_STROKE} from '../constants'
import {colorLabel} from '../data/palette'
import {useCatalog} from '../context/StitchCatalogContext'
import {SymbolLegendItem} from './StitchSymbol'

export function ChartSidebar({chart}: {chart: ChartController}) {
  return (
    <Stack space={3} flex={1} style={{minWidth: 240}}>
      <Card padding={3} radius={2} shadow={1}>
        <Stack space={3}>
          <Heading size={1}>Legend</Heading>
          {chart.viewMode === 'grid' ? <GridLegend /> : <RingLegend />}
        </Stack>
      </Card>
      <Card padding={3} radius={2} shadow={1}>
        {chart.viewMode === 'grid' ? (
          <GridStatsPanel chart={chart} />
        ) : (
          <RingStatsPanel chart={chart} />
        )}
      </Card>
    </Stack>
  )
}

function GridLegend() {
  return (
    <>
      <Text size={1}>
        Pick a color and (optionally) a stitch symbol from the palette above, then
        click a cell to paint it.
      </Text>
      <Text size={1} muted>
        Read each row right → left, working from the bottom row up.
      </Text>
    </>
  )
}

function RingLegend() {
  return (
    <>
      <SymbolLegendItem abbr="ch" description="Chain" />
      <SymbolLegendItem abbr="sl st" description="Slip stitch" />
      <SymbolLegendItem abbr="sc" description="Single crochet (US) / dc (UK)" />
      <SymbolLegendItem abbr="hdc" description="Half double (US) / htr (UK)" />
      <SymbolLegendItem abbr="dc" description="Double crochet (US) / tr (UK)" />
      <SymbolLegendItem abbr="tr" description="Treble (US) / dtr (UK)" />
      <Text size={1} muted>
        Rounds are worked outward from the central magic ring. Click a stitch to
        override its color or symbol. See the palette for the full catalog.
      </Text>
    </>
  )
}

function GridStatsPanel({chart}: {chart: ChartController}) {
  return (
    <Stack space={3}>
      <Flex align="center" justify="space-between">
        <Heading size={1}>Painted cells</Heading>
        <Badge tone="primary">Total {chart.paintedCount}</Badge>
      </Flex>
      <Stack space={1} style={{maxHeight: 320, overflowY: 'auto'}}>
        {chart.paintedPerRow.map(({round, count}) => (
          <Flex key={round} align="center" justify="space-between" paddingY={1}>
            <Text size={1}>Rnd {round}</Text>
            <Text size={1} weight="semibold">
              {count}
            </Text>
          </Flex>
        ))}
      </Stack>
      <Text size={1} muted>
        {chart.width} sts × {chart.height} rounds — auto-saved locally.
      </Text>
      <ColorSummary chart={chart} />
    </Stack>
  )
}

function ColorSummary({chart}: {chart: ChartController}) {
  const totals = new Map<string, number>()
  for (const row of chart.cells) {
    for (const cell of row) {
      if (!cell.color) continue
      totals.set(cell.color, (totals.get(cell.color) ?? 0) + 1)
    }
  }
  if (totals.size === 0) return null
  const entries = Array.from(totals.entries()).sort((a, b) => b[1] - a[1])
  return (
    <Stack space={1}>
      <Text size={0} muted>
        By color
      </Text>
      {entries.map(([color, count]) => (
        <Flex key={color} align="center" gap={2} paddingY={1}>
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              width: 12,
              height: 12,
              background: color,
              border: `1px solid ${GRID_STROKE}`,
              borderRadius: 2,
            }}
          />
          <Text size={1} style={{flex: 1}}>
            {colorLabel(color)}
          </Text>
          <Text size={1} weight="semibold">
            {count}
          </Text>
        </Flex>
      ))}
    </Stack>
  )
}

function RingStatsPanel({chart}: {chart: ChartController}) {
  const list = chart.ringRounds
  return (
    <Stack space={3}>
      <Flex align="center" justify="space-between">
        <Heading size={1}>Rounds</Heading>
        <Flex gap={2}>
          <Badge tone="default">{list.length} rnds</Badge>
          <Badge tone="primary">{chart.ringOverrideCount} painted</Badge>
        </Flex>
      </Flex>
      <Stack space={2} style={{maxHeight: 320, overflowY: 'auto'}}>
        {list.map((r) => (
          <Flex key={r.key} align="flex-start" justify="space-between" paddingY={1} gap={2}>
            <Text size={1}>Rnd {r.index}</Text>
            <Text size={1} weight="semibold" style={{textAlign: 'right'}}>
              {r.totalSts} sts
              <br />
              <Text as="span" size={0} muted>
                {summarisePositions(r.positions)}
              </Text>
            </Text>
          </Flex>
        ))}
      </Stack>
      <OverrideSummary chart={chart} />
      <Text size={1} muted>
        {chart.ringEditable
          ? 'Rounds come from the ring setup above; paint stitches to change them.'
          : 'Symbols come straight from each round’s instruction sequence.'}{' '}
        Overrides are auto-saved locally.
      </Text>
    </Stack>
  )
}

/**
 * Compact summary of the symbol mix on a round, e.g. "24 dc · 24 2dc-inc".
 * Aggregates runs of identical positions and shows them in decreasing count
 * order.
 */
function summarisePositions(positions: readonly SymbolType[]): string {
  if (positions.length === 0) return '—'
  const counts = new Map<string, number>()
  for (const p of positions) counts.set(p, (counts.get(p) ?? 0) + 1)
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([sym, n]) => `${n} ${sym}`)
    .join(' · ')
}

function OverrideSummary({chart}: {chart: ChartController}) {
  const catalog = useCatalog()
  const entries = Object.entries(chart.ringOverrides)
  if (entries.length === 0) return null
  return (
    <Stack space={1}>
      <Text size={0} muted>
        Overrides
      </Text>
      <Stack space={1} style={{maxHeight: 180, overflowY: 'auto'}}>
        {entries
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([key, override]) => {
            const [round, stitch] = key.split(':')
            return (
              <Flex key={key} align="center" gap={2} paddingY={1}>
                {override.color && (
                  <span
                    aria-hidden
                    style={{
                      display: 'inline-block',
                      width: 10,
                      height: 10,
                      background: override.color,
                      border: `1px solid ${GRID_STROKE}`,
                      borderRadius: 2,
                    }}
                  />
                )}
                <Text size={1} style={{flex: 1}}>
                  Rnd {round} · st {Number(stitch) + 1}
                </Text>
                <Text size={1} weight="semibold">
                  {catalog.labelFor(override.stitch)}
                </Text>
              </Flex>
            )
          })}
      </Stack>
    </Stack>
  )
}
