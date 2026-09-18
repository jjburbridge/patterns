import {defineType, defineField} from 'sanity'
import {PinIcon} from '@sanity/icons'

export const needle = defineType({
  name: 'needle',
  title: 'Knitting needle',
  type: 'document',
  icon: PinIcon,
  fields: [
    defineField({
      name: 'sizeMm',
      type: 'number',
      title: 'Size (mm)',
      validation: (rule) => rule.required().positive(),
    }),
    defineField({
      name: 'sizeUs',
      type: 'string',
      title: 'US size',
      description: 'E.g., "8", "10½"',
    }),
    defineField({
      name: 'sizeUk',
      type: 'string',
      title: 'UK size',
    }),
    defineField({
      name: 'brand',
      type: 'string',
    }),
  ],
  preview: {
    select: {mm: 'sizeMm', us: 'sizeUs', brand: 'brand'},
    prepare({mm, us, brand}) {
      const size = [mm ? `${mm} mm` : null, us ? `US ${us}` : null].filter(Boolean).join(' / ')
      return {
        title: size || 'Needle',
        subtitle: brand ?? undefined,
      }
    },
  },
})
