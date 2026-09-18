/**
 * Writing charts back to Sanity.
 *
 * `patternDraft.ts` turns chart state into document shapes; this module puts
 * those shapes into the dataset. It is kept free of React and of `sanity` so
 * the write behaviour — particularly the copy-on-edit dance needed to append
 * to a published pattern — can be exercised against a plain client.
 */

import {buildPatternSection, type PatternSectionDraft} from './patternDraft'
import type {ChartRow, SectionDraftOptions, StitchResolver} from './patternDraft'

/**
 * The subset of the Sanity client these writes need. Declaring it structurally
 * rather than importing the client keeps this module runnable outside the
 * Studio, against a plain `@sanity/client` instance.
 *
 * The mutation methods are heavily overloaded on the real client, and a
 * narrower parameter type here would make it fail to match, so the arguments
 * we don't use are left loose on purpose.
 */
export type PatternWriteClient = {
  getDocument: (id: string) => Promise<Record<string, unknown> | undefined>
  create: (doc: any, options?: any) => Promise<Record<string, unknown>>
  patch: (id: string) => PatchBuilder
}

type PatchBuilder = {
  setIfMissing: (attrs: Record<string, unknown>) => PatchBuilder
  append: (selector: string, items: any[]) => PatchBuilder
  commit: (options?: any) => Promise<Record<string, unknown>>
}

export type AppendSectionResult = PatternSectionDraft & {
  /** Sections the pattern has once the new one is in place. */
  sectionCount: number
}

/**
 * Append a chart to an existing pattern as a new section.
 *
 * Everything the tool writes goes to drafts, so a pattern that exists only in
 * published form has to have a draft made from it first — the same
 * copy-on-edit the Studio performs the moment you type into a published
 * document. Without it the patch would either fail or edit live content.
 */
export async function appendSectionToPattern(
  client: PatternWriteClient,
  publishedId: string,
  rows: readonly ChartRow[],
  opts: SectionDraftOptions,
  resolve: StitchResolver,
): Promise<AppendSectionResult> {
  const draft = buildPatternSection(rows, opts, resolve)
  const draftId = `drafts.${publishedId}`

  if (!(await client.getDocument(draftId))) {
    const published = await client.getDocument(publishedId)
    if (!published) throw new Error('That pattern no longer exists — refresh the pattern list.')
    await client.create({...published, _id: draftId})
  }

  const updated = await client
    .patch(draftId)
    .setIfMissing({sections: []})
    .append('sections', [draft.section])
    .commit()

  const sectionCount = Array.isArray(updated.sections) ? updated.sections.length : 1
  return {...draft, sectionCount}
}
