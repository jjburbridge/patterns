# Patterns

A Sanity Studio for writing knitting and crochet patterns as structured content rather than as a
block of prose.

A pattern here is a document, not a page. Every step names the stitches it works and the stitch
count it leaves behind, so the same pattern can be read back as instructions, drawn as a chart, or
printed as a PDF without anyone re-typing it. The Studio ships two things on top of the schemas to
make that practical: a **stitch chart designer** that can draw a chart from a pattern section — or
turn a chart you paint into one — and a **PDF export** that prints the whole pattern, charts
included.

New to the Studio? Start with the **[guide to using the Studio](docs/using-the-studio.md)**.

## Getting started

Requires Node 22.12 or newer (Sanity v6's floor) and [pnpm](https://pnpm.io) 10 — declared as the
`packageManager`, so [Corepack](https://nodejs.org/api/corepack.html) will pick the right version
up for you.

```sh
pnpm install
pnpm dev
```

The Studio comes up on <http://localhost:3333>. It talks to the hosted `production` dataset on
Sanity project `g1bgv0t7`, so you will be asked to log in and there is no local database to seed.

## Commands

All scripts run from the repo root and fan out through [Turborepo](https://turborepo.com).

| Command               | What it does                                                    |
| --------------------- | --------------------------------------------------------------- |
| `pnpm dev`            | Run every app in dev mode. Persistent, never cached.            |
| `pnpm build`          | Build everything. Output is cached under `.turbo/` and `dist/`. |
| `pnpm lint`           | ESLint across the workspace.                                    |
| `pnpm deploy`         | Deploy each app — currently `sanity deploy`. Builds first.      |
| `pnpm deploy-graphql` | Deploy the GraphQL API for the dataset.                         |

To run a task against one package, use Turbo's filter: `pnpm turbo run build --filter=studio`. To
run a script inside a workspace directly, `pnpm --filter studio <script>`.

There is no test script.

## Layout

A Turborepo + pnpm workspaces monorepo. `pnpm-workspace.yaml` declares `apps/*` and `packages/*`,
though only `apps/` exists so far — `packages/` is reserved for code a frontend would share.

```
apps/studio/          Sanity Studio v6 — the only app
  schemaTypes/        Documents and objects; index.ts is the single export point
  tools/stitchChart/  The chart designer, registered as a Studio tool
  pdf/                PDF export: query, document, chart rasterising, document action
  queries/            Shared GROQ meant to outlive the Studio
turbo.json            Task pipeline
```

Three files wire the Studio together:

- `sanity.cli.ts` — CLI and deployment config. Pins the project and dataset, and turns on Studio
  auto-updates.
- `sanity.config.ts` — runtime config. Registers the plugins, the schema types, the stitch chart
  tool, and the PDF export document action.
- `schemaTypes/index.ts` — the `schemaTypes` array the config consumes. A new type goes in its own
  file under `schemaTypes/` and is added here.

## Content model

Patterns come in two document types, `crochetPattern` and `knitPattern`, which share most of their
fields through `schemaTypes/shared/patternFields.ts` and differ only where the craft does: crochet
patterns carry hooks and a US/UK terminology switch, knit patterns carry needles.

The structure underneath is what makes the charts and the PDF possible:

```
pattern
└── sections[]          a named part of the garment — Crown, Body, Brim
    └── steps[]         one row, round, setup note, or repeat block
        └── instruction[]   one group per phrase, e.g. "*(2 tr, 2tr in next st)"
            └── stitches[]  a count and a reference to a stitchType
```

Stitches are references rather than free text, which is what lets a step be rendered as symbols.
The `stitchType` documents carry the chart metadata: which symbol to draw, how many chart positions
the stitch yields, and where it sits in the palette.

Nothing stores a list of the stitches a pattern uses — it is derived from the instructions on
demand. `queries/patterns.ts` exports that projection for anything that needs it.

## Code style

Prettier config lives in the root `package.json`: no semicolons, single quotes, no bracket spacing,
100-column lines. Match it when editing anything in the repo.

## Docs

- [Using the Studio](docs/using-the-studio.md) — writing patterns, the stitch chart designer, and
  PDF export
- [CLAUDE.md](CLAUDE.md) — orientation for AI coding agents working in this repo
