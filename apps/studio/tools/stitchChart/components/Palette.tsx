import type {ReactNode} from 'react'
import {Button, Card, Flex, Label, Stack, Text} from '@sanity/ui'
import {CRAFTS, CRAFT_LABELS, type Craft, type SymbolType} from '../types'
import {DEFAULT_INK, GRID_STROKE, SYMBOL_STROKE} from '../constants'
import {colorLabel, PALETTE_COLORS} from '../data/palette'
import {useCatalog} from '../context/StitchCatalogContext'
import type {PaletteController} from '../hooks/usePalette'
import {StitchSymbol} from './StitchSymbol'

export type PaletteProps = {
  palette: PaletteController
  craft: Craft
  onCraftChange: (craft: Craft) => void
}

export function Palette({palette, craft, onCraftChange}: PaletteProps) {
  const catalog = useCatalog()
  const groups = catalog.paletteGroupsFor(craft)

  return (
    <Card padding={3} radius={2} shadow={1}>
      <Stack space={3}>
        <CraftToggle craft={craft} onChange={onCraftChange} hasCraft={catalog.hasCraft} />

        <PaletteRow label="Color">
          <ColorChip
            color={null}
            active={palette.activeColor === null}
            onClick={() => palette.setActiveColor(null)}
          />
          {PALETTE_COLORS.map((c) => (
            <ColorChip
              key={c}
              color={c}
              active={palette.activeColor === c}
              onClick={() => palette.setActiveColor(c)}
            />
          ))}
        </PaletteRow>

        <PaletteRow label="Stitch — auto / blank">
          <StitchChip
            stitch={null}
            active={palette.activeStitch === null}
            onClick={() => palette.setActiveStitch(null)}
          />
          <StitchChip
            stitch="blank"
            active={palette.activeStitch === 'blank'}
            onClick={() => palette.setActiveStitch('blank')}
          />
        </PaletteRow>

        {groups.map((group) => (
          <PaletteRow key={group.id} label={group.label}>
            {group.stitches.map((s) => (
              <StitchChip
                key={s}
                stitch={s}
                active={palette.activeStitch === s}
                onClick={() => palette.setActiveStitch(s)}
              />
            ))}
          </PaletteRow>
        ))}

        {groups.length === 0 && (
          <Card padding={3} radius={2} tone="caution">
            <Text size={1}>
              No {CRAFT_LABELS[craft].toLowerCase()} stitches with a chart symbol were found. Add{' '}
              <code>stitchType</code> documents with <code>craft = &quot;{craft}&quot;</code> to
              fill this palette.
            </Text>
          </Card>
        )}

        <Text size={0} muted>
          Click a stitch to paint it. Shift-click or right-click to erase.
          {palette.isEraser ? ' Eraser mode active.' : ''}
        </Text>
      </Stack>
    </Card>
  )
}

function CraftToggle({
  craft,
  onChange,
  hasCraft,
}: {
  craft: Craft
  onChange: (craft: Craft) => void
  hasCraft: (craft: Craft) => boolean
}) {
  return (
    <Stack space={2}>
      <Label size={0} muted>
        Craft
      </Label>
      <Flex gap={1}>
        {CRAFTS.map((c) => (
          <Button
            key={c}
            mode={craft === c ? 'default' : 'bleed'}
            tone={craft === c ? 'primary' : 'default'}
            onClick={() => onChange(c)}
            text={CRAFT_LABELS[c]}
            fontSize={1}
            padding={2}
            title={
              hasCraft(c)
                ? `Show ${CRAFT_LABELS[c].toLowerCase()} chart symbols`
                : `No ${CRAFT_LABELS[c].toLowerCase()} stitches in the catalog yet`
            }
          />
        ))}
      </Flex>
    </Stack>
  )
}

function PaletteRow({label, children}: {label: string; children: ReactNode}) {
  return (
    <Stack space={2}>
      <Label size={0} muted>
        {label}
      </Label>
      <Flex gap={1} wrap="wrap">
        {children}
      </Flex>
    </Stack>
  )
}

const CHIP_BASE: React.CSSProperties = {
  padding: 0,
  cursor: 'pointer',
  borderRadius: 4,
  background: '#fff',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}

function chipBorder(active: boolean) {
  return active ? `2px solid ${SYMBOL_STROKE}` : `1px solid ${GRID_STROKE}`
}

function ColorChip({
  color,
  active,
  onClick,
}: {
  color: string | null
  active: boolean
  onClick: () => void
}) {
  const label = colorLabel(color)
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      style={{
        ...CHIP_BASE,
        width: 30,
        height: 30,
        border: chipBorder(active),
        background: color ?? '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {color === null && (
        <svg width={24} height={24} viewBox="0 0 24 24" aria-hidden>
          <line x1={4} y1={20} x2={20} y2={4} stroke={SYMBOL_STROKE} strokeWidth={2} />
        </svg>
      )}
    </button>
  )
}

function StitchChip({
  stitch,
  active,
  onClick,
}: {
  stitch: SymbolType | null
  active: boolean
  onClick: () => void
}) {
  const catalog = useCatalog()
  const label = catalog.labelFor(stitch)
  const title = catalog.titleFor(stitch)
  const isTextChip = stitch === null || stitch === 'blank' || stitch === 'unknown'

  return (
    <button
      type="button"
      aria-label={title}
      aria-pressed={active}
      title={title}
      onClick={onClick}
      style={{
        ...CHIP_BASE,
        minWidth: 42,
        height: 34,
        padding: '2px 6px',
        border: chipBorder(active),
        gap: 4,
        flexDirection: 'column',
        lineHeight: 1,
      }}
    >
      {isTextChip ? (
        <span style={{fontFamily: 'ui-monospace, monospace', fontSize: 11}}>{label}</span>
      ) : (
        <>
          <svg width={22} height={22} viewBox="-12 -12 24 24" aria-hidden>
            <StitchSymbol
              type={stitch}
              cx={0}
              cy={0}
              rotationDeg={0}
              length={18}
              color={DEFAULT_INK}
            />
          </svg>
          <span
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 9,
              color: '#666',
              marginTop: -1,
            }}
          >
            {label}
          </span>
        </>
      )}
    </button>
  )
}
