// =============================================================================
// Support: งานรังสีวิทยา X-Ray
// =============================================================================

import { useCallback, useState, useRef, useMemo } from 'react'
import { Scan, Radiation, CircleCheckBig, AlertCircle, CalendarDays, Clock, RefreshCw, ClipboardList } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LabelList } from 'recharts'
import { format, parseISO, subMonths } from 'date-fns'
import { th } from 'date-fns/locale'
import { useBmsSessionContext } from '@/contexts/BmsSessionContext'
import { useQuery } from '@/hooks/useQuery'
import { usePersistentDateRange } from '@/hooks/usePersistentDateRange'
import { DateRangePicker } from '@/components/dashboard/DateRangePicker'
import { ChartExportMenu } from '@/components/dashboard/ChartExportMenu'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { cn } from '@/lib/utils'
import { formatDate, formatDateTime } from '@/utils/dateUtils'
import {
  getXraySummary,
  getXrayItemsTop,
  getXrayByDept,
  getXrayByWard,
  getXrayDoctorRead,
  getXrayOpdOrders,
  getXrayBySex,
  getXrayByUrgency,
  getXrayMonthlyOrders,
} from '@/services/xrayService'
import type {
  XraySummary,
  XrayItemTop,
  XrayByDept,
  XrayByWard,
  XrayDoctorRead,
  XrayOpdOrder,
  XrayBySex,
  XrayByUrgency,
  XrayMonthlyOrder,
} from '@/types'

function formatDateLabel(dateStr: string): string {
  try { return format(parseISO(dateStr), 'd MMM', { locale: th }) } catch { return dateStr }
}

function formatMonthLabel(monthKey: string): string {
  try { return format(parseISO(`${monthKey}-01`), 'MMM yy', { locale: th }) } catch { return monthKey }
}

const CHART_COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))',
  '#a78bfa', '#f59e0b', '#10b981', '#f87171', '#60a5fa',
]

const tooltipStyle = {
  borderRadius: '8px',
  border: '1px solid hsl(var(--border))',
  backgroundColor: 'hsl(var(--popover))',
  color: 'hsl(var(--popover-foreground))',
  fontSize: '12px',
}

const SEX_COLORS: Record<string, string> = {
  ชาย: 'hsl(var(--chart-1))',
  หญิง: 'hsl(var(--chart-2))',
  ตั้งครรภ์: '#f59e0b',
}

const URGENCY_COLORS: Record<string, string> = {
  ด่วน: '#ef4444',
  ปกติ: 'hsl(var(--chart-2))',
  ไม่ระบุ: '#94a3b8',
}

function getMonotoneBarColor(baseToken: '--chart-1' | '--chart-2', index: number, total: number): string {
  if (total <= 1) {
    return `hsl(var(${baseToken}) / 0.9)`
  }
  const minAlpha = 0.4
  const maxAlpha = 0.95
  const ratio = index / (total - 1)
  const alpha = maxAlpha - ratio * (maxAlpha - minAlpha)
  return `hsl(var(${baseToken}) / ${alpha.toFixed(3)})`
}

