# Using the Studio

How to write a pattern, draw a chart, and get a PDF out the other end.

- [Opening the Studio](#opening-the-studio)
- [Set up the reference data first](#set-up-the-reference-data-first)
- [Writing a pattern](#writing-a-pattern)
- [The stitch chart designer](#the-stitch-chart-designer)
- [Exporting a PDF](#exporting-a-pdf)
- [When something looks wrong](#when-something-looks-wrong)

## Opening the Studio

```sh
pnpm install
pnpm dev
```

Then <http://localhost:3333>. You are editing the hosted `production` dataset, so your changes are
real as soon as you publish — but everything you type before that lives in a draft only you are
looking at.

The left-hand pane lists every document type. The **Stitch chart designer** sits in the top
navigation bar alongside Structure and Vision, because it works across patterns rather than inside
any one of them.

## Set up the reference data first

Patterns reference other documents rather than repeating their details, so a little groundwork pays
off before you write your first pattern.

**Stitch types are the important one.** They are what makes a chart possible, and an empty catalog
leaves the chart designer with nothing to paint. Each `stitchType` describes one stitch:

| Field                   | What it is for                                                               |
| ----------------------- | ---------------------------------------------------------------------------- |
| Name, abbreviation      | "Double crochet", `dc`. The abbreviation is what prints in instructions.     |
| Alternate abbreviations | Other spellings that mean this stitch — usually the UK/US counterpart.       |
| Craft                   | `knit` or `crochet`. Decides which palette the stitch appears in.            |
| Chart symbol key        | Which symbol to draw. Must match a shape the chart tool knows (see below).   |
| Chart yield             | How many chart positions one application of the stitch produces.             |
| Palette group           | Which row of the palette it lands in — Basic, Decrease, Increase, Cluster, … |
| Sort order              | Position within that group. Falls back to alphabetical.                      |
| Show in chart palette   | Turn off for aliases that share a symbol with another stitch.                |

**Chart yield** is worth understanding, because stitch counts depend on it. It is the number of
positions the stitch leaves behind, not the number of movements you make: `1` for an ordinary
stitch or a decrease, `2` for a `2dc-inc`, `5` for a five-stitch shell, and `0` for something that
occupies no position of its own such as a chain, a slip stitch, or a magic ring.

**Chart symbol key** has to match a shape registered in the tool. The ones that exist today:

```
ch  sc  hdc  dc  tr  dtr
fpdc  bpdc  fptr  bptr
sc-blo  hdc-blo  dc-blo  tr-blo
sc2tog  sc3tog  dc2tog  dc3tog
2sc-inc  2dc-inc  3dc-inc  4dc-inc
3dc-cluster  5dc-cluster  3hdc-puff  5dc-popcorn  5hdc-popcorn
picot  v-stitch  shell  crab  magic-ring  no-stitch
```

A stitch with no symbol key still works in a pattern; it just can't be drawn on a chart.

The other reference types — **yarn**, **hook**, **needle**, and **category** — are ordinary lookup
documents. Create them as you need them; a pattern's materials list points at them rather than
restating sizes and brands.

## Writing a pattern

Create a **Crochet pattern** or a **Knit pattern**. Beyond the obvious title, designer, and
description, a few fields carry more weight than they look like they do.

**Terminology** (crochet only) records whether the pattern is written in US or UK terms. The same
abbreviations mean different stitches in each, so this is the difference between a readable pattern
and a ruined one. It prints in the PDF subtitle.

**Sizes** are more than labels. Each size carries a multiplier and a list of measurements. The
multiplier lets a step derive its per-size stitch counts instead of you typing each one: turn on
_Use multiplier_ on a step, give it a base count, and the counts come out as base × multiplier.
Where that doesn't fit, leave it off and fill in the per-size counts by hand.

**Gauge** matters to anyone knitting or crocheting from the pattern at a different tension, and it
prints in the front matter of the PDF.

### Sections and steps

Instructions are structured rather than typed as prose:

- A **section** is a named part of the piece — Crown, Body, Brim. It can carry notes of its own.
- A **step** is one row, round, setup note, or repeat block. Its _kind_ says which. A repeat block
  also takes a number of times.
- Inside a step, the **instruction** is a list of groups, one per phrase in the written pattern.
  A group has a repeat count and a list of stitches, so `*(2 tr, 2tr in next st) repeat 12 times`
  is one group with a count of 12 and two stitches inside it.
- A **stitch** is a count plus a reference to a `stitchType`.

Referencing stitches rather than typing them is what lets the tooling read your pattern back: the
chart designer can draw a section you have written, the PDF can list the stitches the pattern uses,
and the stitch counts can be checked rather than trusted.

Finish each step with its **stitch count per size** — the number of stitches on the hook or needles
when the step is done. The PDF prints these down the right-hand margin, which is how most people
actually check their work.

## The stitch chart designer

Open it from the top navigation. It has two modes, and which one you can use depends on what you
are charting.

### Grid — anything worked flat, and freehand colourwork

The grid is a plain chart: columns numbered from the right, rows from the bottom, matching the
order both knit and crochet charts are read in.

Set **Width** and **Height** (3 to 80 either way), or load a **Preset** to start from something —
there is a blank 9 × 6, a blank 12 × 12, a letter A, and a heart.

Pick a **colour** and a **stitch** from the palette, then click cells to paint them. The two are
independent: a colour with no stitch is colourwork, a stitch with no colour is a symbol chart, and
both together gives you both. Two entries sit at the front of the stitch row — _auto_, which paints
colour and leaves the symbol alone, and _blank_, which marks a cell as deliberately unworked.

**Shift-click or right-click erases.**

Use the **Craft** toggle to switch between the knit and crochet palettes. Symbols are craft-specific,
so switching drops the active stitch back to _auto_ rather than leaving you painting a symbol that
isn't in the palette you are looking at.

### Ring — anything worked in the round

Ring charts are drawn outward from a central magic ring. There are two ways to get one.

**From a pattern section.** Pick a pattern in _Populate from pattern_ and the tool reads that
section's instructions and draws them: each round's symbols come straight from the stitches you
wrote. The Ring button is disabled for sections worked in rows — chart those on the grid.

**Freehand.** With no pattern selected, the ring is yours to describe: a number of **rounds**
(up to 24), the **stitches in round 1** (3 to 48), and a **shape** — a flat circle that increases
every round, or a tube that keeps the same count throughout. The toolbar shows the resulting total
and the outer round's count as you change them.

Either way, clicking a stitch paints over it, the same as on the grid. Overrides sit on top of the
underlying chart, so _Reset to pattern_ throws your edits away and redraws from the instructions
while _Clear_ empties the chart entirely.

### The sidebar

The right-hand panel shows a legend and a running tally: painted cells per row and a breakdown by
colour on the grid, or the stitch count and symbol mix per round on a ring, plus a list of any
overrides you have painted.

### Your work is saved locally

Charts autosave to your browser's local storage, per pattern section and one slot for the freehand
grid. They survive a reload but they are not in Sanity and nobody else can see them. A chart only
becomes real content when you save it as a pattern.

### Turning a chart into a pattern

**Export PNG** downloads the chart as an image — useful for a step's _chart_ field, or for anywhere
outside the Studio.

**Save as pattern** writes the chart into Sanity as structured instructions. The dialog asks:

- **Read instructions from** — the freehand grid, or the ring chart including anything painted over
  it. The grid is read bottom row first, right to left: the order the stitches are worked.
- **Save this chart as** — a new pattern, or a new section appended to one that already exists.
  Appending is how a pattern gets built up a section at a time. It defaults to creating a new
  pattern, so opening the dialog can never overwrite something by accident.
- **Each chart line is a** — row or round, which sets how the steps are labelled.
- **Base stitch** (grid only) — what a cell painted with a colour but no symbol counts as, so the
  stitch counts come out right.

A preview at the bottom shows the first few steps as they will be written, with the total stitch
count, so you can check the reading order before committing.

Whatever you save lands as a **draft**. If you append to a pattern that is already published, the
new section goes into a draft and the live version is untouched until you publish it yourself.

## Exporting a PDF

Open any pattern and choose **Export PDF** from the document actions menu, beside Publish. It
exports what you are looking at, drafts included, so you can print a pattern you are still working
on.

The PDF puts everything you need before casting on onto the first page — the hero photograph, the
description, materials, gauge, sizes, and the stitches the pattern uses — and then the instructions,
one block per section, with each section's chart drawn in place and stitch counts down the right
margin.

The charts are rendered by the same code the chart designer uses, so a printed chart is the chart
you drew. A chart that fails to draw is left out rather than failing the whole export; you get the
instructions either way.

Export is the one place the Studio pulls in a large dependency, so it is downloaded the first time
you use it rather than on every page load. Expect a short pause on the first export of a session.

## When something looks wrong

**The palette is empty.** There are no `stitchType` documents for that craft with a chart symbol
key. Check the craft toggle first, then that your stitch types have _Chart symbol key_ filled in
with a value from the list above.

**The Ring button is disabled.** The selected section is worked in rows. Either chart it on the
grid, or deselect the pattern to build a ring freehand.

**A chart shows the wrong stitch.** Almost always a _Chart yield_ that doesn't match the stitch.
A stitch that occupies no position of its own — a chain, a slip stitch — should be `0`; an increase
should be however many stitches it leaves.

**Saving warned about unresolved stitches.** The chart used a symbol with no matching `stitchType`
document. Those groups were saved with a readable label but no reference, so they will print but
won't count toward the stitches-used list. Create the missing stitch type and re-save.

**Stitch counts in the PDF look low.** Check the step's _stitch count per size_ against the size
labels the pattern declares — a count filed under a size that no longer exists won't print.
