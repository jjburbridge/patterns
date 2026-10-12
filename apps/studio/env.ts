/**
 * The bits of Studio configuration that change between environments.
 *
 * Values come from gitignored `.env` files in this directory; `.env.example`
 * records the shape. Keeping them out of source is what makes pointing a
 * checkout at a staging dataset or a second project practical.
 *
 * The `SANITY_STUDIO_` prefix is not decoration: it is the only prefix the
 * bundler substitutes into browser code. The Sanity CLI loads `.env` files
 * before either config is evaluated, so the same names resolve in
 * `sanity.config.ts` (bundled) and `sanity.cli.ts` (Node).
 *
 * Each variable is read as a literal property rather than through a lookup,
 * because the substitution is a textual one — `process.env[name]` would
 * survive the build unreplaced and come back undefined in the browser.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `${name} is not set. Copy apps/studio/.env.example to .env and fill it in, ` +
        `or export it in the environment running this command.`,
    )
  }
  return value
}

export const projectId = required('SANITY_STUDIO_PROJECT_ID', process.env.SANITY_STUDIO_PROJECT_ID)

export const dataset = required('SANITY_STUDIO_DATASET', process.env.SANITY_STUDIO_DATASET)

/**
 * The deployed Studio this project pushes to.
 *
 * Only `sanity deploy` reads it, so it stays optional: running the Studio
 * locally against a dataset shouldn't require knowing where it deploys to.
 * Left unset, the CLI asks at deploy time.
 */
export const appId = process.env.SANITY_STUDIO_APP_ID || undefined
