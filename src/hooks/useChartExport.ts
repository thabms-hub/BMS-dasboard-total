// =============================================================================
// Chart Export Hook - PNG, SVG, PDF, Excel support
// Uses html-to-image (browser-native SVG renderer) for accurate CSS rendering
// =============================================================================

import { useState, useCallback } from 'react'
import * as htmlToImage from 'html-to-image'
import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'

export type ExportFormat = 'png' | 'svg' | 'pdf' | 'excel'

export interface UseChartExportOptions {
  containerRef: React.RefObject<HTMLDivElement | null>
  data: unknown[]
  title?: string
}

export interface UseChartExportState {
  isExporting: boolean
  exportError: string | null
}

export interface UseChartExportReturn extends UseChartExportState {
  exportChart: (format: ExportFormat) => Promise<void>
  clearError: () => void
}

export function useChartExport(
  options: UseChartExportOptions,
): UseChartExportReturn {
  const { containerRef, data, title = 'chart' } = options
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const clearError = useCallback(() => setExportError(null), [])

  const sanitizeFileName = (str: string): string =>
    str.replace(/[/\\?%*:|"<>]/g, '_').substring(0, 200)

  /** Skip elements marked to be excluded from export (e.g. the export button). */
  const exportFilter = useCallback((node: Node): boolean => {
    if (node instanceof HTMLElement) {
      return node.dataset.html2canvasIgnore !== 'true'
    }
    return true
  }, [])

  const exportChart = useCallback(
    async (format: ExportFormat) => {
      if (!containerRef.current) {
        setExportError('Chart container not found')
        return
      }

      setIsExporting(true)
      setExportError(null)

      try {
        const timestamp = new Date().toISOString().slice(0, 10)
        const fileName = `${sanitizeFileName(title)}_${timestamp}`
        const el = containerRef.current

        await document.fonts.ready

        // Shared html-to-image options
        const baseOptions: Parameters<typeof htmlToImage.toPng>[1] = {
          pixelRatio: 1.5,
          backgroundColor: '#ffffff',
          filter: exportFilter,
          // Retry fetching resources to handle transient failures
          fetchRequestInit: { cache: 'force-cache' },
        }

        switch (format) {
          case 'png': {
            const dataUrl = await htmlToImage.toPng(el, baseOptions)
            const link = document.createElement('a')
            link.href = dataUrl
            link.download = `${fileName}.png`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            break
          }

          case 'svg': {
            const dataUrl = await htmlToImage.toSvg(el, {
              ...baseOptions,
              pixelRatio: 1,
            })
            const link = document.createElement('a')
            link.href = dataUrl
            link.download = `${fileName}.svg`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            break
          }

          case 'pdf': {
            const dataUrl = await htmlToImage.toPng(el, baseOptions)

            const elW = el.offsetWidth
            const elH = el.offsetHeight
            const orientation = elH > elW ? 'portrait' : 'landscape'

            const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' })
            const pdfWidth = pdf.internal.pageSize.getWidth()
            const pdfHeight = pdf.internal.pageSize.getHeight()
            const margin = 10

            const availW = pdfWidth - margin * 2
            const availH = pdfHeight - margin * 2
            const ratio = Math.min(availW / elW, availH / elH)
            const finalWidth = elW * ratio
            const finalHeight = elH * ratio
            const x = (pdfWidth - finalWidth) / 2
            const y = (pdfHeight - finalHeight) / 2

            pdf.addImage(dataUrl, 'PNG', x, y, finalWidth, finalHeight)
            pdf.save(`${fileName}.pdf`)
            break
          }

          case 'excel': {
            if (!data || data.length === 0) {
              throw new Error('No data to export')
            }
            const worksheet = XLSX.utils.json_to_sheet(data)
            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')
            XLSX.writeFile(workbook, `${fileName}.xlsx`)
            break
          }

          default: {
            const _exhaustive: never = format
            throw new Error(`Unknown format: ${_exhaustive}`)
          }
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown export error'
        setExportError(message)
        console.error('Chart export failed:', error)
      } finally {
        setIsExporting(false)
      }
    },
    [containerRef, data, title, exportFilter],
  )

  return { isExporting, exportError, exportChart, clearError }
}