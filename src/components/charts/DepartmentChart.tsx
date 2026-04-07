// =============================================================================
// BMS Session KPI Dashboard - Department Horizontal Bar Chart (T063)
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
import type { DepartmentWorkload } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { ChartExportMenu } from '@/components/dashboard/ChartExportMenu'
import { cn } from '@/lib/utils'

interface DepartmentChartProps {
  data: DepartmentWorkload[]
  isLoading: boolean
  onDepartmentClick?: (depcode: string) => void
  className?: string
  title?: string
}

/**
 * Truncates long department names so they fit the Y-axis.
 */
function truncateName(name: string, maxLength = 20): string {
  if (name.length <= maxLength) return name
  return `${name.slice(0, maxLength)}...`
}

export function DepartmentChart({
  data,
  isLoading,
  onDepartmentClick,
  className,
  title = 'รายละเอียดการเข้ารับบริการแยกตามแผนก',
}: DepartmentChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">รายละเอียดการเข้ารับบริการแยกตามแผนก</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
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
          <CardTitle className="text-sm font-medium">รายละเอียดการเข้ารับบริการแยกตามแผนก</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState title="ไม่มีข้อมูลแผนก" />
        </CardContent>
      </Card>
    )
  }

  // ---------------------------------------------------------------------------
  // Chart
  // ---------------------------------------------------------------------------
  const chartHeight = Math.max(300, data.length * 40)

  return (
    <Card ref={containerRef} className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">รายละเอียดการเข้ารับบริการแยกตามแผนก</CardTitle>
        <ChartExportMenu containerRef={containerRef} data={data} title={title} />
      </CardHeader>
      <CardContent>
          <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            onClick={(state: Record<string, unknown>) => {
              const activePayload = state?.activePayload as Array<{ payload: DepartmentWorkload }> | undefined
              if (activePayload?.[0]?.payload && onDepartmentClick) {
                onDepartmentClick(activePayload[0].payload.departmentCode)
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              type="number"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="departmentName"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={150}
              tickFormatter={(value: string) => truncateName(value)}
            />
            <Tooltip
              cursor={false}
              formatter={((value: unknown) => [Number(value).toLocaleString(), 'ครั้ง']) as never}
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid hsl(var(--border))',
                backgroundColor: 'hsl(var(--popover))',
                color: 'hsl(var(--popover-foreground))',
              }}
            />
            <Bar
              dataKey="visitCount"
              fill="hsl(var(--chart-3))"
              radius={[0, 4, 4, 0]}
              cursor="pointer"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
