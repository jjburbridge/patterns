import {defineType, defineField, defineArrayMember} from 'sanity'
import {InstructionStepPreview} from '../components/InstructionStepPreview'

export const instructionStep = defineType({
  name: 'instructionStep',
  title: 'Instruction step',
  type: 'object',
  fields: [
    defineField({
      name: 'kind',
      type: 'string',
      options: {
        list: [
          {title: 'Row', value: 'row'},
          {title: 'Round', value: 'round'},
          {title: 'Setup', value: 'setup'},
          {title: 'Repeat block', value: 'repeat'},
          {title: 'Note', value: 'note'},
        ],
        layout: 'radio',
      },
      initialValue: 'row',
    }),
    defineField({
      name: 'label',
      type: 'string',
      description: 'E.g., "Row 1 (RS)", "Rnd 5", "Repeat rows 2-5"',
    }),
    defineField({
      name: 'instruction',
      type: 'array',
      description: 'The stitch sequence — one instruction group per phrase in the pattern',
      of: [defineArrayMember({type: 'instructionGroup'})],
    }),
    defineField({
      name: 'useMultiplier',
      type: 'boolean',
      description:
        'When on, the per-size stitch count is derived as baseCount × each size’s multiplier',
      initialValue: false,
    }),
    defineField({
      name: 'baseCount',
      type: 'number',
      description: 'Multiplied by each size’s multiplier to derive per-size counts',
      validation: (rule) => rule.positive(),
      hidden: ({parent}) => parent?.useMultiplier !== true,
    }),
    defineField({
      name: 'stitchCount',
      type: 'array',
      title: 'Stitch count per size',
      description: 'Stitches at the end of this step, one entry per graded size',
      of: [defineArrayMember({type: 'stitchCountEntry'})],
      hidden: ({parent}) => parent?.useMultiplier === true,
    }),
    defineField({
      name: 'repeatTimes',
      type: 'number',
      description: 'How many times to repeat this step or block',
      hidden: ({parent}) => parent?.kind !== 'repeat',
    }),
    defineField({
      name: 'chart',
      type: 'image',
      description: 'Optional chart or diagram for this step',
      options: {hotspot: false},
    }),
  ],
  preview: {
    select: {
      label: 'label',
      kind: 'kind',
      instruction: 'instruction',
      counts: 'stitchCount',
      repeatTimes: 'repeatTimes',
    },
    prepare({label, kind, instruction, counts, repeatTimes}) {
      const groups: PreviewGroup[] = Array.isArray(instruction) ? instruction : []
      const rawCounts: PreviewCount[] = Array.isArray(counts) ? counts : []
      const rawRepeat = typeof repeatTimes === 'number' ? repeatTimes : null

      const kindLabel = kind ? kind.charAt(0).toUpperCase() + kind.slice(1) : 'Step'
      const isRepeat = kind === 'repeat' && rawRepeat !== null && rawRepeat > 1
      const base = label || kindLabel
      const title = isRepeat ? `${base} × ${rawRepeat}` : base

      // Sync fallback subtitle — used when the custom component isn't
      // active (e.g., in reference dialogs) or before its async fetch
      // resolves. It renders "?" for stitchTypes because refs aren't
      // resolved here; the custom preview replaces them with real
      // abbreviations once loaded.
      const stitchesLine = groups.map(formatGroupSync).filter(Boolean).join(' · ')
      const countsLine = summariseCounts(rawCounts)
      const subtitle = [stitchesLine, countsLine].filter(Boolean).join(' → ')

      return {
        title,
        subtitle: subtitle ? truncate(subtitle, 120) : undefined,
        // Extra fields piped through to the custom preview component so it
        // can do a batched fetch to resolve stitchType abbreviations. These
        // aren't part of Sanity's PreviewValue contract but the runtime
        // passes unknown keys straight through as component props.
        _rawInstruction: groups,
        _rawCounts: rawCounts,
        _rawRepeatTimes: rawRepeat,
        _rawKind: kind ?? null,
        _rawLabel: label ?? null,
      }
    },
  },
  components: {
    preview: InstructionStepPreview,
  },
})

type PreviewStitch = {
  count?: number
  stitchType?: {abbreviation?: string}
}

type PreviewGroup = {
  label?: string
  count?: number
  stitches?: PreviewStitch[]
}

type PreviewCount = {
  size?: string
  value?: number
}

/**
 * Sync version of the group formatter — used by the fallback `prepare`
 * subtitle. The `stitchType` reference isn't resolved by Sanity's
 * `select` API inside iterated arrays, so `abbreviation` is always
 * undefined here; we emit `?` and let the custom preview component
 * replace it with the real abbreviation after its fetch resolves.
 */
function formatGroupSync(g: PreviewGroup | undefined): string {
  if (!g) return ''
  const stitches = Array.isArray(g.stitches) ? g.stitches : []
  const inner = stitches
    .map((s) => {
      const abbr = s?.stitchType?.abbreviation ?? '?'
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
