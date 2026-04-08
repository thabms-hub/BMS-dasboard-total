// =============================================================================
// BMS Session KPI Dashboard - Visit Trends Page
// Diversified chart types for professional showcase
// =============================================================================

import { useCallback, useMemo, useRef, useState } from 'react'
import { usePersistentDateRange } from '@/hooks/usePersistentDateRange'
import { useBmsSessionContext } from '@/contexts/BmsSessionContext'
import { useQuery } from '@/hooks/useQuery'
import {
  getDailyVisitTrend,
  getDailyErVisitTrend,
  getMonthlyVisitSummary,
  getVisitsByDayOfWeek,
  getTopDepartmentsForRange,
  computeTrendSummary,
  getTopDiagnoses,
  getDeathSummary,
  getPatientExpenseSummary,
  getMedicationCostSummary,
  getPttypeByDay,
  getDeptByDay,
} from '@/services/kpiService'
import type { VisitTrend, DepartmentWorkload } from '@/types'
import { DateRangePicker } from '@/components/dashboard/DateRangePicker'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { ChartExportMenu } from '@/components/dashboard/ChartExportMenu'
import {
  TrendingUp,
  BarChart3,
  ArrowUp,
  ArrowDown,
  HeartPulse,
  FileText,
  Receipt,
  Pill,
  Download,
  RefreshCw,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

function exportCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const bom = '\uFEFF'
  const csv = bom + [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function formatMonthLabel(monthStr: string): string {
  try {
    const d = parseISO(monthStr + '-01')
    const thaiYear = d.getFullYear() + 543
    return format(d, 'MMM', { locale: th }) + ' ' + thaiYear
  } catch {
    return monthStr
  }
}

function formatDateLabel(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'd MMM', { locale: th })
  } catch {
    return dateStr
  }
}

function formatLargeNumber(value: number): string {
  if (value >= 100_000_000) {
    return `${(value / 1_000_000).toFixed(0)}M`
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }
  return value.toLocaleString()
}

const iconColorMap: Record<string, string> = {
  blue:   'bg-blue-200 text-blue-700 dark:bg-blue-600/40 dark:text-blue-300',
  green:  'bg-green-200 text-green-700 dark:bg-green-600/40 dark:text-green-300',
  red:    'bg-red-200 text-red-700 dark:bg-red-600/40 dark:text-red-300',
  amber:  'bg-amber-200 text-amber-700 dark:bg-amber-600/40 dark:text-amber-300',
  purple: 'bg-purple-200 text-purple-700 dark:bg-purple-600/40 dark:text-purple-300',
  teal:   'bg-teal-200 text-teal-700 dark:bg-teal-600/40 dark:text-teal-300',
  orange: 'bg-orange-200 text-orange-700 dark:bg-orange-600/40 dark:text-orange-300',
}

