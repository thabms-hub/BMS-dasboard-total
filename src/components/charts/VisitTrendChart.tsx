// =============================================================================
// BMS Session KPI Dashboard - Visit Trend Chart Component (T054)
// =============================================================================

import { useRef } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import type { VisitTrend } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { ChartExportMenu } from '@/components/dashboard/ChartExportMenu'
import { cn } from '@/lib/utils'

interface VisitTrendChartProps {
  data: VisitTrend[]
  isLoading: boolean
  onDateClick?: (date: string) => void
  className?: string
  title?: string
}

/**
 * Formats a date string (yyyy-MM-dd) to a shorter label like "Mar 17".
 */
function formatDateLabel(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'd MMM', { locale: th })
  } catch {
    return dateStr
  }
}

export function VisitTrendChart({
  data,
  isLoading,
  onDateClick,
  className,
  title = 'แนวโน้มการเข้ารับบริการรายวัน',
}: VisitTrendChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">แนวโน้มการเข้ารับบริการรายวัน</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    )
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------
  if (!data || data.length === 0) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">แนวโน้มการเข้ารับบริการรายวัน</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState title="ไม่มีข้อมูลการเข้ารับบริการ" />
        </CardContent>
      </Card>
    )
  }

  // ---------------------------------------------------------------------------
  // Chart
  // ---------------------------------------------------------------------------
  return (
    <Card ref={containerRef} className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">แนวโน้มการเข้ารับบริการรายวัน</CardTitle>
        <ChartExportMenu containerRef={containerRef} data={data} title={title} />
      </CardHeader>
      <CardContent>
          <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={data}
            onClick={(state: Record<string, unknown>) => {
              const payload = state?.activePayload as Array<{ payload: { date: string } }> | undefined
              if (payload?.[0]?.payload && onDateClick) {
                onDateClick(payload[0].payload.date)
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateLabel}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Tooltip
              labelFormatter={((label: unknown) => formatDateLabel(String(label))) as any}
              formatter={((value: unknown) => [Number(value).toLocaleString(), 'ครั้ง']) as any}
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid hsl(var(--border))',
                backgroundColor: 'hsl(var(--popover))',
                color: 'hsl(var(--popover-foreground))',
              }}
            />
            <Bar
              dataKey="visitCount"
              fill="hsl(var(--chart-1))"
              radius={[4, 4, 0, 0]}
              cursor="pointer"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
