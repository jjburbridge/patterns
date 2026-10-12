/**
 * Turning pattern documents into the lines that get printed.
 *
 * Kept free of React and of the PDF renderer so the wording can be checked
 * on its own — the layout is the easy part, deciding what a step should read
 * like is not.
 */

import type {
  PdfCount,
  PdfGauge,
  PdfGroup,
  PdfHook,
  PdfNeedle,
  PdfPattern,
  PdfSize,
  PdfStep,
  PdfYarn,
} from './patternQuery'

// -----------------------------------------------------------------------------
// Encoding

/**
 * The typographic extras WinAnsi provides above Latin-1.
 *
 * The built-in PDF fonts — the Helvetica family used here — are WinAnsi
 * encoded, so they cover Latin-1 plus these and nothing else.
 */
const WINANSI_EXTRAS = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ')

/**
 * Characters patterns reach for that the built-in fonts can't draw.
 *
 * An unencodable character doesn't go missing, it comes out as the wrong
 * glyph: "[12 increases → 24]" printed as "[12 increases ' 24]" before this
 * was added, which reads as nonsense rather than as an obvious gap. The
 * alternative is registering a Unicode webfont, but that means a network
 * fetch that can fail at the moment someone hits export.
 */
const TRANSLITERATIONS: Record<string, string> = {
  '→': '->',
  '←': '<-',
  '↔': '<->',
  '⇒': '=>',
  '⇐': '<=',
  '≈': '~',
  '≠': '!=',
  '≤': '<=',
  '≥': '>=',
  '′': "'",
  '″': '"',
  '⅐': '1/7',
  '⅑': '1/9',
  '⅓': '1/3',
  '⅔': '2/3',
  '⅕': '1/5',
  '⅖': '2/5',
  '⅗': '3/5',
  '⅘': '4/5',
  '⅙': '1/6',
  '⅚': '5/6',
  '⅛': '1/8',
  '⅜': '3/8',
  '⅝': '5/8',
  '⅞': '7/8',
}

function encodable(ch: string): boolean {
  return ch.codePointAt(0)! < 256 || WINANSI_EXTRAS.has(ch)
}

/**
 * Rewrite a string into something the built-in fonts can actually draw.
 *
 * Anything with a clear ASCII reading is transliterated. Anything without one
 * is dropped rather than replaced with a placeholder: a decorative character
 * that silently disappears is a smaller lie than one that prints as a
 * different character entirely.
 */
export function printable(text: string): string {
  let out = ''
  let dropped = false

  for (const ch of text) {
    if (encodable(ch)) {
      out += ch
      continue
    }
    const mapped = TRANSLITERATIONS[ch]
    if (mapped !== undefined) {
      out += mapped
      continue
    }
    // Accented and composed characters often decompose into something Latin-1
    // can hold; if they don't, they fall away.
    const before = out.length
    for (const d of ch.normalize('NFKD')) if (encodable(d)) out += d
    if (out.length === before) dropped = true
  }

  // Removing a character leaves the space that sat beside it, which reads as
  // a typo rather than as an omission — "(4 + 1 + 4 = 9 ✓)" becoming
  // "(4 + 1 + 4 = 9 )". Only touched when something actually went.
  return dropped ? out.replace(/ {2,}/g, ' ').replace(/ +([)\]},.;:!?])/g, '$1') : out
}

/**
 * Apply `printable` to every string in a fetched pattern.
 *
 * Done once at the boundary rather than at each `<Text>`, so a field added to
 * the document later can't quietly reintroduce the problem.
 */
export function printableDeep<T>(value: T): T {
  if (typeof value === 'string') return printable(value) as unknown as T
  if (Array.isArray(value)) return value.map(printableDeep) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = printableDeep(v)
    return out as T
  }
  return value
}

// -----------------------------------------------------------------------------
// Steps

/**
 * How a step is introduced, and the prose that follows it.
 *
 * Patterns in this dataset label steps two ways. Charted ones carry a bare
 * designator — "Row 1" — and keep the stitches in `instruction`. Hand-written
 * ones put the whole sentence in the label: "Rnd 1: Work 12 tr into a magic
 * ring in MC. Sl st to first tr." Printing either of those as a heading
 * unchanged gives you a heading that is sometimes a word and sometimes a
 * paragraph, so the sentence is split off and set as body text.
 *
 * The split is on the first colon, and only when what precedes it is short
 * enough to plausibly be a designator. "Edge round: Ch 1…" splits; a label
 * that happens to contain a colon mid-sentence does not.
 */
