// =============================================================================
// Support: ระบบห้องผ่าตัด OR
// =============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Scissors, Users, Activity, ClipboardList, CircleDollarSign, AlertCircle, Info } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts'
import { useBmsSessionContext } from '@/contexts/BmsSessionContext'
import { useQuery } from '@/hooks/useQuery'
import { usePersistentDateRange } from '@/hooks/usePersistentDateRange'
import { ChartExportMenu } from '@/components/dashboard/ChartExportMenu'
import { DepartmentPageTemplate } from '@/components/dashboard/DepartmentPageTemplate'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/dashboard/EmptyState'
import {
  getOrSummary,
  getOrTopOperations,
  getOrByUrgency,
  getOrByType,
  getOrByStatus,
  getOrRoomUsageByShift,
  getOrAnesthesiaTypes,
  getOrAverageDurationByOperation,
} from '@/services/orService'
import type {
  OrSummary,
  OrTopOperationItem,
  OrUrgencyItem,
  OrOperationTypeItem,
  OrStatusItem,
  OrRoomUsageByShiftItem,
  OrAnesthesiaTypeItem,
  OrOperationDurationItem,
} from '@/types'

const tooltipStyle = {
  borderRadius: '8px',
  border: '1px solid hsl(var(--border))',
  backgroundColor: 'hsl(var(--popover))',
  color: 'hsl(var(--popover-foreground))',
  fontSize: '12px',
}

const pageSize = 10
const urgencyColors = ['#ef4444', '#f97316', '#f59e0b', '#14b8a6', '#3b82f6', '#8b5cf6']
const anesColors = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
]
const statusColors = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
]
const typeColors = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
]

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase()
}

function matchesAnyKeyword(value: string, keywords: string[]): boolean {
  const normalizedValue = normalizeLabel(value)
  return keywords.some((keyword) => normalizedValue.includes(keyword))
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function truncateOperationLabel(label: string, maxLength = 20): string {
  if (label.length <= maxLength) {
    return label
  }
  return `${label.slice(0, maxLength).trimEnd()}...`
}

type TopOpsTickProps = {
  x?: number
  y?: number
  payload?: {
    value?: string
  }
}

function TopOpsYAxisTick({ x = 0, y = 0, payload }: TopOpsTickProps) {
  const rawLabel = payload?.value ? String(payload.value) : ''
  const displayLabel = truncateOperationLabel(rawLabel, 20)

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={-102}
        y={4}
        fontSize={10}
        fill="hsl(var(--muted-foreground))"
      >
        {displayLabel}
      </text>
      <title>{rawLabel}</title>
    </g>
  )
}

function getTopOpsBarFill(index: number, total: number): string {
  if (total <= 1) {
    return 'hsl(var(--chart-1))'
  }

  const minOpacity = 0.42
  const maxOpacity = 1
  const ratio = index / (total - 1)
  const opacity = maxOpacity - (maxOpacity - minOpacity) * ratio
  return `hsl(var(--chart-1) / ${opacity.toFixed(3)})`
}

type HeaderTitleWithTooltipProps = {
  title: string
  description: string
}

function HeaderTitleWithTooltip({ title, description }: HeaderTitleWithTooltipProps) {
  return (
    <CardTitle className="flex items-center gap-2">
      <span>{title}</span>
      <span className="group relative inline-flex">
        <span
          className="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-primary"
          aria-label={description}
        >
          <Info className="h-3 w-3" />
        </span>
        <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 rounded-md bg-popover p-2 text-xs font-normal text-muted-foreground opacity-0 shadow-md transition-opacity duration-75 group-hover:opacity-100">
          {description}
        </span>
      </span>
    </CardTitle>
  )
}

