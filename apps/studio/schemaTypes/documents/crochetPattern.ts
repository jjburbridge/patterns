import {defineType, defineField, defineArrayMember} from 'sanity'
import {BookIcon} from '@sanity/icons'
import {sharedPatternFields} from '../shared/patternFields'

export const crochetPattern = defineType({
  name: 'crochetPattern',
  title: 'Crochet pattern',
  type: 'document',
  icon: BookIcon,
  fields: [
    ...sharedPatternFields,
    defineField({
      name: 'hooks',
      type: 'array',
      of: [defineArrayMember({type: 'hookRequirement'})],
    }),
    defineField({
      name: 'terminology',
      type: 'string',
      description: 'US and UK terms use the same abbreviations to mean different stitches',
      options: {
        list: [
          {title: 'US terms', value: 'us'},
          {title: 'UK terms', value: 'uk'},
        ],
        layout: 'radio',
      },
      initialValue: 'us',
    }),
  ],
  preview: {
    select: {title: 'title', designer: 'designer', media: 'heroImage'},
    prepare({title, designer, media}) {
      return {
        title: title || 'Untitled crochet pattern',
        subtitle: designer ? `by ${designer}` : undefined,
        media,
      }
    },
  },
})
