import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {stitchChartTool} from './tools/stitchChart'

export default defineConfig({
  name: 'default',
  title: 'patterns',

  projectId: 'g1bgv0t7',
  dataset: 'production',

  plugins: [structureTool(), visionTool()],

  schema: {
    types: schemaTypes,
  },

  tools: (prev) => [...prev, stitchChartTool],
})
