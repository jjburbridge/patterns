# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Layout

Turborepo + pnpm workspaces monorepo. Workspaces are declared in `pnpm-workspace.yaml` as `apps/*` and `packages/*`.

- `apps/studio/` — Sanity Studio v6 (currently the only app; `packages/` is reserved for future shared code)
- `turbo.json` — task pipeline (`build`, `dev`, `lint`, `deploy`, `deploy-graphql`)
- Root `package.json` — Turbo + shared Prettier config

## Commands

Package manager is **pnpm**. All scripts are run from the repo root and fan out through Turbo.

- `pnpm dev` — run all apps in dev mode (currently just the studio); Turbo treats this as `persistent`, no cache
- `pnpm build` — build everything; outputs cached under `.turbo/` and `apps/*/dist/**`
- `pnpm lint` — run ESLint across packages
- `pnpm deploy` — deploy each app (currently `sanity deploy`); depends on `build`
- `pnpm deploy-graphql` — deploy the GraphQL API for the dataset

To run a task against a single package, use Turbo's filter syntax: `pnpm turbo run build --filter=studio`. To run a script directly inside one workspace, `pnpm --filter studio <script>` (or `cd apps/studio && pnpm <script>`).

No test script is configured.

## Studio architecture (`apps/studio/`)

Three files define the studio's wiring:

- `sanity.cli.ts` — CLI/deployment config. Hardcodes `projectId: g1bgv0t7`, `dataset: production`, and enables Studio auto-updates.
- `sanity.config.ts` — runtime Studio config. Registers plugins (`structureTool`, `visionTool`) and pulls schema types from `./schemaTypes`.
- `schemaTypes/index.ts` — the single export point (`schemaTypes` array) consumed by `sanity.config.ts`. New document/object types should be defined in their own files under `schemaTypes/` and added to this array.

The studio is currently a bootstrap with an empty `schemaTypes` array — most work in this repo will be defining schemas. Use `defineType` / `defineField` from `sanity` for type-safe schema definitions, and prefer the `sanity-best-practices` skill when designing schemas, GROQ queries, or Studio structure.

## Code style

Prettier config lives at the root `package.json`: no semicolons, single quotes, `bracketSpacing: false`, `printWidth: 100`. Match this style when editing any file in the repo.
