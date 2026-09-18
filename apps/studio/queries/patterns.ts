/**
 * Reusable GROQ over the pattern documents.
 *
 * The stitch chart tool has its own query in `tools/stitchChart/data/
 * patterns.ts`, shaped for the chart editor and not much use to anything
 * else. What lives here is meant to be shared by consumers of the dataset,
 * so this is the file that moves into `packages/` once a frontend exists.
 */

/**
 * Ids of the stitch types a pattern uses, read from its own instructions.
 *
 * Patterns used to carry this as a stored `stitchesUsed` array beside their
 * sections. Nothing ever read it, and it had to be kept in step by hand every
 * time a section was added or edited, so it drifted for free. The
 * instructions already name every stitch worked, which makes the stored copy
 * redundant.
 *
 * `defined(@)` filters the flattened result rather than the traversal.
 * An instruction group with no `stitches` — a step whose stitches were never
 * filled in — contributes a null at that point in the flattening, and only
 * the outer filter is in a position to drop it.
 *
 * Use it relative to a pattern document:
 *
 *   *[_type == "crochetPattern"]{title, "stitchIds": <STITCHES_USED_IDS>}
 */
export const STITCHES_USED_IDS = /* groq */ `
  array::unique(sections[].steps[].instruction[].stitches[].stitchType._ref)[defined(@)]
`

/**
 * The stitch type documents a pattern uses, in palette order.
 *
 * Missing references need no filtering here, since a null matches no `_id`.
 * Append whatever fields the caller wants:
 *
 *   *[_type == "crochetPattern"]{title, "stitchesUsed": <STITCHES_USED>{abbreviation, name}}
 */
export const STITCHES_USED = /* groq */ `
  *[_id in array::unique(^.sections[].steps[].instruction[].stitches[].stitchType._ref)]
  | order(coalesce(sortOrder, 999) asc)
`
