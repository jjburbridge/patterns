import {defineType, defineField} from 'sanity'

export const stitchRef = defineType({
  name: 'stitchRef',
  title: 'Stitch',
  type: 'object',
  fields: [
    defineField({
      name: 'stitchType',
      type: 'reference',
      to: [{type: 'stitchType'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'count',
      type: 'number',
      description: 'How many times to work this stitch',
      validation: (rule) => rule.integer().positive(),
    }),
  ],
  preview: {
    select: {abbr: 'stitchType.abbreviation', name: 'stitchType.name', count: 'count'},
    prepare({abbr, name, count}) {
      const symbol = abbr || name || 'stitch'
      return {
        title: count != null ? `${symbol}${count}` : symbol,
      }
    },
  },
})
