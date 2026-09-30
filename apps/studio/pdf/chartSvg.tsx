/**
 * Drawing a pattern's charts outside the chart editor.
 *
 * The export reuses `GridChartSvg` and `RingChartSvg` rather than
 * reimplementing them, so a chart in a PDF is the chart the author drew. They
 * are React components built for an interactive canvas, so they are rendered
 * to static markup here with no handlers attached and no refs taken.
 *
 * Which chart a section gets follows the same rule as the editor: work in
 * rounds is drawn as a ring, work in rows as a grid.
 */

import {renderToStaticMarkup} from 'react-dom/server'
import {StitchCatalogProvider} from '../tools/stitchChart/context/StitchCatalogContext'
import {GridChartSvg} from '../tools/stitchChart/components/GridChartSvg'
import {RingChartSvg} from '../tools/stitchChart/components/RingChartSvg'
import {computeRingGeometry} from '../tools/stitchChart/data/geometry'
import {gridGeometry} from '../tools/stitchChart/data/grid'
import {
  defaultDimsForSection,
  sectionToGrid,
  summarizePattern,
} from '../tools/stitchChart/data/patterns'
import type {StitchCatalog} from '../tools/stitchChart/data/stitchCatalog'
import type {PatternSection, RawPattern} from '../tools/stitchChart/types'
import type {PdfPattern} from './patternQuery'

/** A section's chart as serialised SVG, ready to be rasterised. */
export type SectionChart = {
  sectionKey: string
  sectionTitle: string
  svg: string
  width: number
  height: number
  caption: string
}

/** The chart components require click handlers; a printed chart has no clicks. */
function ignoreClick(): void {
  // Intentionally empty.
}

/**
 * One chart per section that has enough information to draw one.
 *
 * A section only charts if its steps carry stitch counts — without them there
 * is no way to know how wide a row is — so sections of pure prose are skipped
 * rather than drawn empty.
 */
export function buildSectionCharts(catalog: StitchCatalog, pattern: PdfPattern): SectionChart[] {
  const summary = summarizePattern(catalog, pattern as unknown as RawPattern)
  const charts: SectionChart[] = []

  summary.sections.forEach((section, i) => {
    if (section.roundList.length === 0) return
    const key = section.key || `section-${i}`
    const chart =
      section.construction === 'rounds'
        ? ringChart(catalog, section)
        : gridChart(catalog, section, summary.maxSts)
    charts.push({sectionKey: key, sectionTitle: section.title, ...chart})
  })

  return charts
}

function ringChart(catalog: StitchCatalog, section: PatternSection) {
  const {size} = computeRingGeometry(section.roundList)
  const svg = render(
    catalog,
    <RingChartSvg
      svgRef={null}
      rounds={section.roundList}
      overrides={{}}
      onStitchClick={ignoreClick}
    />,
  )
  const rounds = section.roundList.length
  return {
    svg,
    width: size,
    height: size,
    caption: `${section.title} — ${rounds} round${rounds === 1 ? '' : 's'}, read anticlockwise from the centre`,
  }
}

function gridChart(catalog: StitchCatalog, section: PatternSection, patternMaxSts: number) {
  const dims = defaultDimsForSection(section, patternMaxSts)
  const cells = sectionToGrid(section, dims.width, dims.height)
  const geom = gridGeometry(dims.width, dims.height)
  const svg = render(
    catalog,
    <GridChartSvg
      svgRef={null}
      cells={cells}
      width={dims.width}
      height={dims.height}
      cellSize={geom.cellSize}
      padTop={geom.padTop}
      padLeft={geom.padLeft}
      gridInnerW={geom.innerW}
      gridInnerH={geom.innerH}
      svgWidth={geom.svgWidth}
      svgHeight={geom.svgHeight}
      colStride={geom.colStride}
      rowStride={geom.rowStride}
      onCellClick={ignoreClick}
    />,
  )
  return {
    svg,
    width: geom.svgWidth,
    height: geom.svgHeight,
    caption: `${section.title} — ${dims.width} sts × ${dims.height} rows, read bottom-up, right to left`,
  }
}

/**
 * Serialise a chart component.
 *
 * The catalog has to be provided rather than defaulted: the symbol renderers
 * read it to decide what each stitch looks like, and without it every cell
 * would come out blank.
 */
function render(catalog: StitchCatalog, node: React.ReactElement): string {
  const markup = renderToStaticMarkup(
    <StitchCatalogProvider catalog={catalog}>{node}</StitchCatalogProvider>,
  )
  return withXmlns(markup)
}

/**
 * React omits the SVG namespace, which a browser fills in from context when
 * the markup is inlined in a page. These strings are handed to an `Image` or
 * written to a file instead, where nothing supplies it, so it goes on here.
 */
function withXmlns(markup: string): string {
  if (markup.includes('xmlns=')) return markup
  return markup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
}
