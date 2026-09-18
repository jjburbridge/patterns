import {Button, Card, Flex, Label, Select, Spinner, Stack, Text, TextInput} from '@sanity/ui'
import {AddDocumentIcon, DownloadIcon, RefreshIcon, ResetIcon, TrashIcon} from '@sanity/icons'
import type {ChartController} from '../hooks/useChartController'
import type {PatternList} from '../hooks/usePatternList'
import type {RingSpec} from '../types'
import {PRESETS} from '../data/grid'
import {RING_SHAPE_LABELS, stitchesOnRound, totalStitches} from '../data/ring'
import {PatternContextCard} from './PatternContextCard'

export type ChartToolbarProps = {
  chart: ChartController
  patternList: PatternList
  onExport: () => void
  onSaveAsPattern: () => void
}

export function ChartToolbar({chart, patternList, onExport, onSaveAsPattern}: ChartToolbarProps) {
  const isRing = chart.viewMode === 'ring'
  // A ring driven by a pattern section has a fixed shape; a freehand one is
  // described here instead, so the grid controls make way for ring controls.
  const shapingRing = isRing && chart.ringEditable

  return (
    <Card padding={3} radius={2} shadow={1}>
      <Stack space={3}>
        <Flex align="flex-end" gap={3} wrap="wrap">
          {shapingRing ? (
            <RingSetup chart={chart} />
          ) : (
            <>
              <DimInput
                label="Width (sts)"
                value={chart.width}
                disabled={isRing}
                onChange={chart.onWidthChange}
              />
              <DimInput
                label="Height (rounds)"
                value={chart.height}
                disabled={isRing}
                onChange={chart.onHeightChange}
              />
              <PresetSelect
                value={chart.presetId}
                disabled={isRing}
                onChange={chart.loadPreset}
              />
            </>
          )}
          <PatternSelect
            value={chart.selectedPatternId}
            list={patternList}
            onChange={chart.applyPattern}
          />
          <ActionButtons
            patternListLoading={patternList.loading}
            onReloadPatterns={patternList.refresh}
            onClear={chart.clearAll}
            onResetToPattern={chart.canResetToPattern ? chart.resetToPattern : null}
            onExport={onExport}
            onSaveAsPattern={onSaveAsPattern}
          />
        </Flex>

        <PatternContextCard chart={chart} />

        {patternList.error && (
          <Card padding={2} radius={2} tone="critical">
            <Text size={1}>Could not load patterns: {patternList.error}</Text>
          </Card>
        )}
      </Stack>
    </Card>
  )
}

function DimInput({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string
  value: number
  disabled?: boolean
  onChange: (raw: string) => void
}) {
  return (
    <Stack space={2}>
      <Label size={1} muted>
        {label}
      </Label>
      <TextInput
        type="number"
        value={String(value)}
        onChange={(e) => onChange(e.currentTarget.value)}
        disabled={disabled}
        style={{width: 96}}
      />
    </Stack>
  )
}

function RingSetup({chart}: {chart: ChartController}) {
  const {ringSpec, updateRingSpec} = chart
  const outerSts = stitchesOnRound(ringSpec, ringSpec.rounds - 1)

  return (
    <>
      <DimInput
        label="Rounds"
        value={ringSpec.rounds}
        onChange={(raw) => updateRingSpec({rounds: Number(raw)})}
      />
      <DimInput
        label={ringSpec.shape === 'tube' ? 'Sts per round' : 'Sts in round 1'}
        value={ringSpec.startSts}
        onChange={(raw) => updateRingSpec({startSts: Number(raw)})}
      />
      <Stack space={2} flex={1} style={{minWidth: 240}}>
        <Label size={1} muted>
          Shape — {totalStitches(ringSpec)} sts, {outerSts} on the outer round
        </Label>
        <Select
          value={ringSpec.shape}
          onChange={(e) => updateRingSpec({shape: e.currentTarget.value as RingSpec['shape']})}
        >
          {Object.entries(RING_SHAPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Stack>
    </>
  )
}

function PresetSelect({
  value,
  disabled,
  onChange,
}: {
  value: string
  disabled: boolean
  onChange: (id: string) => void
}) {
  return (
    <Stack space={2} flex={1} style={{minWidth: 200}}>
      <Label size={1} muted>
        Preset
      </Label>
      <Select
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        disabled={disabled}
      >
        <option value="">Load preset…</option>
        {PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </Select>
    </Stack>
  )
}

function PatternSelect({
  value,
  list,
  onChange,
}: {
  value: string
  list: PatternList
  onChange: (id: string) => void
}) {
  const {patterns, loading, error} = list
  const placeholder = error
    ? 'Could not load patterns'
    : loading
      ? 'Loading patterns…'
      : patterns.length === 0
        ? 'No patterns found'
        : 'Freehand — select a pattern…'

  return (
    <Stack space={2} flex={1} style={{minWidth: 260}}>
      <Flex align="center" gap={2}>
        <Label size={1} muted>
          Populate from pattern
        </Label>
        {loading && <Spinner muted size={0} />}
      </Flex>
      <Select
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        disabled={loading || Boolean(error)}
      >
        <option value="">{placeholder}</option>
        {patterns.map((p) => (
          <option key={p.id} value={p.id}>
            {p.isDraft ? 'Draft · ' : ''}
            {p.title} — {p.sections.length}{' '}
            {p.sections.length === 1 ? 'section' : 'sections'}
            {p.type === 'knitPattern' ? ' (knit)' : ''}
          </option>
        ))}
      </Select>
    </Stack>
  )
}

function ActionButtons({
  patternListLoading,
  onReloadPatterns,
  onClear,
  onResetToPattern,
  onExport,
  onSaveAsPattern,
}: {
  patternListLoading: boolean
  onReloadPatterns: () => void
  onClear: () => void
  /** Null when the current selection has no flat section to re-seed from. */
  onResetToPattern: (() => void) | null
  onExport: () => void
  onSaveAsPattern: () => void
}) {
  return (
    <Flex gap={2} wrap="wrap">
      <Button
        mode="ghost"
        icon={RefreshIcon}
        onClick={onReloadPatterns}
        text="Reload"
        disabled={patternListLoading}
        title="Refresh pattern list"
      />
      {onResetToPattern && (
        <Button
          mode="ghost"
          icon={ResetIcon}
          onClick={onResetToPattern}
          text="Reset to pattern"
          title="Discard edits and redraw the grid from this section's instructions"
        />
      )}
      <Button
        mode="ghost"
        tone="critical"
        icon={TrashIcon}
        onClick={onClear}
        text="Clear"
        title="Clear both the freehand grid and any ring overrides for this chart"
      />
      <Button mode="ghost" icon={DownloadIcon} onClick={onExport} text="Export PNG" />
      <Button
        tone="primary"
        icon={AddDocumentIcon}
        onClick={onSaveAsPattern}
        text="Save as pattern"
        title="Create a new crochet or knit pattern document from this chart"
      />
    </Flex>
  )
}
