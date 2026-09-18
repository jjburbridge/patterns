/**
 * Turn the tool's in-memory chart into a `crochetPattern` / `knitPattern`
 * document payload.
 *
 * This is the inverse of `data/patterns.ts`, which reads pattern documents
 * and expands them into per-position chart symbols. Here we collapse a
 * per-position symbol sequence back into the structured instruction shape
 * the schema expects:
 *
 *   pattern → sections[] → steps[] (instructionStep)
 *                        → instruction[] (instructionGroup)
 *                        → stitches[] (stitchRef → stitchType reference)
 *
 * Everything in this module is pure so the conversion can be reasoned about
 * (and previewed in the dialog) without touching the network. Resolving a
 * chart symbol to an actual `stitchType` document is delegated to a
 * `StitchResolver` supplied by the caller, because which document a symbol
 * maps to depends on the craft of the pattern being created.
 */

import type {Craft, Grid, PatternRound, RingOverrides, SymbolType} from '../types'
import {slugify} from './patterns'
import {chartSpan} from './stitchCatalog'

export type PatternCraft = Craft

/** Which `instructionStep.kind` the generated steps use. */
export type StepKind = 'row' | 'round'

/**
 * Occupies a chart position but is never worked, so it contributes neither a
 * stitch reference nor a stitch count.
 */
const NON_STITCH_SYMBOLS: ReadonlySet<string> = new Set(['no-stitch'])

/**
 * Means "a stitch is worked here but the chart doesn't say which" — a
 * colour-only cell in a duplicate-stitch grid, or an unrecognised symbol.
 * These become the base stitch chosen in the dialog so the counts stay right.
 */
const UNSPECIFIED_SYMBOLS: ReadonlySet<string> = new Set(['blank', 'unknown'])

/** One chart row/round, flattened to the stitches actually worked in it. */
export type ChartRow = {
  label: string
  /** Worked stitches in reading order. Length is the row's stitch count. */
  symbols: SymbolType[]
  /** Turning chains worked at the start of the round (ring charts only). */
  chStart?: number
  /** Slip stitches joining the round (ring charts only). */
  slStEnd?: number
}

/** What a chart symbol maps to in Sanity, for the craft being created. */
export type ResolvedStitch = {
  docId: string
  abbr: string
  /** Chart positions one application of this stitch produces. */
  yieldSts: number
}

export type StitchResolver = (symbol: SymbolType) => ResolvedStitch | undefined

/** Everything needed to turn chart rows into one `patternSection`. */
export type SectionDraftOptions = {
  craft: PatternCraft
  sectionTitle: string
  stepKind: StepKind
  /**
   * Which of the pattern's sizes the generated stitch counts belong to.
   * `stitchCountEntry.size` has to match a label declared on the parent
   * pattern, so when appending to an existing one this must come from that
   * document rather than being invented here.
   */
  sizeLabel: string
}

export type PatternDraftOptions = SectionDraftOptions & {
  title: string
  designer?: string
  description?: string
}

export type PatternSectionDraft = {
  section: Record<string, unknown>
  /** Symbols with no `stitchType` document for the target craft. */
  unresolved: SymbolType[]
  /** Total worked stitches across every step in the section. */
  stitchTotal: number
}

export type PatternDraftDoc = {
  _id: string
  _type: 'crochetPattern' | 'knitPattern'
  [key: string]: unknown
}

export type PatternDraftResult = {
  doc: PatternDraftDoc
  /** Symbols with no `stitchType` document for the target craft. */
  unresolved: SymbolType[]
  /** Total worked stitches across every step. */
  stitchTotal: number
}

// -----------------------------------------------------------------------------
// Chart state → rows

/**
 * Flatten the freehand grid into rows.
 *
 * The grid is stored top-down and rendered with columns numbered from the
 * right, but a chart is worked bottom-up and read right-to-left — so we walk
 * rows in reverse and each row's columns in reverse to match the order the
 * stitches are actually made in.
 */
export function gridToRows(
  cells: Grid,
  opts: {baseStitch: SymbolType; stepKind: StepKind},
): ChartRow[] {
  const rows: ChartRow[] = []
  for (let r = cells.length - 1; r >= 0; r--) {
    const row = cells[r] ?? []
    const symbols: SymbolType[] = []
    for (let c = row.length - 1; c >= 0; c--) {
      const symbol = row[c]?.stitch ?? null
      if (symbol && NON_STITCH_SYMBOLS.has(symbol)) continue
      const worked = symbol && !UNSPECIFIED_SYMBOLS.has(symbol) ? symbol : opts.baseStitch
      symbols.push(worked)
    }
    rows.push({label: `${stepNoun(opts.stepKind)} ${rows.length + 1}`, symbols})
  }
  return rows
}

/**
 * Flatten a ring chart into rows, with any painted overrides applied on top
 * of the symbols derived from the source pattern.
 *
 * Ring overrides are keyed by the round's 1-based `index` (not its position
 * in the array) — see `RingChartSvg`, which is what writes them.
 */
