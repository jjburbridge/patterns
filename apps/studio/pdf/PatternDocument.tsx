/**
 * The printed pattern.
 *
 * Laid out the way a pattern is actually used: everything you need before
 * casting on sits on the first page — materials, gauge, sizes, the stitches
 * the pattern uses — and the instructions follow, one block per section, so
 * you can work from the page without leafing back and forth.
 *
 * Only the built-in Helvetica family is used. Registering a webfont means a
 * network fetch that can fail at export time, and a pattern that prints in a
 * slightly plainer face beats one that doesn't print.
 */

import {Document, Font, Image, Page, StyleSheet, Text, View} from '@react-pdf/renderer'
import {
  formatCounts,
  formatGauge,
  formatHook,
  formatInstruction,
  formatNeedle,
  formatRepeat,
  formatSize,
  formatSubtitle,
  formatYarn,
  patternTitle,
  splitStepLabel,
  stepIsEmpty,
} from './format'
import type {PdfPattern, PdfSection, PdfStep} from './patternQuery'

/** A section's chart, already rasterised, keyed by the section it belongs to. */
export type ChartImage = {
  dataUrl: string
  /** Rendered aspect ratio, so the image is never stretched to fit. */
  aspect: number
  caption: string
}

/** The pattern's hero photograph, already fetched. */
export type HeroImage = {
  dataUrl: string
  aspect: number
}

export type PatternDocumentProps = {
  pattern: PdfPattern
  charts?: Record<string, ChartImage>
  hero?: HeroImage
}

/**
 * Turn hyphenation off.
 *
 * The renderer hyphenates by default, which breaks words mid-syllable in the
 * narrow columns this layout uses — "Head circumfer-ence", "Dupli-cate-stitch".
 * Patterns are scanned rather than read, and a stitch abbreviation split
 * across a line break is worse than a short line.
 */
Font.registerHyphenationCallback((word) => [word])

/** A4 in PDF points, matching the `size` given to every Page below. */
const A4_HEIGHT = 841.89

const INK = '#1a1a1a'
const MUTED = '#6b7280'
const RULE = '#d9d9d9'
const PANEL = '#f6f6f4'

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.45,
    color: INK,
  },

  title: {fontFamily: 'Helvetica-Bold', fontSize: 24, lineHeight: 1.2},
  subtitle: {fontSize: 10, color: MUTED, marginTop: 6},
  // Line height is inherited from the page rather than restated: setting it
  // again on a wrapping paragraph compounds with the page value and opens the
  // leading out to nearly double.
  description: {marginTop: 14},

  sectionHeading: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 13,
    marginTop: 22,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  blockHeading: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    letterSpacing: 0.8,
    color: MUTED,
    marginBottom: 5,
  },

  heroWrap: {marginTop: 14, alignItems: 'center'},

  panel: {backgroundColor: PANEL, borderRadius: 4, padding: 12, marginTop: 12},
  row: {flexDirection: 'row'},
  bullet: {flexDirection: 'row', marginBottom: 2},
  bulletDot: {width: 10, color: MUTED},
  bulletText: {flex: 1},

  // Steps: designator in a fixed gutter, instruction flowing beside it, and
  // the resulting stitch count set right so the eye can run down the column.
  step: {flexDirection: 'row', marginBottom: 7},
  // Wide enough for "Rnds 7–15 × 9" on one line, with a gutter so a longer
  // designator that does wrap never runs into the instruction beside it.
  stepDesignator: {width: 84, paddingRight: 8, fontFamily: 'Helvetica-Bold'},
  stepBody: {flex: 1, paddingRight: 8},
  stepStitches: {color: INK},
  stepProse: {marginBottom: 1},
  stepMuted: {color: MUTED, fontSize: 9},
  stepCount: {width: 66, textAlign: 'right', color: MUTED},

  notes: {color: MUTED, marginBottom: 10},

  abbrGrid: {flexDirection: 'row', flexWrap: 'wrap'},
  abbrItem: {width: '50%', flexDirection: 'row', marginBottom: 2, paddingRight: 8},
  abbrKey: {fontFamily: 'Helvetica-Bold', width: 46},
  abbrName: {flex: 1},

  sizeRow: {flexDirection: 'row', marginBottom: 2},
  sizeLabel: {fontFamily: 'Helvetica-Bold', width: 80},
  sizeDetail: {flex: 1, color: MUTED},

  chartWrap: {marginTop: 6, marginBottom: 12, alignItems: 'center'},
  chartCaption: {fontSize: 8, color: MUTED, marginTop: 4},

  // Pinned with `top` rather than `bottom`: the page sets a `lineHeight`, and
  // an absolute element inheriting it never resolves a `bottom` offset — the
  // footer silently fails to draw at any value. `top` is unaffected.
  footer: {
    position: 'absolute',
    top: A4_HEIGHT - 42,
    left: 48,
    right: 48,
    textAlign: 'center',
    fontSize: 8,
    color: MUTED,
  },
})

