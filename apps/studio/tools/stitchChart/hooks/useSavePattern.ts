import {useCallback, useState} from 'react'
import {useClient} from 'sanity'
import {API_VERSION} from '../constants'
import {
  buildPatternDocument,
  type ChartRow,
  type PatternCraft,
  type PatternDraftOptions,
  type ResolvedStitch,
  type SectionDraftOptions,
  type StitchResolver,
} from '../data/patternDraft'
import {appendSectionToPattern} from '../data/patternWrites'
import type {SymbolType} from '../types'

type Client = ReturnType<typeof useClient>

/**
 * Every `stitchType` document for a craft that carries a chart symbol.
 *
 * The tool's own catalog can't be reused here: it's built from crochet
 * documents only, whereas a saved pattern must reference stitches of the
 * craft it was created as. Doing the lookup at save time keeps the two
 * concerns separate and means knit support starts working as soon as knit
 * `stitchType` documents exist.
 */
const STITCH_LOOKUP_QUERY = /* groq */ `
  *[_type == "stitchType" && craft == $craft && defined(chartSymbol)]{
    "docId": _id,
    "symbol": chartSymbol,
    "abbr": abbreviation,
    "yieldSts": coalesce(yieldSts, 1),
    "preferred": coalesce(showInPalette, true),
    "sort": coalesce(sortOrder, 999)
  }
`

type LookupRow = {
  docId: string
  symbol: string | null
  abbr: string | null
  yieldSts: number | null
  preferred: boolean | null
  sort: number | null
}

export type SavedPattern = {
  /** Published id (the `drafts.` prefix stripped) for use with edit intents. */
  id: string
  type: 'crochetPattern' | 'knitPattern'
  title: string
  sectionTitle: string
  /** True when the section joined a pattern that already existed. */
  appended: boolean
  /** Sections the pattern has now, including the one just written. */
  sectionCount: number
  steps: number
  stitches: number
  /** Chart symbols that had no `stitchType` document for the chosen craft. */
  unresolved: SymbolType[]
}

/** An existing pattern a section can be appended to. */
export type AppendTarget = {
  /** Published id, with no `drafts.` prefix. */
  id: string
  type: 'crochetPattern' | 'knitPattern'
  title: string
}

export type SavePatternState = {
  saving: boolean
  error: string | null
  saved: SavedPattern | null
  save: (rows: readonly ChartRow[], opts: PatternDraftOptions) => Promise<void>
  appendSection: (
    rows: readonly ChartRow[],
    target: AppendTarget,
    opts: SectionDraftOptions,
  ) => Promise<void>
  reset: () => void
}

export function useSavePattern(): SavePatternState {
  const client = useClient({apiVersion: API_VERSION})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<SavedPattern | null>(null)

  const save = useCallback(
    async (rows: readonly ChartRow[], opts: PatternDraftOptions) => {
      setSaving(true)
      setError(null)
      setSaved(null)
      try {
        const resolve = await loadResolver(client, opts.craft)
        const {doc, unresolved, stitchTotal} = buildPatternDocument(rows, opts, resolve)
        const created = await client.create(doc)
        setSaved({
          id: created._id.replace(/^drafts\./, ''),
          type: doc._type,
          title: opts.title,
          sectionTitle: opts.sectionTitle,
          appended: false,
          sectionCount: 1,
          steps: rows.length,
          stitches: stitchTotal,
          unresolved,
        })
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Could not create the pattern')
      } finally {
        setSaving(false)
      }
    },
    [client],
  )

  const appendSection = useCallback(
    async (rows: readonly ChartRow[], target: AppendTarget, opts: SectionDraftOptions) => {
      setSaving(true)
      setError(null)
      setSaved(null)
      try {
        const resolve = await loadResolver(client, opts.craft)
        const {unresolved, stitchTotal, sectionCount} = await appendSectionToPattern(
          client,
          target.id,
          rows,
          opts,
          resolve,
        )
        setSaved({
          id: target.id,
          type: target.type,
          title: target.title,
          sectionTitle: opts.sectionTitle,
          appended: true,
          sectionCount,
          steps: rows.length,
          stitches: stitchTotal,
          unresolved,
        })
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Could not add the section')
      } finally {
        setSaving(false)
      }
    },
    [client],
  )

  const reset = useCallback(() => {
    setError(null)
    setSaved(null)
  }, [])

  return {saving, error, saved, save, appendSection, reset}
}

/**
 * Build a symbol → document lookup for one craft.
 *
 * Several documents can share a chart symbol — the US "sc" and UK "dc" both
 * render as `sc`, for example. Palette-visible documents win, then the lowest
 * `sortOrder`, so a reference always points at the canonical stitch rather
 * than a terminology alias.
 */
async function loadResolver(client: Client, craft: PatternCraft): Promise<StitchResolver> {
  const rows = await client
    .withConfig({perspective: 'drafts'})
    .fetch<LookupRow[]>(STITCH_LOOKUP_QUERY, {craft})

  const map = new Map<string, ResolvedStitch>()
  for (const row of [...rows].sort(byPreference)) {
    const symbol = row.symbol?.trim()
    if (!symbol || map.has(symbol)) continue
    map.set(symbol, {
      docId: row.docId,
      abbr: row.abbr?.trim() || symbol,
      yieldSts: typeof row.yieldSts === 'number' && row.yieldSts > 0 ? row.yieldSts : 1,
    })
  }
  return (symbol) => map.get(symbol)
}

function byPreference(a: LookupRow, b: LookupRow): number {
  const aPreferred = a.preferred !== false
  const bPreferred = b.preferred !== false
  if (aPreferred !== bPreferred) return aPreferred ? -1 : 1
  return (a.sort ?? 999) - (b.sort ?? 999)
}
