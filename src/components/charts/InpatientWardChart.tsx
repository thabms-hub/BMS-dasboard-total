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

const MAX_LABEL_LENGTH = 20

function truncateLabel(label: string) {
  if (label.length <= MAX_LABEL_LENGTH) return label
  return `${label.slice(0, MAX_LABEL_LENGTH)}...`
}

export function InpatientWardChart({ data, isLoading, error, className, title = 'ผู้ป่วยในแยกตามตึก/วอร์ด' }: InpatientWardChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  if (isLoading) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            ผู้ป่วยในแยกตามตึก/วอร์ด
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            ผู้ป่วยในแยกตามตึก/วอร์ด
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="ไม่สามารถโหลดข้อมูลผู้ป่วยในได้"
            description={error.message}
          />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            ผู้ป่วยในแยกตามตึก/วอร์ด
          </CardTitle>
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
  const chartHeight = Math.max(300, data.length * 40)

  return (
    <Card ref={containerRef} className={cn(className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-medium">
            ผู้ป่วยในแยกตามตึก/วอร์ด
          </CardTitle>
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
          <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
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
              dataKey="wardName"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={170}
              tickFormatter={truncateLabel}
            />
            <Tooltip
              formatter={((value: unknown, _name: string, props: any) => {
                const bedCount = props.payload?.bedCount || 0
                const bedInfo = bedCount > 0 ? ` (${bedCount} เตียง)` : ''
                return [
                  `${Number(value).toLocaleString()} คน${bedInfo}`,
                  'ผู้ป่วยใน',
                ]
              }) as never}
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid hsl(var(--border))',
                backgroundColor: 'hsl(var(--popover))',
                color: 'hsl(var(--popover-foreground))',
              }}
            />
            <Bar dataKey="patientCount" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
