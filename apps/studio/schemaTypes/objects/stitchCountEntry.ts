import {defineType, defineField} from 'sanity'
import {SizeSelect} from '../components/SizeSelect'

export const stitchCountEntry = defineType({
  name: 'stitchCountEntry',
  title: 'Stitch count',
  type: 'object',
  fields: [
    defineField({
      name: 'size',
      type: 'string',
      description: 'Must match a size label on the parent pattern',
      components: {input: SizeSelect},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'value',
      type: 'number',
      title: 'Stitches',
      // Grading scales this by a size's multiplier, and the result is rounded
      // back to a whole stitch — so a fractional count here would only ever
      // be an error that quietly disappeared.
      validation: (rule) => rule.required().positive().integer(),
    }),
  ],
  preview: {
    select: {size: 'size', value: 'value'},
    prepare({size, value}) {
      return {
        title: size || 'No size',
        subtitle: value != null ? `${value} sts` : undefined,
      }
    },
  },
})
