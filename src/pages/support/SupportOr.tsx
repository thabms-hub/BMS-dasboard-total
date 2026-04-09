// =============================================================================
// Support: ระบบห้องผ่าตัด OR
// =============================================================================

import { useCallback, useMemo, useRef, useState } from 'react'
import { Scissors, Users, Activity, ClipboardList, CircleDollarSign, AlertCircle } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { useBmsSessionContext } from '@/contexts/BmsSessionContext'
import { useQuery } from '@/hooks/useQuery'
import { usePersistentDateRange } from '@/hooks/usePersistentDateRange'
import { ChartExportMenu } from '@/components/dashboard/ChartExportMenu'
import { DepartmentPageTemplate } from '@/components/dashboard/DepartmentPageTemplate'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/dashboard/EmptyState'
import {
  getOrSummary,
  getOrTopOperations,
  getOrByUrgency,
  getOrByType,
  getOrByStatus,
} from '@/services/orService'
import type {
  OrSummary,
  OrTopOperationItem,
  OrUrgencyItem,
  OrOperationTypeItem,
  OrStatusItem,
} from '@/types'

const tooltipStyle = {
  borderRadius: '8px',
  border: '1px solid hsl(var(--border))',
  backgroundColor: 'hsl(var(--popover))',
  color: 'hsl(var(--popover-foreground))',
  fontSize: '12px',
}

