// =============================================================================
// BMS Session KPI Dashboard - Visit Trends Page
// Diversified chart types for professional showcase
// =============================================================================

import { useState, useCallback, useMemo } from 'react'
import { usePersistentDateRange } from '@/hooks/usePersistentDateRange'
import { useBmsSessionContext } from '@/contexts/BmsSessionContext'
import { useQuery } from '@/hooks/useQuery'
import {
  getDailyVisitTrend,
  getHourlyDistribution,
  getMonthlyVisitSummary,
  getVisitsByDayOfWeek,
  getTopDepartmentsForRange,
  computeTrendSummary,
  getTopDiagnoses,
  getTopMedications,
  getMedicationCostSummary,
  getDeathSummary,
  getPatientExpenseSummary,
} from '@/services/kpiService'
import type { VisitTrend, HourlyDistribution, DepartmentWorkload } from '@/types'
import { DateRangePicker } from '@/components/dashboard/DateRangePicker'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/dashboard/EmptyState'
import {
  TrendingUp,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Pill,
  Banknote,
  Package,
  HeartPulse,
  FileText,
  Receipt,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

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

  const { startDate, endDate, setRange } = usePersistentDateRange('trends', 30)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)


  const isReady = connectionConfig !== null && session !== null

  // --- Existing Queries ---
  const { data: dailyData, isLoading: isDailyLoading, isError: isDailyError, error: dailyError, execute: refetchDaily } =
    useQuery<VisitTrend[]>({
      queryFn: useCallback(() => getDailyVisitTrend(connectionConfig!, session!.databaseType, startDate, endDate), [connectionConfig, session, startDate, endDate]),
      enabled: isReady,
    })

  const { data: hourlyData, isLoading: isHourlyLoading, reset: resetHourly } =
    useQuery<HourlyDistribution[]>({
      queryFn: useCallback(() => getHourlyDistribution(connectionConfig!, session!.databaseType, selectedDate!), [connectionConfig, session, selectedDate]),
      enabled: isReady && selectedDate !== null,
    })

  const { data: dowData, isLoading: isDowLoading } =
    useQuery<{ dayOfWeek: number; dayName: string; visitCount: number }[]>({
      queryFn: useCallback(() => getVisitsByDayOfWeek(connectionConfig!, session!.databaseType, startDate, endDate), [connectionConfig, session, startDate, endDate]),
      enabled: isReady,
    })

  const { data: topDeptsData, isLoading: isTopDeptsLoading } =
    useQuery<DepartmentWorkload[]>({
      queryFn: useCallback(() => getTopDepartmentsForRange(connectionConfig!, session!.databaseType, startDate, endDate), [connectionConfig, session, startDate, endDate]),
      enabled: isReady,
    })

  const { data: monthlyData, isLoading: isMonthlyLoading } =
    useQuery<{ month: string; visitCount: number }[]>({
      queryFn: useCallback(() => getMonthlyVisitSummary(connectionConfig!, session!.databaseType), [connectionConfig, session]),
      enabled: isReady,
    })

  // --- New Queries: Diagnosis, Medications, Death ---
  const { data: topDiagnosesData, isLoading: isDiagnosesLoading } =
    useQuery<{ name: string; cc: number }[]>({
      queryFn: useCallback(() => getTopDiagnoses(connectionConfig!, session!.databaseType, startDate, endDate), [connectionConfig, session, startDate, endDate]),
      enabled: isReady,
    })

  const { data: topMedsData, isLoading: isMedsLoading } =
    useQuery<{ drugName: string; totalQty: number; totalCost: number }[]>({
      queryFn: useCallback(() => getTopMedications(connectionConfig!, session!.databaseType, startDate, endDate), [connectionConfig, session, startDate, endDate]),
      enabled: isReady,
    })

  const { data: medCostSummary, isLoading: isMedCostLoading } =
    useQuery<{ totalItems: number; totalCost: number; uniqueDrugs: number }>({
      queryFn: useCallback(() => getMedicationCostSummary(connectionConfig!, session!.databaseType, startDate, endDate), [connectionConfig, session, startDate, endDate]),
      enabled: isReady,
    })

  const { data: deathData, isLoading: isDeathLoading } =
    useQuery<{ totalDeaths: number; thisYearDeaths: number; thisMonthDeaths: number }>({
      queryFn: useCallback(() => getDeathSummary(connectionConfig!, session!.databaseType), [connectionConfig, session]),
      enabled: isReady,
    })


  const { data: patientExpense, isLoading: isPatientExpenseLoading } =
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

  const handleRangeChange = useCallback((newStart: string, newEnd: string) => {
    setRange(newStart, newEnd)
    setSelectedDate(null)
    resetHourly()
  }, [setRange, resetHourly])

  const handleDateClick = useCallback((date: string) => {
    setSelectedDate(date)
  }, [])

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

      {/* 2. Summary Cards — expanded from 4 to 6 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'จำนวนการเข้ารับบริการทั้งหมด', desc: `จำนวนวันที่เลือก ${trendSummary.totalDays} วัน`, value: trendSummary.totalVisits, icon: TrendingUp, color: 'blue', loading: isDailyLoading },
          { label: 'เฉลี่ยต่อวัน', desc: `จำนวน ${trendSummary.totalVisits.toLocaleString()} ราย / ${trendSummary.daysWithVisits} วัน`, value: trendSummary.avgDailyVisits, icon: BarChart3, color: 'green', loading: isDailyLoading },
          { label: 'วันที่มีผู้เข้ารับบริการมากที่สุด', desc: trendSummary.peakDay?.date ? format(parseISO(trendSummary.peakDay.date), 'd MMM yyyy', { locale: th }) : '-', value: trendSummary.peakDay?.count ?? 0, icon: ArrowUp, color: 'red', loading: isDailyLoading },
          { label: 'วันที่มีผู้เข้ารับบริการน้อยที่สุด', desc: minDay?.date ? format(parseISO(minDay.date), 'd MMM yyyy', { locale: th }) : '-', value: minDay?.visitCount ?? 0, icon: ArrowDown, color: 'purple', loading: isDailyLoading },
          { label: 'ค่าใช้จ่ายผู้ป่วยทั้งหมด', desc: '', value: `฿${formatLargeNumber(patientExpense?.totalExpense ?? 0)}`, icon: Receipt, color: 'teal', loading: isPatientExpenseLoading },
          { label: 'ค่ายาทั้งหมด', desc: '', value: `฿${formatLargeNumber(medCostSummary?.totalCost ?? 0)}`, icon: Pill, color: 'orange', loading: isMedCostLoading },
        ].map((card) => (
          <Card key={card.label} className="card-shadow-hover px-4 pt-3 pb-4">
            <CardContent className="p-0 flex flex-col gap-2">
              {card.loading ? <Skeleton className="h-20 w-full" /> : (
                <>
                  <div className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconColorMap[card.color]}`}>
                      <card.icon className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground leading-snug">{card.label}</p>
                  </div>
                  <div className="flex items-center justify-center py-1">
                    <p className="text-3xl font-bold text-foreground">{typeof card.value === 'number' ? formatLargeNumber(card.value) : card.value}</p>
                  </div>
                  {card.desc && <p className="text-xs text-muted-foreground text-center">{card.desc}</p>}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3. Daily Trend — AREA CHART + Hourly drill-down below */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-sm font-medium">แนวโน้มการเข้ารับบริการรายวัน</CardTitle>
          <CardDescription>
            {selectedDate
              ? `เลือกวันที่ ${formatDateLabel(selectedDate)} — ดูรายละเอียดรายชั่วโมงด้านล่าง`
              : 'คลิกที่จุดข้อมูลในกราฟเพื่อดูรายละเอียดรายชั่วโมง'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isDailyLoading ? <Skeleton className="h-[300px] w-full" /> :
           !dailyData || dailyData.length === 0 ? <EmptyState title="ไม่มีข้อมูลการเข้ารับบริการ" /> : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyData} style={{ cursor: 'pointer' }} onClick={(state: Record<string, unknown>) => {
                const payload = state?.activePayload as Array<{ payload: { date: string } }> | undefined
                if (payload?.[0]?.payload) handleDateClick(payload[0].payload.date)
              }}>
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tickFormatter={formatDateLabel} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  labelFormatter={((label: unknown) => formatDateLabel(String(label))) as never}
                  formatter={((value: unknown) => [Number(value).toLocaleString(), 'ครั้ง']) as never}
                  contentStyle={tooltipStyle}
                />
                <Area type="monotone" dataKey="visitCount" stroke="hsl(var(--chart-1))" strokeWidth={2.5} fill="url(#areaGradient)" dot={{ r: 4, fill: 'hsl(var(--chart-1))', strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 6, strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {/* Hourly drill-down — shown inline when a date is selected */}
          {selectedDate && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">รายละเอียดรายชั่วโมง — {formatDateLabel(selectedDate)}</p>
                <Button variant="outline" size="sm" onClick={() => { setSelectedDate(null); resetHourly() }}>ล้างการเลือก</Button>
              </div>
              {isHourlyLoading ? (
                <Skeleton className="h-[240px] w-full" />
              ) : !hourlyData || hourlyData.length === 0 ? (
                <EmptyState title="ไม่มีข้อมูลรายชั่วโมงสำหรับวันที่นี้" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="hour" tickFormatter={(h: number) => `${String(h).padStart(2,'0')}:00`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      cursor={false}
                      labelFormatter={((h: unknown) => `${String(Number(h)).padStart(2,'0')}:00`) as never}
                      formatter={((value: unknown) => [Number(value).toLocaleString(), 'ครั้ง']) as never}
                      contentStyle={tooltipStyle}
                    />
                    <Bar dataKey="visitCount" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. 12-col: Radar (2) + TOP10 (4) + กลุ่มโรค (6) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Day of week — RADAR CHART (col-3) */}
        <Card className="card-shadow lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-medium">การเข้ารับบริการตามวันในสัปดาห์</CardTitle>
            <CardDescription>รูปแบบการกระจายตัวแยกตามวัน</CardDescription>
          </CardHeader>
          <CardContent>
            {isDowLoading ? <Skeleton className="h-[280px] w-full" /> :
             !dowData || dowData.length === 0 ? <EmptyState title="ไม่มีข้อมูลแยกตามวัน" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={dowData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid strokeDasharray="3 3" className="stroke-muted" />
                  <PolarAngleAxis dataKey="dayName" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <PolarRadiusAxis tick={{ fontSize: 9 }} />
                  <Tooltip
                    formatter={((value: unknown) => [Number(value).toLocaleString(), 'ครั้ง']) as never}
                    contentStyle={tooltipStyle}
                  />
                  <Radar dataKey="visitCount" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.25} strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--chart-2))' }} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* TOP10 จุดบริการแรกรับ (col-3) — numbered list single page */}
        <Card className="card-shadow lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-medium">TOP10 จุดบริการแรกรับ</CardTitle>
            <CardDescription>เรียงตามจำนวนผู้เข้ารับบริการ (ตามที่ส่งตรวจ)</CardDescription>
          </CardHeader>
          <CardContent>
            {isTopDeptsLoading ? (
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
        <Card className="card-shadow lg:col-span-6">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              กลุ่มโรคที่พบบ่อย
            </CardTitle>
            <CardDescription>10 กลุ่มโรค (ICD10) ที่มีการวินิจฉัยมากที่สุดในช่วงเวลาที่เลือก</CardDescription>
          </CardHeader>
          <CardContent>
            {isDiagnosesLoading ? <Skeleton className="h-[300px] w-full" /> :
             !topDiagnosesData || topDiagnosesData.length === 0 ? <EmptyState title="ไม่มีข้อมูลการวินิจฉัย" /> : (
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
                    formatter={((value: unknown) => [Number(value).toLocaleString(), 'ครั้ง']) as never}
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

      {/* 8. ค่าใช้จ่ายยาและเวชภัณฑ์ — Medication Costs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: 3 mini stat cards */}
        <div className="flex flex-col gap-4">
          {[
            {
              label: 'จำนวนรายการยา',
              value: (medCostSummary?.totalItems ?? 0).toLocaleString(),
              icon: Pill,
              color: 'blue',
            },
            {
              label: 'ค่ายาทั้งหมด',
              value: `฿${formatLargeNumber(medCostSummary?.totalCost ?? 0)}`,
              icon: Banknote,
              color: 'orange',
            },
            {
              label: 'ชนิดยาที่ใช้',
              value: (medCostSummary?.uniqueDrugs ?? 0).toLocaleString(),
              icon: Package,
              color: 'purple',
            },
          ].map((stat) => (
            <Card key={stat.label} className="card-shadow-hover p-4">
              <CardContent className="p-0 flex items-center gap-3">
                {isMedCostLoading ? <Skeleton className="h-14 w-full" /> : (
                  <>
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-${stat.color}-100 text-${stat.color}-600 dark:bg-${stat.color}-900/30 dark:text-${stat.color}-400`}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                      <p className="text-lg font-bold">{stat.value}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Right: Top 10 medications by cost — Horizontal Bar */}
        <Card className="card-shadow lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Pill className="h-4 w-4" />
              ยาที่มีค่าใช้จ่ายสูงสุด
            </CardTitle>
            <CardDescription>10 รายการยาที่มีมูลค่าการใช้สูงสุดในช่วงเวลาที่เลือก</CardDescription>
          </CardHeader>
          <CardContent>
            {isMedsLoading ? <Skeleton className="h-[350px] w-full" /> :
             !topMedsData || topMedsData.length === 0 ? <EmptyState title="ไม่มีข้อมูลค่ายา" /> : (
              <ResponsiveContainer width="100%" height={Math.max(300, topMedsData.length * 40)}>
                <BarChart data={topMedsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tickFormatter={(value: number) => value.toLocaleString()}
                  />
                  <YAxis
                    dataKey="drugName"
                    type="category"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={180}
                    tickFormatter={(value: string) => value.length > 25 ? `${value.slice(0, 25)}...` : value}
                  />
                  <Tooltip
                    cursor={false}
                    formatter={((value: unknown, name: unknown) => {
                      if (String(name) === 'totalCost') return [`${Number(value).toLocaleString()} บาท`, 'ค่าใช้จ่าย']
                      return [Number(value).toLocaleString(), String(name)]
                    }) as never}
                    labelFormatter={(label: unknown) => String(label)}
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="totalCost" fill="hsl(var(--chart-3))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 6. Monthly summary — LINE CHART */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-sm font-medium">สรุปการเข้ารับบริการรายเดือน</CardTitle>
          <CardDescription>6 เดือนย้อนหลัง</CardDescription>
        </CardHeader>
        <CardContent>
          {isMonthlyLoading ? <Skeleton className="h-[220px] w-full" /> :
           !monthlyData || monthlyData.length === 0 ? <EmptyState title="ไม่มีข้อมูลรายเดือน" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={((value: unknown) => [Number(value).toLocaleString(), 'ครั้ง']) as never}
                  contentStyle={tooltipStyle}
                />
                <Line type="monotone" dataKey="visitCount" stroke="hsl(var(--chart-5))" strokeWidth={2.5} dot={{ r: 5, fill: 'hsl(var(--chart-5))', strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 7, strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 9. สถิติการเสียชีวิต — Death Statistics */}
      <Card className="card-shadow bg-muted/30">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-muted-foreground" />
            สถิติการเสียชีวิต
          </CardTitle>
          <CardDescription>ข้อมูลสรุปจำนวนผู้เสียชีวิตจากฐานข้อมูล</CardDescription>
        </CardHeader>
        <CardContent>
          {isDeathLoading ? <Skeleton className="h-20 w-full" /> : (
            <div className="grid grid-cols-3 gap-6">
              {[
                { label: 'จำนวนทั้งหมด', value: deathData?.totalDeaths ?? 0 },
                { label: 'ปีนี้', value: deathData?.thisYearDeaths ?? 0 },
                { label: 'เดือนนี้', value: deathData?.thisMonthDeaths ?? 0 },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                  <p className="text-2xl font-bold text-muted-foreground">{item.value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