const MAX_DESIGNATOR = 28

export function splitStepLabel(step: PdfStep, index: number): {designator: string; prose: string} {
  const label = (step.label ?? '').trim()
  if (!label) return {designator: fallbackDesignator(step, index), prose: ''}

  const colon = label.indexOf(':')
  if (colon > 0 && colon <= MAX_DESIGNATOR) {
    const head = label.slice(0, colon).trim()
    const rest = label.slice(colon + 1).trim()
    if (head && rest) return {designator: head, prose: rest}
  }

  // No usable split: a short label is the designator, a long one is prose
  // that still needs something to sit under.
  if (label.length <= MAX_DESIGNATOR) return {designator: label, prose: ''}
  return {designator: fallbackDesignator(step, index), prose: label}
}

function fallbackDesignator(step: PdfStep, index: number): string {
  switch (step.kind) {
    case 'round':
      return `Rnd ${index}`
    case 'setup':
      return 'Setup'
    case 'repeat':
      return 'Repeat'
    case 'note':
      return 'Note'
    default:
      return `Row ${index}`
  }
}

/**
 * The stitch sequence as a pattern would write it: "2 k, p, 9 k", with a
 * repeated group bracketed as "(sc, 2sc-inc) × 6".
 *
 * Mirrors the Studio preview in `InstructionStepPreview`, so what an author
 * sees while editing is what the PDF prints.
 */
export function formatInstruction(groups: readonly PdfGroup[] | null): string {
  return (groups ?? []).map(formatGroup).filter(Boolean).join(', ')
}

function formatGroup(group: PdfGroup | null): string {
  if (!group) return ''
  const stitches = group.stitches ?? []
  const inner = stitches
    .map((s) => {
      const abbr = s?.abbr ?? '?'
      return typeof s?.count === 'number' && s.count > 1 ? `${s.count} ${abbr}` : abbr
    })
    .join(', ')

  const body = inner || group.label || ''
  if (!body) return ''

  const times = typeof group.count === 'number' ? group.count : 1
  if (times <= 1) return body
  return stitches.length > 1 ? `(${body}) × ${times}` : `${body} × ${times}`
}

/** A stitch count that knows which size it belongs to. */
type ResolvedCount = {label: string; value: number}

type Resolution = {
  counts: ResolvedCount[]
  /** Every size the pattern declares has a count, in declared order. */
  complete: boolean
}

/** A size's multiplier, defaulting to 1 — a zero or missing one grades nothing. */
function multiplierOf(size: PdfSize): number {
  return typeof size.multiplier === 'number' && size.multiplier > 0 ? size.multiplier : 1
}

/**
 * One size's count scaled to another's.
 *
 * Stitches are whole things and a round of none is not a round, so the result
 * is rounded to the nearest and floored at one however small the multiplier.
 *
 * The nudge is for binary floating point: 53 × 1.2 ÷ 0.8 is exactly 79.5 but
 * evaluates to 79.49999999999999, which would round down and lose a stitch on
 * the sizes that land halfway. A relative epsilon is far larger than that
 * error and far smaller than any fraction of a stitch worth keeping.
 */
function scaleCount(value: number, from: number, to: number): number {
  const exact = (value * to) / from
  return Math.max(1, Math.round(exact + exact * 1e-9))
}

/**
 * The entered count the remaining sizes are graded from.
 *
 * The size whose multiplier is 1 is the one the pattern was written for, so
 * it anchors the grading whenever it has a count of its own. Failing that the
 * first entered count does, and scaling by the ratio of the two multipliers
 * keeps the relationship the designer described either way.
 */
function pickAnchor(
  graded: readonly (PdfSize & {label: string})[],
  bySize: ReadonlyMap<string, number>,
): {value: number; multiplier: number} | null {
  const entered = graded
    .filter((s) => bySize.has(s.label))
    .map((s) => ({value: bySize.get(s.label)!, multiplier: multiplierOf(s)}))

  if (entered.length === 0) return null
  return entered.find((e) => e.multiplier === 1) ?? entered[0]
}

/**
 * The stitch counts after a step, across every size the pattern grades to.
 *
 * A count is entered against one size. For a graded step the rest are worked
 * out from it by each size's multiplier, so adding a size to the pattern
 * grades the whole thing rather than leaving forty steps to retype. An
 * entered count always wins over a derived one — the designer knowing better
 * than the arithmetic is the whole reason the field stays editable.
 *
 * Counts come back in the order the pattern declares its sizes, because a
 * graded pattern is read as "S / M / L" throughout.
 */
