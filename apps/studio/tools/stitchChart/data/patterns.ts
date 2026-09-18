import type {
  Construction,
  Grid,
  PatternListItem,
  PatternRound,
  PatternSection,
  RawInstructionGroup,
  RawPattern,
  RawPatternStep,
  SymbolType,
} from '../types'
import {MIN_DIM} from '../constants'
import {clampDim, makeBlank} from './grid'
import {chartSpan, type StitchCatalog} from './stitchCatalog'
import {isRenderableSymbol} from './symbolShapes'

/**
 * Patterns are fetched through the `drafts` perspective, so a document that
 * has never been published still appears and an edited one shows its
 * unpublished content — charting is part of drafting, not something you do
 * only once a pattern is finished.
 *
 * The filter deliberately doesn't require a title: an in-progress draft is
 * often several rounds deep before it gets named. It does require some
 * sections, which keeps brand-new empty documents out of the picker.
 *
 * That perspective rewrites `_id` to the published id, so `_originalId` is
 * the only thing left that reveals whether we're looking at draft content.
 */
export const PATTERN_QUERY = /* groq */ `
  *[_type in ["crochetPattern", "knitPattern"] && (defined(title) || count(sections) > 0)]
  | order(title asc) {
    _id,
    _originalId,
    _type,
    title,
    "slug": slug.current,
    "sizeLabels": sizes[].label,
    "sections": sections[]{
      "key": _key,
      title,
      "steps": steps[]{
        _key,
        kind,
        label,
        repeatTimes,
        "counts": stitchCount[]{value},
        "instruction": instruction[]{
          label,
          count,
          "stitches": stitches[]{
            count,
            "abbr": stitchType->abbreviation,
            "symbol": stitchType->chartSymbol
          }
        }
      }
    }
  }
`

export function summarizePattern(catalog: StitchCatalog, p: RawPattern): PatternListItem {
  const sections: PatternSection[] = []
  let patternMaxSts = 0
  let bodyRounds = 0

  const rawSections = p.sections ?? []
  rawSections.forEach((section, i) => {
    const roundList = extractRounds(catalog, section?.steps ?? [])
    const sMaxSts = roundList.reduce((max, r) => Math.max(max, r.totalSts), 0)
    patternMaxSts = Math.max(patternMaxSts, sMaxSts)

    const isBody = (section?.title ?? '').toLowerCase().startsWith('body')
    if (isBody) bodyRounds += roundList.length

    sections.push({
      key: section?.key ?? `section-${i}`,
      title: section?.title ?? `Section ${i + 1}`,
      maxSts: sMaxSts,
      rounds: roundList.length,
      roundList,
      construction: detectConstruction(section?.steps ?? []),
    })
  })

  return {
    id: p._id,
    type: p._type,
    title: patternTitle(p),
    isDraft: String(p._originalId ?? p._id).startsWith('drafts.'),
    sizeLabels: (p.sizeLabels ?? []).map((s) => (s ?? '').trim()).filter(Boolean),
    maxSts: patternMaxSts || MIN_DIM,
    bodyRounds: bodyRounds || 6,
    sections,
  }
}

/**
 * Untitled drafts are common and their ids are meaningless UUIDs, so name
 * them after what they are rather than falling back to the id.
 */
function patternTitle(p: RawPattern): string {
  const explicit = (p.title ?? '').trim()
  if (explicit) return explicit
  const slug = (p.slug ?? '').trim()
  if (slug) return slug
  return p._type === 'knitPattern' ? 'Untitled knit pattern' : 'Untitled crochet pattern'
}

export function extractRounds(catalog: StitchCatalog, steps: RawPatternStep[]): PatternRound[] {
  const rounds: PatternRound[] = []
  for (const step of steps) {
    const times = stepRepeatCount(step)
    if (times === 0) continue

    const totalSts = step.counts?.[0]?.value ?? 0
    if (totalSts <= 0) continue

    const shape = buildRoundShape(catalog, step.instruction ?? [], totalSts)

    for (let i = 0; i < times; i++) {
      const idx = rounds.length + 1
      rounds.push({
        key: `${step._key ?? 'step'}-${i}`,
        index: idx,
        label: step.label ?? `Round ${idx}`,
        totalSts,
        ...shape,
      })
    }
  }
  return rounds
}

/**
 * Decide whether a section is worked flat or in the round from its steps'
 * `kind`. `setup`, `repeat` and `note` steps are neutral — they occur in both
 * constructions — so only explicit rows and rounds vote, and whichever is
 * more common wins. A section with no vote either way is treated as flat,
 * since a grid can represent anything whereas rings only make sense for
 * work that actually spirals outwards.
 */
function detectConstruction(steps: RawPatternStep[]): Construction {
  let rounds = 0
  let rows = 0
  for (const step of steps) {
    if (step?.kind === 'round') rounds++
    else if (step?.kind === 'row') rows++
  }
  return rounds > rows ? 'rounds' : 'rows'
}

function stepRepeatCount(step: RawPatternStep): number {
  if (step?.kind === 'repeat') return Math.max(1, step.repeatTimes ?? 1)
  if (step?.kind === 'round' || step?.kind === 'row' || step?.kind === 'setup') return 1
  return 0
}

