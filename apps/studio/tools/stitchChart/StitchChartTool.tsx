import {useCallback, useRef, useState} from 'react'
import {Box, Card, Flex, Heading, Spinner, Stack, Text} from '@sanity/ui'
import {usePatternList} from './hooks/usePatternList'
import {useChartController} from './hooks/useChartController'
import {useExportPng} from './hooks/useExportPng'
import {usePalette} from './hooks/usePalette'
import {useStitchCatalog, type StitchCatalogState} from './hooks/useStitchCatalog'
import {StitchCatalogProvider} from './context/StitchCatalogContext'
import type {Craft} from './types'
import {defaultBaseStitch, type StitchCatalog} from './data/stitchCatalog'
import {ChartToolbar} from './components/ChartToolbar'
import {ChartCanvas} from './components/ChartCanvas'
import {ChartSidebar} from './components/ChartSidebar'
import {SavePatternDialog} from './components/SavePatternDialog'
import type {GridClick} from './components/GridChartSvg'
import type {RingClick} from './components/RingChartSvg'

export function StitchChartTool() {
  const catalogState = useStitchCatalog()
  return (
    <StitchCatalogProvider catalog={catalogState.catalog}>
      <Box padding={4}>
        <Stack space={4}>
          <Header />
          <CatalogStatus state={catalogState} />
          {catalogState.catalog.stitches.length > 0 && (
            <ChartWorkspace catalog={catalogState.catalog} />
          )}
        </Stack>
      </Box>
    </StitchCatalogProvider>
  )
}

/**
 * The interactive part of the tool. Rendered only once the catalog has at
 * least one stitch — everything below (patterns, palette, chart) depends on
 * catalog-supplied metadata such as chart symbols and yields.
 */
function ChartWorkspace({catalog}: {catalog: StitchCatalog}) {
  const patternList = usePatternList(catalog)
  const palette = usePalette()
  const [craft, setCraft] = useState<Craft>(() =>
    catalog.hasCraft('crochet') || !catalog.hasCraft('knit') ? 'crochet' : 'knit',
  )
  const chart = useChartController(patternList.patterns, defaultBaseStitch(catalog, craft))
  const [savingPattern, setSavingPattern] = useState(false)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const exportPng = useExportPng(svgRef, {
    svgWidth: chart.svgWidth,
    svgHeight: chart.svgHeight,
    viewMode: chart.viewMode,
    width: chart.width,
    height: chart.height,
    filenameSuffix: chart.filenameSuffix,
  })

  // Symbols are craft-specific, so an active knit stitch must not survive a
  // switch to crochet. Dropping back to "Auto" avoids painting a symbol that
  // isn't in the palette the user is looking at.
  const onCraftChange = useCallback(
    (next: Craft) => {
      setCraft(next)
      palette.setActiveStitch(null)
    },
    [palette],
  )

  const onGridClick = useCallback(
    ({r, c, erase}: GridClick) => {
      if (erase) {
        chart.setCell(r, c, {color: null, stitch: null})
        return
      }
      chart.setCell(r, c, {color: palette.activeColor, stitch: palette.activeStitch})
    },
    [chart, palette.activeColor, palette.activeStitch],
  )

  const onRingClick = useCallback(
    ({roundIndex, stitchIndex, erase}: RingClick) => {
      if (erase) {
        chart.setRingOverride(roundIndex, stitchIndex, null)
        return
      }
      chart.setRingOverride(roundIndex, stitchIndex, {
        color: palette.activeColor,
        stitch: palette.activeStitch,
      })
    },
    [chart, palette.activeColor, palette.activeStitch],
  )

  return (
    <>
      <ChartToolbar
        chart={chart}
        patternList={patternList}
        onExport={exportPng}
        onSaveAsPattern={() => setSavingPattern(true)}
      />
      <Flex gap={4} wrap="wrap" align="flex-start">
        <ChartCanvas
          chart={chart}
          palette={palette}
          craft={craft}
          onCraftChange={onCraftChange}
          svgRef={svgRef}
          onGridClick={onGridClick}
          onRingClick={onRingClick}
        />
        <ChartSidebar chart={chart} />
      </Flex>
      {savingPattern && (
        <SavePatternDialog
          chart={chart}
          craft={craft}
          patterns={patternList.patterns}
          onClose={() => setSavingPattern(false)}
          onSaved={patternList.refresh}
        />
      )}
    </>
  )
}

function Header() {
  return (
    <Stack space={2}>
      <Heading size={3}>Stitch chart designer</Heading>
      <Text muted size={1}>
        Sketch a chart on a grid or in the round, either freehand or starting from a pattern
        section. Choose a craft, pick a color and stitch from the palette, then click positions to
        paint them. Grid columns are numbered from the right and rows from the bottom, matching the
        reading order of both knit and crochet charts.
      </Text>
    </Stack>
  )
}

function CatalogStatus({state}: {state: StitchCatalogState}) {
  if (state.error) {
    return (
      <Card padding={3} radius={2} tone="critical">
        <Text size={1}>Could not load the stitch catalog: {state.error}</Text>
      </Card>
    )
  }
  if (state.loading && state.catalog.stitches.length === 0) {
    return (
      <Card padding={3} radius={2}>
        <Flex align="center" gap={3}>
          <Spinner muted />
          <Text size={1} muted>
            Loading stitch catalog from Sanity…
          </Text>
        </Flex>
      </Card>
    )
  }
  if (state.catalog.stitches.length === 0) {
    return (
      <Card padding={3} radius={2} tone="caution">
        <Text size={1}>
          No stitch documents were found. Add at least one <code>stitchType</code> document with{' '}
          <code>craft</code> set to <code>crochet</code> or <code>knit</code> and a valid{' '}
          <code>chartSymbol</code> to populate the palette.
        </Text>
      </Card>
    )
  }
  return null
}
