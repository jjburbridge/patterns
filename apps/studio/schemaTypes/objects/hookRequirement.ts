import {defineType, defineField} from 'sanity'

export const hookRequirement = defineType({
  name: 'hookRequirement',
  title: 'Hook',
  type: 'object',
  fields: [
    defineField({
      name: 'hook',
      type: 'reference',
      to: [{type: 'hook'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'notes',
      type: 'string',
      description: 'E.g., "for edging" or "main fabric"',
    }),
  ],
  preview: {
    select: {mm: 'hook.sizeMm', us: 'hook.sizeUs', notes: 'notes'},
    prepare({mm, us, notes}) {
      const size = [mm ? `${mm} mm` : null, us ? `US ${us}` : null].filter(Boolean).join(' / ')
      return {
        title: size || 'Hook',
        subtitle: notes ?? undefined,
      }
    },
  },
})
