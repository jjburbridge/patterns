import {useCallback, useMemo, useState, type ReactNode} from 'react'
import {
  Box,
  Button,
  Card,
  Dialog,
  Flex,
  Grid as UiGrid,
  Label,
  Select,
  Stack,
  Text,
  TextArea,
  TextInput,
} from '@sanity/ui'
import {CheckmarkCircleIcon, LaunchIcon} from '@sanity/icons'
import {useRouter} from 'sanity/router'
import {CRAFT_LABELS, type Craft, type PatternListItem, type SymbolType} from '../types'
import {defaultBaseStitch} from '../data/stitchCatalog'
import {
  countRowStitches,
  describeRow,
  gridToRows,
  ringToRows,
  type ChartRow,
  type StepKind,
  type StitchResolver,
} from '../data/patternDraft'
import {useCatalog} from '../context/StitchCatalogContext'
import type {ChartController} from '../hooks/useChartController'
import {useSavePattern, type SavedPattern} from '../hooks/useSavePattern'

/** Where the instructions are read from. */
type Source = 'grid' | 'ring'

/** Whether the chart starts a pattern or joins one that already exists. */
type Destination = 'new' | 'existing'

export type SavePatternDialogProps = {
  chart: ChartController
  /** The craft currently being charted — the default for the new pattern. */
  craft: Craft
  /** Patterns a section can be appended to. */
  patterns: PatternListItem[]
  onClose: () => void
  /** Called after a successful write so the pattern picker can refresh. */
  onSaved: () => void
}