export function ringToRows(rounds: readonly PatternRound[], overrides: RingOverrides): ChartRow[] {
  return rounds.map((round) => {
    const symbols: SymbolType[] = []
    for (let s = 0; s < round.totalSts; s++) {
      const painted = overrides[`${round.index}:${s}`]?.stitch
      const symbol = painted ?? round.positions[s] ?? round.primarySymbol ?? 'unknown'
      if (NON_STITCH_SYMBOLS.has(symbol)) continue
      symbols.push(symbol)
    }
    return {
      label: round.label,
      symbols,
      chStart: round.chStart,
      slStEnd: round.slStEnd,
    }
  })
}

function stepNoun(kind: StepKind): string {
  return kind === 'round' ? 'Rnd' : 'Row'
}

// -----------------------------------------------------------------------------
// Rows → document

/**
 * Build a single `patternSection` from chart rows.
 *
 * Kept separate from the document around it so the same rows can either
 * start a new pattern or be appended to one that already exists — a pattern
 * is built up a section at a time, and the tool charts one section at a time.
 */
export function buildPatternSection(
  rows: readonly ChartRow[],
  opts: SectionDraftOptions,
  resolve: StitchResolver,
): PatternSectionDraft {
  const unresolved = new Set<SymbolType>()
  let stitchTotal = 0

  const steps = rows.map((row) => {
    const instruction: Record<string, unknown>[] = []

    if (row.chStart && row.chStart > 0) {
      instruction.push(makeGroup([{symbol: 'ch', count: row.chStart}], 1, resolve, unresolved))
    }

    const runs = collapseToWorked(row.symbols, resolve)
    if (runs.length > 0) {
      const {cycle, times} = extractCycle(runs)
      instruction.push(makeGroup(cycle, times, resolve, unresolved))
    }

    if (row.slStEnd && row.slStEnd > 0) {
      instruction.push(makeGroup([{symbol: 'sl st', count: row.slStEnd}], 1, resolve, unresolved))
    }

    const worked = countResulting(runs, resolve)
    stitchTotal += worked

    return {
      _type: 'instructionStep',
      _key: newKey(),
      kind: opts.stepKind,
      label: row.label,
      instruction,
      useMultiplier: false,
      // `stitchCountEntry.value` must be positive, so a row with nothing
      // worked in it (all "no stitch") carries no count at all.
      ...(worked > 0
        ? {
            stitchCount: [
              {
                _type: 'stitchCountEntry',
                _key: newKey(),
                size: opts.sizeLabel,
                value: worked,
              },
            ],
          }
        : {}),
    }
  })

  const section = {
    _type: 'patternSection',
    _key: newKey(),
    title: opts.sectionTitle,
    steps,
  }

  return {
    section,
    unresolved: Array.from(unresolved),
    stitchTotal,
  }
}

export function buildPatternDocument(
  rows: readonly ChartRow[],
  opts: PatternDraftOptions,
  resolve: StitchResolver,
): PatternDraftResult {
  const {section, unresolved, stitchTotal} = buildPatternSection(rows, opts, resolve)

  const doc: PatternDraftDoc = {
    // Created as a draft so the pattern lands in the author's workflow for
    // review rather than going straight live.
    _id: `drafts.${newId()}`,
    _type: opts.craft === 'knit' ? 'knitPattern' : 'crochetPattern',
    title: opts.title,
    slug: {_type: 'slug', current: slugify(opts.title) || 'untitled-pattern'},
    ...(opts.designer ? {designer: opts.designer} : {}),
    ...(opts.description ? {description: opts.description} : {}),
    // Chart symbols follow US convention; the UK equivalents live on the
    // stitchType documents as aliases.
    ...(opts.craft === 'crochet' ? {terminology: 'us'} : {}),
    sizes: [
      {
        _type: 'sizeOption',
        _key: newKey(),
        label: opts.sizeLabel,
        multiplier: 1,
      },
    ],
    sections: [section],
  }

  return {doc, unresolved, stitchTotal}
}

/**
 * Build one `instructionGroup` from a run sequence repeated `times` times.
 *
 * The group's `label` holds only the sequence itself ("sc, 2sc-inc") — the
 * repeat count lives in `count`, and the schema's preview renders it as a
 * "× N" suffix, so including it in the label too would double it up.
 */
function makeGroup(
  runs: readonly Run[],
  times: number,
  resolve: StitchResolver,
  unresolved: Set<SymbolType>,
): Record<string, unknown> {
  const stitches: Record<string, unknown>[] = []

  for (const run of runs) {
    const hit = resolve(run.symbol)
    if (!hit) {
      unresolved.add(run.symbol)
      continue
    }
    stitches.push({
      _type: 'stitchRef',
      _key: newKey(),
      stitchType: {_type: 'reference', _ref: hit.docId},
      count: run.count,
    })
  }

  return {
    _type: 'instructionGroup',
    _key: newKey(),
    // Fall back to the raw symbol key so the label still reads sensibly even
    // when the craft has no matching stitchType document.
    label: formatRunList(runs, (symbol) => resolve(symbol)?.abbr ?? symbol),
    count: times,
    sizeDependentCount: false,
    ...(stitches.length > 0 ? {stitches} : {}),
  }
}

