import {defineType, defineField} from 'sanity'

export const needleRequirement = defineType({
  name: 'needleRequirement',
  title: 'Needles',
  type: 'object',
  fields: [
    defineField({
      name: 'needle',
      type: 'reference',
      to: [{type: 'needle'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'type',
      type: 'string',
      options: {
        list: [
          {title: 'Straight', value: 'straight'},
          {title: 'Circular', value: 'circular'},
          {title: 'Double-pointed (DPN)', value: 'dpn'},
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'lengthCm',
      type: 'number',
      title: 'Length (cm)',
      hidden: ({parent}) => parent?.type !== 'circular',
    }),
    defineField({
      name: 'notes',
      type: 'string',
      description: 'E.g., "for sleeves" or "main fabric"',
    }),
  ],
  preview: {
    select: {mm: 'needle.sizeMm', us: 'needle.sizeUs', type: 'type'},
    prepare({mm, us, type}) {
      const size = [mm ? `${mm} mm` : null, us ? `US ${us}` : null].filter(Boolean).join(' / ')
      return {
        title: size || 'Needles',
        subtitle: type ?? undefined,
      }
    },
  },
})
