// =============================================================================
// BMS Session KPI Dashboard - KPI Summary Card Component (Redesigned)
// =============================================================================

import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowUp, ArrowDown, AlertCircle, RotateCcw } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: number | null
  icon?: ReactNode
  isLoading: boolean
  isError: boolean
  error?: string
  onRetry?: () => void
  className?: string
  description?: string
  trend?: { value: number; isPositive: boolean }
  accentColor?: string
}

// Map accent text color to matching border and background classes
function getAccentClasses(accentColor?: string) {
  const colorMap: Record<string, { border: string; bg: string }> = {
    'text-blue-500': { border: 'border-l-blue-500', bg: 'bg-blue-500/10' },
    'text-purple-500': { border: 'border-l-purple-500', bg: 'bg-purple-500/10' },
    'text-red-500': { border: 'border-l-red-500', bg: 'bg-red-500/10' },
    'text-green-500': { border: 'border-l-green-500', bg: 'bg-green-500/10' },
    'text-amber-500': { border: 'border-l-amber-500', bg: 'bg-amber-500/10' },
    'text-cyan-500': { border: 'border-l-cyan-500', bg: 'bg-cyan-500/10' },
    'text-pink-500': { border: 'border-l-pink-500', bg: 'bg-pink-500/10' },
    'text-indigo-500': { border: 'border-l-indigo-500', bg: 'bg-indigo-500/10' },
  }
  return colorMap[accentColor ?? ''] ?? { border: 'border-l-primary', bg: 'bg-primary/10' }
}

export function KpiCard({
  title,
  value,
  icon,
  isLoading,
  isError,
  error,
  onRetry,
  className,
  description,
  trend,
  accentColor,
}: KpiCardProps) {
  const accent = getAccentClasses(accentColor)

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <Card
        className={cn(
          'relative overflow-hidden border-l-4 shadow-sm',
          accent.border,
          className,
        )}
      >
        <div className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-3">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-8 w-20" />
              {description && <Skeleton className="h-3 w-32" />}
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
      </Card>
    )
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------
  if (isError) {
    return (
      <Card
        className={cn(
          'relative overflow-hidden border-l-4 border-l-destructive shadow-sm',
          className,
        )}
      >
        <div className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                {title}
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
            {icon && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                {icon}
              </div>
            )}
          </div>
        </div>
      </Card>
    )
  }

  // ---------------------------------------------------------------------------
  // Loaded state
  // ---------------------------------------------------------------------------
  return (
    <Card
      className={cn(
        'relative overflow-hidden border-l-4 shadow-sm transition-shadow duration-200 hover:shadow-md',
        accent.border,
        className,
      )}
    >
      <div className="p-5">
        <div className="flex items-start justify-between">
          {/* Left content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {title}
            </p>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">
                {value !== null ? value.toLocaleString() : '-'}
              </span>

              {/* Trend indicator */}
              {trend && (
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold',
                    trend.isPositive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400',
                  )}
                >
                  {trend.isPositive ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )}
                  {trend.value}%
                </span>
              )}
            </div>

            {description && (
              <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>

          {/* Icon circle */}
          {icon && (
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                accent.bg,
                accentColor ?? 'text-primary',
              )}
            >
              {icon}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