export function resolveCounts(step: PdfStep, sizes: readonly PdfSize[]): Resolution {
  const graded = sizes.filter((s): s is PdfSize & {label: string} => Boolean(s?.label))

  const entered = (step.counts ?? []).filter(
    (c): c is PdfCount & {value: number} => typeof c?.value === 'number',
  )
  if (entered.length === 0) return {counts: [], complete: false}

  // Nothing to grade against: the entries are all there is to say.
  if (graded.length === 0) {
    return {counts: entered.map((c) => ({label: c.size ?? '', value: c.value})), complete: true}
  }

  const bySize = new Map(entered.map((c) => [c.size ?? '', c.value]))
  const matched = graded.filter((s) => bySize.has(s.label))

  if (matched.length === graded.length) {
    return {
      counts: graded.map((s) => ({label: s.label, value: bySize.get(s.label)!})),
      complete: true,
    }
  }

  const anchor = step.useMultiplier ? pickAnchor(graded, bySize) : null
  if (anchor) {
    return {
      counts: graded.map((s) => {
        const own = bySize.get(s.label)
        return {
          label: s.label,
          value: own ?? scaleCount(anchor.value, anchor.multiplier, multiplierOf(s)),
        }
      }),
      complete: true,
    }
  }

  // Ungraded and incomplete, or a count filed under a size the pattern no
  // longer declares. Keeping the entries beats dropping the only number the
  // step has, but the caller has to say which size each one is for, because
  // position alone no longer tells the reader.
  if (matched.length > 0) {
    return {
      counts: matched.map((s) => ({label: s.label, value: bySize.get(s.label)!})),
      complete: false,
    }
  }
  return {counts: entered.map((c) => ({label: c.size ?? '', value: c.value})), complete: false}
}

/**
 * The stitch counts as they print in the margin.
 *
 * Sizes that all work out to the same number are said once: shaping usually
 * diverges partway through, and "66 / 66 / 66 sts" is noise until it does.
 * When a count is missing for some size, every number is tagged with the size
 * it belongs to, so a partly graded step can't be misread as applying to all.
 *
 * `annotate` turns that tagging off for the case where the whole pattern is
 * graded to one size and the front matter has already said so — see
 * `soleCountSize`.
 */
export function formatCounts(
  step: PdfStep,
  sizes: readonly PdfSize[],
  {annotate = true}: {annotate?: boolean} = {},
): string {
  const {counts, complete} = resolveCounts(step, sizes)
  if (counts.length === 0) return ''

  const values = counts.map((c) => c.value)
  const uniform = values.every((v) => v === values[0])

  if (complete) return uniform ? `${values[0]} sts` : `${values.join(' / ')} sts`
  if (uniform) {
    const tag = annotate && counts[0].label ? ` (${counts[0].label})` : ''
    return `${values[0]} sts${tag}`
  }
  // Mixed sizes are always tagged: position alone can't say which is which.
  return `${counts.map(labelled).join(' / ')} sts`
}

/**
 * The single size every stitch count in the pattern belongs to, if there is
 * one, and the pattern grades to more than that.
 *
 * Sizes get added to a pattern long before the counts are graded for them —
 * a designer declares S/M/L, then works through the steps. Until they do,
 * every count names the one size it was written for, and tagging each of
 * forty rows with the same "(Adult M)" is worse than saying it once up front.
 */
export function soleCountSize(pattern: PdfPattern): string | null {
  const sizes = (pattern.sizes ?? []).filter((s) => s?.label)
  if (sizes.length < 2) return null

  let sole: string | null = null

  for (const section of pattern.sections ?? []) {
    for (const step of section?.steps ?? []) {
      if (!step) continue
      const {counts, complete} = resolveCounts(step, sizes)
      if (counts.length === 0) continue
      // Any fully graded step means the pattern is mixed, and a blanket
      // statement in the front matter would be a lie.
      if (complete || counts.length > 1 || !counts[0].label) return null
      if (sole !== null && sole !== counts[0].label) return null
      sole = counts[0].label
    }
  }

  return sole
}

function labelled(c: ResolvedCount): string {
  return c.label ? `${c.value} (${c.label})` : String(c.value)
}

