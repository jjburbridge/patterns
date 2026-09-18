import {useCallback, useEffect, useMemo, useState} from 'react'
import {useClient} from 'sanity'
import {API_VERSION} from '../constants'
import {
  EMPTY_CATALOG,
  makeCatalog,
  STITCH_QUERY,
  type RawStitchDoc,
  type StitchCatalog,
} from '../data/stitchCatalog'

export type StitchCatalogState = {
  catalog: StitchCatalog
  loading: boolean
  error: string | null
  refresh: () => void
}

/**
 * Fetch every crochet `stitchType` document from Sanity and assemble it into
 * a runtime catalog. Draft docs are included so the tool reflects changes
 * before publish.
 */
export function useStitchCatalog(): StitchCatalogState {
  const client = useClient({apiVersion: API_VERSION})
  const [catalog, setCatalog] = useState<StitchCatalog>(EMPTY_CATALOG)
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
      .fetch<RawStitchDoc[]>(STITCH_QUERY)
      .then((rows) => {
        if (cancelled) return
        setCatalog(makeCatalog(rows))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load stitch catalog')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [client, tick])

  return useMemo(() => ({catalog, loading, error, refresh}), [catalog, loading, error, refresh])
}
