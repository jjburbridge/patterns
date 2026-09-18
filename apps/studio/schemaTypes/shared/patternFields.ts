import {defineField, defineArrayMember} from 'sanity'

export const sharedPatternFields = [
  defineField({
    name: 'title',
    type: 'string',
    validation: (rule) => rule.required(),
  }),
  defineField({
    name: 'slug',
    type: 'slug',
    options: {source: 'title', maxLength: 96},
    validation: (rule) => rule.required(),
  }),
  defineField({
    name: 'designer',
    type: 'string',
    description: 'Pattern designer name',
  }),
  defineField({
    name: 'description',
    type: 'text',
    rows: 3,
  }),
  defineField({
    name: 'skillLevel',
    type: 'string',
    options: {
      list: [
        {title: 'Beginner', value: 'beginner'},
        {title: 'Easy', value: 'easy'},
        {title: 'Intermediate', value: 'intermediate'},
        {title: 'Advanced', value: 'advanced'},
        {title: 'Expert', value: 'expert'},
      ],
      layout: 'radio',
    },
  }),
  defineField({
    name: 'categories',
    type: 'array',
    of: [defineArrayMember({type: 'reference', to: [{type: 'category'}]})],
  }),
  defineField({
    name: 'heroImage',
    type: 'image',
    options: {hotspot: true},
  }),
  defineField({
    name: 'gallery',
    type: 'array',
    of: [defineArrayMember({type: 'image', options: {hotspot: true}})],
  }),
  defineField({
    name: 'yarnRequirements',
    type: 'array',
    of: [defineArrayMember({type: 'yarnRequirement'})],
  }),
  defineField({
    name: 'gauge',
    type: 'gauge',
  }),
  defineField({
    name: 'sizes',
    type: 'array',
    of: [defineArrayMember({type: 'sizeOption'})],
  }),
  defineField({
    name: 'notions',
    type: 'array',
    description: 'E.g., stitch markers, tapestry needle, cable needle',
    of: [defineArrayMember({type: 'string'})],
  }),
  defineField({
    name: 'sections',
    type: 'array',
    description: 'Ordered structured instructions, grouped by section',
    of: [defineArrayMember({type: 'patternSection'})],
  }),
  defineField({
    name: 'publishedAt',
    type: 'datetime',
  }),
]