export default function SupportXray() {
  const { connectionConfig, session } = useBmsSessionContext()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [hiddenOpd, setHiddenOpd] = useState<Set<string>>(new Set())
  const deptChartRef = useRef<HTMLDivElement>(null)
  const wardChartRef = useRef<HTMLDivElement>(null)
  const doctorChartRef = useRef<HTMLDivElement>(null)
  const opdChartRef = useRef<HTMLDivElement>(null)
  const sexDonutRef = useRef<HTMLDivElement>(null)
  const urgencyChartRef = useRef<HTMLDivElement>(null)
  const monthlyChartRef = useRef<HTMLDivElement>(null)
  const { startDate, endDate, setRange } = usePersistentDateRange('support-xray', 30)

  const isConnected = connectionConfig !== null && session !== null

  // Query functions
  const summaryFn = useCallback(() => getXraySummary(connectionConfig!, startDate, endDate), [connectionConfig, startDate, endDate])
  const itemsTopFn = useCallback(() => getXrayItemsTop(connectionConfig!, startDate, endDate), [connectionConfig, startDate, endDate])
  const deptFn = useCallback(() => getXrayByDept(connectionConfig!, startDate, endDate), [connectionConfig, startDate, endDate])
  const wardFn = useCallback(() => getXrayByWard(connectionConfig!, startDate, endDate), [connectionConfig, startDate, endDate])
  const doctorFn = useCallback(() => getXrayDoctorRead(connectionConfig!, startDate, endDate), [connectionConfig, startDate, endDate])
  const opdFn = useCallback(() => getXrayOpdOrders(connectionConfig!, startDate, endDate), [connectionConfig, startDate, endDate])
  const sexFn = useCallback(() => getXrayBySex(connectionConfig!, startDate, endDate), [connectionConfig, startDate, endDate])
  const urgencyFn = useCallback(() => getXrayByUrgency(connectionConfig!, startDate, endDate), [connectionConfig, startDate, endDate])
  const monthlyFn = useCallback(() => getXrayMonthlyOrders(connectionConfig!), [connectionConfig])

  // Queries
  const { data: summary, isLoading: isSummaryLoading, error: summaryError, execute: executeSummary } = useQuery<XraySummary>({ queryFn: summaryFn, enabled: isConnected })
  const { data: itemsTop, isLoading: isItemsLoading, execute: executeItems } = useQuery<XrayItemTop[]>({ queryFn: itemsTopFn, enabled: isConnected })
  const { data: deptData, isLoading: isDeptLoading, execute: executeDept } = useQuery<XrayByDept[]>({ queryFn: deptFn, enabled: isConnected })
  const { data: wardData, isLoading: isWardLoading, execute: executeWard } = useQuery<XrayByWard[]>({ queryFn: wardFn, enabled: isConnected })
  const { data: doctorData, isLoading: isDoctorLoading, execute: executeDoctor } = useQuery<XrayDoctorRead[]>({ queryFn: doctorFn, enabled: isConnected })
  const { data: opdData, isLoading: isOpdLoading, execute: executeOpd } = useQuery<XrayOpdOrder[]>({ queryFn: opdFn, enabled: isConnected })
  const { data: sexData, isLoading: isSexLoading, execute: executeSex } = useQuery<XrayBySex[]>({ queryFn: sexFn, enabled: isConnected })
  const { data: urgencyData, isLoading: isUrgencyLoading, execute: executeUrgency } = useQuery<XrayByUrgency[]>({ queryFn: urgencyFn, enabled: isConnected })
  const { data: monthlyData, isLoading: isMonthlyLoading, error: monthlyError, execute: executeMonthly } = useQuery<XrayMonthlyOrder[]>({ queryFn: monthlyFn, enabled: isConnected })

  // Aggregate totals in selected date range
  const deptTotalsData = useMemo(() => {
    if (!deptData || deptData.length === 0) return []
    const totals = new Map<string, number>()
    deptData.forEach((item) => {
      totals.set(item.deptName, (totals.get(item.deptName) ?? 0) + item.orderCount)
    })
    return [...totals.entries()]
      .map(([deptName, totalCount]) => ({ deptName, totalCount }))
      .sort((a, b) => b.totalCount - a.totalCount)
      .slice(0, 12)
  }, [deptData])

  const wardTotalsData = useMemo(() => {
    if (!wardData || wardData.length === 0) return []
    const totals = new Map<string, number>()
    wardData.forEach((item) => {
      totals.set(item.wardName, (totals.get(item.wardName) ?? 0) + item.orderCount)
    })
    return [...totals.entries()]
      .map(([wardName, totalCount]) => ({ wardName, totalCount }))
      .sort((a, b) => b.totalCount - a.totalCount)
      .slice(0, 12)
  }, [wardData])

  // Sex donut
  const sexDonutData = useMemo(() => (sexData ?? []).map(d => ({ name: d.sexLabel, value: d.patientCount })), [sexData])
  const totalSexPatients = useMemo(() => sexDonutData.reduce((s, d) => s + d.value, 0), [sexDonutData])
  const urgencyChartData = useMemo(() => (urgencyData ?? []).map(d => ({ urgencyLabel: d.urgencyLabel, orderCount: d.orderCount })), [urgencyData])
  const totalUrgencyOrders = useMemo(() => urgencyChartData.reduce((sum, item) => sum + item.orderCount, 0), [urgencyChartData])
  const monthlyChartData = useMemo(() => {
    const now = new Date()
    const map = new Map((monthlyData ?? []).map(item => [item.monthKey, item.orderCount]))
    return Array.from({ length: 12 }, (_, idx) => {
      const date = subMonths(now, 11 - idx)
      const monthKey = format(date, 'yyyy-MM')
      return {
        monthKey,
        monthLabel: format(date, 'MMM yy', { locale: th }),
        orderCount: map.get(monthKey) ?? 0,
      }
    })
  }, [monthlyData])
  const totalMonthlyOrders = useMemo(
    () => monthlyChartData.reduce((sum, item) => sum + item.orderCount, 0),
    [monthlyChartData],
  )

  const handleRangeChange = useCallback((s: string, e: string) => setRange(s, e), [setRange])

  const handleRefresh = useCallback(async () => {
    if (!isConnected) return
    setIsRefreshing(true)
    try {
      await Promise.all([executeSummary(), executeItems(), executeDept(), executeWard(), executeDoctor(), executeOpd(), executeSex(), executeUrgency(), executeMonthly()])
      setLastUpdated(new Date())
    } finally {
      setIsRefreshing(false)
    }
  }, [isConnected, executeSummary, executeItems, executeDept, executeWard, executeDoctor, executeOpd, executeSex, executeUrgency, executeMonthly])

  if (!isConnected) {
    return (
      <EmptyState
        icon={<Scan className="h-5 w-5" />}
        title="ยังไม่เชื่อมต่อ BMS Session"
        description="กรุณาเชื่อมต่อ Session ก่อนใช้งานแดชบอร์ดงานรังสีวิทยา"
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 shadow-md ring-1 ring-primary/20">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 to-transparent" />
            <Radiation className="relative h-10 w-10 text-primary drop-shadow-sm" />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-3xl font-bold tracking-tight">งานรังสีวิทยา X-Ray</h2>
            <p className="text-base text-muted-foreground">Radiology</p>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDate(new Date())}
              </span>
              <span className="text-muted-foreground/40">|</span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                อัปเดตล่าสุด {formatDateTime(lastUpdated)}
              </span>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 gap-1.5 sm:mt-0 dark:border-orange-400/60 dark:bg-orange-500/5 dark:text-white dark:hover:border-orange-300 dark:hover:bg-orange-500/15"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
          รีเฟรช
        </Button>
      </div>

      <DateRangePicker startDate={startDate} endDate={endDate} onRangeChange={handleRangeChange} isLoading={isRefreshing} />

      {(summaryError || monthlyError) && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <span className="font-semibold">ไม่สามารถโหลดข้อมูลได้:</span>{' '}
            {summaryError?.message ?? monthlyError?.message}
          </span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-12">
        <Card className="col-span-12 sm:col-span-6 xl:col-span-3">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                  <ClipboardList className="h-3.5 w-3.5" />
                </span>
                <p className="text-xs font-medium text-muted-foreground">ข้อมูลจำนวนใบสั่ง X-ray ทั้งหมด</p>
              </div>
              {isSummaryLoading ? <Skeleton className="h-8 w-20 mx-auto mt-2" /> : <p className="text-2xl font-bold mt-2">{summary?.totalOrders.toLocaleString() ?? 0}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-12 sm:col-span-6 xl:col-span-3">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                  <CircleCheckBig className="h-3.5 w-3.5" />
                </span>
                <p className="text-xs font-medium text-muted-foreground">ข้อมูลจำนวนใบสั่ง X-ray ยืนยันรับตัว</p>
              </div>
              {isSummaryLoading ? <Skeleton className="h-8 w-20 mx-auto mt-2" /> : <p className="text-2xl font-bold mt-2 text-cyan-700">{summary?.acceptedOrders.toLocaleString() ?? 0}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-12 sm:col-span-6 xl:col-span-3">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                  <Radiation className="h-3.5 w-3.5" />
                </span>
                <p className="text-xs font-medium text-muted-foreground">ข้อมูลจำนวนใบสั่ง X-ray ยืนยันฉาย</p>
              </div>
              {isSummaryLoading ? <Skeleton className="h-8 w-20 mx-auto mt-2" /> : <p className="text-2xl font-bold mt-2 text-violet-700">{summary?.examinedOrders.toLocaleString() ?? 0}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-12 sm:col-span-6 xl:col-span-3">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-700">
                  <CircleCheckBig className="h-3.5 w-3.5" />
                </span>
                <p className="text-xs font-medium text-muted-foreground">ข้อมูลจำนวนใบสั่ง X-ray ยืนยันอ่านผลแล้ว</p>
              </div>
              {isSummaryLoading ? <Skeleton className="h-8 w-20 mx-auto mt-2" /> : <p className="text-2xl font-bold mt-2 text-green-600">{summary?.confirmedReadOrders.toLocaleString() ?? 0}</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Dept totals + Ward totals */}
      <div className="grid gap-6 grid-cols-12">
        {/* จำนวนผู้ป่วยแยกแผนก */}
        <div className="col-span-12 md:col-span-6" ref={deptChartRef}>
          <Card className="card-shadow">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <CardTitle className="text-sm font-medium">จำนวนผู้ป่วยแยกแผนก</CardTitle>
              {deptTotalsData.length > 0 && (
                <ChartExportMenu containerRef={deptChartRef} data={deptTotalsData} title="จำนวนผู้ป่วยแยกแผนก" />
              )}
            </CardHeader>
            <CardContent>
              {isDeptLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : deptTotalsData.length === 0 ? (
                <EmptyState title="ไม่มีข้อมูล" className="py-6" />
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptTotalsData} margin={{ left: 36, right: 8, top: 4, bottom: 52 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                      <XAxis dataKey="deptName" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} angle={-28} textAnchor="end" height={52} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                        tickFormatter={(v: number) => v.toLocaleString()}
                        label={{ value: 'จำนวนรวม', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                        contentStyle={tooltipStyle}
                        formatter={((value: unknown) => [Number(value).toLocaleString() + ' รายการ', 'จำนวนรวม']) as never}
                      />
                      <Bar dataKey="totalCount" name="จำนวนรวม" radius={[6, 6, 0, 0]} maxBarSize={46}>
                        {deptTotalsData.map((item, idx) => (
                          <Cell
                            key={`${item.deptName}-${idx}`}
                            fill={getMonotoneBarColor('--chart-1', idx, deptTotalsData.length)}
                          />
                        ))}
                        <LabelList
                          dataKey="totalCount"
                          position="top"
                          offset={6}
                          fontSize={10}
                          fill="hsl(var(--muted-foreground))"
                          formatter={(value: unknown) => Number(value).toLocaleString()}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* รายการสั่งแยกตามตึก */}
        <div className="col-span-12 md:col-span-6" ref={wardChartRef}>
          <Card className="card-shadow">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <CardTitle className="text-sm font-medium">รายการสั่งแยกตามตึก</CardTitle>
              {wardTotalsData.length > 0 && (
                <ChartExportMenu containerRef={wardChartRef} data={wardTotalsData} title="รายการสั่งแยกตามตึก" />
              )}
            </CardHeader>
            <CardContent>
              {isWardLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : wardTotalsData.length === 0 ? (
                <EmptyState title="ไม่มีข้อมูล" className="py-6" />
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={wardTotalsData} margin={{ left: 36, right: 8, top: 4, bottom: 52 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                      <XAxis dataKey="wardName" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} angle={-28} textAnchor="end" height={52} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                        tickFormatter={(v: number) => v.toLocaleString()}
                        label={{ value: 'จำนวนรวม', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                        contentStyle={tooltipStyle}
                        formatter={((value: unknown) => [Number(value).toLocaleString() + ' รายการ', 'จำนวนรวม']) as never}
                      />
                      <Bar dataKey="totalCount" name="จำนวนรวม" radius={[6, 6, 0, 0]} maxBarSize={46}>
                        {wardTotalsData.map((item, idx) => (
                          <Cell
                            key={`${item.wardName}-${idx}`}
                            fill={getMonotoneBarColor('--chart-2', idx, wardTotalsData.length)}
                          />
                        ))}
                        <LabelList
                          dataKey="totalCount"
                          position="top"
                          offset={6}
                          fontSize={10}
                          fill="hsl(var(--muted-foreground))"
                          formatter={(value: unknown) => Number(value).toLocaleString()}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 3: Gender donut + OPD appointment + urgency */}
      <div className="grid gap-6 grid-cols-12">
        {/* จำนวนผู้ป่วยแยกตามเพศ (รวมตั้งครรภ์) */}
        <div className="col-span-12 lg:col-span-4" ref={sexDonutRef}>
          <Card className="card-shadow h-full">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-sm font-medium">จำนวนผู้ป่วยแยกตามเพศ</CardTitle>
                <CardDescription>
                  {sexDonutData.length > 0 ? `รวม ${totalSexPatients.toLocaleString()} ราย (รวมตั้งครรภ์)` : 'ไม่มีข้อมูล'}
                </CardDescription>
              </div>
              {sexDonutData.length > 0 && (
                <ChartExportMenu containerRef={sexDonutRef} data={sexData ?? []} title="จำนวนผู้ป่วยแยกตามเพศ" />
              )}
            </CardHeader>
            <CardContent className="h-[320px]">
              {isSexLoading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : sexDonutData.length === 0 ? (
                <EmptyState title="ไม่มีข้อมูล" className="py-6" />
              ) : (
                <div className="flex items-center gap-4 h-full">
                  <div className="basis-3/5 min-w-0">
                    <div className="mx-auto aspect-square w-full max-w-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                          <Pie data={sexDonutData} cx="50%" cy="50%" innerRadius="42%" outerRadius="70%" paddingAngle={2} dataKey="value" nameKey="name" strokeWidth={0}>
                            {sexDonutData.map((item, i) => (
                              <Cell key={`sex-${i}`} fill={SEX_COLORS[item.name] ?? CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null
                              const item = payload[0]
                              const pct = totalSexPatients > 0 ? Math.round((Number(item.value) / totalSexPatients) * 100) : 0
                              return (
                                <div className="bg-popover rounded-md border border-border p-2 text-xs shadow-md text-popover-foreground">
                                  <div className="font-medium">{String(item.name)}</div>
                                  <div className="text-muted-foreground">จำนวน: {Number(item.value).toLocaleString()} ราย</div>
                                  <div className="text-muted-foreground">สัดส่วน: {pct}%</div>
                                </div>
                              )
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="basis-2/5 min-w-0">
                    <div className="flex flex-col gap-2">
                      {sexDonutData.map((item, i) => {
                        const pct = totalSexPatients > 0 ? Math.round((item.value / totalSexPatients) * 100) : 0
                        return (
                          <div key={item.name} className="flex items-center gap-2 text-sm">
                            <span className="inline-block h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: SEX_COLORS[item.name] ?? CHART_COLORS[i % CHART_COLORS.length] }} />
                            <span className="flex-1 truncate text-muted-foreground">{item.name}</span>
                            <span className="font-semibold tabular-nums shrink-0">{item.value.toLocaleString()}</span>
                            <span className="text-xs text-muted-foreground w-9 text-right shrink-0">{pct}%</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ผู้ป่วยนัดหมาย OPD ที่มีรายการเอกซเรย์ */}
        <div className="col-span-12 lg:col-span-4" ref={opdChartRef}>
          <Card className="card-shadow h-full">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <CardTitle>ผู้ป่วยนัดหมายที่มีรายการเอกซเรย์</CardTitle>
              {(opdData?.length ?? 0) > 0 && (
                <ChartExportMenu containerRef={opdChartRef} data={opdData ?? []} title="ผู้ป่วยนัดหมายที่มีรายการเอกซเรย์" />
              )}
            </CardHeader>
            <CardContent className="h-[320px]">
              {isOpdLoading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : !opdData || opdData.length === 0 ? (
                <EmptyState title="ไม่มีข้อมูล" className="py-6" />
              ) : (
                <div className="space-y-3 h-full">
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={opdData} margin={{ left: 36, right: 8, top: 4, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                        <XAxis dataKey="date" tickFormatter={formatDateLabel} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} angle={-30} textAnchor="end" height={44} label={{ value: 'วันที่', position: 'insideBottomRight', offset: 0, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={(v: number) => v.toLocaleString()} label={{ value: 'จำนวน', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={tooltipStyle} labelFormatter={(label: unknown) => formatDateLabel(String(label))} formatter={((value: unknown, name: unknown) => [Number(value).toLocaleString(), String(name)]) as never} />
                        <Bar dataKey="patientCount" name="จำนวนผู้ป่วย" fill="hsl(var(--chart-1))" hide={hiddenOpd.has('patientCount')} maxBarSize={48} />
                        <Bar dataKey="orderCount" name="จำนวนใบสั่ง X-Ray" fill="hsl(var(--chart-2))" hide={hiddenOpd.has('orderCount')} maxBarSize={48} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-1">
                    {[
                      { key: 'patientCount', label: 'จำนวนผู้ป่วย', color: 'hsl(var(--chart-1))' },
                      { key: 'orderCount', label: 'จำนวนใบสั่ง X-Ray', color: 'hsl(var(--chart-2))' },
                    ].map(({ key, label, color }) => (
                      <button
                        key={key}
                        onClick={() => { const next = new Set(hiddenOpd); next.has(key) ? next.delete(key) : next.add(key); setHiddenOpd(next) }}
                        className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
                        style={{ opacity: hiddenOpd.has(key) ? 0.35 : 1, cursor: 'pointer' }}
                      >
                        <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-xs leading-tight">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* รายการเอกซเรย์แยกตามความเร่งด่วน */}
        <div className="col-span-12 lg:col-span-4" ref={urgencyChartRef}>
          <Card className="card-shadow">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>รายการเอกซเรย์แยกตามความเร่งด่วน</CardTitle>
                <CardDescription>
                  {urgencyChartData.length > 0
                    ? `รวม ${totalUrgencyOrders.toLocaleString()} รายการ`
                    : 'ไม่มีข้อมูล'}
                </CardDescription>
              </div>
              {urgencyChartData.length > 0 && (
                <ChartExportMenu
                  containerRef={urgencyChartRef}
                  data={urgencyData ?? []}
                  title="รายการเอกซเรย์แยกตามความเร่งด่วน"
                />
              )}
            </CardHeader>
            <CardContent className="h-[320px]">
              {isUrgencyLoading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : urgencyChartData.length === 0 ? (
                <EmptyState title="ไม่มีข้อมูล" className="py-6" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={urgencyChartData} margin={{ left: 36, right: 8, top: 8, bottom: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                    <XAxis dataKey="urgencyLabel" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={(v: number) => v.toLocaleString()} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={((value: unknown) => [Number(value).toLocaleString() + ' รายการ', 'จำนวนใบสั่ง']) as never}
                    />
                    <Bar dataKey="orderCount" radius={[6, 6, 0, 0]}>
                      {urgencyChartData.map((item, idx) => (
                        <Cell
                          key={`${item.urgencyLabel}-${idx}`}
                          fill={URGENCY_COLORS[item.urgencyLabel] ?? CHART_COLORS[idx % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 4: Top items + Doctor read */}
      <div className="grid gap-6 grid-cols-12">
        {/* Top 10 รายการสั่ง X-Ray */}
        <div className="col-span-12 md:col-span-4">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>ชุดข้อมูลอันดับรายการสั่ง X-Ray</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px] overflow-auto">
              {isItemsLoading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : !itemsTop || itemsTop.length === 0 ? (
                <EmptyState title="ไม่มีข้อมูล" className="py-6" />
              ) : (
                <div className="space-y-2">
                  {itemsTop.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="flex-1 truncate text-xs">{idx + 1}. {item.xrayItemsName}</span>
                      <span className="ml-2 font-semibold text-muted-foreground shrink-0">{item.orderCount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* จำนวนรายการที่แพทย์อ่านผล */}
        <div className="col-span-12 md:col-span-8" ref={doctorChartRef}>
          <Card className="card-shadow h-full">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <CardTitle>จำนวนรายการที่แพทย์อ่านผล</CardTitle>
              {(doctorData?.length ?? 0) > 0 && (
                <ChartExportMenu containerRef={doctorChartRef} data={doctorData ?? []} title="จำนวนรายการที่แพทย์อ่านผล" />
              )}
            </CardHeader>
            <CardContent className="h-[320px]">
              {isDoctorLoading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : !doctorData || doctorData.length === 0 ? (
                <EmptyState title="ไม่มีข้อมูล" className="py-6" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={[...doctorData].reverse()}
                    margin={{ left: 120, right: 32, top: 4, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={(v: number) => v.toLocaleString()} />
                    <YAxis type="category" dataKey="doctorName" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={116} />
                    <Tooltip contentStyle={tooltipStyle} formatter={((v: unknown) => [Number(v).toLocaleString() + ' รายการ', 'จำนวนอ่านผล']) as never} />
                    <Bar dataKey="readCount" name="จำนวนอ่านผล" fill="hsl(var(--chart-1))" maxBarSize={20} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 5: Monthly orders */}
      <div className="grid gap-6 grid-cols-12">
        <div className="col-span-12" ref={monthlyChartRef}>
          <Card className="card-shadow">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>จำนวนการสั่งเอกซเรย์แต่ละเดือน</CardTitle>
                <CardDescription>
                  {monthlyChartData.length > 0
                    ? `ย้อนหลัง 12 เดือน (รวม ${totalMonthlyOrders.toLocaleString()} รายการ)`
                    : 'ไม่มีข้อมูล'}
                </CardDescription>
              </div>
              {monthlyChartData.length > 0 && (
                <ChartExportMenu
                  containerRef={monthlyChartRef}
                  data={monthlyChartData}
                  title="จำนวนการสั่งเอกซเรย์แต่ละเดือนย้อนหลัง 12 เดือน"
                />
              )}
            </CardHeader>
            <CardContent className="h-[320px]">
              {isMonthlyLoading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : monthlyChartData.every(item => item.orderCount === 0) ? (
                <EmptyState title="ไม่มีข้อมูล" className="py-6" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData} margin={{ left: 36, right: 8, top: 8, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                    <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      tickFormatter={(v: number) => v.toLocaleString()}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelFormatter={(label: unknown, payload: readonly unknown[]) => {
                        const typedPayload = payload as readonly { payload?: { monthKey?: string } }[]
                        const key = typedPayload?.[0]?.payload?.monthKey
                        return key ? formatMonthLabel(key) : String(label)
                      }}
                      formatter={((value: unknown) => [Number(value).toLocaleString() + ' รายการ', 'จำนวนใบสั่ง']) as never}
                    />
                    <Bar dataKey="orderCount" name="จำนวนใบสั่ง" fill="hsl(var(--chart-3))" radius={[6, 6, 0, 0]} maxBarSize={42} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