export function PatternDocument({pattern, charts = {}, hero}: PatternDocumentProps) {
  const title = patternTitle(pattern)
  const subtitle = formatSubtitle(pattern)
  const sections = (pattern.sections ?? []).filter(hasContent)

  return (
    <Document title={title} author={pattern.designer ?? undefined}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        {subtitle !== '' && <Text style={styles.subtitle}>{subtitle}</Text>}
        {hero && <HeroFigure hero={hero} />}
        {pattern.description && <Text style={styles.description}>{pattern.description}</Text>}

        <FrontMatter pattern={pattern} />

        {sections.map((section, i) => (
          <SectionBlock
            key={section.key ?? i}
            section={section}
            sizeLabels={sizeLabelsOf(pattern)}
            chart={section.key ? charts[section.key] : undefined}
          />
        ))}

        {sections.length === 0 && (
          <Text style={[styles.notes, {marginTop: 20}]}>This pattern has no instructions yet.</Text>
        )}

        <Text
          style={styles.footer}
          fixed
          render={({pageNumber, totalPages}) => `${title}  ·  ${pageNumber} / ${totalPages}`}
        />
      </Page>
    </Document>
  )
}

// -----------------------------------------------------------------------------
// Front matter

/**
 * Widest and tallest the hero photograph may print, in points.
 *
 * The width is the full text column. The height is held well short of it so
 * that a portrait photograph can't take the first page on its own and push
 * the materials list — the part you need before casting on — onto the second.
 */
const HERO_MAX_W = 499
const HERO_MAX_H = 340

function HeroFigure({hero}: {hero: HeroImage}) {
  const width = Math.min(HERO_MAX_W, HERO_MAX_H * hero.aspect)
  return (
    <View style={styles.heroWrap} wrap={false}>
      <Image src={hero.dataUrl} style={{width, height: width / hero.aspect, borderRadius: 4}} />
    </View>
  )
}

function FrontMatter({pattern}: {pattern: PdfPattern}) {
  const needles = pattern.needles ?? []
  const hooks = pattern.hooks ?? []
  const yarns = pattern.yarns ?? []
  const notions = pattern.notions ?? []
  const sizes = (pattern.sizes ?? []).filter((s) => s.label)
  const stitches = (pattern.stitchesUsed ?? []).filter((s) => s.abbr)
  const gauge = formatGauge(pattern.gauge)

  const hasMaterials = needles.length + hooks.length + yarns.length + notions.length > 0
  if (!hasMaterials && !gauge && sizes.length === 0 && stitches.length === 0) return null

  return (
    <View style={styles.panel}>
      {hasMaterials && (
        <Block heading="MATERIALS">
          {needles.map((n, i) => (
            <Bullet key={`n${i}`}>{formatNeedle(n)}</Bullet>
          ))}
          {hooks.map((h, i) => (
            <Bullet key={`h${i}`}>{formatHook(h)}</Bullet>
          ))}
          {yarns.map((y, i) => (
            <Bullet key={`y${i}`}>{formatYarn(y)}</Bullet>
          ))}
          {notions.map((n, i) => (
            <Bullet key={`o${i}`}>{n}</Bullet>
          ))}
        </Block>
      )}

      {gauge !== '' && (
        <Block heading="GAUGE">
          <Text>{gauge}</Text>
        </Block>
      )}

      {sizes.length > 0 && (
        <Block heading="SIZES">
          {sizes.map((size, i) => {
            const detail = formatSize(size)
            return (
              <View key={i} style={styles.sizeRow}>
                <Text style={styles.sizeLabel}>{size.label}</Text>
                {detail !== '' && <Text style={styles.sizeDetail}>{detail}</Text>}
              </View>
            )
          })}
        </Block>
      )}

      {stitches.length > 0 && (
        <Block heading="STITCHES USED">
          <View style={styles.abbrGrid}>
            {stitches.map((s, i) => (
              <View key={i} style={styles.abbrItem}>
                <Text style={styles.abbrKey}>{s.abbr}</Text>
                <Text style={styles.abbrName}>{s.name ?? ''}</Text>
              </View>
            ))}
          </View>
        </Block>
      )}
    </View>
  )
}

