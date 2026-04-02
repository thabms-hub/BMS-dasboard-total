// =============================================================================
// BMS Session KPI Dashboard - Overview Page (Rich Command Center)
// =============================================================================

import { useState, useCallback, useMemo, useRef, useLayoutEffect } from 'react'
import {
  RefreshCw,
  Database,
  Clock,
  Shield,
  Server,
  Globe,
  User,
  Building,
  CalendarDays,
  Receipt,
  CreditCard,
  Landmark,
  BedDouble,
  Activity,
  HeartPulse,
  ChevronLeft,
  ChevronRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  Ambulance,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
} from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { KpiCardGrid } from '@/components/dashboard/KpiCardGrid'
import { ChartExportMenu } from '@/components/dashboard/ChartExportMenu'
import { InpatientWardChart } from '@/components/charts/InpatientWardChart'
import { OpdDepartmentDonutChart } from '@/components/charts/OpdDepartmentDonutChart'
import { PttypeDistributionCard } from '@/components/dashboard/PttypeDistributionCard'
import { useBmsSessionContext } from '@/contexts/BmsSessionContext'
import { useQuery } from '@/hooks/useQuery'
import {
  getWeeklyMiniTrend,
  getTodayVisitsByClinic,
  getThisMonthIPDDischarges,
  getIpdWardDistribution,
  getOpdDepartmentThisMonth,
  getPttypeDistribution,
  getReferStats,
  getRevenueStats,
  getBedStats,
  getBedOccupancyStats,
  getAdjRwThisMonth,
} from '@/services/kpiService'
import { formatDate, formatDateTime } from '@/utils/dateUtils'
import { cn } from '@/lib/utils'

