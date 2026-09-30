/**
 * SVG to PNG, in the browser.
 *
 * `@react-pdf/renderer` draws bitmaps, not SVG markup, so the charts are
 * rasterised on the way in. The same trick the chart tool's PNG export uses:
 * load the markup into an `Image` through a blob URL and paint it onto a
 * canvas.
 *
 * The canvas stays untainted because these charts reference nothing external
 * — every symbol is drawn inline — which is what lets `toDataURL` read the
 * pixels back out.
 */

import {CHART_BG} from '../tools/stitchChart/constants'

/** Drawn at 2× so chart symbols stay crisp in print rather than on screen. */
const SCALE = 2

export function rasterizeSvg(svg: string, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], {type: 'image/svg+xml;charset=utf-8'})
    const url = URL.createObjectURL(blob)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(width * SCALE))
      canvas.height = Math.max(1, Math.round(height * SCALE))

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get a 2D canvas context to draw the chart'))
        return
      }

      // The SVG's own background is a style attribute the rasteriser ignores,
      // so it is painted first — otherwise the chart lands on transparency and
      // prints with a black backing in some PDF viewers.
      ctx.fillStyle = CHART_BG
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0)
      ctx.drawImage(img, 0, 0)

      resolve(canvas.toDataURL('image/png'))
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not rasterise the chart'))
    }

    img.src = url
  })
}

/**
 * Fetch a bitmap and hand back a data URL and its proportions.
 *
 * The renderer can take a remote `src` itself, but then a slow or failed
 * fetch happens inside the render and takes the whole document with it.
 * Pulling the bytes first keeps the failure out here, where the export can
 * simply carry on without the picture.
 */
export async function loadImage(url: string): Promise<{dataUrl: string; aspect: number}> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not load the image (${response.status})`)

  const blob = await response.blob()
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read the image'))
    reader.readAsDataURL(blob)
  })

  // Measured after the crop the CDN applied rather than from the asset's
  // metadata, so the document lays it out at the proportions it will print at.
  const aspect = await new Promise<number>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img.naturalWidth / img.naturalHeight)
    img.onerror = () => reject(new Error('Could not decode the image'))
    img.src = dataUrl
  })

  return {dataUrl, aspect}
}
