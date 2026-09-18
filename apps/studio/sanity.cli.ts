import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'g1bgv0t7',
    dataset: 'production',
  },
  deployment: {
    appId: 'spm09e8gx4sdyfl3hykg1vka',
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: false,
  },
})