function formatExpiryDays(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  if (days > 0) {
    return `${days}d ${hours}h`
  }
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

function truncateUrl(url: string, maxLength = 40): string {
  if (url.length <= maxLength) return url
  return url.substring(0, maxLength) + '...'
}

/** Format a number into compact K/M notation */
function formatCompact(value: number): string {
  if (value >= 1_000_000) {
    return (value / 1_000_000).toFixed(2) + 'M'
  }
  if (value >= 1_000) {
    return (value / 1_000).toFixed(1) + 'K'
  }
  return value.toLocaleString()
}

/**
 * Renders a number in full; switches to K/M compact notation only when
 * the full text overflows its container (detected via ResizeObserver).
 */
function AutoCompactNumber({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [compact, setCompact] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const check = () => {
      const style = window.getComputedStyle(el)
      const probe = document.createElement('span')
      probe.style.cssText =
        `position:absolute;visibility:hidden;white-space:nowrap;` +
        `font-size:${style.fontSize};font-family:${style.fontFamily};` +
        `font-weight:${style.fontWeight};letter-spacing:${style.letterSpacing}`
      probe.textContent = value.toLocaleString()
      document.body.appendChild(probe)
      const needed = probe.offsetWidth
      document.body.removeChild(probe)
      setCompact(needed > el.clientWidth)
    }

    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [value])

  return (
    <span ref={ref} className={cn('block min-w-0 overflow-hidden', className)}>
      {compact ? formatCompact(value) : value.toLocaleString()}
    </span>
  )
}

export default function Overview() {
  const { session, connectionConfig, refreshSession } = useBmsSessionContext()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [clinicsPage, setClinicsPage] = useState(0)
  const weeklyTrendRef = useRef<HTMLDivElement>(null)

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await refreshSession()
      setLastUpdated(new Date())
    } finally {
      // Small delay so the user sees the spinner
      setTimeout(() => setIsRefreshing(false), 600)
    }
  }, [refreshSession])

  const today = formatDate(new Date())
  const isConnected = connectionConfig !== null && session !== null

  // ---------------------------------------------------------------------------
  // Data queries
  // ---------------------------------------------------------------------------

  const weeklyTrendFn = useCallback(
    () => getWeeklyMiniTrend(connectionConfig!, session!.databaseType),
    [connectionConfig, session],
  )
  const {
    data: weeklyTrend,
    isLoading: isTrendLoading,
  } = useQuery<Awaited<ReturnType<typeof getWeeklyMiniTrend>>>({
    queryFn: weeklyTrendFn,
    enabled: isConnected,
  })

  const todayClinicsFn = useCallback(
    () => getTodayVisitsByClinic(connectionConfig!, session!.databaseType),
    [connectionConfig, session],
  )
  const {
    data: todayClinics,
    isLoading: isClinicsLoading,
  } = useQuery<Awaited<ReturnType<typeof getTodayVisitsByClinic>>>({
    queryFn: todayClinicsFn,
    enabled: isConnected,
  })

  const ipdWardFn = useCallback(
    () => getIpdWardDistribution(connectionConfig!),
    [connectionConfig],
  )
  const {
    data: ipdWardDistribution,
    isLoading: isWardLoading,
    isError: isWardError,
    error: wardError,
    execute: retryWardData,
  } = useQuery<Awaited<ReturnType<typeof getIpdWardDistribution>>>({
    queryFn: ipdWardFn,
    enabled: isConnected,
  })

  const opdDepartmentFn = useCallback(
    () => getOpdDepartmentThisMonth(connectionConfig!, session!.databaseType),
    [connectionConfig, session],
  )
  const {
    data: opdDepartmentData,
    isLoading: isOpdDeptLoading,
    isError: isOpdDeptError,
    error: opdDeptError,
    execute: retryOpdDeptData,
  } = useQuery<Awaited<ReturnType<typeof getOpdDepartmentThisMonth>>>({
    queryFn: opdDepartmentFn,
    enabled: isConnected,
  })

  const referFn = useCallback(
    () => getReferStats(connectionConfig!),
    [connectionConfig],
  )
  const {
    data: referData,
    isLoading: isReferLoading,
  } = useQuery<Awaited<ReturnType<typeof getReferStats>>>({
    queryFn: referFn,
    enabled: isConnected,
  })

  const revenueFn = useCallback(
    () => getRevenueStats(connectionConfig!),
    [connectionConfig],
  )
  const {
    data: revenueData,
    isLoading: isRevenueLoading,
  } = useQuery<Awaited<ReturnType<typeof getRevenueStats>>>({
    queryFn: revenueFn,
    enabled: isConnected,
  })

  const bedStatsFn = useCallback(
    () => getBedStats(connectionConfig!),
    [connectionConfig],
  )
  const {
    data: bedStats,
    isLoading: isBedStatsLoading,
  } = useQuery<Awaited<ReturnType<typeof getBedStats>>>({
    queryFn: bedStatsFn,
    enabled: isConnected,
  })

  const bedOccupancyFn = useCallback(
    () => getBedOccupancyStats(connectionConfig!, session!.databaseType),
    [connectionConfig, session],
  )
  const {
    data: bedOccupancy,
    isLoading: isBedOccupancyLoading,
  } = useQuery<Awaited<ReturnType<typeof getBedOccupancyStats>>>({
    queryFn: bedOccupancyFn,
    enabled: isConnected,
  })

  const adjRwFn = useCallback(
    () => getAdjRwThisMonth(connectionConfig!, session!.databaseType),
    [connectionConfig, session],
  )
  const {
    data: adjRwData,
    isLoading: isAdjRwLoading,
  } = useQuery<Awaited<ReturnType<typeof getAdjRwThisMonth>>>({
    queryFn: adjRwFn,
    enabled: isConnected,
  })

  const pttypeFn = useCallback(
    () => getPttypeDistribution(connectionConfig!),
    [connectionConfig],
  )
  const {
    data: pttypeData,
    isLoading: isPttypeLoading,
    isError: isPttypeError,
    error: pttypeError,
    execute: retryPttypeData,
  } = useQuery<Awaited<ReturnType<typeof getPttypeDistribution>>>({
    queryFn: pttypeFn,
    enabled: isConnected,
  })

  const ipdDischargesFn = useCallback(
    () => getThisMonthIPDDischarges(connectionConfig!, session!.databaseType),
    [connectionConfig, session],
  )
  const {
    data: ipdDischarges,
    isLoading: isIPDDischargesLoading,
    isError: isIPDDischargesError,
    error: ipdDischargesError,
    execute: retryIpdDischargesData,
  } = useQuery<Awaited<ReturnType<typeof getThisMonthIPDDischarges>>>({
    queryFn: ipdDischargesFn,
    enabled: isConnected,
  })

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------
  const weeklyTotal = useMemo(
    () => weeklyTrend?.reduce((sum, d) => sum + d.visitCount, 0) ?? 0,
    [weeklyTrend],
  )


  // ---------------------------------------------------------------------------
  // Session info rows helper
  // ---------------------------------------------------------------------------
  const sessionInfoRows: Array<{
    icon: React.ReactNode
    label: string
    value: string | React.ReactNode
  }> = session
    ? [
        {
          icon: <Database className="h-4 w-4" />,
          label: 'ประเภทฐานข้อมูล',
          value: (
            <Badge variant="secondary" className="font-mono text-xs">
              {session.databaseType.toUpperCase()}
            </Badge>
          ),
        },
        {
          icon: <Server className="h-4 w-4" />,
          label: 'ชื่อฐานข้อมูล',
          value: session.databaseName || 'N/A',
        },
        {
          icon: <Clock className="h-4 w-4" />,
          label: 'วันหมดอายุเซสชัน',
          value: `หมดอายุใน ${formatExpiryDays(session.expirySeconds)}`,
        },
        {
          icon: <User className="h-4 w-4" />,
          label: 'ผู้ใช้ / บทบาท',
          value: `${session.userInfo.name} (${session.userInfo.position})`,
        },
        {
          icon: <Building className="h-4 w-4" />,
          label: 'รหัสโรงพยาบาล',
          value: (
            <span className="font-mono text-sm">
              {session.userInfo.hospitalCode || 'N/A'}
            </span>
          ),
        },
        {
          icon: <Shield className="h-4 w-4" />,
          label: 'เวอร์ชันระบบ',
          value: session.systemInfo.version || 'N/A',
        },
        {
          icon: <Globe className="h-4 w-4" />,
          label: 'สภาพแวดล้อม',
          value: (
            <Badge
              variant={
                session.systemInfo.environment?.toLowerCase() === 'production'
                  ? 'default'
                  : 'secondary'
              }
              className="text-xs"
            >
              {session.systemInfo.environment || 'Unknown'}
            </Badge>
          ),
        },
      ]
    : []

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-6">
      {/* ------------------------------------------------------------------- */}
      {/* 1. Welcome Banner                                                    */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            ภาพรวมแดชบอร์ด
          </h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {today}
            </span>
            <span className="text-muted-foreground/40">|</span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              อัปเดตล่าสุด {formatDateTime(lastUpdated)}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 gap-1.5 sm:mt-0 text-blue dark:text-white dark:bg-orange-500/5 dark:border-orange-400/60 dark:hover:bg-orange-500/15 dark:hover:border-orange-300"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')}
          />
          รีเฟรช
        </Button>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 2. KPI Card Grid                                                     */}
      {/* ------------------------------------------------------------------- */}
      <KpiCardGrid />

      {/* ------------------------------------------------------------------- */}
      {/* 3. Stats Row - Refer card + 5 mini stat cards                        */}
      {/* ------------------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Refer card */}
        <Card className="p-3">
          <CardContent className="flex flex-col gap-1.5 p-0">
            <div className="flex items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sky-500 dark:bg-sky-500/10">
                <Ambulance className="h-4 w-4" />
              </div>
              <p className="text-xs text-muted-foreground">ผู้ป่วยส่งต่อวันนี้</p>
            </div>
            {isReferLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="flex w-full justify-around">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="flex items-center gap-1 text-xs text-emerald-500">
                    <ArrowDownToLine className="h-3.5 w-3.5" />
                    <span>In</span>
                  </div>
                  <span className="text-lg font-bold">
                    {(referData?.referIn ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="w-px bg-border" />
                <div className="flex flex-col items-center gap-0.5">
                  <div className="flex items-center gap-1 text-xs text-orange-500">
                    <ArrowUpFromLine className="h-3.5 w-3.5" />
                    <span>Out</span>
                  </div>
                  <span className="text-lg font-bold">
                    {(referData?.referOut ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue total card */}
        <Card className="p-3">
          <CardContent className="flex h-full flex-col p-0">
            <div className="flex items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-violet-500 dark:bg-violet-500/10">
                <Receipt className="h-4 w-4" />
              </div>
              <p className="text-xs text-muted-foreground">ค่ารักษาพยาบาล OPD วันนี้</p>
            </div>
            {isRevenueLoading ? (
              <Skeleton className="h-8 w-full mt-2" />
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <div className="flex min-w-0 max-w-full items-baseline gap-1">
                  <AutoCompactNumber
                    value={Math.round(revenueData?.totalAmount ?? 0)}
                    className="text-base font-bold tabular-nums sm:text-xl lg:text-2xl"
                  />
                  <span className="shrink-0 text-xs font-normal text-muted-foreground">บาท</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue split: ชำระเอง | ลูกหนี้ */}
        <Card className="p-3">
          <CardContent className="flex h-full flex-col justify-around gap-1 p-0">
            {isRevenueLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <>
                <div className="flex min-w-0 items-center justify-between gap-1">
                  <div className="flex shrink-0 items-center gap-1 text-xs text-emerald-500">
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>ชำระเอง</span>
                  </div>
                  <div className="flex min-w-0 items-baseline gap-1">
                    <AutoCompactNumber
                      value={Math.round(revenueData?.selfPayAmount ?? 0)}
                      className="text-sm font-bold tabular-nums lg:text-lg xl:text-xl"
                    />
                    <span className="shrink-0 text-xs text-muted-foreground">บาท</span>
                  </div>
                </div>
                <div className="h-px bg-border" />
                <div className="flex min-w-0 items-center justify-between gap-1">
                  <div className="flex shrink-0 items-center gap-1 text-xs text-orange-500">
                    <Landmark className="h-3.5 w-3.5" />
                    <span>ลูกหนี้</span>
                  </div>
                  <div className="flex min-w-0 items-baseline gap-1">
                    <AutoCompactNumber
                      value={Math.round(revenueData?.receivableAmount ?? 0)}
                      className="text-sm font-bold tabular-nums lg:text-lg xl:text-xl"
                    />
                    <span className="shrink-0 text-xs text-muted-foreground">บาท</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* จำนวนเตียงว่าง */}
        <Card className="p-3">
          <CardContent className="flex h-full flex-col justify-between p-0">
            <div className="flex items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-100 text-cyan-600 dark:bg-cyan-500/10">
                <BedDouble className="h-4 w-4" />
              </div>
              <p className="text-xs text-muted-foreground">เตียงว่างวันนี้</p>
            </div>
            {isBedStatsLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <div className="mt-2 flex flex-col items-center gap-0.5">
                <p className="text-lg font-bold tabular-nums sm:text-xl lg:text-2xl">
                  {(bedStats?.availableBeds ?? 0).toLocaleString()}
                </p>
                <span className="text-xs text-muted-foreground">
                  เตียงในระบบ {(bedStats?.systemBeds ?? 0).toLocaleString()} เตียง
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* อัตราครองเตียงเดือนนี้ */}
        <Card className="p-3">
          <CardContent className="flex h-full flex-col justify-between p-0">
            <div className="flex items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/10">
                <Activity className="h-4 w-4" />
              </div>
              <p className="text-xs text-muted-foreground">ครองเตียงเดือนนี้</p>
            </div>
            {isBedOccupancyLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <div className="mt-2 flex flex-col items-center gap-0.5">
                <p className="text-lg font-bold tabular-nums sm:text-xl lg:text-2xl">
                  {(bedOccupancy?.occupancyRate ?? 0).toFixed(1)}
                  <span className="text-base lg:text-lg">%</span>
                </p>
                <span className="text-xs text-muted-foreground text-center leading-relaxed" title={`(${(bedOccupancy?.admitDays ?? 0).toLocaleString()} วันนอน × 100) ÷ (${bedOccupancy?.daysInPeriod ?? 0} วัน × ${bedOccupancy?.totalBeds ?? 0} เตียง)`}>
                  {(bedOccupancy?.admitDays ?? 0).toLocaleString()} วันนอน{' '}
                  / {bedOccupancy?.daysInPeriod ?? 0} วัน{' '}
                  / {(bedOccupancy?.totalBeds ?? 0).toLocaleString()} เตียงตามกรอบ
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AdjRW เดือนนี้ */}
        <Card className="p-3">
          <CardContent className="flex h-full flex-col p-0">
            <div className="flex items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/10">
                <HeartPulse className="h-4 w-4" />
              </div>
              <p className="text-xs text-muted-foreground">AdjRW เดือนนี้</p>
            </div>
            {isAdjRwLoading ? (
              <Skeleton className="h-8 w-full mt-2" />
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-lg font-bold tabular-nums sm:text-xl lg:text-2xl">
                  {(adjRwData?.adjRwTotal ?? 0).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 4. OPD Donut + Weekly Trend + Top Doctors  (3 / 6 / 3)             */}
      {/* ------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Pttype Distribution (4/12) */}
        <PttypeDistributionCard
          data={pttypeData ?? null}
          isLoading={isPttypeLoading}
          isError={isPttypeError}
          error={isPttypeError ? pttypeError : null}
          onRetry={retryPttypeData}
          className="lg:col-span-4"
        />

        {/* Weekly Visit Trend (5/12) */}
        <Card ref={weeklyTrendRef} className="lg:col-span-5">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-lg">การเข้ารับบริการสัปดาห์นี้</CardTitle>
              <CardDescription>
                {isTrendLoading
                  ? 'กำลังโหลดข้อมูลแนวโน้ม...'
                  : `${weeklyTotal.toLocaleString()} จำนวนการเข้ารับบริการใน 7 วันที่ผ่านมา`}
              </CardDescription>
            </div>
            <ChartExportMenu
              containerRef={weeklyTrendRef}
              data={weeklyTrend ?? []}
              title="การเข้ารับบริการสัปดาห์นี้"
            />
          </CardHeader>
          <CardContent>
            {isTrendLoading ? (
              <div className="flex h-[200px] items-center justify-center">
                <Skeleton className="h-[180px] w-full" />
              </div>
            ) : weeklyTrend && weeklyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={weeklyTrend}>
                  <defs>
                    <linearGradient id="weeklyVisitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val: string) => {
                      const parts = val.split('-')
                      if (parts.length === 3) {
                        const d = new Date(val)
                        return d.toLocaleDateString('th-TH', {
                          month: 'short',
                          day: 'numeric',
                        })
                      }
                      return val
                    }}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={((value: unknown) => [Number(value).toLocaleString(), 'ครั้ง']) as never}
                    labelFormatter={((label: unknown) => `วันที่: ${String(label)}`) as never}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--card))',
                      fontSize: '12px',
                    }}
                    cursor={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="visitCount"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    fill="url(#weeklyVisitGradient)"
                    dot={{ r: 3, fill: 'hsl(var(--chart-1))', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: 'hsl(var(--chart-1))' }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                ไม่มีข้อมูลการเข้ารับบริการใน 7 วันที่ผ่านมา
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's OPD visits by clinic (3/12) */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">ผู้ป่วยมารับบริการวันนี้</CardTitle>
            <CardDescription>เรียงตามจำนวนผู้รับบริการ (ตามที่ส่งตรวจ)</CardDescription>
          </CardHeader>
          <CardContent>
            {isClinicsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="ml-auto h-4 w-12" />
                  </div>
                ))}
              </div>
            ) : todayClinics && todayClinics.length > 0 ? (
              <>
                <div className="space-y-3">
                  {todayClinics.slice(clinicsPage * 5, (clinicsPage + 1) * 5).map((clinic, index) => (
                    <div key={clinic.clinicName} className="flex items-center gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {clinicsPage * 5 + index + 1}
                      </div>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {clinic.clinicName}
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-muted-foreground">
                        {clinic.visitCount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
                {todayClinics.length > 5 && (
                  <div className="flex items-center justify-between pt-3 text-sm text-muted-foreground">
                    <span>หน้า {clinicsPage + 1} / {Math.ceil(todayClinics.length / 5)}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setClinicsPage((p: number) => p - 1)}
                        disabled={clinicsPage === 0}
                        className="flex h-7 w-7 items-center justify-center rounded border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setClinicsPage((p: number) => p + 1)}
                        disabled={clinicsPage >= Math.ceil(todayClinics.length / 5) - 1}
                        className="flex h-7 w-7 items-center justify-center rounded border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                ไม่มีข้อมูลการรับบริการวันนี้
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 6. Department Workload + Recent Visits                               */}
      {/* ------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* OPD Department Donut (4/12) */}
        <OpdDepartmentDonutChart
          data={opdDepartmentData ?? []}
          isLoading={isOpdDeptLoading}
          error={isOpdDeptError ? opdDeptError : null}
          onRetry={retryOpdDeptData}
          className="lg:col-span-4"
        />

        {/* Middle: Inpatient Ward Distribution (1/4 width) */}
        <InpatientWardChart
          data={ipdWardDistribution ?? []}
          isLoading={isWardLoading}
          error={isWardError ? wardError : null}
          onRetry={retryWardData}
          className="lg:col-span-5"
        />

        {/* Right: IPD Discharges this month (3/12 width) */}
        <PttypeDistributionCard
          data={ipdDischarges ?? null}
          isLoading={isIPDDischargesLoading}
          isError={isIPDDischargesError}
          error={isIPDDischargesError ? ipdDischargesError : null}
          onRetry={retryIpdDischargesData}
          title="ผู้ป่วยใน ที่จำหน่ายในเดือนนี้"
          description="แยกตามกลุ่มสิทธิ์การรักษา"
          emptyText="ไม่มีข้อมูลผู้ป่วยในที่จำหน่ายในเดือนนี้"
          className="lg:col-span-3"
        />
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 7. Session Info — full-width status bar                             */}
      {/* ------------------------------------------------------------------- */}
      {session ? (
        <div className="signature-gradient overflow-hidden rounded-xl shadow-md">
          {/* Top strip: label */}
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-widest text-white/60">
              ข้อมูลเซสชัน
            </span>
            <span className="flex items-center gap-1.5 text-xs text-white/50">
              <Globe className="h-3 w-3" />
              {truncateUrl(session.apiUrl)}
            </span>
          </div>

          {/* Info grid — 2 rows × 4 columns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-white/10 [&>*]:border-r [&>*]:border-b [&>*]:border-white/10">
            {sessionInfoRows.map((row, idx) => (
              <div key={idx} className="flex flex-col gap-0.5 px-5 py-3">
                <div className="flex items-center gap-1.5 text-white/50">
                  <span className="[&_svg]:h-3 [&_svg]:w-3">{row.icon}</span>
                  <span className="text-[10px] font-medium uppercase tracking-wide">
                    {row.label}
                  </span>
                </div>
                <div className="truncate text-sm font-semibold text-white">
                  {row.value}
                </div>
              </div>
            ))}

            {/* Connection time — 8th cell */}
            <div className="flex flex-col gap-0.5 px-5 py-3">
              <div className="flex items-center gap-1.5 text-white/50">
                <Clock className="h-3 w-3" />
                <span className="text-[10px] font-medium uppercase tracking-wide">
                  เชื่อมต่อเมื่อ
                </span>
              </div>
              <div className="truncate text-sm font-semibold text-white">
                {formatDateTime(session.connectedAt)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-muted-foreground/20 bg-muted/20 px-6 py-4 text-sm text-muted-foreground">
          ไม่มีเซสชัน กรุณาเชื่อมต่อด้วยรหัสเซสชันเพื่อดูรายละเอียด
        </div>
      )}
    </div>
  )
}
