import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {stitchChartTool} from './tools/stitchChart'
import {ExportPdfAction, PATTERN_TYPES} from './pdf'
import {dataset, projectId} from './env'

export default defineConfig({
  name: 'default',
  title: 'patterns',

  projectId,
  dataset,

  plugins: [structureTool(), visionTool()],

  schema: {
    types: schemaTypes,
  },

  tools: (prev) => [...prev, stitchChartTool],

  document: {
    actions: (prev, context) =>
      PATTERN_TYPES.includes(context.schemaType) ? [...prev, ExportPdfAction] : prev,
  },
})
