import type {
  Grid,
  GridCell,
  RingOverride,
  RingOverrides,
  RingSpec,
  Store,
  StoreEntry,
  SymbolType,
} from '../types'
import {STORAGE_KEY} from '../constants'
import {normaliseRingSpec} from './ring'
import {SHAPES} from './symbolShapes'

const VALID_SYMBOLS = new Set<string>(Object.keys(SHAPES))

export function loadStore(): Store {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return coerceStore(parsed as Record<string, unknown>)
  } catch {
    return {}
  }
}

export function saveStore(store: Store) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // ignore quota / disabled storage
  }
}

// -----------------------------------------------------------------------------
// Defensive coercion — protects against hand-edited or half-written entries.

function coerceStore(raw: Record<string, unknown>): Store {
  const out: Store = {}
  for (const [key, value] of Object.entries(raw)) {
    const entry = coerceEntry(value)
    if (entry) out[key] = entry
  }
  return out
}

function coerceEntry(raw: unknown): StoreEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const width = typeof obj.width === 'number' ? obj.width : NaN
  const height = typeof obj.height === 'number' ? obj.height : NaN
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null
  const cells = coerceGrid(obj.cells)
  if (!cells) return null
  const ringOverrides = coerceOverrides(obj.ringOverrides)
  const ringSpec = coerceRingSpec(obj.ringSpec)
  return {width, height, cells, ringOverrides, ...(ringSpec ? {ringSpec} : {})}
}

function coerceRingSpec(raw: unknown): RingSpec | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  if (typeof obj.rounds !== 'number' || typeof obj.startSts !== 'number') return null
  return normaliseRingSpec({
    rounds: obj.rounds,
    startSts: obj.startSts,
    shape: obj.shape === 'tube' ? 'tube' : 'circle',
  })
}

function coerceGrid(raw: unknown): Grid | null {
  if (!Array.isArray(raw)) return null
  return raw.map((row) => (Array.isArray(row) ? row.map(coerceCell) : []))
}

function coerceCell(raw: unknown): GridCell {
  if (!raw || typeof raw !== 'object') return {color: null, stitch: null}
  const obj = raw as Record<string, unknown>
  return {
    color: typeof obj.color === 'string' ? obj.color : null,
    stitch: isSymbolType(obj.stitch) ? obj.stitch : null,
  }
}

function coerceOverrides(raw: unknown): RingOverrides {
  if (!raw || typeof raw !== 'object') return {}
  const src = raw as Record<string, unknown>
  const out: RingOverrides = {}
  for (const [key, value] of Object.entries(src)) {
    if (!value || typeof value !== 'object') continue
    const obj = value as Record<string, unknown>
    const override: RingOverride = {
      color: typeof obj.color === 'string' ? obj.color : null,
      stitch: isSymbolType(obj.stitch) ? obj.stitch : null,
    }
    if (override.color !== null || override.stitch !== null) out[key] = override
  }
  return out
}

function isSymbolType(v: unknown): v is SymbolType {
  return typeof v === 'string' && VALID_SYMBOLS.has(v)
}
