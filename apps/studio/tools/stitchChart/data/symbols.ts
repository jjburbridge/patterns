import type {SymbolType} from '../types'
import type {StitchCatalog} from './stitchCatalog'

/**
 * Best-effort mapping from an abbreviation used in a pattern to a chart
 * symbol key. Prefers explicit `stitchType.chartSymbol` values when they
 * arrive on the pattern; this is only used as a fallback for legacy or
 * ad-hoc abbreviations.
 *
 * The catalog owns the aliases, so this function is a thin wrapper around
 * `catalog.resolveAbbr` that falls back to `unknown` when the abbreviation
 * isn't recognised.
 */
export function normalizeAbbr(catalog: StitchCatalog, abbr: string): SymbolType {
  return catalog.resolveAbbr(abbr) ?? 'unknown'
}
