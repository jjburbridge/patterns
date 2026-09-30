/**
 * Turning the pattern the author is looking at into a file on their disk.
 *
 * The heavy parts — the PDF renderer and the document that uses it — are
 * imported only once an export actually starts. They are a large dependency
 * that most Studio sessions never touch, and paying for it on every page load
 * to save a moment on a button press is the wrong trade.
 */

import {useCallback, useRef, useState} from 'react'
import {useClient} from 'sanity'
import {API_VERSION} from '../tools/stitchChart/constants'
import {STITCH_QUERY, makeCatalog} from '../tools/stitchChart/data/stitchCatalog'
import type {RawStitchDoc} from '../tools/stitchChart/data/stitchCatalog'
import {buildSectionCharts} from './chartSvg'
import {pdfFilename, printableDeep} from './format'
import {PATTERN_PDF_QUERY, heroImageUrl, type PdfPattern} from './patternQuery'
import {loadImage, rasterizeSvg} from './rasterize'
import type {ChartImage, HeroImage} from './PatternDocument'

/** What the export is doing, so the dialog can say something truthful. */
export type ExportPhase = 'idle' | 'loading' | 'charts' | 'rendering' | 'done' | 'error'

export type ExportState = {
  phase: ExportPhase
  error: string | null
  /** Set once a file has been handed to the browser. */
  filename: string | null
  /** Charts drawn into the document. */
  chartCount: number
  run: (publishedId: string) => Promise<void>
  /** Clears the state, and abandons an export still in flight. */
  reset: () => void
}

export function useExportPdf(): ExportState {
  // Drafts, so an author can print what they are working on rather than only
  // what has been published — the same view the chart tool takes.
  const client = useClient({apiVersion: API_VERSION}).withConfig({perspective: 'drafts'})
  const [phase, setPhase] = useState<ExportPhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [filename, setFilename] = useState<string | null>(null)
  const [chartCount, setChartCount] = useState(0)

  // Dismissing the progress dialog abandons the export. Without this the run
  // would carry on and reopen the dialog at its next phase change, so closing
  // it would look broken.
  const runToken = useRef(0)

  const reset = useCallback(() => {
    runToken.current += 1
    setPhase('idle')
    setError(null)
    setFilename(null)
    setChartCount(0)
  }, [])

  const run = useCallback(
    async (publishedId: string) => {
      const token = ++runToken.current
      const live = () => runToken.current === token

      setPhase('loading')
      setError(null)
      setFilename(null)
      setChartCount(0)

      try {
        const [raw, stitchRows] = await Promise.all([
          client.fetch<PdfPattern | null>(PATTERN_PDF_QUERY, {id: publishedId}),
          client.fetch<RawStitchDoc[]>(STITCH_QUERY),
        ])
        if (!raw) throw new Error('That pattern could not be loaded.')

        // Everything downstream — the charts' captions included — reads from
        // this, so the encoding fix happens once, here.
        const pattern = printableDeep(raw)
        if (!live()) return

        setPhase('charts')
        const [charts, hero] = await Promise.all([
          renderCharts(makeCatalog(stitchRows), pattern),
          loadHero(pattern),
        ])
        if (!live()) return
        setChartCount(Object.keys(charts).length)

        setPhase('rendering')
        const [{pdf}, {PatternDocument}] = await Promise.all([
          import('@react-pdf/renderer'),
          import('./PatternDocument'),
        ])
        // Called rather than mounted: the renderer's root has to be a
        // `Document` element, which is what this returns. It is a pure
        // template with no state, so there is nothing to mount anyway.
        const blob = await pdf(PatternDocument({pattern, charts, hero})).toBlob()
        if (!live()) return

        const name = pdfFilename(pattern)
        download(blob, name)
        setFilename(name)
        setPhase('done')
      } catch (err: unknown) {
        if (!live()) return
        setError(err instanceof Error ? err.message : 'Could not create the PDF')
        setPhase('error')
      }
    },
    [client],
  )

  return {phase, error, filename, chartCount, run, reset}
}

/**
 * Charts, keyed by section.
 *
 * A chart that fails to draw is dropped rather than failing the export: the
 * instructions are the pattern, and a missing diagram is a far better outcome
 * than no document at all.
 */
/**
 * The hero photograph, or nothing.
 *
 * Dropped on failure for the same reason a chart is: the instructions are the
 * pattern, and a document without the picture beats no document at all.
 */
async function loadHero(pattern: PdfPattern): Promise<HeroImage | undefined> {
  const url = heroImageUrl(pattern.heroImage)
  if (!url) return undefined

  try {
    return await loadImage(url)
  } catch {
    return undefined
  }
}

async function renderCharts(
  catalog: ReturnType<typeof makeCatalog>,
  pattern: PdfPattern,
): Promise<Record<string, ChartImage>> {
  const charts: Record<string, ChartImage> = {}

  for (const chart of buildSectionCharts(catalog, pattern)) {
    try {
      charts[chart.sectionKey] = {
        dataUrl: await rasterizeSvg(chart.svg, chart.width, chart.height),
        aspect: chart.width / chart.height,
        caption: chart.caption,
      }
    } catch {
      // Left out of the document; the section still prints its instructions.
    }
  }

  return charts
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