// -----------------------------------------------------------------------------
// Human-readable rendering

/**
 * Render a row the way it will read once saved.
 *
 * Shares the compression used by `buildPatternDocument`, so the preview shown
 * in the save dialog can't drift from the document that actually gets
 * written.
 */
export function describeRow(row: ChartRow, resolve: StitchResolver): string {
  const labelOf = (symbol: SymbolType) => resolve(symbol)?.abbr ?? symbol
  const parts: string[] = []
  if (row.chStart && row.chStart > 0) {
    parts.push(formatRuns([{symbol: 'ch', count: row.chStart}], 1, labelOf))
  }
  const runs = collapseToWorked(row.symbols, resolve)
  if (runs.length > 0) {
    const {cycle, times} = extractCycle(runs)
    parts.push(formatRuns(cycle, times, labelOf))
  }
  if (row.slStEnd && row.slStEnd > 0) {
    parts.push(formatRuns([{symbol: 'sl st', count: row.slStEnd}], 1, labelOf))
  }
  return parts.join(', ')
}

function formatRunList(runs: readonly Run[], labelOf: (symbol: SymbolType) => string): string {
  return runs
    .map((run) => {
      const abbr = labelOf(run.symbol)
      return run.count > 1 ? `${run.count} ${abbr}` : abbr
    })
    .join(', ')
}

function formatRuns(
  runs: readonly Run[],
  times: number,
  labelOf: (symbol: SymbolType) => string,
): string {
  const inner = formatRunList(runs, labelOf)
  if (times <= 1) return inner
  return runs.length > 1 ? `(${inner}) × ${times}` : `${inner} × ${times}`
}

// -----------------------------------------------------------------------------
// Sequence compression

/** A worked stitch and how many times it is worked consecutively. */
type Run = {symbol: SymbolType; count: number}

/**
 * Turn a per-position symbol sequence back into worked stitches, run-length
 * encoded.
 *
 * A stitch that yields several chart positions is drawn as that many adjacent
 * copies of its symbol — an increase worked into one stitch produces two, so
 * the ring shows `2sc-inc` twice. Reversing that here is what makes a saved
 * pattern read back as the same chart: without it every increase would double
 * the stitch count each time the pattern round-trips through the tool.
 *
 * A run too short to fill a whole stitch (an odd number of positions for a
 * two-position symbol, say) still counts as one worked stitch — the chart is
 * ambiguous at that point and dropping it would be worse than rounding up.
 */
function collapseToWorked(symbols: readonly SymbolType[], resolve: StitchResolver): Run[] {
  const runs: Run[] = []
  let i = 0
  while (i < symbols.length) {
    const symbol = symbols[i]
    const span = spanOf(symbol, resolve)

    let consumed = 0
    while (consumed < span && symbols[i + consumed] === symbol) consumed++
    i += consumed

    const last = runs[runs.length - 1]
    if (last && last.symbol === symbol) last.count += 1
    else runs.push({symbol, count: 1})
  }
  return runs
}

/**
 * The count a row carries in `instructionStep.stitchCount`, which is also the
 * width the chart is redrawn at when the pattern is read back.
 *
 * This counts worked stitches by the room they take on the chart rather than
 * by painted cells, so an increase counts once for each of the stitches it
 * leaves — a round drawn as a grid then reads back as the same ring. A
 * charted chain counts for the cell it occupies even though it leaves no
 * stitch, since it is part of the row as drawn. Turning chains are not in
 * `symbols` at all; they are held separately as `chStart`.
 */
export function countRowStitches(row: ChartRow, resolve: StitchResolver): number {
  return countResulting(collapseToWorked(row.symbols, resolve), resolve)
}

function countResulting(runs: readonly Run[], resolve: StitchResolver): number {
  return runs.reduce((sum, run) => sum + run.count * spanOf(run.symbol, resolve), 0)
}

/** Chart cells one application of a symbol occupies. */
function spanOf(symbol: SymbolType, resolve: StitchResolver): number {
  const y = resolve(symbol)?.yieldSts
  return chartSpan(typeof y === 'number' && y >= 0 ? y : 1)
}

/**
 * Factor a run sequence into its shortest repeating cycle, so a round worked
 * as `sc, inc, sc, inc, sc, inc` is stored the way a pattern would write it —
 * `*sc, 2sc-inc* six times` — rather than as a flat list.
 *
 * Only whole-number divisions of the sequence count as a repeat; anything
 * else is returned unfactored with `times: 1`.
 */
function extractCycle(runs: readonly Run[]): {cycle: Run[]; times: number} {
  const n = runs.length
  for (let len = 1; len <= n / 2; len++) {
    if (n % len !== 0) continue
    let matches = true
    for (let i = len; i < n && matches; i++) {
      const a = runs[i]
      const b = runs[i % len]
      if (a.symbol !== b.symbol || a.count !== b.count) matches = false
    }
    if (matches) return {cycle: runs.slice(0, len), times: n / len}
  }
  return {cycle: runs.slice(), times: 1}
}

// -----------------------------------------------------------------------------
// Ids

function newId(): string {
  return crypto.randomUUID()
}

function newKey(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}
