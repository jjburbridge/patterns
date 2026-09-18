import {defineType, defineField, defineArrayMember} from 'sanity'
import {BookIcon} from '@sanity/icons'
import {sharedPatternFields} from '../shared/patternFields'

export const knitPattern = defineType({
  name: 'knitPattern',
  title: 'Knit pattern',
  type: 'document',
  icon: BookIcon,
  fields: [
    ...sharedPatternFields,
    defineField({
      name: 'needles',
      type: 'array',
      of: [defineArrayMember({type: 'needleRequirement'})],
    }),
  ],
  preview: {
    select: {title: 'title', designer: 'designer', media: 'heroImage'},
    prepare({title, designer, media}) {
      return {
        title: title || 'Untitled knit pattern',
        subtitle: designer ? `by ${designer}` : undefined,
        media,
      }
    },
  },
})
