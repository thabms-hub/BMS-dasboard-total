// =============================================================================
// BMS Session KPI Dashboard - Pttype Price Group Distribution Card
// Horizontal bar chart: สัดส่วนผู้มารับบริการวันนี้ แยกตามกลุ่มสิทธิ์
// =============================================================================

import { useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { PttypeGroupItem } from '@/services/kpiService'
import { ChartExportMenu } from '@/components/dashboard/ChartExportMenu'

const BAR_COLORS = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-orange-400',
  'bg-slate-400',
  'bg-violet-500',
  'bg-rose-400',
  'bg-cyan-500',
]

interface PttypeDistributionCardProps {
  data: PttypeGroupItem[] | null
  isLoading: boolean
  isError?: boolean
  error?: Error | null
  className?: string
}

export function PttypeDistributionCard({
  data,
  isLoading,
  isError,
  error,
  className,
}: PttypeDistributionCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null)

  return (
    <Card ref={cardRef} className={cn(className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">สัดส่วนผู้มารับบริการในวันนี้</CardTitle>
          <CardDescription>แยกตามกลุ่มสิทธิ์การรักษา</CardDescription>
        </div>
        {!isLoading && !isError && data && data.length > 0 && (
          <ChartExportMenu
            containerRef={cardRef}
            data={data}
            title="สัดส่วนผู้มารับบริการวันนี้"
          />
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3 w-44" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <p className="text-xs text-destructive">{error?.message ?? 'ไม่สามารถโหลดข้อมูลได้'}</p>
        ) : !data || data.length === 0 ? (
          <p className="text-xs text-muted-foreground">ไม่มีข้อมูลการเข้ารับบริการในวันนี้</p>
        ) : (
          <div className="space-y-2.5">
            {data.map((item, index) => (
              <div key={item.groupName} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{item.groupName}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {item.visitCount.toLocaleString()} ราย
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', BAR_COLORS[index % BAR_COLORS.length])}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
                    {item.percent}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
