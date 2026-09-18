import {defineType, defineField} from 'sanity'
import {SparklesIcon} from '@sanity/icons'

export const stitchType = defineType({
  name: 'stitchType',
  title: 'Stitch type',
  type: 'document',
  icon: SparklesIcon,
  fieldsets: [
    {name: 'chart', title: 'Chart', options: {collapsible: true, collapsed: false}},
  ],
  fields: [
    defineField({
      name: 'name',
      type: 'string',
      description: 'Full stitch name, e.g., "Single crochet", "Slip slip knit"',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'abbreviation',
      title: 'Abbreviation (primary)',
      type: 'string',
      description: 'Primary abbreviation used in patterns, e.g., "sc", "ssk"',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'aliases',
      title: 'Alternate abbreviations',
      type: 'array',
      description:
        'Other abbreviations that should resolve to this stitch — commonly the UK/US alternate (e.g., US "sc" ↔ UK "dc"), or informal shortenings.',
      of: [{type: 'string'}],
      options: {layout: 'tags'},
    }),
    defineField({
      name: 'craft',
      type: 'string',
      options: {
        list: [
          {title: 'Knit', value: 'knit'},
          {title: 'Crochet', value: 'crochet'},
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      type: 'text',
      rows: 3,
      description: 'How the stitch is worked',
    }),
    defineField({
      name: 'difficulty',
      type: 'string',
      options: {
        list: [
          {title: 'Basic', value: 'basic'},
          {title: 'Intermediate', value: 'intermediate'},
          {title: 'Advanced', value: 'advanced'},
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'chartSymbol',
      title: 'Chart symbol key',
      type: 'string',
      description:
        'Key of the SVG renderer used to draw this stitch on a chart, e.g., "dc", "2dc-inc". Must match a shape registered in the chart tool.',
      fieldset: 'chart',
    }),
    defineField({
      name: 'yieldSts',
      title: 'Chart yield (positions)',
      type: 'number',
      description:
        'Number of chart positions a single application of this stitch produces. 0 for markers (ch, sl st, magic ring), 1 for basic stitches and decreases, 2+ for increases (e.g., 2 for 2dc-inc, 3 for 3dc-inc, 5 for a 5-dc shell).',
      initialValue: 1,
      validation: (rule) => rule.min(0).integer(),
      fieldset: 'chart',
    }),
    defineField({
      name: 'group',
      title: 'Palette group',
      type: 'string',
      description: 'Which row of the palette this stitch appears in.',
      options: {
        list: [
          {title: 'Basic', value: 'basic'},
          {title: 'Post', value: 'post'},
          {title: 'Back loop', value: 'loop'},
          {title: 'Decrease', value: 'decrease'},
          {title: 'Increase', value: 'increase'},
          {title: 'Cluster / Puff', value: 'cluster'},
          {title: 'Popcorn', value: 'popcorn'},
          {title: 'Special', value: 'special'},
          {title: 'Marker', value: 'marker'},
        ],
      },
      initialValue: 'basic',
      fieldset: 'chart',
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort order',
      type: 'number',
      description:
        'Position within the palette group (ascending). Lower numbers appear first. Optional — falls back to alphabetical order by abbreviation.',
      validation: (rule) => rule.min(0).integer(),
      fieldset: 'chart',
    }),
    defineField({
      name: 'showInPalette',
      title: 'Show in chart palette',
      type: 'boolean',
      description:
        'When off, this stitch will not appear as a chip in the palette (useful for terminology aliases that share a chart symbol with another stitch, e.g., UK "tr" is an alias for the US "dc" chip).',
      initialValue: true,
      fieldset: 'chart',
    }),
  ],
  orderings: [
    {
      title: 'Craft, group, then sort order',
      name: 'craftGroupSort',
      by: [
        {field: 'craft', direction: 'asc'},
        {field: 'group', direction: 'asc'},
        {field: 'sortOrder', direction: 'asc'},
        {field: 'abbreviation', direction: 'asc'},
      ],
    },
  ],
  preview: {
    select: {name: 'name', abbr: 'abbreviation', craft: 'craft', group: 'group'},
    prepare({name, abbr, craft, group}) {
      return {
        title: name || 'Stitch',
        subtitle: [abbr, craft, group].filter(Boolean).join(' · ') || undefined,
      }
    },
  },
})
