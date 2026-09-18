import {useCallback, useEffect, useState} from 'react'
import {useClient} from 'sanity'
import type {PatternListItem, RawPattern} from '../types'
import {API_VERSION} from '../constants'
import {PATTERN_QUERY, summarizePattern} from '../data/patterns'
import type {StitchCatalog} from '../data/stitchCatalog'

export type PatternList = {
  patterns: PatternListItem[]
  loading: boolean
  error: string | null
  refresh: () => void
}

/**
 * Fetch every pattern from Sanity and summarise it into a form the chart
 * tool can consume. The `catalog` is used to expand each round's instruction
 * sequence into a per-position symbol array (see `buildRoundShape`), so the
 * hook re-runs whenever the catalog identity changes.
 */
export function usePatternList(catalog: StitchCatalog): PatternList {
  const client = useClient({apiVersion: API_VERSION})
  const [patterns, setPatterns] = useState<PatternListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    client
      .withConfig({perspective: 'drafts'})
      .fetch<RawPattern[]>(PATTERN_QUERY)
      .then((rows) => {
        if (cancelled) return
        setPatterns(rows.map((p) => summarizePattern(catalog, p)))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load patterns')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [client, catalog, tick])

  return {patterns, loading, error, refresh}
}