/** A repeat step says how many times up front; everything else speaks for itself. */
export function formatRepeat(step: PdfStep): string {
  const times = step.repeatTimes
  if (step.kind !== 'repeat' || typeof times !== 'number' || times <= 1) return ''
  return `× ${times}`
}

// -----------------------------------------------------------------------------
// Front matter

export function formatNeedle(n: PdfNeedle): string {
  const size = sizeText(n.sizeMm, n.sizeUs, n.sizeUk)
  const shape = [n.type ? (NEEDLE_TYPES[n.type] ?? n.type) : null, lengthText(n.lengthCm)]
    .filter(Boolean)
    .join(', ')
  return joinParts([size, shape], n.notes)
}

const NEEDLE_TYPES: Record<string, string> = {
  straight: 'straight',
  circular: 'circular',
  dpn: 'double-pointed',
}

export function formatHook(h: PdfHook): string {
  return joinParts([sizeText(h.sizeMm, h.sizeUs, h.sizeUk), h.brand], h.notes)
}

function sizeText(mm: number | null, us: string | null, uk: string | null): string {
  const metric = mm != null ? `${mm} mm` : ''
  const imperial = [us ? `US ${us}` : null, uk ? `UK ${uk}` : null].filter(Boolean).join(' / ')
  if (metric && imperial) return `${metric} (${imperial})`
  return metric || imperial || 'Unspecified size'
}

function lengthText(cm: number | null): string {
  return cm != null ? `${cm} cm` : ''
}

export function formatYarn(y: PdfYarn): string {
  const name = [y.brand, y.name].filter(Boolean).join(' ') || 'Yarn'
  const amount =
    y.quantity != null ? `${y.quantity} ${y.unit ?? ''}`.trim() : y.unit ? `${y.unit}` : ''
  return joinParts([name, y.weight, y.colorway, amount], y.notes)
}

/** "14 sts × 8 rows over 10 cm in UK trebles" — omitting whatever is missing. */
export function formatGauge(g: PdfGauge | null): string {
  if (!g) return ''
  const counts = [
    g.stitches != null ? `${g.stitches} sts` : null,
    g.rows != null ? `${g.rows} rows` : null,
  ]
    .filter(Boolean)
    .join(' × ')
  if (!counts) return g.stitchPattern ?? ''

  const over = g.swatchSize ? ` over ${g.swatchSize}` : ''
  const inPattern = g.stitchPattern ? ` in ${g.stitchPattern}` : ''
  return `${counts}${over}${inPattern}`
}

export function formatSize(size: PdfSize): string {
  return (size.measurements ?? [])
    .filter((m) => m?.value != null)
    .map((m) => `${m.name ?? 'Measurement'} ${m.value}${m.unit ?? ''}`)
    .join(' · ')
}

const SKILL_LEVELS: Record<string, string> = {
  beginner: 'Beginner',
  easy: 'Easy',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
}

/**
 * The line under the title: who wrote it, how hard it is, and — for crochet —
 * which side of the Atlantic the abbreviations come from. Terminology is not
 * a nicety: US and UK use the same abbreviations for different stitches, so a
 * printed crochet pattern that omits it is ambiguous.
 */
export function formatSubtitle(pattern: PdfPattern): string {
  const terms = pattern.terminology ? `${pattern.terminology.toUpperCase()} terms` : null
  return [
    pattern.designer ? `by ${pattern.designer}` : null,
    pattern.skillLevel ? (SKILL_LEVELS[pattern.skillLevel] ?? pattern.skillLevel) : null,
    terms,
  ]
    .filter(Boolean)
    .join('  ·  ')
}

export function patternTitle(pattern: PdfPattern): string {
  const title = (pattern.title ?? '').trim()
  if (title) return title
  return pattern._type === 'knitPattern' ? 'Untitled knit pattern' : 'Untitled crochet pattern'
}

/** A filename that survives being downloaded onto any filesystem. */
export function pdfFilename(pattern: PdfPattern): string {
  const slug =
    patternTitle(pattern)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'pattern'
  return `${slug}.pdf`
}

// -----------------------------------------------------------------------------

function joinParts(parts: (string | null)[], notes: string | null): string {
  const main = parts.filter(Boolean).join(', ')
  return notes ? `${main} — ${notes}` : main
}

/** Steps with nothing in them are an editing artefact, not content. */
export function stepIsEmpty(step: PdfStep): boolean {
  return (
    !(step.label ?? '').trim() &&
    formatInstruction(step.instruction) === '' &&
    !step.chartUrl &&
    (step.counts ?? []).length === 0
  )
}
