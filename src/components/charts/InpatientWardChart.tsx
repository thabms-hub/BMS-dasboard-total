// =============================================================================
// BMS Session KPI Dashboard - Inpatient Ward Distribution Chart
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
import type { IpdWardDistribution } from '@/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { ChartExportMenu } from '@/components/dashboard/ChartExportMenu'
import { cn } from '@/lib/utils'

interface InpatientWardChartProps {
  data: IpdWardDistribution[]
  isLoading: boolean
  error?: Error | null
  className?: string
  title?: string
}

// Custom legend rendered as ward-code = ward-name list
function WardLegend({ data }: { data: IpdWardDistribution[] }) {
  return (
    <div className="flex flex-col gap-1 overflow-y-auto max-h-[220px] pl-2">
      {data.map((ward) => (
        <div key={ward.wardCode ?? ward.wardName} className="flex items-center gap-1.5 text-xs leading-tight">
          <span className="shrink-0 inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'hsl(var(--chart-4))' }} />
          <span className="font-semibold text-foreground shrink-0">{ward.wardCode ?? '-'}</span>
          <span className="text-muted-foreground truncate">= {ward.wardName}</span>
        </div>
      ))}
    </div>
  )
}

export function InpatientWardChart({ data, isLoading, error, className, title = 'ผู้ป่วยในแยกตามตึก/วอร์ด' }: InpatientWardChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  if (isLoading) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">ผู้ป่วยในแยกตามตึก/วอร์ด</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[280px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">ผู้ป่วยในแยกตามตึก/วอร์ด</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState title="ไม่สามารถโหลดข้อมูลผู้ป่วยในได้" description={error.message} />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">ผู้ป่วยในแยกตามตึก/วอร์ด</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState title="ไม่มีข้อมูลผู้ป่วยใน" />
        </CardContent>
      </Card>
    )
  }

  const totalPatients = data.reduce((sum, ward) => sum + ward.patientCount, 0)
  const yesterdayPatientCount = data[0]?.yesterdayPatientCount ?? 0
  const percentageChange = data[0]?.percentageChange ?? 0

  // Use wardCode as XAxis key; fallback to wardName if no code
  const chartData = data.map((ward) => ({
    ...ward,
    xLabel: ward.wardCode ?? ward.wardName,
  }))

  return (
    <Card ref={containerRef} className={cn(className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-medium">ผู้ป่วยในแยกตามตึก/วอร์ด</CardTitle>
          <CardDescription className="text-base font-semibold text-foreground">
            รวมทั้งสิ้น: {totalPatients.toLocaleString()} คน
            {yesterdayPatientCount > 0 && (
              <div className="mt-1 text-sm text-muted-foreground">
                เมื่อวาน: {yesterdayPatientCount.toLocaleString()} คน
                <span className={percentageChange >= 0 ? 'ml-2 text-red-600' : 'ml-2 text-green-600'}>
                  ({percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(1)}%)
                </span>
              </div>
            )}
          </CardDescription>
        </div>
        <ChartExportMenu containerRef={containerRef} data={data} title={title} />
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          {/* Chart area */}
          <div className="flex-1 min-w-0">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 5, left: -30, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis
                  type="category"
                  dataKey="xLabel"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  type="number"
                  tick={false}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={0}
                />
                <Tooltip
                  formatter={((value: unknown, _name: string, props: { payload?: IpdWardDistribution }) => [
                    `${Number(value).toLocaleString()} คน`,
                    props.payload?.wardName ?? 'ผู้ป่วยใน',
                  ]) as never}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    backgroundColor: 'hsl(var(--popover))',
                    color: 'hsl(var(--popover-foreground))',
                    boxShadow: 'none',
                  }}
                  cursor={false}
                />
                <Bar dataKey="patientCount" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend: code = name */}
          <div className="w-36 shrink-0 flex flex-col justify-center">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Legend</p>
            <WardLegend data={data} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