export function SavePatternDialog({
  chart,
  craft: initialCraft,
  patterns,
  onClose,
  onSaved,
}: SavePatternDialogProps) {
  const catalog = useCatalog()
  const {saving, error, saved, save, appendSection} = useSavePattern()

  const ringAvailable = chart.ringSupported && chart.ringRounds.length > 0

  const [source, setSource] = useState<Source>(
    chart.viewMode === 'ring' && ringAvailable ? 'ring' : 'grid',
  )
  const [stepKind, setStepKind] = useState<StepKind>(chart.viewMode === 'ring' ? 'round' : 'row')
  // Defaults to creating a new pattern even when one is loaded, so opening
  // the dialog can never write to an existing document by accident.
  const [destination, setDestination] = useState<Destination>('new')
  const initialTarget = chart.selectedPattern ?? patterns[0] ?? null
  const [targetId, setTargetId] = useState(() => initialTarget?.id ?? '')
  const [title, setTitle] = useState(() => defaultTitle(chart))
  const [newCraft, setNewCraft] = useState<Craft>(initialCraft)
  const [sectionTitle, setSectionTitle] = useState(() => chart.selectedSection?.title ?? 'Body')
  const [sizeLabel, setSizeLabel] = useState('One size')
  // Kept apart from `sizeLabel` because appending picks from the target's own
  // sizes, while a new pattern declares whatever it is given.
  const [appendSizeLabel, setAppendSizeLabel] = useState(
    () => initialTarget?.sizeLabels[0] ?? 'One size',
  )
  const [designer, setDesigner] = useState('')
  const [description, setDescription] = useState('')
  const [baseStitch, setBaseStitch] = useState<SymbolType>(() =>
    defaultBaseStitch(catalog, initialCraft),
  )

  const target = patterns.find((p) => p.id === targetId) ?? null
  const appending = destination === 'existing'

  // An existing pattern's document type already fixes its craft, so appending
  // to it can't change that — only a new pattern is free to choose.
  const craft: Craft = appending && target ? craftOf(target) : newCraft
  const baseStitchOptions = catalog.paletteStitchesFor(craft)

  const onTargetChange = useCallback(
    (id: string) => {
      setTargetId(id)
      const next = patterns.find((p) => p.id === id)
      setAppendSizeLabel(next?.sizeLabels[0] ?? 'One size')
    },
    [patterns],
  )

  // Switching source flips the step noun to whichever matches, but the user
  // can still override it afterwards.
  const onSourceChange = useCallback((next: Source) => {
    setSource(next)
    setStepKind(next === 'ring' ? 'round' : 'row')
  }, [])

  // The base stitch has to belong to the pattern's craft, so changing craft
  // moves it to that craft's plain stitch rather than leaving a stale one.
  const onCraftChange = useCallback(
    (next: Craft) => {
      setNewCraft(next)
      setBaseStitch(defaultBaseStitch(catalog, next))
    },
    [catalog],
  )

  const rows: ChartRow[] = useMemo(() => {
    if (source === 'ring') return ringToRows(chart.ringRounds, chart.ringOverrides)
    return gridToRows(chart.cells, {baseStitch, stepKind})
  }, [source, chart.ringRounds, chart.ringOverrides, chart.cells, baseStitch, stepKind])

  // The real resolver runs against Sanity at save time; for the preview the
  // loaded catalog carries the same abbreviations and yields, so the rows read
  // the same as the ones that get written.
  const previewResolve = useCallback<StitchResolver>(
    (symbol) => ({docId: '', abbr: catalog.labelFor(symbol), yieldSts: catalog.yieldOf(symbol)}),
    [catalog],
  )

  const stitchTotal = rows.reduce((sum, row) => sum + countRowStitches(row, previewResolve), 0)
  const trimmedTitle = title.trim()
  const trimmedSection = sectionTitle.trim()

  const sectionOpts = useMemo(
    () => ({
      craft,
      sectionTitle: trimmedSection || 'Body',
      stepKind,
      sizeLabel: (appending ? appendSizeLabel : sizeLabel).trim() || 'One size',
    }),
    [craft, trimmedSection, stepKind, appending, appendSizeLabel, sizeLabel],
  )

  const canSave =
    rows.length > 0 &&
    !saving &&
    trimmedSection.length > 0 &&
    (appending ? target !== null : trimmedTitle.length > 0)

  const onSubmit = useCallback(async () => {
    if (!canSave) return
    if (appending && target) {
      await appendSection(rows, {id: target.id, type: target.type, title: target.title}, sectionOpts)
    } else {
      await save(rows, {
        ...sectionOpts,
        title: trimmedTitle,
        designer: designer.trim() || undefined,
        description: description.trim() || undefined,
      })
    }
    onSaved()
  }, [
    canSave,
    appending,
    target,
    appendSection,
    save,
    rows,
    sectionOpts,
    trimmedTitle,
    designer,
    description,
    onSaved,
  ])

  return (
    <Dialog
      id="save-pattern-dialog"
      header={savedHeader(saved, appending)}
      onClose={onClose}
      onClickOutside={onClose}
      width={1}
      footer={
        <Box padding={3}>
          <Flex gap={2} justify="flex-end">
            <Button mode="ghost" text={saved ? 'Close' : 'Cancel'} onClick={onClose} />
            {!saved && (
              <Button
                tone="primary"
                text={appending ? 'Add section' : 'Create pattern'}
                loading={saving}
                disabled={!canSave}
                onClick={onSubmit}
              />
            )}
          </Flex>
        </Box>
      }
    >
      <Box padding={4}>
        {saved ? (
          <SuccessPanel saved={saved} catalog={catalog} />
        ) : (
          <Stack space={4}>
            <SourceSection
              source={source}
              ringAvailable={ringAvailable}
              sectionTitle={chart.selectedSection?.title}
              onChange={onSourceChange}
            />

            <DestinationSection
              destination={destination}
              patterns={patterns}
              targetId={targetId}
              onDestinationChange={setDestination}
              onTargetChange={onTargetChange}
            />

            {appending ? (
              <TargetSummary target={target} />
            ) : (
              <Field label="Pattern title">
                <TextInput
                  value={title}
                  onChange={(e) => setTitle(e.currentTarget.value)}
                  placeholder="e.g. Textured beanie"
                />
              </Field>
            )}

            <UiGrid columns={2} gap={3}>
              <Field
                label="Saved as"
                description={appending ? 'Set by the pattern you are adding to.' : undefined}
              >
                <Select
                  value={craft}
                  disabled={appending}
                  onChange={(e) => onCraftChange(e.currentTarget.value as Craft)}
                >
                  <option value="crochet">Crochet pattern</option>
                  <option value="knit">Knit pattern</option>
                </Select>
              </Field>
              <Field label="Each chart line is a">
                <Select
                  value={stepKind}
                  onChange={(e) => setStepKind(e.currentTarget.value as StepKind)}
                >
                  <option value="round">Round</option>
                  <option value="row">Row</option>
                </Select>
              </Field>
              <Field label="Section title">
                <TextInput
                  value={sectionTitle}
                  onChange={(e) => setSectionTitle(e.currentTarget.value)}
                  placeholder="Body"
                />
              </Field>
              <SizeField
                appending={appending}
                sizes={target?.sizeLabels ?? []}
                value={appending ? appendSizeLabel : sizeLabel}
                onChange={appending ? setAppendSizeLabel : setSizeLabel}
              />
            </UiGrid>

            {source === 'grid' && (
              <Field
                label="Base stitch"
                description="Used for cells painted with a colour but no symbol, so the stitch counts stay correct."
              >
                <Select
                  value={baseStitch}
                  onChange={(e) => setBaseStitch(e.currentTarget.value as SymbolType)}
                >
                  {baseStitchOptions.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.abbrPrimary} — {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            {!appending && (
              <>
                <Field label="Designer">
                  <TextInput
                    value={designer}
                    onChange={(e) => setDesigner(e.currentTarget.value)}
                    placeholder="Optional"
                  />
                </Field>

                <Field label="Description">
                  <TextArea
                    value={description}
                    rows={2}
                    onChange={(e) => setDescription(e.currentTarget.value)}
                    placeholder="Optional"
                  />
                </Field>
              </>
            )}

            <RowPreview rows={rows} stitchTotal={stitchTotal} resolve={previewResolve} />

            {baseStitchOptions.length === 0 && <MissingCraftNotice craft={craft} />}

            {error && (
              <Card padding={3} radius={2} tone="critical">
                <Text size={1}>{error}</Text>
              </Card>
            )}
          </Stack>
        )}
      </Box>
    </Dialog>
  )
}

// -----------------------------------------------------------------------------

function DestinationSection({
  destination,
  patterns,
  targetId,
  onDestinationChange,
  onTargetChange,
}: {
  destination: Destination
  patterns: PatternListItem[]
  targetId: string
  onDestinationChange: (next: Destination) => void
  onTargetChange: (id: string) => void
}) {
  const none = patterns.length === 0

  return (
    <Stack space={3}>
      <Field
        label="Save this chart as"
        description={
          destination === 'new'
            ? 'A new draft pattern containing this one section.'
            : 'A new section appended to the pattern below, so a pattern can be built up a section at a time.'
        }
      >
        <Select
          value={destination}
          onChange={(e) => onDestinationChange(e.currentTarget.value as Destination)}
        >
          <option value="new">A new pattern</option>
          <option value="existing" disabled={none}>
            A section of an existing pattern{none ? ' — none available' : ''}
          </option>
        </Select>
      </Field>

      {destination === 'existing' && (
        <Field label="Add to pattern">
          <Select value={targetId} onChange={(e) => onTargetChange(e.currentTarget.value)}>
            {patterns.map((p) => (
              <option key={p.id} value={p.id}>
                {p.isDraft ? 'Draft · ' : ''}
                {p.title} — {p.sections.length}{' '}
                {p.sections.length === 1 ? 'section' : 'sections'}
              </option>
            ))}
          </Select>
        </Field>
      )}
    </Stack>
  )
}

/** What the chosen pattern already contains, so the new section has context. */
function TargetSummary({target}: {target: PatternListItem | null}) {
  if (!target) {
    return (
      <Card padding={3} radius={2} tone="caution">
        <Text size={1}>Pick a pattern to add this section to.</Text>
      </Card>
    )
  }

  const existing = target.sections.map((s) => s.title)

  return (
    <Card padding={3} radius={2} tone="transparent">
      <Stack space={2}>
        <Text size={1} weight="medium">
          Adding to “{target.title}”
          {target.isDraft ? ' (draft)' : ''}
        </Text>
        <Text size={1} muted>
          {existing.length > 0
            ? `Already has ${existing.join(', ')}. The new section goes after them.`
            : 'It has no sections yet — this will be the first.'}
        </Text>
        {!target.isDraft && (
          <Text size={0} muted>
            This pattern is published; the section is added to a new draft, leaving the live
            version untouched until you publish.
          </Text>
        )}
      </Stack>
    </Card>
  )
}

function SizeField({
  appending,
  sizes,
  value,
  onChange,
}: {
  appending: boolean
  sizes: string[]
  value: string
  onChange: (next: string) => void
}) {
  // Stitch counts name a size the parent pattern declares, so appending picks
  // from what the target has. A target with no sizes falls back to free text —
  // the mismatch is already there and inventing a label wouldn't fix it.
  if (appending && sizes.length > 0) {
    return (
      <Field label="Stitch counts are for">
        <Select value={value} onChange={(e) => onChange(e.currentTarget.value)}>
          {sizes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </Field>
    )
  }

  return (
    <Field
      label="Size label"
      description={appending ? 'This pattern declares no sizes yet.' : undefined}
    >
      <TextInput
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder="One size"
      />
    </Field>
  )
}

function SourceSection({
  source,
  ringAvailable,
  sectionTitle,
  onChange,
}: {
  source: Source
  ringAvailable: boolean
  sectionTitle: string | undefined
  onChange: (next: Source) => void
}) {
  return (
    <Field
      label="Read instructions from"
      description={
        source === 'grid'
          ? 'The freehand grid, bottom row first and right to left — the order the stitches are worked in.'
          : `The ring chart for ${sectionTitle ?? 'the selected section'}, including anything painted over it.`
      }
    >
      <Select value={source} onChange={(e) => onChange(e.currentTarget.value as Source)}>
        <option value="grid">Freehand grid</option>
        <option value="ring" disabled={!ringAvailable}>
          Ring chart{ringAvailable ? '' : ' — select a section with rounds first'}
        </option>
      </Select>
    </Field>
  )
}

function RowPreview({
  rows,
  stitchTotal,
  resolve,
}: {
  rows: ChartRow[]
  stitchTotal: number
  resolve: StitchResolver
}) {
  const shown = rows.slice(0, 4)

  if (rows.length === 0) {
    return (
      <Card padding={3} radius={2} tone="caution">
        <Text size={1}>
          There is nothing to save — paint a grid or pick a pattern section with rounds.
        </Text>
      </Card>
    )
  }

  return (
    <Card padding={3} radius={2} tone="transparent">
      <Stack space={3}>
        <Text size={1} weight="medium">
          {rows.length} {rows.length === 1 ? 'step' : 'steps'} · {stitchTotal} stitches
        </Text>
        <Stack space={2}>
          {shown.map((row, i) => (
            <Text key={i} size={1} muted textOverflow="ellipsis">
              <strong>{row.label}:</strong> {describeRow(row, resolve)}
            </Text>
          ))}
          {rows.length > shown.length && (
            <Text size={1} muted>
              …and {rows.length - shown.length} more
            </Text>
          )}
        </Stack>
      </Stack>
    </Card>
  )
}

function MissingCraftNotice({craft}: {craft: Craft}) {
  return (
    <Card padding={3} radius={2} tone="caution">
      <Text size={1}>
        There are no {CRAFT_LABELS[craft].toLowerCase()} <code>stitchType</code> documents with a
        chart symbol. The pattern will still be created with its steps and stitch counts, but the
        instruction groups will carry readable labels instead of stitch references.
      </Text>
    </Card>
  )
}

function SuccessPanel({
  saved,
  catalog,
}: {
  saved: SavedPattern
  catalog: {labelFor: (s: SymbolType) => string}
}) {
  const router = useRouter()
  const typeLabel = saved.type === 'knitPattern' ? 'knit pattern' : 'crochet pattern'

  return (
    <Stack space={4}>
      <Card padding={3} radius={2} tone="positive">
        <Flex align="flex-start" gap={3}>
          <Text size={2}>
            <CheckmarkCircleIcon />
          </Text>
          <Stack space={2}>
            <Text size={1} weight="medium">
              {saved.appended
                ? `Added “${saved.sectionTitle}” to “${saved.title}”.`
                : `Created “${saved.title}” as a draft ${typeLabel}.`}
            </Text>
            <Text size={1} muted>
              {saved.steps} {saved.steps === 1 ? 'step' : 'steps'} · {saved.stitches} stitches
              {saved.appended
                ? ` · ${saved.sectionCount} sections in total`
                : ''}
              . Review and publish {saved.appended ? 'the draft' : 'it'} from the content pane.
            </Text>
          </Stack>
        </Flex>
      </Card>

      {saved.unresolved.length > 0 && (
        <Card padding={3} radius={2} tone="caution">
          <Text size={1}>
            No matching <code>stitchType</code> document for{' '}
            {saved.unresolved.map((s) => catalog.labelFor(s)).join(', ')}. Those groups were saved
            with a label but no stitch reference.
          </Text>
        </Card>
      )}

      <Flex>
        <Button
          icon={LaunchIcon}
          mode="ghost"
          text="Open pattern"
          onClick={() => router.navigateIntent('edit', {id: saved.id, type: saved.type})}
        />
      </Flex>
    </Stack>
  )
}

function Field({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: ReactNode
}) {
  return (
    <Stack space={2}>
      <Label size={1} muted>
        {label}
      </Label>
      {children}
      {description && (
        <Text size={0} muted>
          {description}
        </Text>
      )}
    </Stack>
  )
}

// -----------------------------------------------------------------------------

function defaultTitle(chart: ChartController): string {
  if (!chart.selectedPattern) return ''
  return chart.selectedSection
    ? `${chart.selectedPattern.title} — ${chart.selectedSection.title}`
    : chart.selectedPattern.title
}

function craftOf(pattern: PatternListItem): Craft {
  return pattern.type === 'knitPattern' ? 'knit' : 'crochet'
}

function savedHeader(saved: SavedPattern | null, appending: boolean): string {
  if (saved) return saved.appended ? 'Section added' : 'Pattern created'
  return appending ? 'Add this chart as a section' : 'Save chart as a new pattern'
}

