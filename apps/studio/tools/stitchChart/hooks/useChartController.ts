import {useCallback, useEffect, useMemo, useState} from 'react'
import type {
  Grid,
  GridCell,
  PatternListItem,
  PatternRound,
  PatternSection,
  RingOverride,
  RingOverrides,
  RingSpec,
  SymbolType,
  ViewMode,
} from '../types'
import {FREEHAND_KEY} from '../constants'
import {
  cloneGrid,
  clampDim,
  gridGeometry,
  gridHasContent,
  isBlank,
  LETTER_A_9x6,
  makeBlank,
  PRESETS,
  resizeGrid,
  setGridCell,
} from '../data/grid'
import {loadStore, saveStore} from '../data/storage'
import {defaultDimsForSection, sectionToGrid, slugify, worksInRounds} from '../data/patterns'
import {DEFAULT_RING_SPEC, makeFreehandRounds, normaliseRingSpec} from '../data/ring'
import {computeRingGeometry, type RingGeometry} from '../data/geometry'

export type ChartController = {
  // chart state
  chartKey: string
  width: number
  height: number
  cells: Grid
  ringOverrides: RingOverrides
  viewMode: ViewMode
  presetId: string

  // pattern selection
  selectedPatternId: string
  selectedSectionKey: string
  selectedPattern: PatternListItem | null
  selectedSection: PatternSection | null
  ringSupported: boolean
  /** True when the grid can be re-seeded from the selected section. */
  canResetToPattern: boolean

  // ring contents
  /** The rounds the ring view draws — from the section, or freehand. */
  ringRounds: PatternRound[]
  /** True when there's no section driving the ring, so its shape is editable. */
  ringEditable: boolean
  ringSpec: RingSpec

  // grid geometry
  cellSize: number
  gridPadTop: number
  gridPadLeft: number
  gridInnerW: number
  gridInnerH: number
  gridSvgWidth: number
  gridSvgHeight: number
  colStride: number
  rowStride: number

  // ring geometry
  ringGeom: RingGeometry

  // shared svg dims (drives export sizing)
  svgWidth: number
  svgHeight: number

  // derived text
  contextLabel: string
  filenameSuffix: string

  // grid stats
  paintedCount: number
  paintedPerRow: Array<{round: number; count: number}>

  // ring stats
  ringOverrideCount: number

  // actions
  setViewMode: (m: ViewMode) => void
  onWidthChange: (raw: string) => void
  onHeightChange: (raw: string) => void
  setCell: (r: number, c: number, cell: GridCell) => void
  setRingOverride: (roundIndex: number, stitchIndex: number, override: RingOverride | null) => void
  clearAll: () => void
  resetToPattern: () => void
  updateRingSpec: (patch: Partial<RingSpec>) => void
  loadPreset: (id: string) => void
  applyPattern: (id: string) => void
  applySection: (sectionKey: string) => void
  clearPattern: () => void
}

/**
 * @param baseStitch The stitch a freehand ring is drawn in before the user
 *   paints over it — craft-dependent, so it's supplied by the caller.
 */
