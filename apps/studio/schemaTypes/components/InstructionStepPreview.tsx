import {useEffect, useMemo, useState} from 'react'
import {useClient, type PreviewProps} from 'sanity'

/**
 * Custom preview for `instructionStep` that fetches the referenced
 * `stitchType.abbreviation` values so the summary can show actual stitch
 * names (e.g., "12 tr · 1 sl st") instead of `?` placeholders.
 *
 * Sanity's declarative `preview.select` API doesn't traverse references
 * inside iterated arrays, so `instruction[].stitches[].stitchType`
 * arrives as `{_ref, _type: 'reference'}` with no resolved fields. This
 * component reads the raw instruction array passed through by
 * `prepare` and does one batched GROQ fetch for all the referenced
 * stitchType docs used by the step.
 *
 * While the fetch is in flight (or when it fails) the component falls
 * back to a "?" placeholder just like the sync prepare output would.
 */

type PreviewStitch = {
  _key?: string
  count?: number
  stitchType?: {_ref?: string; abbreviation?: string}
}

type PreviewGroup = {
  _key?: string
  label?: string
  count?: number
  stitches?: PreviewStitch[]
}

type PreviewCount = {size?: string; value?: number}

type Extra = {
  /** Raw instruction groups piped through from `prepare()`. */
  _rawInstruction?: PreviewGroup[]
  /** Raw stitchCount entries piped through from `prepare()`. */
  _rawCounts?: PreviewCount[]
  /** Raw repeatTimes piped through from `prepare()`. */
  _rawRepeatTimes?: number | null
  /** Raw kind piped through from `prepare()` — used to append `× N` on repeat steps. */
  _rawKind?: string | null
  /** Raw label piped through from `prepare()` — used to append `× N` on repeat steps. */
  _rawLabel?: string | null
}

export function InstructionStepPreview(props: PreviewProps & Extra) {
  const {renderDefault, _rawInstruction, _rawCounts, _rawRepeatTimes, _rawKind, _rawLabel} = props
  const groups = useMemo(() => _rawInstruction ?? [], [_rawInstruction])
  const counts = _rawCounts ?? []
  const repeatTimes = _rawRepeatTimes
  const kind = _rawKind ?? null
  const label = _rawLabel ?? null

  const refIds = useMemo(() => extractRefIds(groups), [groups])
  const abbrs = useAbbreviations(refIds)

  const stitchesLine = groups.map((g) => formatGroup(g, abbrs)).filter(Boolean).join(' · ')
  const countsLine = summariseCounts(counts)
  const subtitle = [stitchesLine, countsLine].filter(Boolean).join(' → ') || undefined

  const kindLabel = kind ? kind.charAt(0).toUpperCase() + kind.slice(1) : 'Step'
  const isRepeat = kind === 'repeat' && typeof repeatTimes === 'number' && repeatTimes > 1
  const base = label || kindLabel
  const title = isRepeat ? `${base} × ${repeatTimes}` : base

  return renderDefault({
    ...props,
    title,
    subtitle: subtitle ? truncate(subtitle, 120) : undefined,
  })
}

// -----------------------------------------------------------------------------
// Ref resolution

/**
 * Fetch `abbreviation` for every referenced stitchType in a single GROQ
 * request. Returns a Record keyed by document id.
 *
 * Note: Sanity's HTTP client dedupes identical concurrent requests, so if the
 * same step re-renders (or several steps share the same set of refs) only one
 * query goes over the wire.
 */
function useAbbreviations(refIds: string[]): Record<string, string> {
  const client = useClient({apiVersion: '2024-06-01'})
  const [abbrs, setAbbrs] = useState<Record<string, string>>({})
  const key = refIds.join(',')

  useEffect(() => {
    if (refIds.length === 0) {
      setAbbrs({})
      return
    }
    let cancelled = false
    client
      .fetch<Array<{_id: string; abbreviation: string | null}>>(
        '*[_type == "stitchType" && _id in $ids]{_id, abbreviation}',
        {ids: refIds},
      )
      .then((rows) => {
        if (cancelled) return
        const next: Record<string, string> = {}
        for (const r of rows) if (r.abbreviation) next[r._id] = r.abbreviation
        setAbbrs(next)
      })
      .catch(() => {
        // Ignore; we'll fall back to "?" placeholders in the summary.
      })
    return () => {
      cancelled = true
    }
    // We depend on the stable joined key rather than the array identity so
    // re-renders with the same ids don't re-fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, key])

  return abbrs
}

function extractRefIds(groups: PreviewGroup[]): string[] {
  const seen = new Set<string>()
  for (const g of groups) {
    for (const s of g?.stitches ?? []) {
      const ref = s?.stitchType?._ref
      if (ref) seen.add(ref)
    }
  }
  return Array.from(seen)
}

// -----------------------------------------------------------------------------
// Formatting — mirrors the logic in instructionStep.ts prepare()

function formatGroup(g: PreviewGroup | undefined, abbrs: Record<string, string>): string {
  if (!g) return ''
  const stitches = Array.isArray(g.stitches) ? g.stitches : []
  const inner = stitches
    .map((s) => {
      const abbr =
        s?.stitchType?.abbreviation ??
        (s?.stitchType?._ref ? abbrs[s.stitchType._ref] : undefined) ??
        '?'
      const n = s?.count
      return typeof n === 'number' ? `${n} ${abbr}` : abbr
    })
    .join(', ')
  const body = inner || g.label || ''
  if (!body) return ''
  const count = typeof g.count === 'number' ? g.count : 1
  if (count <= 1) return body
  return stitches.length > 1 ? `(${body}) × ${count}` : `${body} × ${count}`
}

function summariseCounts(counts: PreviewCount[]): string {
  const values = counts
    .map((c) => (typeof c?.value === 'number' ? c.value : null))
    .filter((v): v is number => v !== null)
  if (values.length === 0) return ''
  const min = Math.min(...values)
  const max = Math.max(...values)
  return min === max ? `${min} sts` : `${min}–${max} sts`
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`
}
