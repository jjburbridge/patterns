import {createContext, useContext, type ReactNode} from 'react'
import {EMPTY_CATALOG, type StitchCatalog} from '../data/stitchCatalog'

const StitchCatalogContext = createContext<StitchCatalog>(EMPTY_CATALOG)

export function StitchCatalogProvider({
  catalog,
  children,
}: {
  catalog: StitchCatalog
  children: ReactNode
}) {
  return (
    <StitchCatalogContext.Provider value={catalog}>{children}</StitchCatalogContext.Provider>
  )
}

/**
 * Access the current stitch catalog. Returns `EMPTY_CATALOG` when no provider
 * is mounted (e.g., in tests or during initial hydration) so callers can
 * always destructure without null-checking.
 */
export function useCatalog(): StitchCatalog {
  return useContext(StitchCatalogContext)
}
