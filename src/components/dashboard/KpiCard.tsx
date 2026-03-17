// =============================================================================
// BMS Session KPI Dashboard - KPI Summary Card Component (T043)
// =============================================================================

import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
}: KpiCardProps) {
  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <Card className={cn(className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20" />
          {description && <Skeleton className="mt-1 h-3 w-32" />}
        </CardContent>
      </Card>
    )
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------
  if (isError) {
    return (
      <Card className={cn('border-destructive/50', className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            {error ?? 'Failed to load data'}
          </p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={onRetry}
            >
              Retry
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // ---------------------------------------------------------------------------
  // Loaded state
  // ---------------------------------------------------------------------------
  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">
          {value !== null ? value.toLocaleString() : '-'}
        </div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}
