// =============================================================================
// Chart Export Hook - PNG, SVG, PDF, Excel support
// =============================================================================

import { useState, useCallback } from 'react'
import html2canvas from 'html2canvas'
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

/**
 * Hook for exporting charts in multiple formats (PNG, SVG, PDF, Excel)
 *
 * @param options - Configuration with containerRef, data array, and optional title
 * @returns Object with export functions and state
 *
 * @example
 * ```ts
 * const containerRef = useRef<HTMLDivElement>(null)
 * const { exportChart, isExporting } = useChartExport({
 *   containerRef,
 *   data: chartData,
 *   title: 'My Chart'
 * })
 *
 * // Export as PNG
 * await exportChart('png')
 * ```
 */
export function useChartExport(
  options: UseChartExportOptions,
): UseChartExportReturn {
  const { containerRef, data, title = 'chart' } = options
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setExportError(null)
  }, [])

  const sanitizeFileName = (str: string): string => {
    return str.replace(/[/\\?%*:|"<>]/g, '_').substring(0, 200)
  }

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

        switch (format) {
          case 'png': {
            // Export as PNG using html2canvas
            const canvas = await html2canvas(containerRef.current, {
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#ffffff',
            })
            const link = document.createElement('a')
            link.href = canvas.toDataURL('image/png')
            link.download = `${fileName}.png`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            break
          }

          case 'svg': {
            // Export as SVG - extract SVG from recharts
            const svg = containerRef.current.querySelector('svg')
            if (!svg) {
              throw new Error('No SVG found in chart container')
            }

            // Clone the SVG to avoid modifying the original
            const clonedSvg = svg.cloneNode(true) as SVGSVGElement

            // Set explicit dimensions if not present
            if (!clonedSvg.hasAttribute('width')) {
              clonedSvg.setAttribute('width', svg.clientWidth.toString())
            }
            if (!clonedSvg.hasAttribute('height')) {
              clonedSvg.setAttribute('height', svg.clientHeight.toString())
            }

            const svgString = new XMLSerializer().serializeToString(clonedSvg)
            const blob = new Blob([svgString], { type: 'image/svg+xml' })
            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)
            link.download = `${fileName}.svg`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(link.href)
            break
          }

          case 'pdf': {
            // Export as PDF using html2canvas + jsPDF
            const canvas = await html2canvas(containerRef.current, {
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#ffffff',
            })

            const imgData = canvas.toDataURL('image/png')
            const imgWidth = 210 // A4 width in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width
            const pdf = new jsPDF({
              orientation: imgHeight > imgWidth ? 'portrait' : 'landscape',
              unit: 'mm',
              format: 'a4',
            })

            const pdfWidth = pdf.internal.pageSize.getWidth()
            const pdfHeight = pdf.internal.pageSize.getHeight()

            // Calculate dimensions to fit PDF
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
            const finalWidth = imgWidth * ratio
            const finalHeight = imgHeight * ratio
            const x = (pdfWidth - finalWidth) / 2
            const y = (pdfHeight - finalHeight) / 2

            pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight)
            pdf.save(`${fileName}.pdf`)
            break
          }

          case 'excel': {
            // Export data as Excel
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
    [containerRef, data, title],
  )

  return {
    isExporting,
    exportError,
    exportChart,
    clearError,
  }
}