export default function Trends() {
  const { connectionConfig, session } = useBmsSessionContext()

  const { startDate, endDate, setRange: handleRangeChange } = usePersistentDateRange('trends', 30)

  const isReady = connectionConfig !== null && session !== null

  // --- Existing Queries ---
  const { data: dailyData, isLoading: isDailyLoading, isError: isDailyError, error: dailyError, execute: refetchDaily } =
    useQuery<VisitTrend[]>({
      queryFn: useCallback(() => getDailyVisitTrend(connectionConfig!, session!.databaseType, startDate, endDate), [connectionConfig, session, startDate, endDate]),
      enabled: isReady,
    })

  const { data: erDailyData, isLoading: isErDailyLoading, execute: refetchErDaily } =
    useQuery<{ date: string; erCount: number }[]>({
      queryFn: useCallback(() => getDailyErVisitTrend(connectionConfig!, session!.databaseType, startDate, endDate), [connectionConfig, session, startDate, endDate]),
      enabled: isReady,
    })

  const { data: dowData, isLoading: isDowLoading, isError: isDowError, error: dowError, execute: refetchDow } =
    useQuery<{ dayOfWeek: number; dayName: string; visitCount: number }[]>({
      queryFn: useCallback(() => getVisitsByDayOfWeek(connectionConfig!, session!.databaseType, startDate, endDate), [connectionConfig, session, startDate, endDate]),
      enabled: isReady,
    })

  const { data: topDeptsData, isLoading: isTopDeptsLoading, isError: isTopDeptsError, error: topDeptsError, execute: refetchTopDepts } =
    useQuery<DepartmentWorkload[]>({
      queryFn: useCallback(() => getTopDepartmentsForRange(connectionConfig!, session!.databaseType, startDate, endDate), [connectionConfig, session, startDate, endDate]),
      enabled: isReady,
    })

  const { data: monthlyData, isLoading: isMonthlyLoading } =
    useQuery<{ month: string; visitCount: number }[]>({
      queryFn: useCallback(() => getMonthlyVisitSummary(connectionConfig!, session!.databaseType), [connectionConfig, session]),
      enabled: isReady,
    })

  // --- New Queries: Diagnosis, Death, Pttype, Department ---
  const { data: topDiagnosesData, isLoading: isDiagnosesLoading, isError: isDiagnosesError, error: diagnosesError, execute: refetchDiagnoses } =
    useQuery<{ name: string; cc: number }[]>({
      queryFn: useCallback(() => getTopDiagnoses(connectionConfig!, session!.databaseType, startDate, endDate), [connectionConfig, session, startDate, endDate]),
      enabled: isReady,
    })

  const { data: pttypeData, isLoading: isPttypeLoading, isError: isPttypeError, error: pttypeError, execute: refetchPttype } =
    useQuery<{ date: string; groupName: string; visitCount: number }[]>({
      queryFn: useCallback(() => getPttypeByDay(connectionConfig!, startDate, endDate), [connectionConfig, startDate, endDate]),
      enabled: isReady,
    })

  const { data: deptRangeData, isLoading: isDeptRangeLoading, isError: isDeptRangeError, error: deptRangeError, execute: refetchDeptRange } =
    useQuery<{ date: string; departmentName: string; visitCount: number }[]>({
      queryFn: useCallback(() => getDeptByDay(connectionConfig!, session!.databaseType, startDate, endDate), [connectionConfig, session, startDate, endDate]),
      enabled: isReady,
    })

  const { data: medCostData, isLoading: isMedCostLoading, isError: isMedCostError, error: medCostError, execute: refetchMedCost } =
    useQuery<{ totalItems: number; totalCost: number; uniqueDrugs: number }>({
      queryFn: useCallback(() => getMedicationCostSummary(connectionConfig!, session!.databaseType, startDate, endDate), [connectionConfig, session, startDate, endDate]),
      enabled: isReady,
    })

  const { data: deathData, isLoading: isDeathLoading } =
    useQuery<Awaited<ReturnType<typeof getDeathSummary>>>({
      queryFn: useCallback(() => getDeathSummary(connectionConfig!, session!.databaseType), [connectionConfig, session]),
      enabled: isReady,
    })

  const { data: patientExpense, isLoading: isPatientExpenseLoading, isError: isPatientExpenseError, error: patientExpenseError, execute: refetchPatientExpense } =
    useQuery<{ totalExpense: number; totalPatients: number }>({
      queryFn: useCallback(() => getPatientExpenseSummary(connectionConfig!, session!.databaseType, startDate, endDate), [connectionConfig, session, startDate, endDate]),
      enabled: isReady,
    })

  const trendSummary = useMemo(() => computeTrendSummary(dailyData ?? []), [dailyData])

  const minDay = useMemo(() => {
    const days = (dailyData ?? []).filter(d => d.visitCount > 0)
    if (days.length === 0) return null
    return days.reduce((min, d) => d.visitCount < min.visitCount ? d : min)
  }, [dailyData])

  const mergedDailyData = useMemo(() => {
    if (!dailyData) return []
    const erByDate = new Map((erDailyData ?? []).map(d => [d.date, d.erCount]))
    return dailyData.map(d => ({ date: d.date, visitCount: d.visitCount, erCount: erByDate.get(d.date) ?? 0 }))
  }, [dailyData, erDailyData])

  const [hiddenDailySeries, setHiddenDailySeries] = useState<Set<string>>(new Set())
  const handleDailyLegendClick = useCallback((e: { dataKey?: string }) => {
    const key = e.dataKey
    if (!key) return
    setHiddenDailySeries((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

  const dailyChartRef = useRef<HTMLDivElement>(null)
  const dowChartRef = useRef<HTMLDivElement>(null)
  const topDeptsRef = useRef<HTMLDivElement>(null)
  const diagnosesRef = useRef<HTMLDivElement>(null)
  const monthlyChartRef = useRef<HTMLDivElement>(null)

  const tooltipStyle = {
    borderRadius: '8px',
    border: '1px solid hsl(var(--border))',
    backgroundColor: 'hsl(var(--popover))',
    color: 'hsl(var(--popover-foreground))',
    fontSize: '12px',
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* 1. Header + DateRangePicker */}
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold tracking-tight">แนวโน้มการเข้ารับบริการ</h1>
        <DateRangePicker startDate={startDate} endDate={endDate} onRangeChange={handleRangeChange} isLoading={isDailyLoading} />
      </div>

      {isDailyError && dailyError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{dailyError.message || 'ไม่สามารถโหลดข้อมูลแนวโน้มได้'}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={refetchDaily}>ลองอีกครั้ง</Button>
        </div>
      )}

      {/* 2. Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {([
          { label: 'จำนวนการเข้ารับบริการทั้งหมด', desc: `จำนวนวันที่เลือก ${trendSummary.totalDays} วัน`, displayValue: formatLargeNumber(trendSummary.totalVisits), rawNumber: trendSummary.totalVisits, icon: TrendingUp, color: 'blue', loading: isDailyLoading, isError: isDailyError, error: dailyError, refetch: refetchDaily },
          { label: 'เฉลี่ยต่อวัน', desc: `${trendSummary.totalVisits.toLocaleString()} ราย / ${trendSummary.daysWithVisits} วัน`, displayValue: formatLargeNumber(trendSummary.avgDailyVisits), rawNumber: trendSummary.avgDailyVisits, icon: BarChart3, color: 'green', loading: isDailyLoading, isError: isDailyError, error: dailyError, refetch: refetchDaily },
          { label: 'วันที่มีผู้รับบริการมากสุด', desc: trendSummary.peakDay?.date ? format(parseISO(trendSummary.peakDay.date), 'd MMM yyyy', { locale: th }) : '-', displayValue: formatLargeNumber(trendSummary.peakDay?.count ?? 0), rawNumber: trendSummary.peakDay?.count ?? 0, icon: ArrowUp, color: 'red', loading: isDailyLoading, isError: isDailyError, error: dailyError, refetch: refetchDaily },
          { label: 'วันที่มีผู้รับบริการน้อยสุด', desc: minDay?.date ? format(parseISO(minDay.date), 'd MMM yyyy', { locale: th }) : '-', displayValue: formatLargeNumber(minDay?.visitCount ?? 0), rawNumber: minDay?.visitCount ?? 0, icon: ArrowDown, color: 'purple', loading: isDailyLoading, isError: isDailyError, error: dailyError, refetch: refetchDaily },
          { label: 'ค่าใช้จ่ายผู้ป่วยทั้งหมด', desc: '', displayValue: formatLargeNumber(patientExpense?.totalExpense ?? 0), rawNumber: patientExpense?.totalExpense ?? 0, isCurrency: true, icon: Receipt, color: 'teal', loading: isPatientExpenseLoading, isError: isPatientExpenseError, error: patientExpenseError, refetch: refetchPatientExpense },
          { label: 'ค่ายาทั้งหมด', desc: `${(medCostData?.uniqueDrugs ?? 0).toLocaleString()} รายการยา`, displayValue: formatLargeNumber(medCostData?.totalCost ?? 0), rawNumber: medCostData?.totalCost ?? 0, isCurrency: true, icon: Pill, color: 'orange', loading: isMedCostLoading, isError: isMedCostError, error: medCostError, refetch: refetchMedCost },
        ] as const).map((card) => (
          <Card key={card.label} className="card-shadow-hover px-4 pt-3 pb-4">
            <CardContent className="p-0 flex flex-col gap-2">
              {card.loading ? (
                <Skeleton className="h-20 w-full" />
              ) : card.isError ? (
                <div className="flex flex-col items-center gap-2 py-1">
                  <p className="text-xs text-destructive text-center leading-snug">{card.error?.message ?? 'โหลดข้อมูลไม่สำเร็จ'}</p>
                  <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={card.refetch}>
                    <RefreshCw className="h-3 w-3" /> ลองอีกครั้ง
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconColorMap[card.color]}`}>
                        <card.icon className="h-4 w-4" />
                      </div>
                      <p className="text-xs font-medium text-muted-foreground leading-snug">{card.label}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-50 hover:opacity-100" title="ส่งออก CSV"
                      onClick={() => exportCsv(`${card.label}.csv`, [card.label, 'ค่า'], [[card.label, card.rawNumber]])}>
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                  {'isCurrency' in card && card.isCurrency ? (
                    <div className="flex items-end justify-center gap-1 py-1">
                      <p className="text-3xl font-bold text-foreground">{card.displayValue}</p>
                      <span className="text-sm text-muted-foreground mb-0.5">บาท</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-1">
                      <p className="text-3xl font-bold text-foreground">{card.displayValue}</p>
                    </div>
                  )}
                  {card.desc && <p className="text-xs text-muted-foreground text-center">{card.desc}</p>}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3. Daily Trend — AREA CHART dual series */}
      <Card ref={dailyChartRef} className="card-shadow">
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-sm font-medium">แนวโน้มการเข้ารับบริการรายวัน</CardTitle>
            <CardDescription>OPD ทั้งหมด และแผนกฉุกเฉิน (ER) ในช่วงวันที่เลือก</CardDescription>
          </div>
          <ChartExportMenu containerRef={dailyChartRef} data={mergedDailyData} title="แนวโน้มการเข้ารับบริการรายวัน" />
        </CardHeader>
        <CardContent>
          {isDailyError ? (
            <div className="flex flex-col items-center justify-center gap-4 py-6">
              <EmptyState title="ไม่สามารถโหลดข้อมูลแนวโน้มได้" description={dailyError?.message} />
              <Button variant="outline" size="sm" onClick={refetchDaily} className="gap-2">
                <RefreshCw className="h-4 w-4" /> ลองอีกครั้ง
              </Button>
            </div>
          ) : isDailyLoading || isErDailyLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : !dailyData || dailyData.length === 0 ? (
            <EmptyState title="ไม่มีข้อมูลการเข้ารับบริการ" />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={mergedDailyData}>
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="erAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tickFormatter={formatDateLabel} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  labelFormatter={((label: unknown) => formatDateLabel(String(label))) as never}
                  formatter={((value: unknown, name: unknown) => {
                    const label = String(name) === 'erCount' ? 'ฉุกเฉิน (ER)' : 'OPD'
                    return [Number(value).toLocaleString() + ' ราย', label]
                  }) as never}
                  contentStyle={tooltipStyle}
                />
                <Legend
                  onClick={(entry) => handleDailyLegendClick({ dataKey: String(entry.dataKey ?? '') })}
                  wrapperStyle={{ fontSize: 12, cursor: 'pointer' }}
                  formatter={(value, entry) => {
                    const key = String((entry as { dataKey?: unknown }).dataKey ?? value)
                    const hidden = hiddenDailySeries.has(key)
                    return (
                      <span style={{ opacity: hidden ? 0.4 : 1 }}>
                        {value === 'erCount' ? 'ฉุกเฉิน (ER)' : 'OPD'}
                      </span>
                    )
                  }}
                />
                <Area type="monotone" dataKey="visitCount" name="visitCount" hide={hiddenDailySeries.has('visitCount')} stroke="hsl(var(--chart-1))" strokeWidth={2.5} fill="url(#areaGradient)" dot={{ r: 3, fill: 'hsl(var(--chart-1))', strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="erCount" name="erCount" hide={hiddenDailySeries.has('erCount')} stroke="hsl(var(--chart-4))" strokeWidth={2} fill="url(#erAreaGradient)" dot={{ r: 3, fill: 'hsl(var(--chart-4))', strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 4. 12-col: Radar (3) + TOP10 (3) + กลุ่มโรค (6) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Day of week — RADAR CHART (col-3) */}
        <Card ref={dowChartRef} className="card-shadow lg:col-span-3">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-sm font-medium">การเข้ารับบริการตามวันในสัปดาห์</CardTitle>
              <CardDescription>รูปแบบการกระจายตัวแยกตามวัน</CardDescription>
            </div>
            <ChartExportMenu containerRef={dowChartRef} data={dowData ?? []} title="การเข้ารับบริการตามวันในสัปดาห์" />
          </CardHeader>
          <CardContent>
            {isDowError ? (
              <div className="flex flex-col items-center justify-center gap-4 py-6">
                <EmptyState title="ไม่สามารถโหลดข้อมูลได้" description={dowError?.message} />
                <Button variant="outline" size="sm" onClick={refetchDow} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> ลองอีกครั้ง
                </Button>
              </div>
            ) : isDowLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : !dowData || dowData.length === 0 ? (
              <EmptyState title="ไม่มีข้อมูลแยกตามวัน" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={dowData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid strokeDasharray="3 3" className="stroke-muted" />
                  <PolarAngleAxis dataKey="dayName" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <PolarRadiusAxis tick={{ fontSize: 9 }} />
                  <Tooltip
                    formatter={((value: unknown) => [Number(value).toLocaleString(), 'ราย']) as never}
                    contentStyle={tooltipStyle}
                  />
                  <Radar dataKey="visitCount" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.25} strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--chart-2))' }} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* TOP10 จุดบริการแรกรับ (col-3) */}
        <Card ref={topDeptsRef} className="card-shadow lg:col-span-3">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-sm font-medium">TOP10 จุดบริการแรกรับ</CardTitle>
              <CardDescription>เรียงตามจำนวนผู้เข้ารับบริการ (ตามที่ส่งตรวจ)</CardDescription>
            </div>
            <ChartExportMenu containerRef={topDeptsRef} data={topDeptsData ?? []} title="TOP10 จุดบริการแรกรับ" />
          </CardHeader>
          <CardContent>
            {isTopDeptsError ? (
              <div className="flex flex-col items-center justify-center gap-4 py-6">
                <EmptyState title="ไม่สามารถโหลดข้อมูลได้" description={topDeptsError?.message} />
                <Button variant="outline" size="sm" onClick={refetchTopDepts} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> ลองอีกครั้ง
                </Button>
              </div>
            ) : isTopDeptsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded-full shrink-0" />
                    <Skeleton className="h-3 flex-1" />
                    <Skeleton className="h-3 w-10 shrink-0" />
                  </div>
                ))}
              </div>
            ) : !topDeptsData || topDeptsData.length === 0 ? (
              <EmptyState title="ไม่มีข้อมูลแผนก" />
            ) : (
              <div className="space-y-1.5">
                {topDeptsData.slice(0, 10).map((dept, index) => (
                  <div key={dept.departmentCode || dept.departmentName} className="flex items-center gap-2">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                      {index + 1}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium">{dept.departmentName}</span>
                    <span className="shrink-0 text-xs font-semibold text-muted-foreground">{dept.visitCount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* กลุ่มโรคที่พบบ่อย (col-6) */}
        <Card ref={diagnosesRef} className="card-shadow lg:col-span-6">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                กลุ่มโรคที่พบบ่อย
              </CardTitle>
              <CardDescription>10 กลุ่มโรค (ICD10) ที่มีการวินิจฉัยมากที่สุดในช่วงเวลาที่เลือก</CardDescription>
            </div>
            <ChartExportMenu containerRef={diagnosesRef} data={topDiagnosesData ?? []} title="กลุ่มโรคที่พบบ่อย" />
          </CardHeader>
          <CardContent>
            {isDiagnosesError ? (
              <div className="flex flex-col items-center justify-center gap-4 py-6">
                <EmptyState title="ไม่สามารถโหลดข้อมูลได้" description={diagnosesError?.message} />
                <Button variant="outline" size="sm" onClick={refetchDiagnoses} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> ลองอีกครั้ง
                </Button>
              </div>
            ) : isDiagnosesLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : !topDiagnosesData || topDiagnosesData.length === 0 ? (
              <EmptyState title="ไม่มีข้อมูลการวินิจฉัย" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topDiagnosesData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={180}
                    tickFormatter={(value: string) => value.length > 26 ? `${value.slice(0, 26)}...` : value}
                  />
                  <Tooltip
                    cursor={false}
                    formatter={((value: unknown) => [Number(value).toLocaleString(), 'ราย']) as never}
                    labelFormatter={(label: unknown) => String(label)}
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="cc" fill="hsl(var(--chart-1))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5. OPD by pttype (สิทธิ์การรักษา) — Horizontal Bar + right legend */}
      <PttypeBarCard
        data={pttypeData ?? []}
        isLoading={isPttypeLoading}
        isError={isPttypeError}
        error={pttypeError}
        onRetry={refetchPttype}
        tooltipStyle={tooltipStyle}
      />

      {/* 6. 12-col: แผนก (col-8) + รายเดือน (col-4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* แผนก col-8 */}
        <DeptRangeCard
          data={deptRangeData ?? []}
          isLoading={isDeptRangeLoading}
          isError={isDeptRangeError}
          error={deptRangeError}
          onRetry={refetchDeptRange}
          tooltipStyle={tooltipStyle}
          className="lg:col-span-8"
        />

        {/* รายเดือน col-4 */}
        <Card ref={monthlyChartRef} className="card-shadow lg:col-span-4 flex flex-col">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-sm font-medium">สรุปการเข้ารับบริการรายเดือน</CardTitle>
              <CardDescription>เดือนปัจจุบัน ย้อนหลัง 6 เดือน</CardDescription>
            </div>
            <ChartExportMenu containerRef={monthlyChartRef} data={monthlyData ?? []} title="สรุปการเข้ารับบริการรายเดือน" />
          </CardHeader>
          <CardContent className="flex-1 flex flex-col pb-4">
            {isMonthlyLoading ? <Skeleton className="flex-1 min-h-[220px] w-full" /> :
             !monthlyData || monthlyData.length === 0 ? <EmptyState title="ไม่มีข้อมูลรายเดือน" /> : (
              <div className="flex-1 min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData.slice(-7)} margin={{ left: 0, right: 4, top: 4, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                    <XAxis dataKey="month" tickFormatter={formatMonthLabel} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} angle={-30} textAnchor="end" height={44} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={(v: number) => v.toLocaleString()} />
                    <Tooltip
                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                      labelFormatter={(label: unknown) => formatMonthLabel(String(label))}
                      formatter={((value: unknown) => [Number(value).toLocaleString(), 'ราย']) as never}
                      contentStyle={tooltipStyle}
                    />
                    <Bar dataKey="visitCount" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 7. สถิติการเสียชีวิต — Death Statistics */}
      <div className="rounded-xl overflow-hidden shadow-md border border-rose-100 dark:border-slate-700">
        <div className="bg-gradient-to-r from-rose-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-6 py-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 ring-1 ring-rose-200 dark:bg-rose-500/20 dark:ring-rose-400/40">
            <HeartPulse className="h-5 w-5 text-rose-500 dark:text-rose-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">สถิติการเสียชีวิต</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">ข้อมูลสรุปจำนวนผู้เสียชีวิตจากฐานข้อมูล</p>
          </div>
        </div>
        <div className="grid grid-cols-5 divide-x divide-slate-200 dark:divide-slate-700/50 bg-gradient-to-r from-white to-slate-50 dark:from-slate-950 dark:to-slate-900">
          {isDeathLoading ? (
            <div className="col-span-5 p-6"><Skeleton className="h-24 w-full" /></div>
          ) : (() => {
            const calcPct = (cur: number, prev: number) => {
              if (prev === 0) return cur > 0 ? null : 0
              return Math.round(((cur - prev) / prev) * 1000) / 10
            }
            const yearPct  = calcPct(deathData?.thisYearDeaths ?? 0, deathData?.lastYearDeaths ?? 0)
            const monthPct = calcPct(deathData?.thisMonthDeaths ?? 0, deathData?.lastMonthDeaths ?? 0)
            const PctBadge = ({ pct }: { pct: number | null }) => {
              if (pct === null) return <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-400">ไม่มีข้อมูล</span>
              if (pct === 0)    return <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-500">0%</span>
              return pct > 0
                ? <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400"><ArrowUp className="h-3 w-3" />+{pct}%</span>
                : <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><ArrowDown className="h-3 w-3" />{pct}%</span>
            }
            return (
              <>
                {/* Col 1: จำนวนทั้งหมด */}
                <div className="flex flex-col items-center justify-center gap-1 py-6 bg-gradient-to-b from-slate-50 to-white">
                  <p className="text-[10px] text-slate-500 tracking-wide uppercase font-medium">จำนวนทั้งหมด</p>
                  <p className="text-3xl font-bold tabular-nums text-slate-700">{(deathData?.totalDeaths ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-slate-400">ราย</p>
                </div>
                {/* Col 2: ปีก่อน */}
                <div className="flex flex-col items-center justify-center gap-1 py-6 bg-gradient-to-b from-slate-50 to-white">
                  <p className="text-[10px] text-slate-500 tracking-wide uppercase font-medium">ปีก่อน</p>
                  <p className="text-3xl font-bold tabular-nums text-slate-500">{(deathData?.lastYearDeaths ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-slate-400">ราย (ช่วงเดียวกัน)</p>
                </div>
                {/* Col 3: ปีนี้ + เปรียบเทียบ */}
                <div className="flex flex-col items-center justify-center gap-1 py-6 bg-gradient-to-b from-amber-50 to-white">
                  <p className="text-[10px] text-amber-600 tracking-wide uppercase font-medium">ปีนี้</p>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-3xl font-bold tabular-nums text-amber-600">{(deathData?.thisYearDeaths ?? 0).toLocaleString()}</p>
                    <PctBadge pct={yearPct} />
                  </div>
                  <p className="text-xs text-slate-400">ราย</p>
                </div>
                {/* Col 4: เดือนก่อน */}
                <div className="flex flex-col items-center justify-center gap-1 py-6 bg-gradient-to-b from-slate-50 to-white">
                  <p className="text-[10px] text-slate-500 tracking-wide uppercase font-medium">เดือนก่อน</p>
                  <p className="text-3xl font-bold tabular-nums text-slate-500">{(deathData?.lastMonthDeaths ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-slate-400">ราย</p>
                </div>
                {/* Col 5: เดือนนี้ + เปรียบเทียบ */}
                <div className="flex flex-col items-center justify-center gap-1 py-6 bg-gradient-to-b from-rose-50 to-white">
                  <p className="text-[10px] text-rose-600 tracking-wide uppercase font-medium">เดือนนี้</p>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-3xl font-bold tabular-nums text-rose-600">{(deathData?.thisMonthDeaths ?? 0).toLocaleString()}</p>
                    <PctBadge pct={monthPct} />
                  </div>
                  <p className="text-xs text-slate-400">ราย</p>
                </div>
              </>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pttype Stacked Bar Card — OPD visits by date, stacked by สิทธิ์การรักษา
// ---------------------------------------------------------------------------
const PTTYPE_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#a78bfa',
  '#f59e0b',
  '#10b981',
]

interface PttypeBarCardProps {
  data: { date: string; groupName: string; visitCount: number }[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  onRetry: () => void
  tooltipStyle: React.CSSProperties
}

function PttypeBarCard({ data, isLoading, isError, error, onRetry, tooltipStyle }: PttypeBarCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  const toggleGroup = useCallback((name: string) => {
    setHidden(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }, [])

  // Collect unique groups ordered by total desc
  const groups = useMemo(() => {
    const totals = new Map<string, number>()
    data.forEach(d => totals.set(d.groupName, (totals.get(d.groupName) ?? 0) + d.visitCount))
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)
  }, [data])

  // Pivot: date → { date, [groupName]: visitCount, ... }
  const chartData = useMemo(() => {
    const byDate = new Map<string, Record<string, number>>()
    data.forEach(d => {
      if (!byDate.has(d.date)) byDate.set(d.date, {})
      byDate.get(d.date)![d.groupName] = d.visitCount
    })
    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date, ...vals }))
  }, [data])

  return (
    <Card ref={cardRef} className="card-shadow">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-medium">การเข้ารับบริการ OPD แยกตามกลุ่มสิทธิ์การรักษา</CardTitle>
          <CardDescription>คิดตามสิทธิหลักที่มารับบริการ</CardDescription>
        </div>
        <ChartExportMenu containerRef={cardRef} data={data} title="การเข้ารับบริการแยกตามกลุ่มสิทธิ์" />
      </CardHeader>
      <CardContent>
        {isError ? (
          <div className="flex flex-col items-center justify-center gap-4 py-6">
            <EmptyState title="ไม่สามารถโหลดข้อมูลได้" description={error?.message} />
            <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
              <RefreshCw className="h-4 w-4" /> ลองอีกครั้ง
            </Button>
          </div>
        ) : isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : data.length === 0 ? (
          <EmptyState title="ไม่มีข้อมูลสิทธิ์การรักษา" />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ left: 36, right: 8, top: 4, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatDateLabel} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} angle={-30} textAnchor="end" height={44} label={{ value: 'วันที่', position: 'insideBottomRight', offset: 0, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={(v: number) => v.toLocaleString()} label={{ value: 'จำนวนราย', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  contentStyle={tooltipStyle}
                  labelFormatter={(label: unknown) => formatDateLabel(String(label))}
                  formatter={((value: unknown, name: unknown) => [Number(value).toLocaleString() + ' ราย', String(name)]) as never}
                />
                {groups.map((group, i) => (
                  <Bar key={group} dataKey={group} stackId="a" fill={PTTYPE_COLORS[i % PTTYPE_COLORS.length]} hide={hidden.has(group)} maxBarSize={48} />
                ))}
              </BarChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 px-1">
              {groups.map((g, i) => (
                <button
                  key={g}
                  onClick={() => toggleGroup(g)}
                  className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
                  style={{ opacity: hidden.has(g) ? 0.35 : 1, cursor: 'pointer' }}
                >
                  <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: PTTYPE_COLORS[i % PTTYPE_COLORS.length] }} />
                  <span className="text-xs leading-tight">{g}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// DeptRange Stacked Bar Card — OPD visits by date, stacked by department (col-8)
// ---------------------------------------------------------------------------
const DEPT_COLORS = [
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-1))',
  '#a78bfa',
  '#f59e0b',
  '#10b981',
  '#f43f5e',
  '#0ea5e9',
]

interface DeptRangeCardProps {
  data: { date: string; departmentName: string; visitCount: number }[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  onRetry: () => void
  tooltipStyle: React.CSSProperties
  className?: string
}

function DeptRangeCard({ data, isLoading, isError, error, onRetry, tooltipStyle, className }: DeptRangeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  const toggleGroup = useCallback((name: string) => {
    setHidden(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }, [])

  // Top 10 departments by total across all dates
  const top10Depts = useMemo(() => {
    const totals = new Map<string, number>()
    data.forEach(d => totals.set(d.departmentName, (totals.get(d.departmentName) ?? 0) + d.visitCount))
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name]) => name)
  }, [data])

  // Pivot: date → { date, [dept]: visitCount, ... } — only top10 depts
  const chartData = useMemo(() => {
    const deptSet = new Set(top10Depts)
    const byDate = new Map<string, Record<string, number>>()
    data.forEach(d => {
      if (!deptSet.has(d.departmentName)) return
      if (!byDate.has(d.date)) byDate.set(d.date, {})
      byDate.get(d.date)![d.departmentName] = d.visitCount
    })
    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date, ...vals }))
  }, [data, top10Depts])

  return (
    <Card ref={cardRef} className={`card-shadow ${className ?? ''}`}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-medium">การเข้ารับบริการแยกตามแผนก</CardTitle>
          <CardDescription>ข้อมูลตามแผนกที่ส่งตรวจ</CardDescription>
        </div>
        <ChartExportMenu containerRef={cardRef} data={data} title="การเข้ารับบริการแยกตามแผนก" />
      </CardHeader>
      <CardContent>
        {isError ? (
          <div className="flex flex-col items-center justify-center gap-4 py-6">
            <EmptyState title="ไม่สามารถโหลดข้อมูลได้" description={error?.message} />
            <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
              <RefreshCw className="h-4 w-4" /> ลองอีกครั้ง
            </Button>
          </div>
        ) : isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : chartData.length === 0 ? (
          <EmptyState title="ไม่มีข้อมูลแผนก" />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ left: 36, right: 8, top: 4, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatDateLabel} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} angle={-30} textAnchor="end" height={44} label={{ value: 'วันที่', position: 'insideBottomRight', offset: 0, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={(v: number) => v.toLocaleString()} label={{ value: 'จำนวนราย', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  contentStyle={tooltipStyle}
                  labelFormatter={(label: unknown) => formatDateLabel(String(label))}
                  formatter={((value: unknown, name: unknown) => [Number(value).toLocaleString() + ' ราย', String(name)]) as never}
                />
                {top10Depts.map((dept, i) => (
                  <Bar key={dept} dataKey={dept} stackId="a" fill={DEPT_COLORS[i % DEPT_COLORS.length]} hide={hidden.has(dept)} maxBarSize={48} />
                ))}
              </BarChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 px-1">
              {top10Depts.map((dept, i) => (
                <button
                  key={dept}
                  onClick={() => toggleGroup(dept)}
                  className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
                  style={{ opacity: hidden.has(dept) ? 0.35 : 1, cursor: 'pointer' }}
                >
                  <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                  <span className="text-xs leading-tight">{dept}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
