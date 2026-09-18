import {defineType, defineField, defineArrayMember} from 'sanity'

/**
 * One "chunk" of stitches within an `instructionStep.instruction[]`.
 *
 * A group holds an ordered sequence of atomic stitches and an optional
 * repeat count for the whole sequence — so "*sc, 2sc-inc* repeat 6 times"
 * becomes a single group with `count: 6` and two `stitches[]` entries.
 *
 * For simple flat instructions (e.g., "12 tr") the group holds a single
 * stitch and `count` defaults to 1.
 */
export const instructionGroup = defineType({
  name: 'instructionGroup',
  title: 'Instruction group',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      type: 'string',
      description:
        'How the group reads in the pattern, e.g., "ch 2", "sc, 2sc-inc", "sl st to first tr"',
    }),
    defineField({
      name: 'count',
      type: 'number',
      description:
        'How many times to repeat the whole `stitches` sequence. Defaults to 1 for single-stitch groups.',
      initialValue: 1,
      validation: (rule) => rule.integer().positive(),
    }),
    defineField({
      name: 'stitches',
      type: 'array',
      description: 'The atomic stitches that make up one iteration of this group.',
      of: [defineArrayMember({type: 'stitchRef'})],
    }),
    defineField({
      name: 'sizeDependentCount',
      type: 'boolean',
      description: 'Whether the count is dependent on the size of the project.',
      initialValue: false,
    }),
  ],
  preview: {
    select: {label: 'label', count: 'count', stitches: 'stitches'},
    prepare({label, count, stitches}) {
      const list = Array.isArray(stitches) ? stitches : []
      const summary = list
        .map((s) => {
          const abbr = s?.stitchType?.abbreviation ?? s?.stitchType?._ref ?? '?'
          const n = s?.count
          return typeof n === 'number' ? `${n} ${abbr}` : abbr
        })
        .join(', ')
      // Show the repeat count as a "× N" suffix so it's always visible when
      // meaningful — regardless of whether the row also has a label. A count
      // of 1 is the default and adds no information, so it's omitted.
      const suffix = typeof count === 'number' && count > 1 ? ` × ${count}` : ''
      const base = label || summary || 'Instruction group'
      return {
        title: `${base}${suffix}`,
        subtitle: label && summary ? summary : undefined,
      }
    },
  },
})
