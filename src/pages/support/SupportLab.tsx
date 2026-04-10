// =============================================================================
// Support: งานห้องปฏิบัติการ Lab
// =============================================================================

import { useCallback, useState, useRef, useMemo } from 'react'
import { Microscope, Users, Activity, CircleCheckBig, AlertCircle, FlaskConical, CalendarDays, Clock, RefreshCw } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'
import { format, parseISO } from 'date-fns'
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
  getLabOrderSummary,
  getLabOrderByPriority,
  getLabItemsTop,
  getLabGroupTop,
  getLabOrderByLocation,
  getLabOrderByDepartment,
  getLabOrderVsPatient,
  getLabOrderVsPatientByType,
  getLabRejectedRadar,
} from '@/services/labService'
import type {
  LabOrderSummary,
  LabOrderByPriority,
  LabItemTop,
  LabGroupTop,
  LabOrderByLocation,
  LabOrderByDepartment,
  LabOrderVsPatient,
  LabOrderVsPatientByType,
  LabRejectedRadarItem,
} from '@/types'

// Date formatter: d MMM locale:th (e.g. "1 ม.ค.")
function formatDateLabel(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'd MMM', { locale: th })
  } catch {
    return dateStr
  }
}

// Color palette for priority chart
const PRIORITY_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#a78bfa',
  '#f59e0b',
  '#10b981',
]

const DEFAULT_HIDDEN_PRIORITY = 'ไม่ระบุ'

// Tooltip styling
const tooltipStyle = {
  borderRadius: '8px',
  border: '1px solid hsl(var(--border))',
  backgroundColor: 'hsl(var(--popover))',
  color: 'hsl(var(--popover-foreground))',
  fontSize: '12px',
}

