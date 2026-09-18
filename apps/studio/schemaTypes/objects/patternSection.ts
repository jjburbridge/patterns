import {defineType, defineField, defineArrayMember} from 'sanity'

export const patternSection = defineType({
  name: 'patternSection',
  title: 'Section',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      description: 'E.g., "Cuff", "Body", "Sleeve cap", "Finishing"',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'notes',
      type: 'text',
      rows: 2,
      description: 'Optional commentary or context for this section',
    }),
    defineField({
      name: 'steps',
      type: 'array',
      of: [defineArrayMember({type: 'instructionStep'})],
    }),
  ],
  preview: {
    select: {title: 'title', steps: 'steps'},
    prepare({title, steps}) {
      const count = Array.isArray(steps) ? steps.length : 0
      return {
        title: title || 'Section',
        subtitle: count > 0 ? `${count} step${count === 1 ? '' : 's'}` : 'No steps',
      }
    },
  },
})
