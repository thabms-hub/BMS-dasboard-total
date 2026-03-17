// =============================================================================
// BMS Session KPI Dashboard - Empty State Component
// Professional showcase redesign with dashed border, icon circle, and subtle bg
// =============================================================================

import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        'bg-muted/20 rounded-xl border border-dashed border-muted-foreground/20',
        className,
      )}
    >
      {/* Icon circle - uses provided icon or defaults to Inbox */}
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>

      <h3 className="text-lg font-semibold text-foreground">{title}</h3>

      {description && (
        <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
          {description}
        </p>
      )}

      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
