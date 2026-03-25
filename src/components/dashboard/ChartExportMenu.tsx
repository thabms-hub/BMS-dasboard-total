// =============================================================================
// Chart Export Menu - Dropdown menu for exporting charts in multiple formats
// =============================================================================

import { useState, useRef, useEffect } from 'react'
import { Download, Image, FileText, File, Table } from 'lucide-react'
import { useChartExport } from '@/hooks/useChartExport'
import { cn } from '@/lib/utils'

interface ChartExportMenuProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  data: unknown[]
  title?: string
  className?: string
}

export function ChartExportMenu({
  containerRef,
  data,
  title = 'chart',
  className,
}: ChartExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { exportChart, isExporting, exportError } = useChartExport({
    containerRef,
    data,
    title,
  })

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () =>
        document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleExport = async (
    format: 'png' | 'svg' | 'pdf' | 'excel',
  ) => {
    await exportChart(format)
    setIsOpen(false)
  }

  const exportOptions = [
    {
      format: 'png' as const,
      label: 'ภาพ PNG',
      icon: Image,
      description: 'รูปภาพ raster',
    },
    {
      format: 'svg' as const,
      label: 'ไฟล์ SVG',
      icon: FileText,
      description: 'รูปภาพ vector',
    },
    {
      format: 'pdf' as const,
      label: 'PDF',
      icon: File,
      description: 'เอกสาร PDF',
    },
    {
      format: 'excel' as const,
      label: 'Excel',
      icon: Table,
      description: 'ตารางข้อมูล',
    },
  ]

  return (
    <div ref={menuRef} className={cn('relative inline-block', className)} data-html2canvas-ignore="true">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
          'border border-border bg-background text-foreground',
          'hover:bg-muted hover:text-foreground transition-colors',
          'disabled:opacity-50 disabled:pointer-events-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
        title="Export chart"
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Export</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-border bg-popover shadow-lg z-50">
          {exportError && (
            <div className="border-b border-border bg-destructive/10 px-4 py-2 text-xs text-destructive">
              {exportError}
            </div>
          )}

          <div className="py-2">
            {exportOptions.map(({ format, label, icon: Icon, description }) => (
              <button
                key={format}
                onClick={() => handleExport(format)}
                disabled={isExporting}
                className={cn(
                  'w-full flex items-start gap-3 px-4 py-2 text-sm text-left',
                  'hover:bg-accent hover:text-accent-foreground transition-colors',
                  'disabled:opacity-50 disabled:pointer-events-none',
                  'focus-visible:outline-none focus-visible:bg-accent',
                )}
              >
                <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="font-medium">{label}</div>
                  <div className="text-xs text-muted-foreground">
                    {description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
