import {defineType, defineField, defineArrayMember} from 'sanity'

export const sizeOption = defineType({
  name: 'sizeOption',
  title: 'Size',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      type: 'string',
      description: 'E.g., "S", "M", "L" or "Newborn", "6 months"',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'multiplier',
      type: 'number',
      description: 'Scaling factor used by size-graded instruction steps',
      initialValue: 1,
    }),
    defineField({
      name: 'measurements',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'measurement',
          fields: [
            defineField({
              name: 'name',
              type: 'string',
              description: 'E.g., "Chest", "Length", "Sleeve"',
            }),
            defineField({name: 'value', type: 'number'}),
            defineField({
              name: 'unit',
              type: 'string',
              options: {
                list: [
                  {title: 'cm', value: 'cm'},
                  {title: 'in', value: 'in'},
                ],
                layout: 'radio',
              },
              initialValue: 'cm',
            }),
          ],
          preview: {
            select: {name: 'name', value: 'value', unit: 'unit'},
            prepare({name, value, unit}) {
              return {
                title: name || 'Measurement',
                subtitle: value != null ? `${value} ${unit ?? ''}`.trim() : undefined,
              }
            },
          },
        }),
      ],
    }),
  ],
  preview: {
    select: {label: 'label', multiplier: 'multiplier'},
    prepare({label, multiplier}) {
      return {
        title: label || 'Untitled size',
        subtitle: multiplier != null ? `×${multiplier}` : undefined,
      }
    },
  },
})
