import {useCallback, useMemo, useState} from 'react'
import type {Paint, SymbolType} from '../types'
import {DEFAULT_INK} from '../constants'

export type PaletteController = {
  activeColor: string | null
  activeStitch: SymbolType | null
  paint: Paint
  isEraser: boolean
  setActiveColor: (color: string | null) => void
  setActiveStitch: (stitch: SymbolType | null) => void
}

export function usePalette(): PaletteController {
  const [activeColor, setActiveColor] = useState<string | null>(DEFAULT_INK)
  const [activeStitch, setActiveStitch] = useState<SymbolType | null>(null)

  const paint = useMemo<Paint>(
    () => ({color: activeColor, stitch: activeStitch}),
    [activeColor, activeStitch],
  )
  const isEraser = activeColor === null && activeStitch === null

  return {
    activeColor,
    activeStitch,
    paint,
    isEraser,
    setActiveColor: useCallback((color: string | null) => setActiveColor(color), []),
    setActiveStitch: useCallback((stitch: SymbolType | null) => setActiveStitch(stitch), []),
  }
}
