import {defineType, defineField} from 'sanity'

export const yarnRequirement = defineType({
  name: 'yarnRequirement',
  title: 'Yarn requirement',
  type: 'object',
  fields: [
    defineField({
      name: 'yarn',
      type: 'reference',
      to: [{type: 'yarn'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'colorway',
      type: 'string',
      description: 'Color or colorway used for this pattern',
    }),
    defineField({
      name: 'quantity',
      type: 'number',
      validation: (rule) => rule.positive(),
    }),
    defineField({
      name: 'unit',
      type: 'string',
      options: {
        list: [
          {title: 'Skeins', value: 'skeins'},
          {title: 'Balls', value: 'balls'},
          {title: 'Yards', value: 'yards'},
          {title: 'Meters', value: 'meters'},
          {title: 'Grams', value: 'grams'},
        ],
        layout: 'radio',
      },
      initialValue: 'skeins',
    }),
    defineField({
      name: 'notes',
      type: 'string',
      description: 'E.g., "held double" or "main color"',
    }),
  ],
  preview: {
    select: {yarn: 'yarn.name', colorway: 'colorway', quantity: 'quantity', unit: 'unit'},
    prepare({yarn, colorway, quantity, unit}) {
      const amount = quantity != null ? `${quantity} ${unit ?? ''}`.trim() : ''
      return {
        title: yarn || 'Yarn requirement',
        subtitle: [colorway, amount].filter(Boolean).join(' · ') || undefined,
      }
    },
  },
})
