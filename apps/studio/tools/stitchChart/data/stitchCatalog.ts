/**
 * Runtime crochet stitch catalog.
 *
 * The tool used to hard-code every stitch's metadata (name, palette group,
 * abbreviations, chart yield…). All of that lives on `stitchType` documents
 * in Sanity now — this module just defines the shape of the data and provides
 * a factory that assembles a queryable `StitchCatalog` from whatever docs
 * come back from GROQ.
 *
 * The GROQ query that produces the input to `makeCatalog` lives at
 * `STITCH_QUERY` below.
 */

import {CRAFTS, type Craft, type SymbolType} from '../types'
import {isRenderableSymbol} from './symbolShapes'

export type StitchGroup =
  | 'basic'
  | 'post'
  | 'loop'
  | 'decrease'
  | 'increase'
  | 'cluster'
  | 'popcorn'
  | 'special'
  | 'marker'

export type StitchDifficulty = 'basic' | 'intermediate' | 'advanced'

/**
 * One catalog entry, denormalised from a Sanity `stitchType` document.
 *
 * `key` is the chart-symbol key (equal to `stitchType.chartSymbol` on the
 * doc). Multiple docs may share the same `key` — for example the US "sc" and
 * UK "dc" docs both point at the `sc` renderer. In that case `showInPalette`
 * is used to decide which chip appears in the palette (typically the US doc
 * is visible and the UK doc is a hidden alias).
 */
export type StitchDefinition = {
  /** Chart-symbol key matching a renderer in `SHAPES`. */
  key: SymbolType
  /** ID of the source Sanity document — used to disambiguate duplicate keys. */
  docId: string
  /** Which craft the stitch belongs to. */
  craft: Craft
  /** Primary abbreviation (typically US, e.g., "sc"). */
  abbrPrimary: string
  /** Any alternate abbreviations (UK, informal shorthands…). */
  aliases: string[]
  /** Full name, e.g., "Single crochet". */
  name: string
  /** How the stitch is worked / used. */
  description: string
  /** Palette grouping. */
  group: StitchGroup
  /** Difficulty band from the Sanity doc. */
  difficulty: StitchDifficulty | null
  /** Number of chart positions a single application of this stitch produces. */
  yieldSts: number
  /** Position within the palette group; lower = earlier. */
  sortOrder: number
  /** Whether this stitch should appear as a chip in the palette. */
  showInPalette: boolean
}

/**
 * Assembled, denormalised catalog used everywhere in the tool.
 *
 * The runtime catalog is preferred over standalone helpers because most
 * consumers already receive it from React context and it lets the individual
 * lookups be co-located with the data they need.
 */
export type StitchCatalog = {
  /** Every stitch definition, ordered for palette rendering. */
  stitches: StitchDefinition[]
  /** The stitches shown as palette chips for one craft. */
  paletteStitchesFor(craft: Craft): StitchDefinition[]
  /** Palette rows for one craft: each group + its visible stitches. */
  paletteGroupsFor(craft: Craft): StitchPaletteGroup[]
  /** Whether the catalog holds any stitch at all for a craft. */
  hasCraft(craft: Craft): boolean
  /** Look up a definition by its symbol key. */
  find(key: string): StitchDefinition | undefined
  /** Chart-position count produced by one application of this stitch. */
  yieldOf(key: string): number
  /** Resolve an incoming abbreviation (US, UK, informal) to a symbol key. */
  resolveAbbr(abbr: string): SymbolType | undefined
  /** Short chip label — the primary abbreviation or a UI fallback. */
  labelFor(stitch: SymbolType | null): string
  /** Full descriptive title for a stitch (tooltips / legend). */
  titleFor(stitch: SymbolType | null): string
}

export type StitchPaletteGroup = {
  id: StitchGroup
  label: string
  stitches: SymbolType[]
}

/** The order palette rows are rendered in. */
export const STITCH_GROUP_ORDER: StitchGroup[] = [
  'basic',
  'post',
  'loop',
  'decrease',
  'increase',
  'cluster',
  'popcorn',
  'special',
  'marker',
]

export const STITCH_GROUP_LABELS: Record<StitchGroup, string> = {
  basic: 'Basic',
  post: 'Post',
  loop: 'Back loop',
  decrease: 'Decrease',
  increase: 'Increase',
  cluster: 'Cluster / Puff',
  popcorn: 'Popcorn',
  special: 'Special',
  marker: 'Marker',
}

/**
 * The GROQ query that feeds `makeCatalog`.
 *
 * We only include stitches whose `chartSymbol` matches a renderer we know
 * about — otherwise there's nothing meaningful to render or paint anyway.
 */
