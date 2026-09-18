import {defineType, defineField} from 'sanity'

export const gauge = defineType({
  name: 'gauge',
  title: 'Gauge',
  type: 'object',
  fields: [
    defineField({
      name: 'stitches',
      type: 'number',
      description: 'Stitches across the swatch',
      validation: (rule) => rule.positive(),
    }),
    defineField({
      name: 'rows',
      type: 'number',
      description: 'Rows (or rounds) over the swatch',
      validation: (rule) => rule.positive(),
    }),
    defineField({
      name: 'swatchSize',
      type: 'string',
      description: 'E.g., "10 cm" or "4 inches"',
      initialValue: '10 cm',
    }),
    defineField({
      name: 'stitchPattern',
      type: 'string',
      description: 'E.g., "stockinette, blocked" or "single crochet"',
    }),
  ],
})
