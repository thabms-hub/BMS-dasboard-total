// =============================================================================
// BMS Session KPI Dashboard - IPD KPI Card
// Shows inpatient statistics: current census, today's admits/discharges,
// trend vs yesterday
// =============================================================================

import { BedDouble, ArrowUp, ArrowDown, AlertCircle, RotateCcw } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { IpdVisitDetail } from '@/types'

interface IpdKpiCardProps {
  data: IpdVisitDetail | null
  isLoading: boolean
  isError: boolean
  error?: string
  onRetry?: () => void
}

const ACCENT = {
  border: 'border-l-purple-500',
  bg: 'bg-purple-500/10',
  text: 'text-purple-500',
}

export function IpdKpiCard({ data, isLoading, isError, error, onRetry }: IpdKpiCardProps) {
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
                ผู้ป่วยใน (IPD)
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
              <BedDouble className="h-5 w-5" />
            </div>
          </div>
        </div>
      </Card>
    )
  }

  // ---------------------------------------------------------------------------
  // Loaded
  // ---------------------------------------------------------------------------
  const current = data?.current ?? 0
  const yesterdayTotal = data?.yesterdayTotal ?? 0
  const todayAdmitted = data?.todayAdmitted ?? 0
  const todayDischarged = data?.todayDischarged ?? 0
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
              ผู้ป่วยใน (IPD)
            </p>

            {/* Total + trend badge */}
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">
                {current.toLocaleString()}
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

            {/* Admit / Discharge breakdown */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="flex flex-col items-center gap-0.5 rounded-lg bg-emerald-500/10 px-2 py-2">
                <span className="text-base font-bold text-emerald-600">{todayAdmitted.toLocaleString()}</span>
                <span className="text-[10px] text-muted-foreground">Admit วันนี้</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 rounded-lg bg-orange-500/10 px-2 py-2">
                <span className="text-base font-bold text-orange-600">{todayDischarged.toLocaleString()}</span>
                <span className="text-[10px] text-muted-foreground">จำหน่ายวันนี้</span>
              </div>
            </div>

            {/* vs yesterday */}
            <p className="mt-2 text-xs text-muted-foreground">
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
            <BedDouble className="h-5 w-5" />
          </div>
        </div>
      </div>
    </Card>
  )
}