export default function SupportLab() {
  const { connectionConfig, session } = useBmsSessionContext()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [hiddenPriority, setHiddenPriority] = useState<Set<string>>(new Set([DEFAULT_HIDDEN_PRIORITY]))
  const [hiddenLocation, setHiddenLocation] = useState<Set<string>>(new Set())
  const [hiddenDept, setHiddenDept] = useState<Set<string>>(new Set())
  const [hiddenCompare, setHiddenCompare] = useState<Set<string>>(new Set())
  const priorityChartRef = useRef<HTMLDivElement>(null)
  const locationChartRef = useRef<HTMLDivElement>(null)
  const deptChartRef = useRef<HTMLDivElement>(null)
  const groupDonutRef = useRef<HTMLDivElement>(null)
  const compareByTypeRef = useRef<HTMLDivElement>(null)
  const rejectRadarRef = useRef<HTMLDivElement>(null)
  const { startDate, endDate, setRange } = usePersistentDateRange('support-lab', 30)

  const isConnected = connectionConfig !== null && session !== null

  // Query functions
  const summaryFn = useCallback(
    () => getLabOrderSummary(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )

  const priorityFn = useCallback(
    () => getLabOrderByPriority(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )

  const itemsTopFn = useCallback(
    () => getLabItemsTop(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )

  const groupTopFn = useCallback(
    () => getLabGroupTop(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )

  const locationFn = useCallback(
    () => getLabOrderByLocation(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )

  const deptFn = useCallback(
    () => getLabOrderByDepartment(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )

  const orderVsPatientFn = useCallback(
    () => getLabOrderVsPatient(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )

  const orderVsPatientByTypeFn = useCallback(
    () => getLabOrderVsPatientByType(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )

  const rejectedRadarFn = useCallback(
    () => getLabRejectedRadar(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )

  // Queries
  const { data: summary, isLoading: isSummaryLoading, execute: executeSummary } = useQuery<LabOrderSummary>({
    queryFn: summaryFn,
    enabled: isConnected,
  })

  const { data: priorityData, isLoading: isPriorityLoading, execute: executePriority } = useQuery<LabOrderByPriority[]>({
    queryFn: priorityFn,
    enabled: isConnected,
  })

  const { data: itemsTop, isLoading: isItemsLoading, execute: executeItems } = useQuery<LabItemTop[]>({
    queryFn: itemsTopFn,
    enabled: isConnected,
  })

  const { data: groupTop, isLoading: isGroupLoading, execute: executeGroup } = useQuery<LabGroupTop[]>({
    queryFn: groupTopFn,
    enabled: isConnected,
  })

  const { data: locationData, isLoading: isLocationLoading, execute: executeLocation } = useQuery<LabOrderByLocation[]>({
    queryFn: locationFn,
    enabled: isConnected,
  })

  const { data: deptData, isLoading: isDeptLoading, execute: executeDept } = useQuery<LabOrderByDepartment[]>({
    queryFn: deptFn,
    enabled: isConnected,
  })

  const { data: orderVsPatient, isLoading: isOrderVsPatientLoading, execute: executeOrderVsPatient } = useQuery<LabOrderVsPatient>({
    queryFn: orderVsPatientFn,
    enabled: isConnected,
  })

  const {
    data: orderVsPatientByType,
    isLoading: isOrderVsPatientByTypeLoading,
    execute: executeOrderVsPatientByType,
  } = useQuery<LabOrderVsPatientByType[]>({
    queryFn: orderVsPatientByTypeFn,
    enabled: isConnected,
  })

  const {
    data: rejectedRadarData,
    isLoading: isRejectedRadarLoading,
    execute: executeRejectedRadar,
  } = useQuery<LabRejectedRadarItem[]>({
    queryFn: rejectedRadarFn,
    enabled: isConnected,
  })

  // Memoized pivot logic for priority chart - reformat {date, priorityName, orderCount} to {date, priority1: count, priority2: count, ...}
  const { priorityNames, priorityChartData } = useMemo(() => {
    if (!priorityData || priorityData.length === 0) {
      return { priorityNames: [], priorityChartData: [] }
    }

    // Collect unique priority names ordered by total count desc
    const totals = new Map<string, number>()
    priorityData.forEach(d => {
      totals.set(d.priorityName, (totals.get(d.priorityName) ?? 0) + d.orderCount)
    })
    const names = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)

    // Pivot: date → { date, [priorityName]: orderCount, ... }
    const byDate = new Map<string, Record<string, number>>()
    priorityData.forEach(d => {
      if (!byDate.has(d.date)) byDate.set(d.date, {})
      byDate.get(d.date)![d.priorityName] = d.orderCount
    })

    const chartData = [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date, ...vals }))

    return { priorityNames: names, priorityChartData: chartData }
  }, [priorityData])

  const { locationNames, locationChartData } = useMemo(() => {
    if (!locationData || locationData.length === 0) {
      return { locationNames: [], locationChartData: [] }
    }

    const totals = new Map<string, number>()
    locationData.forEach(d => {
      totals.set(d.locationName, (totals.get(d.locationName) ?? 0) + d.orderCount)
    })
    const names = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name]) => name)
    const nameSet = new Set(names)

    const byDate = new Map<string, Record<string, number>>()
    locationData.forEach(d => {
      if (!nameSet.has(d.locationName)) return
      if (!byDate.has(d.date)) byDate.set(d.date, {})
      byDate.get(d.date)![d.locationName] = d.orderCount
    })

    const chartData = [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date, ...vals }))

    return { locationNames: names, locationChartData: chartData }
  }, [locationData])

  const { deptNames, deptChartData } = useMemo(() => {
    if (!deptData || deptData.length === 0) {
      return { deptNames: [], deptChartData: [] }
    }

    const totals = new Map<string, number>()
    deptData.forEach(d => {
      totals.set(d.deptName, (totals.get(d.deptName) ?? 0) + d.orderCount)
    })
    const names = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name]) => name)
    const nameSet = new Set(names)

    const byDate = new Map<string, Record<string, number>>()
    deptData.forEach(d => {
      if (!nameSet.has(d.deptName)) return
      if (!byDate.has(d.date)) byDate.set(d.date, {})
      byDate.get(d.date)![d.deptName] = d.orderCount
    })

    const chartData = [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date, ...vals }))

    return { deptNames: names, deptChartData: chartData }
  }, [deptData])

  const groupDonutData = useMemo(() => {
    if (!groupTop || groupTop.length === 0) return []
    return groupTop.slice(0, 10).map(item => ({
      name: item.groupName,
      value: item.orderCount,
    }))
  }, [groupTop])

  const totalGroupOrders = useMemo(
    () => groupDonutData.reduce((sum, item) => sum + item.value, 0),
    [groupDonutData],
  )

  const handleRangeChange = useCallback((newStartDate: string, newEndDate: string) => {
    setRange(newStartDate, newEndDate)
  }, [setRange])

  const handleRefresh = useCallback(async () => {
    if (!isConnected) return
    setIsRefreshing(true)
    try {
      await Promise.all([
        executeSummary(),
        executePriority(),
        executeItems(),
        executeGroup(),
        executeLocation(),
        executeDept(),
        executeOrderVsPatient(),
        executeOrderVsPatientByType(),
        executeRejectedRadar(),
      ])
      setLastUpdated(new Date())
    } finally {
      setIsRefreshing(false)
    }
  }, [
    isConnected,
    executeSummary,
    executePriority,
    executeItems,
    executeGroup,
    executeLocation,
    executeDept,
    executeOrderVsPatient,
    executeOrderVsPatientByType,
    executeRejectedRadar,
  ])

  const comparisonByTypeData = useMemo(() => {
    const base = {
      IPD: { patientType: 'IPD', patientCount: 0, orderCount: 0 },
      OPD: { patientType: 'OPD', patientCount: 0, orderCount: 0 },
    }

    ;(orderVsPatientByType ?? []).forEach(item => {
      base[item.patientType] = {
        patientType: item.patientType,
        patientCount: item.patientCount,
        orderCount: item.orderCount,
      }
    })

    return [base.IPD, base.OPD]
  }, [orderVsPatientByType])

  if (!isConnected) {
    return (
      <EmptyState
        icon={<Microscope className="h-5 w-5" />}
        title="ยังไม่เชื่อมต่อ BMS Session"
        description="กรุณาเชื่อมต่อ Session ก่อนใช้งานแดชบอร์ดห้องแลป"
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header (without department info card) */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 shadow-md ring-1 ring-primary/20">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 to-transparent" />
            <Microscope className="relative h-10 w-10 text-primary drop-shadow-sm" />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-3xl font-bold tracking-tight">งานห้องปฏิบัติการ Lab</h2>
            <p className="text-base text-muted-foreground">Laboratory</p>
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
          className="mt-2 gap-1.5 text-blue sm:mt-0 dark:border-orange-400/60 dark:bg-orange-500/5 dark:text-white dark:hover:border-orange-300 dark:hover:bg-orange-500/15"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
          รีเฟรช
        </Button>
      </div>

      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onRangeChange={handleRangeChange}
        isLoading={isRefreshing}
      />

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-12">
        <Card className="col-span-6 md:col-span-2">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                  <FlaskConical className="h-3.5 w-3.5" />
                </span>
                <p className="text-xs font-medium text-muted-foreground">ใบสั่งแลปทั้งหมด</p>
              </div>
              {isSummaryLoading ? <Skeleton className="h-8 w-20 mx-auto mt-2" /> : <p className="text-2xl font-bold mt-2">{summary?.totalOrders.toLocaleString()}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-6 md:col-span-2">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                  <Users className="h-3.5 w-3.5" />
                </span>
                <p className="text-xs font-medium text-muted-foreground">จำนวนผู้ป่วย</p>
              </div>
              {isOrderVsPatientLoading ? <Skeleton className="h-8 w-20 mx-auto mt-2" /> : <p className="text-2xl font-bold mt-2">{orderVsPatient?.uniquePatients.toLocaleString() ?? 0}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-6 md:col-span-2">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                  <Activity className="h-3.5 w-3.5" />
                </span>
                <p className="text-xs font-medium text-muted-foreground">อัตราจำนวนใบสั่งต่อราย</p>
              </div>
              {isOrderVsPatientLoading ? (
                <Skeleton className="h-8 w-20 mx-auto mt-2" />
              ) : (
                <p className="text-2xl font-bold mt-2">
                  {orderVsPatient && orderVsPatient.uniquePatients > 0
                    ? (orderVsPatient.totalOrders / orderVsPatient.uniquePatients).toFixed(2)
                    : '0.00'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-6 md:col-span-2">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-700">
                  <CircleCheckBig className="h-3.5 w-3.5" />
                </span>
                <p className="text-xs font-medium text-muted-foreground">รับรายการแล้ว</p>
              </div>
              {isSummaryLoading ? <Skeleton className="h-8 w-20 mx-auto mt-2" /> : <p className="text-2xl font-bold mt-2 text-green-600">{summary?.receivedOrders.toLocaleString()}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-6 md:col-span-2">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                  <CircleCheckBig className="h-3.5 w-3.5" />
                </span>
                <p className="text-xs font-medium text-muted-foreground">รายงานผลแล้ว</p>
              </div>
              {isSummaryLoading ? <Skeleton className="h-8 w-20 mx-auto mt-2" /> : <p className="text-2xl font-bold mt-2 text-blue-600">{summary?.reportedOrders.toLocaleString()}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-6 md:col-span-2">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-orange-700">
                  <AlertCircle className="h-3.5 w-3.5" />
                </span>
                <p className="text-xs font-medium text-muted-foreground">OUT LAB</p>
              </div>
              {isSummaryLoading ? <Skeleton className="h-8 w-20 mx-auto mt-2" /> : <p className="text-2xl font-bold mt-2 text-orange-600">{summary?.outlabCount.toLocaleString()}</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 grid-cols-12">
        {/* Priority Distribution */}
        <div className="col-span-12 md:col-span-8" ref={priorityChartRef}>
          <Card className="card-shadow">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <CardTitle>การสั่งแยกตามความเร่งด่วน</CardTitle>
              {priorityChartData && priorityChartData.length > 0 && (
                <ChartExportMenu 
                  containerRef={priorityChartRef}
                  data={priorityData || []}
                  title="Priority Chart"
                />
              )}
            </CardHeader>
            <CardContent>
              {isPriorityLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : !priorityChartData || priorityChartData.length === 0 ? (
                <EmptyState title="ไม่มีข้อมูล" className="py-8" />
              ) : (
                <div className="space-y-3">
                  {/* Stacked Bar Chart */}
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={priorityChartData} 
                        margin={{ left: 36, right: 8, top: 4, bottom: 40 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                        <XAxis dataKey="date" tickFormatter={formatDateLabel} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} angle={-30} textAnchor="end" height={44} label={{ value: 'วันที่', position: 'insideBottomRight', offset: 0, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={(v: number) => v.toLocaleString()} label={{ value: 'จำนวนรายการ', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={tooltipStyle} labelFormatter={(label: unknown) => formatDateLabel(String(label))} formatter={((value: unknown, name: unknown) => [Number(value).toLocaleString() + ' รายการ', String(name)]) as never} />
                        {priorityNames.map((priority, i) => (
                          <Bar 
                            key={priority} 
                            dataKey={priority} 
                            stackId="a" 
                            fill={PRIORITY_COLORS[i % PRIORITY_COLORS.length]}
                            hide={hiddenPriority.has(priority)}
                            maxBarSize={48}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 px-1">
                    {priorityNames.map((priority, i) => (
                      <button
                        key={priority}
                        onClick={() => {
                          const newHidden = new Set(hiddenPriority)
                          if (newHidden.has(priority)) {
                            newHidden.delete(priority)
                          } else {
                            newHidden.add(priority)
                          }
                          setHiddenPriority(newHidden)
                        }}
                        className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
                        style={{ opacity: hiddenPriority.has(priority) ? 0.35 : 1, cursor: 'pointer' }}
                      >
                        <span 
                          className="h-2.5 w-2.5 rounded-sm shrink-0" 
                          style={{ backgroundColor: PRIORITY_COLORS[i % PRIORITY_COLORS.length] }} 
                        />
                        <span className="text-xs leading-tight">{priority}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-12 md:col-span-4" ref={compareByTypeRef}>
          <Card className="card-shadow">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <CardTitle>เปรียบเทียบจำนวนใบส่งแลปต่อผู้ป่วย</CardTitle>
              {comparisonByTypeData.length > 0 && (
                <ChartExportMenu containerRef={compareByTypeRef} data={comparisonByTypeData} title="เปรียบเทียบจำนวนใบส่งแลปต่อผู้ป่วย" />
              )}
            </CardHeader>
            <CardContent>
              {isOrderVsPatientByTypeLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : comparisonByTypeData.every(item => item.patientCount === 0 && item.orderCount === 0) ? (
                <EmptyState title="ไม่มีข้อมูล" className="py-8" />
              ) : (
                <div className="space-y-3">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonByTypeData} margin={{ left: 36, right: 8, top: 4, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                        <XAxis dataKey="patientType" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} height={44} label={{ value: 'ประเภทผู้ป่วย', position: 'insideBottomRight', offset: 0, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={(v: number) => v.toLocaleString()} label={{ value: 'จำนวนรายการ', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={tooltipStyle} formatter={((value: unknown, name: unknown) => [Number(value).toLocaleString() + ' รายการ', String(name)]) as never} />
                        <Bar dataKey="patientCount" name="จำนวนผู้ป่วย" fill="#4F96D1" hide={hiddenCompare.has('patientCount')} maxBarSize={48} />
                        <Bar dataKey="orderCount" name="จำนวนใบสั่งแลป" fill="#E55252" hide={hiddenCompare.has('orderCount')} maxBarSize={48} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 px-1">
                    <button
                      onClick={() => {
                        const next = new Set(hiddenCompare)
                        next.has('patientCount') ? next.delete('patientCount') : next.add('patientCount')
                        setHiddenCompare(next)
                      }}
                      className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
                      style={{ opacity: hiddenCompare.has('patientCount') ? 0.35 : 1, cursor: 'pointer' }}
                    >
                      <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: '#4F96D1' }} />
                      <span className="text-xs leading-tight">จำนวนผู้ป่วย</span>
                    </button>
                    <button
                      onClick={() => {
                        const next = new Set(hiddenCompare)
                        next.has('orderCount') ? next.delete('orderCount') : next.add('orderCount')
                        setHiddenCompare(next)
                      }}
                      className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
                      style={{ opacity: hiddenCompare.has('orderCount') ? 0.35 : 1, cursor: 'pointer' }}
                    >
                      <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: '#E55252' }} />
                      <span className="text-xs leading-tight">จำนวนใบสั่งแลป</span>
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reject + Top Items + Group */}
      <div className="grid gap-6 grid-cols-12">
        <div className="col-span-12 md:col-span-6 xl:col-span-4" ref={rejectRadarRef}>
          <Card className="card-shadow h-full bg-[linear-gradient(150deg,hsl(var(--primary)/0.14)_0%,hsl(var(--card))_58%)]">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <CardTitle>สรุป LAB ที่ถูก Reject</CardTitle>
              <ChartExportMenu containerRef={rejectRadarRef} data={rejectedRadarData ?? []} title="สรุป LAB ที่ถูก Reject" />
            </CardHeader>
            <CardContent className="h-[320px]">
              {isRejectedRadarLoading ? (
                <Skeleton className="h-full w-full" />
              ) : (rejectedRadarData?.length ?? 0) > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={rejectedRadarData ?? []} outerRadius="72%">
                    <PolarGrid radialLines stroke="hsl(var(--border))" strokeOpacity={0.7} />
                    <PolarAngleAxis
                      dataKey="reason"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value: unknown) => String(value).slice(0, 24)}
                    />
                    <PolarRadiusAxis allowDecimals={false} tick={false} axisLine={false} />
                    <Tooltip
                      cursor={false}
                      formatter={((value: unknown) => [Number(value).toLocaleString(), 'จำนวนรายการ']) as never}
                    />
                    <Radar
                      dataKey="rejectedCount"
                      stroke="hsl(var(--chart-1))"
                      fill="hsl(var(--chart-1))"
                      fillOpacity={0.35}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="ไม่พบข้อมูล LAB Reject" description="ยังไม่มีรายการ reject ในช่วงวันที่ที่เลือก" />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-12 md:col-span-6 xl:col-span-3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Top 10 รายการแลป</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px] overflow-auto">
              {isItemsLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : !itemsTop || itemsTop.length === 0 ? (
                <EmptyState title="ไม่มีข้อมูล" className="py-6" />
              ) : (
                <div className="space-y-2">
                  {itemsTop.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="flex-1 truncate text-xs">{idx + 1}. {item.labItemsName}</span>
                      <span className="font-semibold text-muted-foreground ml-2">{item.orderCount}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-12 md:col-span-6 xl:col-span-5">
          <Card className="card-shadow h-full" ref={groupDonutRef}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-sm font-medium">ใบสั่งแยกตามกลุ่มแลป</CardTitle>
                <CardDescription>
                  {groupDonutData.length > 0
                    ? `รวม ${totalGroupOrders.toLocaleString()} รายการ`
                    : 'ไม่มีข้อมูล'}
                </CardDescription>
              </div>
              {groupDonutData.length > 0 && (
                <ChartExportMenu containerRef={groupDonutRef} data={groupDonutData} title="ใบสั่งแยกตามกลุ่มแลป" />
              )}
            </CardHeader>
            <CardContent className="h-[320px]">
              {isGroupLoading ? (
                <div className="flex h-[260px] items-center justify-center">
                  <Skeleton className="h-[220px] w-full" />
                </div>
              ) : groupDonutData.length === 0 ? (
                <EmptyState title="ไม่มีข้อมูล" className="py-6" />
              ) : (
                <div className="flex items-center gap-4">
                  <div className="basis-3/5 min-w-0">
                    <div className="mx-auto aspect-square w-full max-w-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                          <Pie
                            data={groupDonutData}
                            cx="50%"
                            cy="50%"
                            innerRadius="42%"
                            outerRadius="70%"
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="name"
                            strokeWidth={0}
                          >
                            {groupDonutData.map((_, i) => (
                              <Cell key={`group-cell-${i}`} fill={PRIORITY_COLORS[i % PRIORITY_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload || payload.length === 0) return null
                              const item = payload[0]
                              const pct = totalGroupOrders > 0
                                ? Math.round((Number(item.value) / totalGroupOrders) * 100)
                                : 0
                              return (
                                <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700 p-2 text-xs shadow-md">
                                  <div className="font-medium text-slate-900 dark:text-slate-100">{String(item.name)}</div>
                                  <div className="text-slate-500 dark:text-slate-300">จำนวน: {Number(item.value).toLocaleString()} รายการ</div>
                                  <div className="text-slate-500 dark:text-slate-300">สัดส่วน: {pct}%</div>
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
                      {groupDonutData.map((item, i) => {
                        const pct = totalGroupOrders > 0 ? Math.round((item.value / totalGroupOrders) * 100) : 0
                        return (
                          <div key={item.name} className="flex items-center gap-2 text-sm">
                            <span className="inline-block h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: PRIORITY_COLORS[i % PRIORITY_COLORS.length] }} />
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
      </div>

      {/* Location and Department */}
      <div className="grid gap-6 grid-cols-12">
        <div className="col-span-6" ref={locationChartRef}>
          <Card className="card-shadow">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <CardTitle className="text-sm font-medium">ใบสั่งแยกตามตึก</CardTitle>
              {locationChartData.length > 0 && (
                <ChartExportMenu containerRef={locationChartRef} data={locationData || []} title="ใบสั่งแยกตามตึก" />
              )}
            </CardHeader>
            <CardContent>
              {isLocationLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : locationChartData.length === 0 ? (
                <EmptyState title="ไม่มีข้อมูล" className="py-6" />
              ) : (
                <div className="space-y-3">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={locationChartData} margin={{ left: 36, right: 8, top: 4, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                        <XAxis dataKey="date" tickFormatter={formatDateLabel} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} angle={-30} textAnchor="end" height={44} label={{ value: 'วันที่', position: 'insideBottomRight', offset: 0, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={(v: number) => v.toLocaleString()} label={{ value: 'จำนวนรายการ', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={tooltipStyle} labelFormatter={(label: unknown) => formatDateLabel(String(label))} formatter={((value: unknown, name: unknown) => [Number(value).toLocaleString() + ' รายการ', String(name)]) as never} />
                        {locationNames.map((name, i) => (
                          <Bar key={name} dataKey={name} stackId="a" fill={PRIORITY_COLORS[i % PRIORITY_COLORS.length]} hide={hiddenLocation.has(name)} maxBarSize={48} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 px-1">
                    {locationNames.map((name, i) => (
                      <button
                        key={name}
                        onClick={() => {
                          const next = new Set(hiddenLocation)
                          next.has(name) ? next.delete(name) : next.add(name)
                          setHiddenLocation(next)
                        }}
                        className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
                        style={{ opacity: hiddenLocation.has(name) ? 0.35 : 1, cursor: 'pointer' }}
                      >
                        <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: PRIORITY_COLORS[i % PRIORITY_COLORS.length] }} />
                        <span className="text-xs leading-tight">{name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-6" ref={deptChartRef}>
          <Card className="card-shadow">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <CardTitle className="text-sm font-medium">ใบสั่งแยกแผนก</CardTitle>
              {deptChartData.length > 0 && (
                <ChartExportMenu containerRef={deptChartRef} data={deptData || []} title="ใบสั่งแยกแผนก" />
              )}
            </CardHeader>
            <CardContent>
              {isDeptLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : deptChartData.length === 0 ? (
                <EmptyState title="ไม่มีข้อมูล" className="py-6" />
              ) : (
                <div className="space-y-3">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deptChartData} margin={{ left: 36, right: 8, top: 4, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                        <XAxis dataKey="date" tickFormatter={formatDateLabel} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} angle={-30} textAnchor="end" height={44} label={{ value: 'วันที่', position: 'insideBottomRight', offset: 0, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={(v: number) => v.toLocaleString()} label={{ value: 'จำนวนรายการ', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={tooltipStyle} labelFormatter={(label: unknown) => formatDateLabel(String(label))} formatter={((value: unknown, name: unknown) => [Number(value).toLocaleString() + ' รายการ', String(name)]) as never} />
                        {deptNames.map((name, i) => (
                          <Bar key={name} dataKey={name} stackId="a" fill={PRIORITY_COLORS[i % PRIORITY_COLORS.length]} hide={hiddenDept.has(name)} maxBarSize={48} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-3 gap-x-3 gap-y-2 mt-3 px-1">
                    {deptNames.map((name, i) => (
                      <button
                        key={name}
                        onClick={() => {
                          const next = new Set(hiddenDept)
                          next.has(name) ? next.delete(name) : next.add(name)
                          setHiddenDept(next)
                        }}
                        className="flex w-full min-w-0 items-center gap-1.5 transition-opacity hover:opacity-80"
                        style={{ opacity: hiddenDept.has(name) ? 0.35 : 1, cursor: 'pointer' }}
                        title={name}
                      >
                        <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: PRIORITY_COLORS[i % PRIORITY_COLORS.length] }} />
                        <span className="min-w-0 flex-1 truncate text-left text-xs leading-tight">{name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