export function useChartController(
  patterns: PatternListItem[],
  baseStitch: SymbolType,
): ChartController {
  const [chartKey, setChartKey] = useState<string>(FREEHAND_KEY)
  const [width, setWidth] = useState(9)
  const [height, setHeight] = useState(6)
  const [cells, setCells] = useState<Grid>(() => cloneGrid(LETTER_A_9x6))
  const [ringOverrides, setRingOverrides] = useState<RingOverrides>({})
  const [ringSpec, setRingSpec] = useState<RingSpec>(DEFAULT_RING_SPEC)
  const [presetId, setPresetId] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedPatternId, setSelectedPatternId] = useState('')
  const [selectedSectionKey, setSelectedSectionKey] = useState('')

  // Restore the last freehand chart on mount, if any.
  useEffect(() => {
    const entry = loadStore()[FREEHAND_KEY]
    if (!entry) return
    setWidth(entry.width)
    setHeight(entry.height)
    setCells(cloneGrid(entry.cells))
    setRingOverrides({...entry.ringOverrides})
    if (entry.ringSpec) setRingSpec(entry.ringSpec)
  }, [])

  // Auto-save on every chart change, keyed by the current chart context.
  useEffect(() => {
    const store = loadStore()
    store[chartKey] = {width, height, cells, ringOverrides, ringSpec}
    saveStore(store)
  }, [chartKey, width, height, cells, ringOverrides, ringSpec])

  const selectedPattern = useMemo(
    () => patterns.find((p) => p.id === selectedPatternId) ?? null,
    [patterns, selectedPatternId],
  )
  const selectedSection = useMemo(
    () => selectedPattern?.sections.find((s) => s.key === selectedSectionKey) ?? null,
    [selectedPattern, selectedSectionKey],
  )
  // With no section behind the chart there is nothing to derive rounds from,
  // so the ring is described by `ringSpec` and is always available.
  const ringEditable = selectedSection === null
  const freehandRounds = useMemo(
    () => makeFreehandRounds(ringSpec, baseStitch),
    [ringSpec, baseStitch],
  )
  const ringRounds = selectedSection ? selectedSection.roundList : freehandRounds
  const ringSupported = ringEditable || worksInRounds(selectedSection)

  // If ring mode is active but the current section can't support it, snap back to grid.
  useEffect(() => {
    if (!ringSupported && viewMode === 'ring') setViewMode('grid')
  }, [ringSupported, viewMode])

  const updateRingSpec = useCallback((patch: Partial<RingSpec>) => {
    setRingSpec((prev) => normaliseRingSpec({...prev, ...patch}))
  }, [])

  /**
   * Load the saved state for a chart key, falling back to `seed` (the
   * pattern's own stitches) and then to a blank canvas. Saved edits win, so
   * switching away from a chart and back doesn't discard work.
   *
   * An empty saved grid is not an edit worth keeping, though: every section
   * gets saved the moment it is opened, so without this a section visited
   * once — before it had anything to seed from — would show blank forever.
   */
  const switchChart = useCallback(
    (newKey: string, dims: {width: number; height: number}, seed?: Grid | null) => {
      const existing = loadStore()[newKey]
      const edited = existing && (!seed || gridHasContent(existing.cells))
      const w = (edited ? existing.width : undefined) ?? dims.width
      const h = (edited ? existing.height : undefined) ?? dims.height
      const nextCells = edited
        ? cloneGrid(existing.cells)
        : seed
          ? resizeGrid(seed, w, h)
          : makeBlank(w, h)
      setChartKey(newKey)
      setWidth(w)
      setHeight(h)
      setCells(nextCells)
      // Ring overrides live alongside the grid rather than in it, so they are
      // restored whether or not the grid itself had anything in it.
      setRingOverrides(existing ? {...existing.ringOverrides} : {})
      setRingSpec(existing?.ringSpec ?? DEFAULT_RING_SPEC)
    },
    [],
  )

  /**
   * Open a section in whichever view matches how it is worked: rounds are
   * charted as rings, rows on a grid seeded with the section's stitches.
   */
  const showSection = useCallback(
    (pattern: PatternListItem, section: PatternSection) => {
      setSelectedSectionKey(section.key)
      const dims = defaultDimsForSection(section, pattern.maxSts)
      const inRounds = worksInRounds(section)
      setViewMode(inRounds ? 'ring' : 'grid')
      switchChart(
        `${pattern.id}::${section.key}`,
        dims,
        inRounds ? null : sectionToGrid(section, dims.width, dims.height),
      )
    },
    [switchChart],
  )

  const applyDim = useCallback((w: number, h: number) => {
    setWidth(w)
    setHeight(h)
    setCells((prev) => resizeGrid(prev, w, h))
  }, [])

  const onWidthChange = useCallback(
    (raw: string) => applyDim(clampDim(raw, width), height),
    [applyDim, width, height],
  )
  const onHeightChange = useCallback(
    (raw: string) => applyDim(width, clampDim(raw, height)),
    [applyDim, width, height],
  )

  const setCell = useCallback(
    (r: number, c: number, cell: GridCell) => setCells((prev) => setGridCell(prev, r, c, cell)),
    [],
  )

  const setRingOverride = useCallback(
    (roundIndex: number, stitchIndex: number, override: RingOverride | null) => {
      const key = `${roundIndex}:${stitchIndex}`
      setRingOverrides((prev) => {
        const next = {...prev}
        if (override === null || (override.color === null && override.stitch === null)) {
          delete next[key]
        } else {
          next[key] = override
        }
        return next
      })
    },
    [],
  )

  const clearAll = useCallback(() => {
    setCells(makeBlank(width, height))
    setRingOverrides({})
  }, [width, height])

  /**
   * Re-seed the grid from the selected section. Saved edits normally take
   * precedence over the pattern, so this is the way back to what the pattern
   * currently says after it has been changed in the Studio.
   */
  const resetToPattern = useCallback(() => {
    if (!selectedPattern || !selectedSection || worksInRounds(selectedSection)) return
    const dims = defaultDimsForSection(selectedSection, selectedPattern.maxSts)
    setWidth(dims.width)
    setHeight(dims.height)
    setCells(sectionToGrid(selectedSection, dims.width, dims.height))
    setRingOverrides({})
  }, [selectedPattern, selectedSection])

  const canResetToPattern = Boolean(
    selectedPattern && selectedSection && !ringSupported && selectedSection.roundList.length > 0,
  )

  const loadPreset = useCallback((id: string) => {
    setPresetId(id)
    if (!id) return
    const preset = PRESETS.find((p) => p.id === id)
    if (!preset) return
    setViewMode('grid')
    setWidth(preset.width)
    setHeight(preset.height)
    setCells(cloneGrid(preset.cells))
  }, [])

  const applyPattern = useCallback(
    (id: string) => {
      setPresetId('')
      setSelectedPatternId(id)
      if (!id) {
        setSelectedSectionKey('')
        setViewMode('grid')
        switchChart(FREEHAND_KEY, {width: 9, height: 6})
        return
      }
      const pattern = patterns.find((p) => p.id === id)
      if (!pattern) return
      const first = pattern.sections[0]
      if (!first) {
        setSelectedSectionKey('')
        setViewMode('grid')
        switchChart(`${pattern.id}::default`, {
          width: pattern.maxSts,
          height: pattern.bodyRounds,
        })
        return
      }
      showSection(pattern, first)
    },
    [patterns, showSection, switchChart],
  )

  const applySection = useCallback(
    (sectionKey: string) => {
      if (!selectedPattern) return
      const section = selectedPattern.sections.find((s) => s.key === sectionKey)
      if (!section) return
      showSection(selectedPattern, section)
    },
    [selectedPattern, showSection],
  )

  const clearPattern = useCallback(() => {
    setSelectedPatternId('')
    setSelectedSectionKey('')
    setViewMode('grid')
    switchChart(FREEHAND_KEY, {width: 9, height: 6})
  }, [switchChart])

  // -- derived stats & geometry -----------------------------------------------

  const paintedPerRow = useMemo(
    () =>
      cells
        .map((row, i) => ({
          round: height - i,
          count: row.reduce<number>((sum, cell) => sum + (isBlank(cell) ? 0 : 1), 0),
        }))
        .sort((a, b) => a.round - b.round),
    [cells, height],
  )
  const paintedCount = paintedPerRow.reduce((sum, r) => sum + r.count, 0)
  const ringOverrideCount = Object.keys(ringOverrides).length

  const geom = gridGeometry(width, height)

  const ringGeom = useMemo(() => computeRingGeometry(ringRounds), [ringRounds])

  const contextLabel = selectedPattern
    ? selectedSection
      ? `${selectedPattern.title} · ${selectedSection.title}`
      : selectedPattern.title
    : 'Freehand chart'

  const filenameSuffix = selectedPattern
    ? selectedSection
      ? `-${slugify(selectedPattern.title)}-${slugify(selectedSection.title)}`
      : `-${slugify(selectedPattern.title)}`
    : ''

  const svgWidth = viewMode === 'ring' ? ringGeom.size : geom.svgWidth
  const svgHeight = viewMode === 'ring' ? ringGeom.size : geom.svgHeight

  return {
    chartKey,
    width,
    height,
    cells,
    ringOverrides,
    viewMode,
    presetId,
    selectedPatternId,
    selectedSectionKey,
    selectedPattern,
    selectedSection,
    ringSupported,
    canResetToPattern,
    ringRounds,
    ringEditable,
    ringSpec,
    cellSize: geom.cellSize,
    gridPadTop: geom.padTop,
    gridPadLeft: geom.padLeft,
    gridInnerW: geom.innerW,
    gridInnerH: geom.innerH,
    gridSvgWidth: geom.svgWidth,
    gridSvgHeight: geom.svgHeight,
    colStride: geom.colStride,
    rowStride: geom.rowStride,
    ringGeom,
    svgWidth,
    svgHeight,
    contextLabel,
    filenameSuffix,
    paintedCount,
    paintedPerRow,
    ringOverrideCount,
    setViewMode,
    onWidthChange,
    onHeightChange,
    setCell,
    setRingOverride,
    clearAll,
    resetToPattern,
    updateRingSpec,
    loadPreset,
    applyPattern,
    applySection,
    clearPattern,
  }
}
