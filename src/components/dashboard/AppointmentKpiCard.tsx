// =============================================================================
// BMS Session KPI Dashboard - Appointment KPI Card
// =============================================================================

import { CalendarCheck, AlertCircle, RotateCcw, ArrowUp, ArrowDown } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AppointmentStats } from '@/services/kpiService'

interface AppointmentKpiCardProps {
  data: AppointmentStats | null
  isLoading: boolean
  isError: boolean
  error?: string
  onRetry?: () => void
  className?: string
}

export function AppointmentKpiCard({
  data,
  isLoading,
  isError,
  error,
  onRetry,
  className,
}: AppointmentKpiCardProps) {
  if (isLoading) {
    return (
      <Card className={cn('relative overflow-hidden border-l-4 border-l-violet-500 shadow-sm', className)}>
        <div className="p-5 space-y-3">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-8 w-20" />
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card className={cn('relative overflow-hidden border-l-4 border-l-destructive shadow-sm', className)}>
        <div className="p-5">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            ผู้ป่วยนัดหมายวันนี้
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-sm">{error ?? 'ไม่สามารถโหลดข้อมูลได้'}</p>
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" className="mt-3 h-7 gap-1.5 text-xs" onClick={onRetry}>
              <RotateCcw className="h-3 w-3" />
              ลองอีกครั้ง
            </Button>
          )}
        </div>
      </Card>
    )
  }

  const total = data?.totalAppointments ?? 0
  const attended = data?.attended ?? 0
  const notAttended = data?.notAttended ?? 0
  const lastWeekSameDayTotal = data?.lastWeekSameDayTotal ?? 0
  const lastWeekDate = new Date()
  lastWeekDate.setDate(lastWeekDate.getDate() - 7)
  const lastWeekDayName = lastWeekDate.toLocaleDateString('th-TH', { weekday: 'short' })
  const changePercent = data?.changePercent ?? 0
  const isPositive = changePercent >= 0


  const attendedPct = total > 0 ? Math.round((attended / total) * 100) : 0
  const notAttendedPct = total > 0 ? Math.round((notAttended / total) * 100) : 0

  return (
    <Card className={cn('relative overflow-hidden border-l-4 border-l-violet-500 shadow-sm transition-shadow duration-200 hover:shadow-md', className)}>
      <div className="p-5">
        <div className="flex items-start justify-between">
          {/* Left content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              ผู้ป่วยนัดหมายวันนี้
            </p>

            {/* Total + trend badge */}
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">
                {total.toLocaleString()}
              </span>
              {changePercent !== 0 && (
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold',
                    isPositive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400',
                  )}
                >
                  {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {Math.abs(changePercent)}%
                </span>
              )}
            </div>

            {/* มาตามนัด / ไม่มาตามนัด */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="flex flex-col items-center gap-0.5 rounded-lg bg-emerald-500/10 px-2 py-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-bold text-emerald-600">{attended.toLocaleString()}</span>
                  <span className="text-xs font-semibold text-emerald-600">({attendedPct}%)</span>
                </div>
                <span className="text-[10px] text-muted-foreground">มาตามนัด</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 rounded-lg bg-red-500/10 px-2 py-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-bold text-red-500">{notAttended.toLocaleString()}</span>
                  <span className="text-xs font-semibold text-red-500">({notAttendedPct}%)</span>
                </div>
                <span className="text-[10px] text-muted-foreground">ไม่มาตามนัด</span>
              </div>
            </div>

            {/* vs last week same day */}
            <p className="mt-2 text-xs text-muted-foreground">
              สัปดาห์ ({lastWeekDayName}) ที่แล้ว{' '}
              <span className="font-medium text-foreground">{lastWeekSameDayTotal.toLocaleString()}</span>{' '}
              ราย
            </p>
          </div>

          {/* Icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-500">
            <CalendarCheck className="h-5 w-5" />
          </div>
        </div>
      </div>
    </Card>
  )
}