const watermarkItems = Array.from({ length: 120 }, (_, index) => `wm-${index}`)

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export default function SupportOr() {
  const { connectionConfig, session } = useBmsSessionContext()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const { startDate, endDate, setRange } = usePersistentDateRange('support-or', 30)

  const topOpsRef = useRef<HTMLDivElement>(null)
  const urgencyRef = useRef<HTMLDivElement>(null)
  const typeRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)

  const isConnected = connectionConfig !== null && session !== null

  const summaryFn = useCallback(
    () => getOrSummary(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )
  const topOpsFn = useCallback(
    () => getOrTopOperations(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )
  const urgencyFn = useCallback(
    () => getOrByUrgency(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )
  const typeFn = useCallback(
    () => getOrByType(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )
  const statusFn = useCallback(
    () => getOrByStatus(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )

  const { data: summary, isLoading: isSummaryLoading, error: summaryError, execute: executeSummary } = useQuery<OrSummary>({
    queryFn: summaryFn,
    enabled: isConnected,
  })
  const { data: topOps, isLoading: isTopOpsLoading, execute: executeTopOps } = useQuery<OrTopOperationItem[]>({
    queryFn: topOpsFn,
    enabled: isConnected,
  })
  const { data: urgencyData, isLoading: isUrgencyLoading, execute: executeUrgency } = useQuery<OrUrgencyItem[]>({
    queryFn: urgencyFn,
    enabled: isConnected,
  })
  const { data: typeData, isLoading: isTypeLoading, execute: executeType } = useQuery<OrOperationTypeItem[]>({
    queryFn: typeFn,
    enabled: isConnected,
  })
  const { data: statusData, isLoading: isStatusLoading, execute: executeStatus } = useQuery<OrStatusItem[]>({
    queryFn: statusFn,
    enabled: isConnected,
  })

  const topOpsChartData = useMemo(() => topOps ?? [], [topOps])
  const urgencyChartData = useMemo(() => (urgencyData ?? []).slice(0, 10), [urgencyData])
  const typeChartData = useMemo(() => (typeData ?? []).slice(0, 10), [typeData])
  const statusChartData = useMemo(() => statusData ?? [], [statusData])

  const handleRangeChange = useCallback((newStartDate: string, newEndDate: string) => {
    setRange(newStartDate, newEndDate)
  }, [setRange])

  const handleRefresh = useCallback(async () => {
    if (!isConnected) return
    setIsRefreshing(true)
    try {
      await Promise.all([
        executeSummary(),
        executeTopOps(),
        executeUrgency(),
        executeType(),
        executeStatus(),
      ])
      setLastUpdated(new Date())
    } finally {
      setIsRefreshing(false)
    }
  }, [isConnected, executeSummary, executeTopOps, executeUrgency, executeType, executeStatus])

  if (!isConnected) {
    return (
      <EmptyState
        icon={<Scissors className="h-5 w-5" />}
        title="ยังไม่เชื่อมต่อ BMS Session"
        description="กรุณาเชื่อมต่อ Session ก่อนใช้งานแดชบอร์ดระบบห้องผ่าตัด"
      />
    )
  }

  return (
    <DepartmentPageTemplate
      title="ระบบห้องผ่าตัด OR"
      subtitle="Operating Room"
      icon={Scissors}
      enableDateFilter
      dateRangeStorageKey="support-or"
      defaultDateRangeDays={30}
      isDateFilterLoading={isRefreshing}
      onDateRangeChange={handleRangeChange}
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
      lastUpdated={lastUpdated}
    >
      <div className="relative space-y-6">
        <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
          <div className="absolute inset-[-14%] grid grid-cols-3 gap-x-14 gap-y-12 sm:grid-cols-4 lg:grid-cols-6 rotate-[-22deg]">
            {watermarkItems.map((key) => (
              <span
                key={key}
                className="select-none text-[16px] font-bold uppercase tracking-[0.24em] text-muted-foreground/14"
              >
                กำลังพัฒนา
              </span>
            ))}
          </div>
        </div>

        {summaryError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span><span className="font-semibold">ไม่สามารถโหลดข้อมูลได้:</span> {summaryError.message}</span>
          </div>
        )}

        <div className="grid gap-4 grid-cols-12">
          <Card className="col-span-12 sm:col-span-6 xl:col-span-3">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-orange-700">
                    <ClipboardList className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-xs font-medium text-muted-foreground">ทะเบียนผู้ป่วย Set ที่ยังไม่ได้รับเข้าห้องผ่าตัด</p>
                </div>
                {isSummaryLoading ? <Skeleton className="h-8 w-24 mx-auto mt-2" /> : <p className="text-2xl font-bold mt-2">{summary?.pendingSetCount.toLocaleString() ?? 0}</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-12 sm:col-span-4 xl:col-span-3">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                    <Users className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-xs font-medium text-muted-foreground">ผู้ป่วยผ่าตัดทั้งหมด</p>
                </div>
                {isSummaryLoading ? <Skeleton className="h-8 w-24 mx-auto mt-2" /> : <p className="text-2xl font-bold mt-2">{summary?.totalPatients.toLocaleString() ?? 0}</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-12 sm:col-span-4 xl:col-span-3">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                    <Activity className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-xs font-medium text-muted-foreground">จำนวนผ่าตัดทั้งหมด</p>
                </div>
                {isSummaryLoading ? <Skeleton className="h-8 w-24 mx-auto mt-2" /> : <p className="text-2xl font-bold mt-2">{summary?.totalSurgeries.toLocaleString() ?? 0}</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-12 sm:col-span-4 xl:col-span-3">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <CircleDollarSign className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-xs font-medium text-muted-foreground">รวมยอดค่าผ่าตัดทั้งหมด</p>
                </div>
                {isSummaryLoading ? <Skeleton className="h-8 w-24 mx-auto mt-2" /> : <p className="text-2xl font-bold mt-2">{formatCurrency(summary?.totalAmount ?? 0)}</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 grid-cols-12">
          <div className="col-span-12 lg:col-span-6" ref={topOpsRef}>
            <Card className="card-shadow h-full">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle>อันดับรายการผ่าตัด</CardTitle>
                {(topOpsChartData.length > 0) && (
                  <ChartExportMenu containerRef={topOpsRef} data={topOpsChartData} title="อันดับรายการผ่าตัด" />
                )}
              </CardHeader>
              <CardContent className="h-[320px]">
                {isTopOpsLoading ? (
                  <Skeleton className="h-[280px] w-full" />
                ) : topOpsChartData.length === 0 ? (
                  <EmptyState title="ไม่มีข้อมูล" className="py-6" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={[...topOpsChartData].reverse()} margin={{ left: 140, right: 20, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={(v: number) => v.toLocaleString()} />
                      <YAxis type="category" dataKey="operationName" width={136} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={tooltipStyle} formatter={((v: unknown) => [Number(v).toLocaleString() + ' รายการ', 'จำนวนผ่าตัด']) as never} />
                      <Bar dataKey="surgeryCount" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="col-span-12 lg:col-span-6" ref={urgencyRef}>
            <Card className="card-shadow h-full">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle>ความเร่งด่วน</CardTitle>
                  <CardDescription>แยกตาม emergency ของงานผ่าตัด</CardDescription>
                </div>
                {(urgencyChartData.length > 0) && (
                  <ChartExportMenu containerRef={urgencyRef} data={urgencyChartData} title="ความเร่งด่วน" />
                )}
              </CardHeader>
              <CardContent className="h-[320px]">
                {isUrgencyLoading ? (
                  <Skeleton className="h-[280px] w-full" />
                ) : urgencyChartData.length === 0 ? (
                  <EmptyState title="ไม่มีข้อมูล" className="py-6" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={urgencyChartData} margin={{ left: 36, right: 8, top: 4, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                      <XAxis dataKey="urgencyName" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={(v: number) => v.toLocaleString()} />
                      <Tooltip contentStyle={tooltipStyle} formatter={((v: unknown) => [Number(v).toLocaleString() + ' รายการ', 'จำนวนผ่าตัด']) as never} />
                      <Bar dataKey="surgeryCount" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} maxBarSize={42} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid gap-6 grid-cols-12">
          <div className="col-span-12 lg:col-span-6" ref={typeRef}>
            <Card className="card-shadow h-full">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle>ประเภทการผ่าตัด</CardTitle>
                {(typeChartData.length > 0) && (
                  <ChartExportMenu containerRef={typeRef} data={typeChartData} title="ประเภทการผ่าตัด" />
                )}
              </CardHeader>
              <CardContent className="h-[320px]">
                {isTypeLoading ? (
                  <Skeleton className="h-[280px] w-full" />
                ) : typeChartData.length === 0 ? (
                  <EmptyState title="ไม่มีข้อมูล" className="py-6" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={[...typeChartData].reverse()} margin={{ left: 140, right: 20, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={(v: number) => v.toLocaleString()} />
                      <YAxis type="category" dataKey="operationTypeName" width={136} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={tooltipStyle} formatter={((v: unknown) => [Number(v).toLocaleString() + ' รายการ', 'จำนวนผ่าตัด']) as never} />
                      <Bar dataKey="surgeryCount" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="col-span-12 lg:col-span-6" ref={statusRef}>
            <Card className="card-shadow h-full">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle>สถานะการผ่าตัด</CardTitle>
                {(statusChartData.length > 0) && (
                  <ChartExportMenu containerRef={statusRef} data={statusChartData} title="สถานะการผ่าตัด" />
                )}
              </CardHeader>
              <CardContent className="h-[320px]">
                {isStatusLoading ? (
                  <Skeleton className="h-[280px] w-full" />
                ) : statusChartData.length === 0 ? (
                  <EmptyState title="ไม่มีข้อมูล" className="py-6" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusChartData} margin={{ left: 36, right: 8, top: 4, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                      <XAxis dataKey="statusName" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={(v: number) => v.toLocaleString()} />
                      <Tooltip contentStyle={tooltipStyle} formatter={((v: unknown) => [Number(v).toLocaleString() + ' รายการ', 'จำนวนผ่าตัด']) as never} />
                      <Bar dataKey="surgeryCount" fill="hsl(var(--chart-4))" radius={[6, 6, 0, 0]} maxBarSize={42} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DepartmentPageTemplate>
  )
}
