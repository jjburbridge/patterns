import {defineType, defineField, defineArrayMember} from 'sanity'
import {PackageIcon} from '@sanity/icons'

export const yarn = defineType({
  name: 'yarn',
  title: 'Yarn',
  type: 'document',
  icon: PackageIcon,
  fields: [
    defineField({
      name: 'name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'brand',
      type: 'string',
    }),
    defineField({
      name: 'weight',
      type: 'string',
      title: 'Yarn weight',
      options: {
        list: [
          {title: 'Lace (0)', value: 'lace'},
          {title: 'Super fine (1) — sock/fingering', value: 'superFine'},
          {title: 'Fine (2) — sport', value: 'fine'},
          {title: 'Light (3) — DK', value: 'light'},
          {title: 'Medium (4) — worsted/aran', value: 'medium'},
          {title: 'Bulky (5) — chunky', value: 'bulky'},
          {title: 'Super bulky (6)', value: 'superBulky'},
          {title: 'Jumbo (7)', value: 'jumbo'},
        ],
      },
    }),
    defineField({
      name: 'fiber',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      options: {
        list: [
          {title: 'Wool', value: 'wool'},
          {title: 'Merino', value: 'merino'},
          {title: 'Alpaca', value: 'alpaca'},
          {title: 'Cashmere', value: 'cashmere'},
          {title: 'Mohair', value: 'mohair'},
          {title: 'Silk', value: 'silk'},
          {title: 'Cotton', value: 'cotton'},
          {title: 'Linen', value: 'linen'},
          {title: 'Bamboo', value: 'bamboo'},
          {title: 'Acrylic', value: 'acrylic'},
          {title: 'Nylon', value: 'nylon'},
          {title: 'Polyester', value: 'polyester'},
        ],
      },
    }),
    defineField({
      name: 'yardsPerSkein',
      type: 'number',
      title: 'Yards per skein',
    }),
    defineField({
      name: 'metersPerSkein',
      type: 'number',
      title: 'Meters per skein',
    }),
    defineField({
      name: 'gramsPerSkein',
      type: 'number',
      title: 'Grams per skein',
    }),
    defineField({
      name: 'website',
      type: 'url',
    }),
  ],
  preview: {
    select: {title: 'name', brand: 'brand', weight: 'weight'},
    prepare({title, brand, weight}) {
      return {
        title: title || 'Yarn',
        subtitle: [brand, weight].filter(Boolean).join(' · ') || undefined,
      }
    },
  },
})