export default function SupportOr() {
  const { connectionConfig, session } = useBmsSessionContext()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [roomUsagePage, setRoomUsagePage] = useState(0)
  const [durationPage, setDurationPage] = useState(0)
  const { startDate, endDate, setRange } = usePersistentDateRange('support-or', 30)

  const topOpsRef = useRef<HTMLDivElement>(null)
  const urgencyRef = useRef<HTMLDivElement>(null)
  const typeRef = useRef<HTMLDivElement>(null)
  const roomUsageRef = useRef<HTMLDivElement>(null)
  const anesTypeRef = useRef<HTMLDivElement>(null)
  const statusDonutRef = useRef<HTMLDivElement>(null)
  const durationRef = useRef<HTMLDivElement>(null)

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
  const roomUsageFn = useCallback(
    () => getOrRoomUsageByShift(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )
  const anesTypeFn = useCallback(
    () => getOrAnesthesiaTypes(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )
  const durationFn = useCallback(
    () => getOrAverageDurationByOperation(connectionConfig!, startDate, endDate),
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
  const {
    data: roomUsageData,
    isLoading: isRoomUsageLoading,
    error: roomUsageError,
    execute: executeRoomUsage,
  } = useQuery<OrRoomUsageByShiftItem[]>({
    queryFn: roomUsageFn,
    enabled: isConnected,
  })
  const {
    data: anesTypeData,
    isLoading: isAnesTypeLoading,
    error: anesTypeError,
    execute: executeAnesType,
  } = useQuery<OrAnesthesiaTypeItem[]>({
    queryFn: anesTypeFn,
    enabled: isConnected,
  })
  const {
    data: durationData,
    isLoading: isDurationLoading,
    error: durationError,
    execute: executeDuration,
  } = useQuery<OrOperationDurationItem[]>({
    queryFn: durationFn,
    enabled: isConnected,
  })

  const topOpsChartData = useMemo(
    () => [...(topOps ?? [])].sort((left, right) => right.surgeryCount - left.surgeryCount),
    [topOps],
  )
  const urgencyChartData = useMemo(() => {
    const items = urgencyData ?? []
    if (items.length <= 5) {
      return items
    }

    const visibleItems = items.slice(0, 5)
    const remainingTotal = items.slice(5).reduce((sum, item) => sum + item.surgeryCount, 0)
    return [...visibleItems, { urgencyName: 'อื่นๆ', surgeryCount: remainingTotal }]
  }, [urgencyData])
  const typeChartData = useMemo(() => {
    const items = typeData ?? []
    if (items.length <= 5) {
      return items
    }

    const visibleItems = items.slice(0, 5)
    const remainingTotal = items.slice(5).reduce((sum, item) => sum + item.surgeryCount, 0)
    return [...visibleItems, { operationTypeName: 'อื่นๆ', surgeryCount: remainingTotal }]
  }, [typeData])
  const statusChartData = useMemo(() => statusData ?? [], [statusData])
  const urgencyTotal = useMemo(
    () => urgencyChartData.reduce((sum, item) => sum + item.surgeryCount, 0),
    [urgencyChartData],
  )
  const typeTotal = useMemo(
    () => typeChartData.reduce((sum, item) => sum + item.surgeryCount, 0),
    [typeChartData],
  )
  const finishedSurgeryCount = useMemo(
    () => statusChartData
      .filter((item) => matchesAnyKeyword(item.statusName, ['เสร็จ', 'สำเร็จ', 'complete', 'completed', 'done']))
      .reduce((sum, item) => sum + item.surgeryCount, 0),
    [statusChartData],
  )
  const cancelledSurgeryCount = useMemo(
    () => statusChartData
      .filter((item) => matchesAnyKeyword(item.statusName, ['ยกเลิก', 'cancel', 'งด']))
      .reduce((sum, item) => sum + item.surgeryCount, 0),
    [statusChartData],
  )
  const roomUsageRows = useMemo(() => roomUsageData ?? [], [roomUsageData])
  const anesTypeChartData = useMemo(() => (anesTypeData ?? []).slice(0, 6), [anesTypeData])
  const durationRows = useMemo(
    () => [...(durationData ?? [])].sort((left, right) => right.avgDurationMinutes - left.avgDurationMinutes),
    [durationData],
  )
  const maxDurationMinutes = useMemo(
    () => Math.max(...durationRows.map((item) => item.avgDurationMinutes), 1),
    [durationRows],
  )
  const anesTypeTotal = useMemo(
    () => anesTypeChartData.reduce((sum, item) => sum + item.caseCount, 0),
    [anesTypeChartData],
  )
  const anesDonutData = useMemo(() => {
    const sorted = [...anesTypeChartData].sort((left, right) => right.caseCount - left.caseCount)
    const compact = sorted.length > 4
      ? [
          ...sorted.slice(0, 3),
          {
            anesName: 'Other',
            caseCount: sorted.slice(3).reduce((sum, item) => sum + item.caseCount, 0),
          },
        ]
      : sorted
    const total = compact.reduce((sum, item) => sum + item.caseCount, 0)
    return compact.map((item, index) => ({
      ...item,
      fill: anesColors[index % anesColors.length],
      percent: total > 0 ? (item.caseCount / total) * 100 : 0,
    }))
  }, [anesTypeChartData])
  const statusDonutData = useMemo(() => {
    const sorted = [...statusChartData].sort((left, right) => right.surgeryCount - left.surgeryCount)
    const compact = sorted.length > 4
      ? [
          ...sorted.slice(0, 3),
          {
            statusName: 'Other',
            surgeryCount: sorted.slice(3).reduce((sum, item) => sum + item.surgeryCount, 0),
          },
        ]
      : sorted
    const total = compact.reduce((sum, item) => sum + item.surgeryCount, 0)
    return compact.map((item, index) => ({
      ...item,
      fill: statusColors[index % statusColors.length],
      percent: total > 0 ? (item.surgeryCount / total) * 100 : 0,
    }))
  }, [statusChartData])
  const statusDonutTotal = useMemo(
    () => statusDonutData.reduce((sum, item) => sum + item.surgeryCount, 0),
    [statusDonutData],
  )
  const urgencyDescription = useMemo(
    () => (urgencyChartData.length > 0 ? `รวม ${urgencyTotal.toLocaleString()} รายการ` : 'ไม่มีข้อมูล'),
    [urgencyChartData.length, urgencyTotal],
  )
  const anesTypeDescription = useMemo(
    () => (anesTypeChartData.length > 0 ? `รวม ${anesTypeTotal.toLocaleString()} เคส` : 'ไม่มีข้อมูล'),
    [anesTypeChartData.length, anesTypeTotal],
  )
  const topOpsPageRows = useMemo(
    () => topOpsChartData.slice(0, pageSize),
    [topOpsChartData],
  )
  const durationTotalPages = useMemo(
    () => Math.max(Math.ceil(durationRows.length / pageSize), 1),
    [durationRows.length],
  )
  const durationPageRows = useMemo(
    () => durationRows.slice(durationPage * pageSize, (durationPage + 1) * pageSize),
    [durationRows, durationPage],
  )
  const shiftLabelOrder = useMemo(() => {
    const orderMap = new Map<string, number>([
      ['เวรเช้า', 0],
      ['เวรบ่าย', 1],
      ['เวรดึก', 2],
    ])
    return Array.from(new Set(roomUsageRows.map((item) => item.shiftName))).sort((left, right) => {
      const leftOrder = orderMap.get(left) ?? 99
      const rightOrder = orderMap.get(right) ?? 99
      if (leftOrder === rightOrder) {
        return left.localeCompare(right)
      }
      return leftOrder - rightOrder
    })
  }, [roomUsageRows])
  const roomUsageTableRows = useMemo(() => {
    const roomMap = new Map<string, Record<string, number>>()
    roomUsageRows.forEach((item) => {
      const byShift = roomMap.get(item.roomName) ?? {}
      byShift[item.shiftName] = item.usageCount
      roomMap.set(item.roomName, byShift)
    })

    return Array.from(roomMap.entries()).map(([roomName, byShift]) => ({
      roomName,
      values: shiftLabelOrder.map((shiftName) => byShift[shiftName] ?? 0),
    }))
  }, [roomUsageRows, shiftLabelOrder])
  const roomUsageTotalPages = useMemo(
    () => Math.max(Math.ceil(roomUsageTableRows.length / pageSize), 1),
    [roomUsageTableRows.length],
  )
  const roomUsagePageRows = useMemo(
    () => roomUsageTableRows.slice(roomUsagePage * pageSize, (roomUsagePage + 1) * pageSize),
    [roomUsageTableRows, roomUsagePage],
  )

  useEffect(() => {
    setDurationPage((prev) => Math.min(prev, durationTotalPages - 1))
  }, [durationTotalPages])

  useEffect(() => {
    setRoomUsagePage((prev) => Math.min(prev, roomUsageTotalPages - 1))
  }, [roomUsageTotalPages])

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
        executeRoomUsage(),
        executeAnesType(),
        executeDuration(),
      ])
      setLastUpdated(new Date())
    } finally {
      setIsRefreshing(false)
    }
  }, [
    isConnected,
    executeSummary,
    executeTopOps,
    executeUrgency,
    executeType,
    executeStatus,
    executeRoomUsage,
    executeAnesType,
    executeDuration,
  ])

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
        {summaryError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span><span className="font-semibold">ไม่สามารถโหลดข้อมูลได้:</span> {summaryError.message}</span>
          </div>
        )}

        <div className="grid gap-4 grid-cols-12">
          <Card className="col-span-12 sm:col-span-6 xl:col-span-2">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-orange-700">
                    <ClipboardList className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-xs font-medium text-muted-foreground">ผู้ป่วย Set รอรับเข้าห้องผ่าตัด</p>
                </div>
                {isSummaryLoading ? <Skeleton className="h-8 w-24 mx-auto mt-2" /> : <p className="text-2xl font-bold mt-2">{summary?.pendingSetCount.toLocaleString() ?? 0}</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-12 sm:col-span-6 xl:col-span-2">
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

          <Card className="col-span-12 sm:col-span-6 xl:col-span-2">
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

          <Card className="col-span-12 sm:col-span-6 xl:col-span-2">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Activity className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-xs font-medium text-muted-foreground">ผ่าตัดเสร็จแล้ว</p>
                </div>
                {isStatusLoading ? <Skeleton className="mx-auto mt-2 h-8 w-24" /> : <p className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-300">{finishedSurgeryCount.toLocaleString()}</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-12 sm:col-span-6 xl:col-span-2">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                    <AlertCircle className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-xs font-medium text-muted-foreground">ยกเลิกผ่าตัด</p>
                </div>
                {isStatusLoading ? <Skeleton className="mx-auto mt-2 h-8 w-24" /> : <p className="mt-2 text-2xl font-bold text-rose-700 dark:text-rose-300">{cancelledSurgeryCount.toLocaleString()}</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-12 sm:col-span-6 xl:col-span-2">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <CircleDollarSign className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-xs font-medium text-muted-foreground">ยอดค่าผ่าตัดทั้งหมด</p>
                </div>
                {isSummaryLoading ? <Skeleton className="h-8 w-24 mx-auto mt-2" /> : <p className="text-2xl font-bold mt-2">{formatCurrency(summary?.totalAmount ?? 0)}</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 grid-cols-12">
          <div className="col-span-12 lg:col-span-4" ref={urgencyRef}>
            <Card className="card-shadow h-full flex flex-col">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <HeaderTitleWithTooltip title="ความเร่งด่วน" description={urgencyDescription} />
                {(urgencyChartData.length > 0) && (
                  <ChartExportMenu containerRef={urgencyRef} data={urgencyChartData} title="ความเร่งด่วน" />
                )}
              </CardHeader>
              <CardContent className="flex-1 p-0">
                {isUrgencyLoading ? (
                  <Skeleton className="h-[96px] w-full" />
                ) : urgencyChartData.length === 0 ? (
                  <EmptyState title="ไม่มีข้อมูล" className="py-6" />
                ) : (
                  <div className="space-y-4 px-3 pb-3">
                    <div className="flex h-12 w-full overflow-hidden rounded-sm border">
                      {urgencyChartData.map((item, index) => {
                        const ratio = urgencyTotal > 0 ? (item.surgeryCount / urgencyTotal) * 100 : 0
                        const color = urgencyColors[index % urgencyColors.length]
                        return (
                          <div
                            key={item.urgencyName}
                            style={{ width: `${ratio}%`, backgroundColor: color }}
                            title={`${item.urgencyName}: ${item.surgeryCount.toLocaleString()} รายการ`}
                          />
                        )
                      })}
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {urgencyChartData.map((item, index) => {
                        const color = urgencyColors[index % urgencyColors.length]
                        return (
                          <div key={item.urgencyName} className="flex flex-col items-start gap-1">
                            <div className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
                              <span className="text-xs font-medium">{item.urgencyName}</span>
                            </div>
                            <span className="text-sm font-bold" style={{ color }}>{item.surgeryCount.toLocaleString()}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="col-span-12 lg:col-span-8" ref={typeRef}>
            <Card className="card-shadow h-full flex flex-col">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <HeaderTitleWithTooltip title="ประเภทการผ่าตัด" description="สัดส่วนจำนวนผ่าตัดแยกตามประเภท" />
                {(typeChartData.length > 0) && (
                  <ChartExportMenu containerRef={typeRef} data={typeChartData} title="ประเภทการผ่าตัด" />
                )}
              </CardHeader>
              <CardContent className="flex-1 pt-2">
                {isTypeLoading ? (
                  <Skeleton className="h-[96px] w-full" />
                ) : typeChartData.length === 0 ? (
                  <EmptyState title="ไม่มีข้อมูล" className="py-6" />
                ) : (
                  <div className="space-y-4">
                    <div className="flex h-12 w-full overflow-hidden rounded-sm border">
                      {typeChartData.map((item, index) => {
                        const ratio = typeTotal > 0 ? (item.surgeryCount / typeTotal) * 100 : 0
                        const color = typeColors[index % typeColors.length]
                        return (
                          <div
                            key={item.operationTypeName}
                            style={{ width: `${ratio}%`, backgroundColor: color }}
                            title={`${item.operationTypeName}: ${item.surgeryCount.toLocaleString()} รายการ`}
                          />
                        )
                      })}
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                      {typeChartData.map((item, index) => {
                        const color = typeColors[index % typeColors.length]
                        return (
                          <div key={item.operationTypeName} className="flex flex-col items-start gap-1">
                            <div className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
                              <span className="text-xs font-medium">{item.operationTypeName}</span>
                            </div>
                            <span className="text-sm font-bold" style={{ color }}>{item.surgeryCount.toLocaleString()}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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
              <CardContent className="h-[300px] flex flex-col">
                {isTopOpsLoading ? (
                  <Skeleton className="h-[280px] w-full" />
                ) : topOpsChartData.length === 0 ? (
                  <EmptyState title="ไม่มีข้อมูล" className="py-6" />
                ) : (
                  <div className="min-h-0 flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={topOpsPageRows} margin={{ left: 16, right: 20, top: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={(v: number) => v.toLocaleString()} />
                        <YAxis type="category" dataKey="operationName" width={112} tick={<TopOpsYAxisTick />} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={tooltipStyle} formatter={((v: unknown) => [Number(v).toLocaleString() + ' รายการ', 'จำนวนผ่าตัด']) as never} />
                        <Bar dataKey="surgeryCount" radius={[0, 4, 4, 0]} maxBarSize={18}>
                          {topOpsPageRows.map((item, index) => (
                            <Cell key={`top-op-bar-${item.operationName}-${index}`} fill={getTopOpsBarFill(index, topOpsPageRows.length)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="col-span-12 lg:col-span-3" ref={anesTypeRef}>
            <Card className="card-shadow h-full">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <HeaderTitleWithTooltip title="ประเภทวิสัญญี" description={anesTypeDescription} />
                {anesTypeChartData.length > 0 && (
                  <ChartExportMenu containerRef={anesTypeRef} data={anesTypeChartData} title="ประเภทวิสัญญี" />
                )}
              </CardHeader>
              <CardContent className="h-[300px] overflow-hidden">
                {isAnesTypeLoading ? (
                  <div className="flex h-[280px] items-center justify-center">
                    <Skeleton className="h-[240px] w-full" />
                  </div>
                ) : anesTypeError ? (
                  <p className="text-xs text-destructive">โหลดข้อมูลไม่สำเร็จ: {anesTypeError.message}</p>
                ) : anesDonutData.length === 0 ? (
                  <EmptyState title="ไม่มีข้อมูล" className="py-6" />
                ) : (
                  <div className="flex h-full flex-col gap-2">
                    <div className="relative mx-auto h-[180px] w-full max-w-[220px] shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={anesDonutData}
                            dataKey="caseCount"
                            nameKey="anesName"
                            cx="50%"
                            cy="50%"
                            innerRadius="56%"
                            outerRadius="84%"
                            paddingAngle={2}
                            strokeWidth={0}
                          >
                            {anesDonutData.map((item) => (
                              <Cell key={item.anesName} fill={item.fill} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} formatter={((v: unknown) => [Number(v).toLocaleString() + ' เคส', 'จำนวน']) as never} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-3xl font-bold leading-none text-slate-700 dark:text-slate-100">{anesTypeTotal.toLocaleString()}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Total</p>
                      </div>
                    </div>
                    <div className="min-h-0 space-y-1 overflow-y-auto pr-1 text-xs">
                      {anesDonutData.map((item) => (
                        <div key={item.anesName} className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                          <span className="flex-1 truncate">{item.anesName}</span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">{item.percent.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="col-span-12 lg:col-span-3" ref={statusDonutRef}>
            <Card className="card-shadow h-full">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle>สถานะการผ่าตัด</CardTitle>
                {statusDonutData.length > 0 && (
                  <ChartExportMenu containerRef={statusDonutRef} data={statusDonutData} title="สถานะการผ่าตัด" />
                )}
              </CardHeader>
              <CardContent className="h-[300px] overflow-hidden">
                {isStatusLoading ? (
                  <div className="flex h-[280px] items-center justify-center">
                    <Skeleton className="h-[240px] w-full" />
                  </div>
                ) : statusDonutData.length === 0 ? (
                  <EmptyState title="ไม่มีข้อมูล" className="py-6" />
                ) : (
                  <div className="flex h-full flex-col gap-2">
                    <div className="relative mx-auto h-[180px] w-full max-w-[220px] shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusDonutData}
                            dataKey="surgeryCount"
                            nameKey="statusName"
                            cx="50%"
                            cy="50%"
                            innerRadius="56%"
                            outerRadius="84%"
                            paddingAngle={2}
                            strokeWidth={0}
                          >
                            {statusDonutData.map((item) => (
                              <Cell key={item.statusName} fill={item.fill} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} formatter={((v: unknown) => [Number(v).toLocaleString() + ' รายการ', 'จำนวน']) as never} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-3xl font-bold leading-none text-slate-700 dark:text-slate-100">{statusDonutTotal.toLocaleString()}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Total</p>
                      </div>
                    </div>
                    <div className="min-h-0 space-y-1 overflow-y-auto pr-1 text-xs">
                      {statusDonutData.map((item) => (
                        <div key={item.statusName} className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                          <span className="flex-1 truncate">{item.statusName}</span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">{item.percent.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid gap-6 grid-cols-12">
          <div className="col-span-12 lg:col-span-6" ref={roomUsageRef}>
            <Card className="card-shadow h-full">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <HeaderTitleWithTooltip title="สรุปการใช้ห้อง แยกตามเวร" description="เทียบจำนวนการใช้ห้องผ่าตัดในแต่ละเวร" />
                {roomUsageRows.length > 0 && (
                  <ChartExportMenu containerRef={roomUsageRef} data={roomUsageRows} title="สรุปการใช้ห้อง แยกตามเวร" />
                )}
              </CardHeader>
              <CardContent>
                {isRoomUsageLoading ? (
                  <Skeleton className="h-52 w-full" />
                ) : roomUsageError ? (
                  <p className="text-xs text-destructive">โหลดข้อมูลไม่สำเร็จ: {roomUsageError.message}</p>
                ) : roomUsageTableRows.length > 0 && shiftLabelOrder.length > 0 ? (
                  <div className="space-y-2">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[120px]">ห้องผ่าตัด</TableHead>
                            {shiftLabelOrder.map((shiftName) => (
                              <TableHead key={shiftName} className="text-center">{shiftName}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {roomUsagePageRows.map((row) => (
                            <TableRow key={row.roomName}>
                              <TableCell className="font-medium">{row.roomName}</TableCell>
                              {row.values.map((value, index) => (
                                <TableCell key={`${row.roomName}-${index}`} className="text-center">
                                  {value.toLocaleString()}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {roomUsageTotalPages > 1 && (
                      <div className="mt-2 flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
                        <span>
                          หน้า {roomUsagePage + 1}/{roomUsageTotalPages}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setRoomUsagePage((prev) => Math.max(prev - 1, 0))}
                            disabled={roomUsagePage === 0}
                          >
                            ก่อนหน้า
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setRoomUsagePage((prev) => Math.min(prev + 1, roomUsageTotalPages - 1))}
                            disabled={roomUsagePage >= roomUsageTotalPages - 1}
                          >
                            ถัดไป
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptyState title="ไม่พบข้อมูลการใช้ห้อง" description="ยังไม่มีข้อมูล operation_anes ในช่วงวันที่ที่เลือก" />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="col-span-12 lg:col-span-6" ref={durationRef}>
            <Card className="card-shadow h-full">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <HeaderTitleWithTooltip title="ระยะเวลาผ่าตัด (นาที)" description="เวลาผ่าตัดเฉลี่ยรายรายการผ่าตัด" />
                {durationRows.length > 0 && (
                  <ChartExportMenu containerRef={durationRef} data={durationRows} title="ระยะเวลาผ่าตัด (นาที)" />
                )}
              </CardHeader>
              <CardContent>
                {isDurationLoading ? (
                  <Skeleton className="h-[260px] w-full" />
                ) : durationError ? (
                  <p className="text-xs text-destructive">โหลดข้อมูลไม่สำเร็จ: {durationError.message}</p>
                ) : durationRows.length === 0 ? (
                  <EmptyState title="ไม่มีข้อมูล" className="py-6" />
                ) : (
                  <div className="space-y-3">
                    {durationPageRows.map((item, index) => {
                      const color = typeColors[index % typeColors.length]
                      const widthPercent = (item.avgDurationMinutes / maxDurationMinutes) * 100
                      return (
                        <div key={item.operationName} className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="truncate font-medium" title={item.operationName}>{item.operationName}</span>
                            <span className="shrink-0 text-muted-foreground">
                              {Math.round(item.avgDurationMinutes).toLocaleString()} นาที ({item.caseCount.toLocaleString()} เคส)
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.max(widthPercent, 4)}%`, backgroundColor: color }}
                            />
                          </div>
                        </div>
                      )
                    })}
                    {durationTotalPages > 1 && (
                      <div className="mt-2 flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
                        <span>
                          หน้า {durationPage + 1}/{durationTotalPages}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setDurationPage((prev) => Math.max(prev - 1, 0))}
                            disabled={durationPage === 0}
                          >
                            ก่อนหน้า
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setDurationPage((prev) => Math.min(prev + 1, durationTotalPages - 1))}
                            disabled={durationPage >= durationTotalPages - 1}
                          >
                            ถัดไป
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </DepartmentPageTemplate>
  )
}