export const STITCH_QUERY = /* groq */ `
  *[_type == "stitchType" && craft in ["crochet", "knit"] && defined(chartSymbol)] | order(craft asc, group asc, sortOrder asc, abbreviation asc) {
    "docId": _id,
    "key": chartSymbol,
    craft,
    "abbrPrimary": abbreviation,
    "aliases": coalesce(aliases, []),
    name,
    description,
    group,
    difficulty,
    "yieldSts": coalesce(yieldSts, 1),
    "sortOrder": coalesce(sortOrder, 999),
    "showInPalette": coalesce(showInPalette, true)
  }
`

/** The shape a single row of the GROQ query returns. */
export type RawStitchDoc = {
  docId: string
  key: string | null
  craft: string | null
  abbrPrimary: string | null
  aliases: string[] | null
  name: string | null
  description: string | null
  group: string | null
  difficulty: string | null
  yieldSts: number | null
  sortOrder: number | null
  showInPalette: boolean | null
}

/**
 * Build a runtime catalog from raw Sanity docs. Invalid rows (missing key or
 * unknown chart symbol) are dropped so downstream code never encounters an
 * unrenderable stitch.
 */
export function makeCatalog(rows: readonly RawStitchDoc[]): StitchCatalog {
  const stitches: StitchDefinition[] = []
  for (const row of rows) {
    const def = coerceDefinition(row)
    if (def) stitches.push(def)
  }
  stitches.sort(byCraftGroupThenSort)

  // Palette contents are precomputed per craft because `Palette` reads them
  // during render and the result only changes when the catalog is refetched.
  const paletteStitches = new Map<Craft, StitchDefinition[]>()
  const paletteGroups = new Map<Craft, StitchPaletteGroup[]>()
  for (const craft of CRAFTS) {
    const visible = dedupeByKey(stitches.filter((s) => s.craft === craft)).filter(
      (s) => s.showInPalette,
    )
    paletteStitches.set(craft, visible)
    paletteGroups.set(craft, buildPaletteGroups(visible))
  }

  const byKey = new Map<string, StitchDefinition>()
  for (const s of stitches) {
    // First-write-wins: the earlier (lower sortOrder) doc becomes the canonical
    // one, so `find('sc')` returns the US doc rather than the UK dc alias.
    if (!byKey.has(s.key)) byKey.set(s.key, s)
  }

  const abbrIndex = buildAbbrIndex(stitches)

  return {
    stitches,
    paletteStitchesFor: (craft) => paletteStitches.get(craft) ?? [],
    paletteGroupsFor: (craft) => paletteGroups.get(craft) ?? [],
    hasCraft: (craft) => (paletteStitches.get(craft)?.length ?? 0) > 0,
    find: (key) => byKey.get(key),
    yieldOf: (key) => byKey.get(key)?.yieldSts ?? 1,
    resolveAbbr: (abbr) => abbrIndex.get(normaliseAbbrKey(abbr)),
    labelFor: (stitch) => labelFor(stitch, byKey),
    titleFor: (stitch) => titleFor(stitch, byKey),
  }
}

/** An empty catalog for use before Sanity data has loaded. */
export const EMPTY_CATALOG: StitchCatalog = makeCatalog([])

/**
 * Chart cells one application of a stitch occupies, given its `yieldSts`.
 *
 * Usually the two are the same: a stitch leaves one stitch behind and takes
 * one cell, an increase leaves two and takes two. They part company at zero.
 * A chain leaves no stitch in the fabric, but it is still drawn, so it takes
 * a cell — and in the mesh and filet patterns where chains are charted, the
 * row's stated count includes them.
 *
 * Both directions of the conversion go through here. `data/patterns.ts`
 * expands a saved pattern into cells and `data/patternDraft.ts` collapses
 * cells back into a saved pattern; if they disagreed about how much room a
 * stitch takes, a round-trip would pad or truncate every row containing one.
 */
export function chartSpan(yieldSts: number): number {
  return Math.max(1, yieldSts)
}

// -----------------------------------------------------------------------------
// Internal helpers

/**
 * The plain, most-used stitch of a craft — what an unmarked chart position
 * means, and the fallback the freehand ring is drawn in.
 */
export function defaultBaseStitch(catalog: StitchCatalog, craft: Craft): SymbolType {
  const preferred: SymbolType = craft === 'knit' ? 'k' : 'sc'
  const options = catalog.paletteStitchesFor(craft)
  return options.find((s) => s.key === preferred)?.key ?? options[0]?.key ?? preferred
}

