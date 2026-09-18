import type {Ref} from 'react'
import {Button, Card, Flex, Stack, Text} from '@sanity/ui'
import type {Craft} from '../types'
import type {ChartController} from '../hooks/useChartController'
import type {PaletteController} from '../hooks/usePalette'
import {CHART_BG, MONO} from '../constants'
import {GridChartSvg, type GridClick} from './GridChartSvg'
import {RingChartSvg, type RingClick} from './RingChartSvg'
import {Palette} from './Palette'

export type ChartCanvasProps = {
  chart: ChartController
  palette: PaletteController
  craft: Craft
  onCraftChange: (craft: Craft) => void
  svgRef: Ref<SVGSVGElement>
  onGridClick: (click: GridClick) => void
  onRingClick: (click: RingClick) => void
}

export function ChartCanvas({
  chart,
  palette,
  craft,
  onCraftChange,
  svgRef,
  onGridClick,
  onRingClick,
}: ChartCanvasProps) {
  return (
    <Stack space={3} style={{maxWidth: '100%'}}>
      <Palette palette={palette} craft={craft} onCraftChange={onCraftChange} />
      <Card
        padding={3}
        radius={2}
        shadow={1}
        style={{background: CHART_BG, maxWidth: '100%', overflowX: 'auto'}}
      >
        <Stack space={3}>
          <Flex align="center" justify="space-between" gap={3} wrap="wrap">
            <Text
              size={1}
              muted
              style={{fontFamily: MONO, textTransform: 'uppercase', letterSpacing: 0.5}}
            >
              {chart.contextLabel}
            </Text>
            <ViewToggle chart={chart} />
          </Flex>

          {chart.viewMode === 'grid' ? (
            <GridChartSvg
              svgRef={svgRef}
              cells={chart.cells}
              width={chart.width}
              height={chart.height}
              cellSize={chart.cellSize}
              padTop={chart.gridPadTop}
              padLeft={chart.gridPadLeft}
              gridInnerW={chart.gridInnerW}
              gridInnerH={chart.gridInnerH}
              svgWidth={chart.gridSvgWidth}
              svgHeight={chart.gridSvgHeight}
              colStride={chart.colStride}
              rowStride={chart.rowStride}
              onCellClick={onGridClick}
            />
          ) : (
            <RingChartSvg
              svgRef={svgRef}
              rounds={chart.ringRounds}
              overrides={chart.ringOverrides}
              onStitchClick={onRingClick}
            />
          )}
        </Stack>
      </Card>
    </Stack>
  )
}

function ViewToggle({chart}: {chart: ChartController}) {
  return (
    <Flex gap={1}>
      <Button
        mode={chart.viewMode === 'grid' ? 'default' : 'bleed'}
        tone={chart.viewMode === 'grid' ? 'primary' : 'default'}
        onClick={() => chart.setViewMode('grid')}
        text="Grid"
      />
      <Button
        mode={chart.viewMode === 'ring' ? 'default' : 'bleed'}
        tone={chart.viewMode === 'ring' ? 'primary' : 'default'}
        onClick={() => chart.setViewMode('ring')}
        text="Ring"
        disabled={!chart.ringSupported}
        title={
          !chart.ringSupported
            ? 'This section is worked in rows — chart it on the grid'
            : chart.ringEditable
              ? 'Build your own chart worked in the round'
              : 'Symbol chart for a section worked in the round'
        }
      />
    </Flex>
  )
}
