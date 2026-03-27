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


export function InpatientWardChart({ data, isLoading, error, className, title = 'ผู้ป่วยในแยกตามตึก/วอร์ด ที่รักษาตัวอยู่' }: InpatientWardChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  if (isLoading) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">ผู้ป่วยในแยกตามตึก/วอร์ด ที่รักษาตัวอยู่</CardTitle>
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
          <CardTitle className="text-sm font-medium">ผู้ป่วยในแยกตามตึก/วอร์ด ที่รักษาตัวอยู่</CardTitle>
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
          <CardTitle className="text-sm font-medium">ผู้ป่วยในแยกตามตึก/วอร์ด ที่รักษาตัวอยู่</CardTitle>
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
    <Card ref={containerRef} className={cn('flex flex-col', className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-medium">ผู้ป่วยในแยกตามตึก/วอร์ด ที่รักษาตัวอยู่</CardTitle>
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
      <CardContent className="flex-1 min-h-0 pb-4">
        <ResponsiveContainer width="100%" height="100%" minHeight={240}>
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 10, bottom: 48 }}
            barCategoryGap="20%"
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
              padding={{ left: 20, right: 20 }}
              label={{ value: 'รหัสตึก', position: 'insideBottomRight', offset: 0, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
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
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null
                const ward = payload[0].payload as IpdWardDistribution & { xLabel: string }
                const count = Number(payload[0].value ?? 0)
                return (
                  <div style={{
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    backgroundColor: 'hsl(var(--popover))',
                    boxShadow: 'none',
                    padding: '8px 12px',
                    fontSize: '13.8px',
                    lineHeight: '1.7',
                  }}>
                    <div style={{ fontWeight: 600, color: 'hsl(var(--popover-foreground))' }}>
                      {ward.xLabel} : {ward.wardName}
                    </div>
                    <div style={{ color: 'hsl(var(--chart-1))', fontWeight: 500 }}>
                      {count.toLocaleString()} คน
                    </div>
                  </div>
                )
              }}
              cursor={false}
            />
            <Bar dataKey="patientCount" fill="hsl(var(--chart-1) / 0.75)" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
