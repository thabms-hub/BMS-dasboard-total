// =============================================================================
// BMS Session KPI Dashboard - OPD KPI Card
// Shows today's OPD total with walk-in / appointment breakdown and real trend
// =============================================================================

import { Activity, ArrowUp, ArrowDown, AlertCircle, RotateCcw } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { OpdVisitDetail } from '@/types'

interface OpdKpiCardProps {
  data: OpdVisitDetail | null
  isLoading: boolean
  isError: boolean
  error?: string
  onRetry?: () => void
}

const ACCENT = {
  border: 'border-l-blue-500',
  bg: 'bg-blue-500/10',
  text: 'text-blue-500',
}

export function OpdKpiCard({ data, isLoading, isError, error, onRetry }: OpdKpiCardProps) {
  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <Card className={cn('relative overflow-hidden border-l-4 shadow-sm', ACCENT.border)}>
        <div className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-3">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
      </Card>
    )
  }

  // ---------------------------------------------------------------------------
  // Error
  // ---------------------------------------------------------------------------
  if (isError) {
    return (
      <Card className="relative overflow-hidden border-l-4 border-l-destructive shadow-sm">
        <div className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                ผู้ป่วยนอก (OPD)
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p className="text-sm">{error ?? 'ไม่สามารถโหลดข้อมูลได้'}</p>
              </div>
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 h-7 gap-1.5 text-xs"
                  onClick={onRetry}
                >
                  <RotateCcw className="h-3 w-3" />
                  ลองอีกครั้ง
                </Button>
              )}
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Activity className="h-5 w-5" />
            </div>
          </div>
        </div>
      </Card>
    )
  }

  // ---------------------------------------------------------------------------
  // Loaded
  // ---------------------------------------------------------------------------
  const total = data?.total ?? 0
  const walkin = data?.walkin ?? 0
  const appointment = data?.appointment ?? 0
  const yesterdayTotal = data?.yesterdayTotal ?? 0
  const trendPercent = data?.trendPercent ?? null
  const isPositive = data?.isPositive ?? true

  return (
    <Card
      className={cn(
        'relative overflow-hidden border-l-4 shadow-sm transition-shadow duration-200 hover:shadow-md',
        ACCENT.border,
      )}
    >
      <div className="p-5">
        <div className="flex items-start justify-between">
          {/* Left content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              ผู้ป่วยนอก (OPD)
            </p>

            {/* Total + trend badge */}
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">
                {total.toLocaleString()}
              </span>

              {trendPercent !== null && (
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold',
                    isPositive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400',
                  )}
                >
                  {isPositive ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )}
                  {Math.abs(trendPercent)}%
                </span>
              )}
            </div>

            {/* Walk-in / Appointment breakdown */}
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                Walk-in{' '}
                <span className="font-semibold text-foreground">
                  {walkin.toLocaleString()}
                </span>
              </span>
              <span className="text-sm font-medium text-muted-foreground/60">•</span>
              <span>
                นัดหมาย{' '}
                <span className="font-semibold text-foreground">
                  {appointment.toLocaleString()}
                </span>
              </span>
            </div>

            {/* vs yesterday */}
            <p className="mt-1 text-xs text-muted-foreground">
              เมื่อวาน{' '}
              <span className="font-medium text-foreground">
                {yesterdayTotal.toLocaleString()}
              </span>{' '}
              ราย
            </p>
          </div>

          {/* Icon */}
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
              ACCENT.bg,
              ACCENT.text,
            )}
          >
            <Activity className="h-5 w-5" />
          </div>
        </div>
      </div>
    </Card>
  )
}
