import {defineCliConfig} from 'sanity/cli'
import {appId, dataset, projectId} from './env'

export default defineCliConfig({
  api: {
    projectId,
    dataset,
  },
  deployment: {
    appId,
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: false,
  },
})