function Block({heading, children}: {heading: string; children: React.ReactNode}) {
  return (
    <View style={{marginBottom: 10}}>
      <Text style={styles.blockHeading}>{heading}</Text>
      {children}
    </View>
  )
}

function Bullet({children}: {children: React.ReactNode}) {
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  )
}

// -----------------------------------------------------------------------------
// Instructions

function SectionBlock({
  section,
  sizeLabels,
  chart,
}: {
  section: PdfSection
  sizeLabels: string[]
  chart?: ChartImage
}) {
  const steps = (section.steps ?? []).filter((s) => s && !stepIsEmpty(s))

  return (
    <View>
      {/* Keeps a heading from being stranded at the foot of a page. */}
      <Text style={styles.sectionHeading} minPresenceAhead={60}>
        {section.title ?? 'Section'}
      </Text>
      {section.notes && <Text style={styles.notes}>{section.notes}</Text>}
      {chart && <ChartFigure chart={chart} />}
      {steps.map((step, i) => (
        <StepRow key={step._key ?? i} step={step} index={i + 1} sizeLabels={sizeLabels} />
      ))}
    </View>
  )
}

/**
 * Widest and tallest a chart may be drawn, in points.
 *
 * The width is the full text column — a wide chart like 66 sts across nine
 * rows is unreadable at anything less — and the height leaves room for a
 * caption without the figure claiming a page to itself.
 */
const CHART_MAX_W = 499
const CHART_MAX_H = 400

function ChartFigure({chart}: {chart: ChartImage}) {
  // Fit inside the box on whichever axis binds first, so a wide grid and a
  // tall ring both sit on the page at their true proportions.
  const width = Math.min(CHART_MAX_W, CHART_MAX_H * chart.aspect)
  return (
    <View style={styles.chartWrap} wrap={false}>
      <Image src={chart.dataUrl} style={{width, height: width / chart.aspect}} />
      <Text style={styles.chartCaption}>{chart.caption}</Text>
    </View>
  )
}

/**
 * One step.
 *
 * The designator, any prose, and the stitch sequence are all optional in the
 * data, and patterns in practice use different combinations: charted patterns
 * carry a bare "Row 1" plus stitches, written ones carry a sentence. The
 * sequence is only repeated under the prose when it adds something the
 * sentence doesn't already spell out.
 */
function StepRow({step, index, sizeLabels}: {step: PdfStep; index: number; sizeLabels: string[]}) {
  const {designator, prose} = splitStepLabel(step, index)
  const stitches = formatInstruction(step.instruction)
  const repeat = formatRepeat(step)
  const count = formatCounts(step.counts, sizeLabels)
  const showStitches = stitches !== '' && !prose.toLowerCase().includes(stitches.toLowerCase())

  return (
    <View style={styles.step} wrap={false}>
      <Text style={styles.stepDesignator}>{repeat ? `${designator} ${repeat}` : designator}</Text>
      <View style={styles.stepBody}>
        {prose !== '' && <Text style={styles.stepProse}>{prose}</Text>}
        {showStitches && (
          <Text style={prose !== '' ? styles.stepMuted : styles.stepStitches}>{stitches}</Text>
        )}
      </View>
      <Text style={styles.stepCount}>{count}</Text>
    </View>
  )
}

// -----------------------------------------------------------------------------

function hasContent(section: PdfSection): boolean {
  if ((section.notes ?? '').trim() !== '') return true
  return (section.steps ?? []).some((s) => s && !stepIsEmpty(s))
}

function sizeLabelsOf(pattern: PdfPattern): string[] {
  return (pattern.sizeLabels ?? []).filter((l): l is string => typeof l === 'string')
}
