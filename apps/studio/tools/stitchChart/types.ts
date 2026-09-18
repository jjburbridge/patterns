export type ViewMode = 'grid' | 'ring'

/** The crafts the tool can chart. Matches `stitchType.craft` in Sanity. */
export type Craft = 'crochet' | 'knit'

export const CRAFTS: Craft[] = ['crochet', 'knit']

export const CRAFT_LABELS: Record<Craft, string> = {
  crochet: 'Crochet',
  knit: 'Knit',
}

/**
 * The full set of chart-symbol keys the tool can render. Derived from the
 * `SHAPES` registry in `data/symbolShapes.tsx` — that file is the single
 * source of truth for which symbols exist.
 */
export type {SymbolType} from './data/symbolShapes'
import type {SymbolType} from './data/symbolShapes'

/** A single stitch in the freehand grid. `color: null` = blank/MC. */
export type GridCell = {
  color: string | null
  stitch: SymbolType | null
}
export type Grid = GridCell[][]

/** Painted override for a single position in the ring chart. */
export type RingOverride = {
  color: string | null
  stitch: SymbolType | null
}
/** Keyed as `${roundIndex}:${stitchIndex}`. */
export type RingOverrides = Record<string, RingOverride>

/**
 * The shape of a freehand ring chart — used when no pattern section is
 * supplying rounds, so the chart has to be described rather than derived.
 */
export type RingSpec = {
  /** Rounds worked outward from the magic ring. */
  rounds: number
  /** Stitches in round 1. */
  startSts: number
  /**
   * `circle` adds another `startSts` stitches on every round, the standard
   * flat-circle increase; `tube` keeps every round at `startSts`.
   */
  shape: 'circle' | 'tube'
}

/** The paint currently loaded on the palette. `null` means "unset". */
export type Paint = {
  color: string | null
  stitch: SymbolType | null
}

export type Preset = {
  id: string
  label: string
  width: number
  height: number
  cells: Grid
}

/** One atomic stitch inside an instruction group, as returned by GROQ. */
export type RawInstructionStitch = {
  count: number | null
  abbr: string | null
  /** Optional explicit `stitchType.chartSymbol` override for this stitch. */
  symbol: string | null
}

/**
 * One group of stitches within a step's `instruction[]` array. `count` is
 * the number of times the whole `stitches` sequence repeats — so `{count: 6,
 * stitches: [sc, 2sc-inc]}` describes twelve chart positions.
 */
export type RawInstructionGroup = {
  label: string | null
  count: number | null
  stitches: RawInstructionStitch[] | null
}

export type RawPatternStep = {
  _key: string | null
  kind: string | null
  label: string | null
  repeatTimes: number | null
  counts: Array<{value: number | null}> | null
  instruction: RawInstructionGroup[] | null
}

export type RawPatternSection = {
  key: string | null
  title: string | null
  steps: RawPatternStep[] | null
}

export type RawPattern = {
  _id: string
  /**
   * The unrewritten document id. Under the `drafts` perspective `_id` is the
   * published id even for draft content, so this is what carries the
   * `drafts.` prefix.
   */
  _originalId: string | null
  _type: 'crochetPattern' | 'knitPattern'
  title: string | null
  slug: string | null
  sizeLabels: (string | null)[] | null
  sections: RawPatternSection[] | null
}

export type PatternRound = {
  key: string
  index: number
  label: string
  totalSts: number
  /**
   * The resolved chart symbol for every ring position on this round, built by
   * walking the instruction in order and expanding each entry by
   * `count × yieldSts`. Length equals `totalSts`.
   */
  positions: SymbolType[]
  /** The dominant stitch abbreviation used in the round (for stats display). */
  primaryAbbr: string
  /** Resolved chart symbol for the dominant stitch, if the doc provides one. */
  primarySymbol: SymbolType | null
  chStart: number
  slStEnd: number
}

/**
 * How a section is worked. Flat pieces are charted on a grid; pieces worked
 * in the round are charted as concentric rings.
 */
export type Construction = 'rows' | 'rounds'

export type PatternSection = {
  key: string
  title: string
  maxSts: number
  rounds: number
  roundList: PatternRound[]
  construction: Construction
}

export type PatternListItem = {
  id: string
  type: RawPattern['_type']
  title: string
  /** True when the content being charted is unpublished. */
  isDraft: boolean
  /**
   * Sizes declared on the pattern. A step's stitch count has to name one of
   * these, so appending a section to this pattern has to pick from them.
   */
  sizeLabels: string[]
  maxSts: number
  bodyRounds: number
  sections: PatternSection[]
}

export type StoreEntry = {
  width: number
  height: number
  cells: Grid
  ringOverrides: RingOverrides
  /** Only meaningful for charts with no pattern section behind them. */
  ringSpec?: RingSpec
}
export type Store = Record<string, StoreEntry>
