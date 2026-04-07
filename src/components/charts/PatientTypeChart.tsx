// =============================================================================
// BMS Session KPI Dashboard - Patient Type (Insurance) Chart (T073)
// Horizontal bar chart showing insurance / patient type distribution.
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { ChartExportMenu } from '@/components/dashboard/ChartExportMenu'
import { cn } from '@/lib/utils'
import type { PatientTypeDistribution } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PatientTypeChartProps {
  data: PatientTypeDistribution[]
  isLoading: boolean
  className?: string
  title?: string
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface TooltipPayloadEntry {
  name: string
  value: number
  payload: { name: string; code: string; visitCount: number }
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
}) {
  if (!active || !payload || payload.length === 0) return null

  const entry = payload[0]
  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm">
      <p className="text-sm font-medium">{entry.payload.name}</p>
      <p className="text-xs text-muted-foreground">
        รหัส: {entry.payload.code}
      </p>
      <p className="text-sm text-muted-foreground">
        จำนวนครั้ง: {entry.value.toLocaleString()}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PatientTypeChart({
  data,
  isLoading,
  className,
  title = 'สถิติผู้ป่วยแยกตามประเภทสิทธิ์',
}: PatientTypeChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  if (isLoading) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">สถิติผู้ป่วยแยกตามประเภทสิทธิ์</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">สถิติผู้ป่วยแยกตามประเภทสิทธิ์</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState title="ไม่มีข้อมูลสิทธิ์การรักษา" />
        </CardContent>
      </Card>
    )
  }

  // Map to chart-friendly shape
  const chartData = data.map((d) => ({
    name: d.pttypeName || d.pttypeCode,
    code: d.pttypeCode,
    visitCount: d.visitCount,
  }))

  const dynamicHeight = Math.max(250, data.length * 35)

  return (
    <Card ref={containerRef} className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">สถิติผู้ป่วยแยกตามประเภทสิทธิ์</CardTitle>
        <ChartExportMenu containerRef={containerRef} data={data} title={title} />
      </CardHeader>
      <CardContent>
          <ResponsiveContainer width="100%" height={dynamicHeight}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            type="number"
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            width={150}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Bar
            dataKey="visitCount"
            fill="hsl(var(--chart-5))"
            radius={[0, 4, 4, 0]}
          />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
