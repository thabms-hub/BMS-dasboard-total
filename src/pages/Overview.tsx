// =============================================================================
// BMS Session KPI Dashboard - Overview Page (Rich Command Center)
// =============================================================================

import { useState, useCallback, useMemo, useRef } from 'react'
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
  CalendarCheck,
  CalendarMinus,
  BarChart3,
  Stethoscope,
  Building2,
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
  getOverviewStats,
  getWeeklyMiniTrend,
  getTopDoctorsThisMonth,
  getRecentVisits,
  getIpdWardDistribution,
  getOpdDepartmentThisMonth,
  getPttypeDistribution,
  getReferStats,
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

/** Format vsttime (e.g. "14:30:00" or "143000") into "HH:MM" */
function formatVisitTime(raw: string): string {
  if (!raw) return '--:--'
  // Handle "HH:MM:SS" format
  if (raw.includes(':')) {
    return raw.substring(0, 5)
  }
  // Handle numeric "HHMMSS" format
  const padded = raw.padStart(6, '0')
  return `${padded.substring(0, 2)}:${padded.substring(2, 4)}`
}

export default function Overview() {
  const { session, connectionConfig, refreshSession } = useBmsSessionContext()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [recentVisitsPage, setRecentVisitsPage] = useState(0)
  const [doctorsPage, setDoctorsPage] = useState(0)
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

  const overviewStatsFn = useCallback(
    () => getOverviewStats(connectionConfig!, session!.databaseType),
    [connectionConfig, session],
  )
  const {
    data: overviewStats,
    isLoading: isStatsLoading,
  } = useQuery<Awaited<ReturnType<typeof getOverviewStats>>>({
    queryFn: overviewStatsFn,
    enabled: isConnected,
  })

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

  const topDoctorsFn = useCallback(
    () => getTopDoctorsThisMonth(connectionConfig!, session!.databaseType),
    [connectionConfig, session],
  )
  const {
    data: topDoctors,
    isLoading: isDoctorsLoading,
  } = useQuery<Awaited<ReturnType<typeof getTopDoctorsThisMonth>>>({
    queryFn: topDoctorsFn,
    enabled: isConnected,
  })

  const ipdWardFn = useCallback(
    () => getIpdWardDistribution(connectionConfig!),
    [connectionConfig],
  )
  const {
    data: ipdWardDistribution,
    isLoading: isWardLoading,    isError: isWardError,
    error: wardError,  } = useQuery<Awaited<ReturnType<typeof getIpdWardDistribution>>>({
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

  const pttypeFn = useCallback(
    () => getPttypeDistribution(connectionConfig!),
    [connectionConfig],
  )
  const {
    data: pttypeData,
    isLoading: isPttypeLoading,
    isError: isPttypeError,
    error: pttypeError,
  } = useQuery<Awaited<ReturnType<typeof getPttypeDistribution>>>({
    queryFn: pttypeFn,
    enabled: isConnected,
  })

  const recentVisitsFn = useCallback(
    () => getRecentVisits(connectionConfig!, session!.databaseType),
    [connectionConfig, session],
  )
  const {
    data: recentVisits,
    isLoading: isVisitsLoading,
  } = useQuery<Awaited<ReturnType<typeof getRecentVisits>>>({
    queryFn: recentVisitsFn,
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
  // Mini stat card definitions
  // ---------------------------------------------------------------------------
  const miniStats = useMemo(
    () => [
      {
        label: 'เข้ารับบริการเดือนนี้',
        value: overviewStats?.totalVisitsThisMonth,
        icon: <CalendarCheck className="h-4 w-4" />,
      },
      {
        label: 'เข้ารับบริการเดือนที่แล้ว',
        value: overviewStats?.totalVisitsLastMonth,
        icon: <CalendarMinus className="h-4 w-4" />,
      },
      {
        label: 'เฉลี่ยต่อวัน',
        value: overviewStats?.avgDailyVisitsThisMonth,
        icon: <BarChart3 className="h-4 w-4" />,
      },
      {
        label: 'แพทย์ทั้งหมด',
        value: overviewStats?.totalDoctors,
        icon: <Stethoscope className="h-4 w-4" />,
      },
      {
        label: 'แผนกทั้งหมด',
        value: overviewStats?.totalDepartments,
        icon: <Building2 className="h-4 w-4" />,
      },
    ],
    [overviewStats],
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
      <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
        {/* Refer card */}
        <Card className="p-3">
          <CardContent className="flex flex-col gap-1.5 p-0">
            <div className="flex items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
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

        {/* Remaining mini stat cards */}
        {miniStats.map((stat) => (
          <Card key={stat.label} className="p-3">
            <CardContent className="flex flex-col items-start gap-1.5 p-0">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                {stat.icon}
              </div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              {isStatsLoading ? (
                <Skeleton className="h-6 w-16" />
              ) : (
                <p className="text-lg font-bold">
                  {stat.value?.toLocaleString() ?? '0'}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
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

        {/* Top Doctors This Month (3/12) */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">TOP 10 Doctor</CardTitle>
            <CardDescription>เรียงตามจำนวนผู้ป่วยเดือนนี้</CardDescription>
          </CardHeader>
          <CardContent>
            {isDoctorsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="ml-auto h-4 w-12" />
                  </div>
                ))}
              </div>
            ) : topDoctors && topDoctors.length > 0 ? (
              <>
                <div className="space-y-3">
                  {topDoctors.slice(doctorsPage * 5, (doctorsPage + 1) * 5).map((doc, index) => (
                    <div
                      key={doc.doctorCode}
                      className="flex items-center gap-3"
                    >
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {doctorsPage * 5 + index + 1}
                      </div>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {doc.doctorName}
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-muted-foreground">
                        {doc.patientCount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
                {topDoctors.length > 5 && (
                  <div className="flex items-center justify-between pt-3 text-sm text-muted-foreground">
                    <span>หน้า {doctorsPage + 1} / {Math.ceil(Math.min(topDoctors.length, 10) / 5)}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setDoctorsPage((p) => p - 1)}
                        disabled={doctorsPage === 0}
                        className="flex h-7 w-7 items-center justify-center rounded border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDoctorsPage((p) => p + 1)}
                        disabled={doctorsPage >= Math.ceil(Math.min(topDoctors.length, 10) / 5) - 1}
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
                ไม่มีกิจกรรมของแพทย์ในเดือนนี้
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
          className="lg:col-span-4"
        />

        {/* Middle: Inpatient Ward Distribution (1/4 width) */}
        <InpatientWardChart
          data={ipdWardDistribution ?? []}
          isLoading={isWardLoading}
          error={isWardError ? wardError : null}
          className="lg:col-span-5"
        />

        {/* Right: Recent Visits (3/12 width — matches Top Doctors) */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">การเข้ารับบริการล่าสุด</CardTitle>
            <CardDescription>10 รายการล่าสุดที่บันทึก</CardDescription>
          </CardHeader>
          <CardContent>
            {isVisitsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-5 w-12 rounded" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentVisits && recentVisits.length > 0 ? (
              <>
                <div className="space-y-0 divide-y">
                  {recentVisits.slice(recentVisitsPage * 5, (recentVisitsPage + 1) * 5).map((visit, index) => (
                    <div
                      key={`${visit.vn}-${index}`}
                      className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <Badge
                        variant="secondary"
                        className="shrink-0 font-mono text-[10px] tabular-nums"
                      >
                        {formatVisitTime(visit.vsttime)}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {visit.departmentName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {visit.doctorName}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {recentVisits.length > 5 && (
                  <div className="flex items-center justify-between pt-3 text-sm text-muted-foreground">
                    <span>
                      หน้า {recentVisitsPage + 1} / {Math.ceil(recentVisits.length / 5)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setRecentVisitsPage((p) => p - 1)}
                        disabled={recentVisitsPage === 0}
                        className="flex h-7 w-7 items-center justify-center rounded border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setRecentVisitsPage((p) => p + 1)}
                        disabled={recentVisitsPage >= Math.ceil(recentVisits.length / 5) - 1}
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
                ไม่มีการเข้ารับบริการล่าสุดที่บันทึก
              </p>
            )}
          </CardContent>
        </Card>
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
