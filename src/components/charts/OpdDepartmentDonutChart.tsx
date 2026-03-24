// =============================================================================
// BMS Session KPI Dashboard - OPD Department Donut Chart (This Month)
// Doughnut chart: top 6 departments + "อื่นๆ" group, total in header
// =============================================================================

import { useMemo, useRef } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { ChartExportMenu } from '@/components/dashboard/ChartExportMenu'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DepartmentData {
  departmentName: string
  visitCount: number
}

interface ChartSlice {
  name: string
  value: number
  /** Actual departments grouped under "อื่นๆ" (only populated for that slice) */
  others?: DepartmentData[]
}

interface OpdDepartmentDonutChartProps {
  data: DepartmentData[]
  isLoading: boolean
  error?: Error | null
  className?: string
  title?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_DEPARTMENTS = 6

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#8b5cf6',
  '#94a3b8', // "อื่นๆ" color (slate)
]

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface TooltipPayloadItem {
  name: string
  value: number
  payload: ChartSlice
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const slice = payload[0]
  const isOthers = slice.payload.others && slice.payload.others.length > 0

  return (
    <div
      style={{
        borderRadius: 8,
        border: '1px solid hsl(var(--border))',
        background: 'hsl(var(--popover))',
        color: 'hsl(var(--popover-foreground))',
        padding: '10px 14px',
        fontSize: 12,
        maxWidth: 220,
      }}
    >
      {isOthers ? (
        <>
          <p style={{ fontWeight: 600, marginBottom: 6 }}>
            อื่นๆ — {slice.value.toLocaleString()} ราย
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {slice.payload.others!.map((d) => (
              <div
                key={d.departmentName}
                style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}
              >
                <span style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {d.departmentName}
                </span>
                <span style={{ fontWeight: 500 }}>{d.visitCount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontWeight: 600 }}>{slice.name}</span>
          <span>{slice.value.toLocaleString()} ราย</span>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

interface LegendProps {
  slices: ChartSlice[]
}

function DonutLegend({ slices }: LegendProps) {
  return (
    <div className="flex flex-col gap-1 flex-1 min-w-0">
      {slices.map((slice, index) => (
        <div key={slice.name} className="flex items-center gap-2 text-xs min-w-0">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: CHART_COLORS[index] ?? '#94a3b8' }}
          />
          <span className="flex-1 truncate text-muted-foreground">{slice.name}</span>
          <span className="font-medium tabular-nums shrink-0">{slice.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function OpdDepartmentDonutChart({
  data,
  isLoading,
  error,
  className,
  title = 'ผู้ป่วยนอกเดือนนี้แยกตามแผนก',
}: OpdDepartmentDonutChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { slices, total } = useMemo(() => {
    if (!data || data.length === 0) return { slices: [], total: 0 }

    const sorted = [...data].sort((a, b) => b.visitCount - a.visitCount)
    const top = sorted.slice(0, MAX_DEPARTMENTS)
    const rest = sorted.slice(MAX_DEPARTMENTS)
    const otherCount = rest.reduce((sum, d) => sum + d.visitCount, 0)
    const total = sorted.reduce((sum, d) => sum + d.visitCount, 0)

    const slices: ChartSlice[] = top.map((d) => ({
      name: d.departmentName,
      value: d.visitCount,
    }))

    if (rest.length > 0) {
      slices.push({ name: 'อื่นๆ', value: otherCount, others: rest })
    }

    return { slices, total }
  }, [data])

  if (isLoading) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="text-lg">ผู้ป่วยนอกเดือนนี้แยกตามแผนก</CardTitle>
          <CardDescription>กำลังโหลดข้อมูล...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[260px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="text-lg">ผู้ป่วยนอกเดือนนี้แยกตามแผนก</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="ไม่สามารถโหลดข้อมูลได้"
            description={error.message}
          />
        </CardContent>
      </Card>
    )
  }

  if (slices.length === 0) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="text-lg">ผู้ป่วยนอกเดือนนี้แยกตามแผนก</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState title="ไม่มีข้อมูลผู้ป่วยนอกในเดือนนี้" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">
            ผู้ป่วยนอกเดือนนี้แยกตามแผนก{' '}
            <span className="mx-1 text-muted-foreground/50">|</span>{' '}
            <span className="font-semibold text-foreground">
              {total.toLocaleString()}
            </span>{' '}
            ราย
          </CardTitle>
          <CardDescription>
            แยกตามคลินิก/แผนก เฉพาะ OPD (ไม่รวม IPD)
          </CardDescription>
        </div>
        <ChartExportMenu containerRef={containerRef} data={data} title={title} />
      </CardHeader>
      <CardContent>
        <div ref={containerRef}>
          <div className="flex items-center gap-4">
          {/* Donut chart */}
          <div className="shrink-0">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {slices.map((_, index) => (
                    <Cell
                      key={index}
                      fill={CHART_COLORS[index] ?? '#94a3b8'}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

            {/* Legend */}
            <DonutLegend slices={slices} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