function coerceDefinition(row: RawStitchDoc): StitchDefinition | null {
  const key = row.key?.trim()
  if (!key || !isRenderableSymbol(key)) return null
  const group = coerceGroup(row.group)
  if (!group) return null
  const craft = coerceCraft(row.craft)
  if (!craft) return null
  return {
    key,
    docId: row.docId,
    craft,
    abbrPrimary: row.abbrPrimary?.trim() || key,
    aliases: (row.aliases ?? []).map((a) => a.trim()).filter(Boolean),
    name: row.name?.trim() || key,
    description: row.description?.trim() || '',
    group,
    difficulty: coerceDifficulty(row.difficulty),
    yieldSts: typeof row.yieldSts === 'number' && row.yieldSts >= 0 ? row.yieldSts : 1,
    sortOrder: typeof row.sortOrder === 'number' ? row.sortOrder : 999,
    showInPalette: row.showInPalette !== false,
  }
}

function coerceGroup(raw: string | null | undefined): StitchGroup | null {
  return raw && STITCH_GROUP_ORDER.includes(raw as StitchGroup) ? (raw as StitchGroup) : null
}

function coerceDifficulty(raw: string | null | undefined): StitchDifficulty | null {
  return raw === 'basic' || raw === 'intermediate' || raw === 'advanced' ? raw : null
}

function coerceCraft(raw: string | null | undefined): Craft | null {
  return raw && (CRAFTS as string[]).includes(raw) ? (raw as Craft) : null
}

/**
 * Craft leads the ordering so the abbreviation index and `byKey` map resolve
 * deterministically when the two crafts happen to share an abbreviation —
 * crochet sorts first and therefore wins.
 */
function byCraftGroupThenSort(a: StitchDefinition, b: StitchDefinition): number {
  const ci = CRAFTS.indexOf(a.craft) - CRAFTS.indexOf(b.craft)
  if (ci !== 0) return ci
  const gi = STITCH_GROUP_ORDER.indexOf(a.group) - STITCH_GROUP_ORDER.indexOf(b.group)
  if (gi !== 0) return gi
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
  return a.abbrPrimary.localeCompare(b.abbrPrimary)
}

function dedupeByKey(list: StitchDefinition[]): StitchDefinition[] {
  const seen = new Set<string>()
  const out: StitchDefinition[] = []
  for (const s of list) {
    if (seen.has(s.key)) continue
    seen.add(s.key)
    out.push(s)
  }
  return out
}

function buildPaletteGroups(stitches: StitchDefinition[]): StitchPaletteGroup[] {
  return STITCH_GROUP_ORDER.map((group) => ({
    id: group,
    label: STITCH_GROUP_LABELS[group],
    stitches: stitches.filter((s) => s.group === group).map((s) => s.key),
  })).filter((g) => g.stitches.length > 0)
}

function buildAbbrIndex(stitches: StitchDefinition[]): Map<string, SymbolType> {
  const map = new Map<string, SymbolType>()
  for (const s of stitches) {
    for (const variant of abbrVariants(s)) {
      // First writer wins so US docs (sorted earlier) beat UK aliases.
      if (!map.has(variant)) map.set(variant, s.key)
    }
  }
  return map
}

/**
 * Every string that should resolve to this stitch. We include the key, the
 * primary abbreviation, and each alias, along with variants that swap between
 * spaces / hyphens / nothing (so "2 tr", "2-tr" and "2tr" all match).
 */
function abbrVariants(s: StitchDefinition): string[] {
  const seeds = new Set<string>([s.key, s.abbrPrimary, ...s.aliases])
  const out = new Set<string>()
  for (const seed of seeds) {
    const base = normaliseAbbrKey(seed)
    if (!base) continue
    out.add(base)
    out.add(base.replace(/\s+/g, '-'))
    out.add(base.replace(/-/g, ' '))
    out.add(base.replace(/[-\s]+/g, ''))
  }
  return Array.from(out).filter(Boolean)
}

function normaliseAbbrKey(raw: string): string {
  return raw.toLowerCase().trim()
}

function labelFor(stitch: SymbolType | null, byKey: Map<string, StitchDefinition>): string {
  if (stitch === null) return 'Auto'
  if (stitch === 'blank') return 'blank'
  if (stitch === 'unknown') return '?'
  return byKey.get(stitch)?.abbrPrimary ?? String(stitch)
}

function titleFor(stitch: SymbolType | null, byKey: Map<string, StitchDefinition>): string {
  if (stitch === null) return 'Auto (use pattern default)'
  if (stitch === 'blank') return 'Blank (color only, no symbol)'
  if (stitch === 'unknown') return 'Unknown stitch'
  const entry = byKey.get(stitch)
  return entry ? `${entry.abbrPrimary} — ${entry.name}` : String(stitch)
}
