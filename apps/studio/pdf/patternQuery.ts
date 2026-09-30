/**
 * Everything a printed pattern needs, in one query.
 *
 * The `sections` projection deliberately matches the shape
 * `tools/stitchChart/data/patterns.ts` expects, so the same result can be
 * handed to `summarizePattern` to rebuild the charts without a second round
 * trip. Fields the chart reader ignores (step notes, chart images, the size
 * on a stitch count) ride along for the prose side of the document.
 */

import type {Craft} from '../tools/stitchChart/types'

export const PATTERN_PDF_QUERY = /* groq */ `
  *[_id == $id][0]{
    _id,
    _type,
    title,
    designer,
    description,
    skillLevel,
    terminology,
    notions,
    publishedAt,
    "sizeLabels": sizes[].label,
    "heroImage": heroImage{
      crop,
      "url": asset->url,
      "width": asset->metadata.dimensions.width,
      "height": asset->metadata.dimensions.height
    },
    "gauge": gauge{stitches, rows, swatchSize, stitchPattern},
    "sizes": sizes[]{
      label,
      "measurements": measurements[]{name, value, unit}
    },
    "needles": needles[]{
      type,
      lengthCm,
      notes,
      "sizeMm": needle->sizeMm,
      "sizeUs": needle->sizeUs,
      "sizeUk": needle->sizeUk,
      "brand": needle->brand
    },
    "hooks": hooks[]{
      notes,
      "sizeMm": hook->sizeMm,
      "sizeUs": hook->sizeUs,
      "sizeUk": hook->sizeUk,
      "brand": hook->brand
    },
    "yarns": yarnRequirements[]{
      colorway,
      quantity,
      unit,
      notes,
      "name": yarn->name,
      "brand": yarn->brand,
      "weight": yarn->weight
    },
    "stitchesUsed": *[
      _id in array::unique(^.sections[].steps[].instruction[].stitches[].stitchType._ref)
    ] | order(coalesce(sortOrder, 999) asc) {
      "abbr": abbreviation,
      name,
      description
    },
    "sections": sections[]{
      "key": _key,
      title,
      notes,
      "steps": steps[]{
        _key,
        kind,
        label,
        repeatTimes,
        "counts": stitchCount[]{size, value},
        "chartUrl": chart.asset->url,
        "instruction": instruction[]{
          label,
          count,
          "stitches": stitches[]{
            count,
            "abbr": stitchType->abbreviation,
            "symbol": stitchType->chartSymbol
          }
        }
      }
    }
  }
`

export type PdfMeasurement = {name: string | null; value: number | null; unit: string | null}
export type PdfSize = {label: string | null; measurements: PdfMeasurement[] | null}

export type PdfGauge = {
  stitches: number | null
  rows: number | null
  swatchSize: string | null
  stitchPattern: string | null
}

export type PdfNeedle = {
  type: string | null
  lengthCm: number | null
  notes: string | null
  sizeMm: number | null
  sizeUs: string | null
  sizeUk: string | null
  brand: string | null
}

export type PdfHook = Omit<PdfNeedle, 'type' | 'lengthCm'>

export type PdfYarn = {
  colorway: string | null
  quantity: number | null
  unit: string | null
  notes: string | null
  name: string | null
  brand: string | null
  weight: string | null
}

export type PdfCrop = {top: number; bottom: number; left: number; right: number}

export type PdfHeroImage = {
  url: string | null
  width: number | null
  height: number | null
  crop: PdfCrop | null
}

export type PdfStitch = {abbr: string | null; name: string | null; description: string | null}

export type PdfStitchRef = {count: number | null; abbr: string | null; symbol: string | null}
export type PdfGroup = {label: string | null; count: number | null; stitches: PdfStitchRef[] | null}
export type PdfCount = {size: string | null; value: number | null}

export type PdfStep = {
  _key: string | null
  kind: string | null
  label: string | null
  repeatTimes: number | null
  counts: PdfCount[] | null
  chartUrl: string | null
  instruction: PdfGroup[] | null
}

export type PdfSection = {
  key: string | null
  title: string | null
  notes: string | null
  steps: PdfStep[] | null
}

export type PdfPattern = {
  _id: string
  _type: 'crochetPattern' | 'knitPattern'
  title: string | null
  designer: string | null
  description: string | null
  skillLevel: string | null
  terminology: string | null
  notions: string[] | null
  publishedAt: string | null
  sizeLabels: (string | null)[] | null
  heroImage: PdfHeroImage | null
  gauge: PdfGauge | null
  sizes: PdfSize[] | null
  needles: PdfNeedle[] | null
  hooks: PdfHook[] | null
  yarns: PdfYarn[] | null
  stitchesUsed: PdfStitch[] | null
  sections: PdfSection[] | null
}

export function craftOf(pattern: PdfPattern): Craft {
  return pattern._type === 'knitPattern' ? 'knit' : 'crochet'
}

/** Enough pixels to stay sharp across the text column at print resolution. */
const HERO_MAX_PX = 1400

/**
 * A CDN URL for the hero image, cropped the way the author cropped it.
 *
 * The format is pinned rather than negotiated: left to itself the CDN serves
 * WebP to browsers that accept it, and the PDF renderer decodes only JPEG and
 * PNG. The hotspot is ignored on purpose — it only decides what to keep when
 * an aspect ratio is being forced, and here the image keeps its own.
 */
export function heroImageUrl(hero: PdfHeroImage | null | undefined): string | null {
  if (!hero?.url) return null

  const params = [`w=${HERO_MAX_PX}`, 'fit=max', 'fm=jpg', 'q=80']
  const {crop, width, height} = hero

  if (crop && width && height) {
    const left = Math.round(crop.left * width)
    const top = Math.round(crop.top * height)
    const w = Math.round((1 - crop.left - crop.right) * width)
    const h = Math.round((1 - crop.top - crop.bottom) * height)
    if (w > 0 && h > 0 && (w !== width || h !== height)) {
      params.unshift(`rect=${left},${top},${w},${h}`)
    }
  }

  return `${hero.url}?${params.join('&')}`
}
