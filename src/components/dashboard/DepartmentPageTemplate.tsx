// =============================================================================
// Department Page Template - Shared base layout for department sub-pages
// =============================================================================

import { CalendarDays, Clock, RefreshCw, type LucideIcon } from 'lucide-react'
import { useCallback, type ComponentType } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DateRangePicker } from '@/components/dashboard/DateRangePicker'
import { usePersistentDateRange } from '@/hooks/usePersistentDateRange'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatDate, formatDateTime } from '@/utils/dateUtils'

interface DepartmentPageTemplateProps {
  title: string
  subtitle?: string
  icon: LucideIcon | ComponentType<{ className?: string }>
  enableDateFilter?: boolean
  dateRangeStorageKey?: string
  defaultDateRangeDays?: number
  isDateFilterLoading?: boolean
  lastUpdated?: Date
  onRefresh?: () => void
  isRefreshing?: boolean
  onDateRangeChange?: (startDate: string, endDate: string) => void
  children?: React.ReactNode
}

export function DepartmentPageTemplate({
  title,
  subtitle,
  icon: Icon,
  enableDateFilter = false,
  dateRangeStorageKey,
  defaultDateRangeDays = 0,
  isDateFilterLoading = false,
  lastUpdated,
  onRefresh,
  isRefreshing = false,
  onDateRangeChange,
  children,
}: DepartmentPageTemplateProps) {
  const storageKey = dateRangeStorageKey ?? title
  const { startDate, endDate, setRange } = usePersistentDateRange(storageKey, defaultDateRangeDays)
  const today = formatDate(new Date())

  const handleRangeChange = useCallback((newStartDate: string, newEndDate: string) => {
    setRange(newStartDate, newEndDate)
    onDateRangeChange?.(newStartDate, newEndDate)
  }, [onDateRangeChange, setRange])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 shadow-md ring-1 ring-primary/20">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 to-transparent" />
            <Icon className="relative h-10 w-10 text-primary drop-shadow-sm" />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
            {subtitle && (
              <p className="text-base text-muted-foreground">{subtitle}</p>
            )}
            {lastUpdated && (
              <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {today}
                </span>
                <span className="text-muted-foreground/40">|</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  อัปเดตล่าสุด {formatDateTime(lastUpdated)}
                </span>
              </div>
            )}
          </div>
        </div>

        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            className="mt-2 gap-1.5 text-blue sm:mt-0 dark:border-orange-400/60 dark:bg-orange-500/5 dark:text-white dark:hover:border-orange-300 dark:hover:bg-orange-500/15"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
            รีเฟรช
          </Button>
        )}
      </div>

      {enableDateFilter && (
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onRangeChange={handleRangeChange}
          isLoading={isDateFilterLoading}
        />
      )}

      {/* Content */}
      {children ?? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ข้อมูลแผนก{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              อยู่ระหว่างพัฒนา — ข้อมูลสถิติของแผนก{title}จะแสดงในส่วนนี้
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
