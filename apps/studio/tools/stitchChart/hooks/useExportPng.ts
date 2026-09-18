import {useCallback, type RefObject} from 'react'
import {CHART_BG} from '../constants'
import type {ViewMode} from '../types'

export type ExportOpts = {
  svgWidth: number
  svgHeight: number
  viewMode: ViewMode
  width: number
  height: number
  filenameSuffix: string
}

export function useExportPng(svgRef: RefObject<SVGSVGElement | null>, opts: ExportOpts) {
  const {svgWidth, svgHeight, viewMode, width, height, filenameSuffix} = opts
  return useCallback(() => {
    const svg = svgRef.current
    if (!svg) return
    const svgString = new XMLSerializer().serializeToString(svg)
    const svgBlob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'})
    const url = URL.createObjectURL(svgBlob)
    const img = new Image()
    const scale = 2
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = svgWidth * scale
      canvas.height = svgHeight * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        return
      }
      ctx.fillStyle = CHART_BG
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      ctx.drawImage(img, 0, 0)
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url)
        if (!blob) return
        const downloadUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.download = `stitch-chart-${viewMode}-${width}x${height}${filenameSuffix}.png`
        link.href = downloadUrl
        link.click()
        URL.revokeObjectURL(downloadUrl)
      }, 'image/png')
    }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url
  }, [svgRef, svgWidth, svgHeight, viewMode, width, height, filenameSuffix])
}