/**
 * Walk the instruction groups in order and build a per-position sequence for
 * a round.
 *
 * The instruction shape is `RawInstructionGroup[]`. Each group has:
 *   - `label`  — human-readable phrase (ignored for chart purposes)
 *   - `count`  — how many times to repeat the whole `stitches` sequence
 *   - `stitches[]` — the atomic stitches that make up one iteration
 *
 * For every group we replay `group.stitches` `group.count` times, then split
 * the flattened sequence into the parts that get charted and the parts that
 * frame the round:
 *
 *   - A run of `ch` at the very start is the turning chain, drawn separately
 *     as a radial "seam" rather than as stitches.
 *   - A run of `sl st` at the very end is the join that closes the round.
 *
 * Position matters. A chain in the middle of a row is a real charted stitch —
 * the chain spaces of mesh, filet and lace — so only a leading run is the
 * turning chain. Treating every chain as structural used to erase them from
 * the chart, and `fitToTotal` then backfilled the holes with the round's main
 * stitch, quietly turning `2 sc, 2 ch, sc, ch` into a row of plain sc.
 *
 * Each remaining stitch fills `count × chartSpan(...)` positions, so an
 * increase at yield 2 takes the two cells it produces and a chain takes the
 * one it is drawn in.
 *
 * If the sequence ends up shorter than `totalSts` — because the pattern is a
 * summary rather than a literal stitch-by-stitch list — we pad with the
 * round's primary symbol so the chart stays complete, and truncate if longer.
 */
function buildRoundShape(catalog: StitchCatalog, groups: RawInstructionGroup[], totalSts: number) {
  const flat = flattenInstruction(catalog, groups)

  let first = 0
  let chStart = 0
  while (first < flat.length && flat[first].abbr === 'ch') chStart += flat[first++].count

  let last = flat.length
  let slStEnd = 0
  while (last > first && isJoinAbbr(flat[last - 1].abbr)) slStEnd += flat[--last].count

  const positions: SymbolType[] = []
  let primaryAbbr = 'dc'
  let primarySymbol: SymbolType | null = null
  let primaryYield = 0

  for (let i = first; i < last; i++) {
    const {abbr, symbol, count} = flat[i]
    if (!symbol) continue

    const span = chartSpan(catalog.yieldOf(symbol))
    const yielded = count * span
    for (let n = 0; n < yielded; n++) positions.push(symbol)

    if (yielded > primaryYield) {
      primaryYield = yielded
      primaryAbbr = abbr || 'dc'
      primarySymbol = symbol
    }
  }

  const filled = fitToTotal(positions, totalSts, primarySymbol)
  return {positions: filled, primaryAbbr, primarySymbol, chStart, slStEnd}
}

type FlatStitch = {abbr: string; symbol: SymbolType | null; count: number}

/** Replay every group's repeats into one flat stitch-by-stitch sequence. */
function flattenInstruction(catalog: StitchCatalog, groups: RawInstructionGroup[]): FlatStitch[] {
  const flat: FlatStitch[] = []
  for (const group of groups) {
    const repeats = groupRepeatCount(group)
    const stitches = group?.stitches ?? []
    for (let r = 0; r < repeats; r++) {
      for (const stitch of stitches) {
        const abbr = (stitch?.abbr ?? '').toLowerCase().trim()
        const count = typeof stitch?.count === 'number' ? stitch.count : 0
        if (count <= 0) continue
        flat.push({abbr, symbol: resolveSymbol(catalog, stitch?.symbol, abbr), count})
      }
    }
  }
  return flat
}

function isJoinAbbr(abbr: string): boolean {
  return abbr === 'sl st' || abbr === 'ss'
}

function groupRepeatCount(group: RawInstructionGroup | undefined | null): number {
  const n = group?.count
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 1) return 1
  return Math.floor(n)
}

function fitToTotal(
  positions: SymbolType[],
  totalSts: number,
  fallback: SymbolType | null,
): SymbolType[] {
  if (totalSts <= 0) return []
  if (positions.length === totalSts) return positions
  if (positions.length === 0) {
    return Array.from({length: totalSts}, () => fallback ?? 'unknown')
  }
  if (positions.length > totalSts) return positions.slice(0, totalSts)
  const pad = fallback ?? positions[positions.length - 1]
  const out = positions.slice()
  while (out.length < totalSts) out.push(pad)
  return out
}

/**
 * Prefer the explicit `chartSymbol` denormalised onto the pattern by the
 * GROQ query, falling back to abbreviation resolution when it's missing.
 */
function resolveSymbol(
  catalog: StitchCatalog,
  explicit: string | null | undefined,
  abbr: string,
): SymbolType | null {
  if (explicit && typeof explicit === 'string') {
    const key = explicit.trim()
    if (isRenderableSymbol(key)) return key
  }
  return catalog.resolveAbbr(abbr) ?? null
}

/** True when a section should be charted as rings rather than as a grid. */
export function worksInRounds(section: PatternSection | null | undefined): boolean {
  return Boolean(section && section.construction === 'rounds' && section.roundList.length > 0)
}

/**
 * Lay a flat section's steps out on the grid so the chart opens showing the
 * pattern rather than an empty canvas.
 *
 * Charts are worked bottom-up and read right-to-left, so the first step
 * becomes the bottom row and its first stitch the rightmost column — the
 * same order `gridToRows` reads the grid back in, so a seeded chart
 * round-trips. Rows shorter than the widest one leave blanks on the left.
 */
export function sectionToGrid(section: PatternSection, width: number, height: number): Grid {
  const grid = makeBlank(width, height)
  section.roundList.forEach((step, stepIndex) => {
    const r = height - 1 - stepIndex
    if (r < 0) return
    step.positions.forEach((symbol, position) => {
      const c = width - 1 - position
      if (c < 0) return
      grid[r][c] = {color: null, stitch: symbol}
    })
  })
  return grid
}

export function defaultDimsForSection(
  section: PatternSection,
  patternMaxSts: number,
): {width: number; height: number} {
  if (section.maxSts > 0 && section.rounds > 0) {
    return {
      width: clampDim(section.maxSts, 9),
      height: clampDim(section.rounds, 6),
    }
  }
  return {
    width: clampDim(Math.min(patternMaxSts || 9, 12), 9),
    height: 6,
  }
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
