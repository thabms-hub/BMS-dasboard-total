// =============================================================================
// BMS Session KPI Dashboard - ER KPI Card
// Shows emergency room statistics: today's visits, triage breakdown,
// trend vs yesterday
// =============================================================================

import { Siren, ArrowUp, ArrowDown, AlertCircle, RotateCcw } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ErVisitDetail } from '@/types'

interface ErKpiCardProps {
  data: ErVisitDetail | null
  isLoading: boolean
  isError: boolean
  error?: string
  onRetry?: () => void
}

const ACCENT = {
  border: 'border-l-red-500',
  bg: 'bg-red-500/10',
  text: 'text-red-500',
}

export function ErKpiCard({ data, isLoading, isError, error, onRetry }: ErKpiCardProps) {
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
                ห้องฉุกเฉิน (ER)
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
              <Siren className="h-5 w-5" />
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
  const yesterdayTotal = data?.yesterdayTotal ?? 0
  const trendPercent = data?.trendPercent ?? null
  const isPositive = data?.isPositive ?? true
  const redCount = data?.redCount ?? 0
  const pinkCount = data?.pinkCount ?? 0
  const yellowCount = data?.yellowCount ?? 0
  const greenCount = data?.greenCount ?? 0
  const whiteCount = data?.whiteCount ?? 0

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
              ห้องฉุกเฉิน (ER) วันนี้
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

            {/* Triage breakdown — colored boxes */}
            <div className="mt-3 grid grid-cols-5 gap-1">
              <div className="flex flex-col items-center gap-0.5 rounded-lg bg-red-500/15 px-1 py-2">
                <span className="text-sm font-bold text-red-600">{redCount.toLocaleString()}</span>
                <span className="text-[9px] text-muted-foreground">แดง</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 rounded-lg bg-pink-500/15 px-1 py-2">
                <span className="text-sm font-bold text-pink-600">{pinkCount.toLocaleString()}</span>
                <span className="text-[9px] text-muted-foreground">ชมพู</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 rounded-lg bg-yellow-400/20 px-1 py-2">
                <span className="text-sm font-bold text-yellow-600">{yellowCount.toLocaleString()}</span>
                <span className="text-[9px] text-muted-foreground">เหลือง</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 rounded-lg bg-green-500/15 px-1 py-2">
                <span className="text-sm font-bold text-green-600">{greenCount.toLocaleString()}</span>
                <span className="text-[9px] text-muted-foreground">เขียว</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 rounded-lg bg-gray-400/15 px-1 py-2">
                <span className="text-sm font-bold text-gray-500">{whiteCount.toLocaleString()}</span>
                <span className="text-[9px] text-muted-foreground">ขาว</span>
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
            <Siren className="h-5 w-5" />
          </div>
        </div>
      </div>
    </Card>
  )
}
