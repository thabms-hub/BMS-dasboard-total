// =============================================================================
// Department: ทันตกรรม (Dentistry)
// Displays dental case statistics, patient details table, and visit type distribution
// With date range filtering capabilities
// =============================================================================

import { useState, useCallback, useMemo, useRef } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, CalendarDays, Clock, AlertCircle, RotateCcw, Users, BedDouble, CalendarCheck2 } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ToothIcon } from '@/components/icons/ToothIcon'
import { DateRangePicker } from '@/components/dashboard/DateRangePicker'
import { ChartExportMenu } from '@/components/dashboard/ChartExportMenu'
import { useBmsSessionContext } from '@/contexts/BmsSessionContext'
import { useQuery } from '@/hooks/useQuery'
import {
  getDentistrySummary,
  getDentistryCasesPage,
  getDentistryTopProcedures,
  getDoctorPerformance,
  getDentService,
  getDentalAppointmentStatus,
  getDentalOutServiceCount,
  getDentalExpenseByPaymentType,
  getTodayDentistryMetrics,
} from '@/services/DentalService'
import { formatDate, formatDateTime } from '@/utils/dateUtils'
import { usePersistentDateRange } from '@/hooks/usePersistentDateRange'
import { cn } from '@/lib/utils'
import type {
  DentistrySummary,
  DentistryDoctorPerformance,
  DentistryServiceTypeCount,
  DentistryCasesPage,
  DentistryTopProcedureItem,
  DentalAppointmentStatus,
  DentalExpenseByPaymentType,
  DentalServicePlaceCount,
} from '@/types'

const PAGE_SIZE = 10

export default function Dentistry() {
  const { connectionConfig, session } = useBmsSessionContext()
  const [currentPage, setCurrentPage] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Chart visibility state for doctor performance chart
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(
    new Set(['c_vn', 'c_dtmain', 'sum_price'])
  )

  // Chart container refs for export
  const barChartContainerRef = useRef<HTMLDivElement>(null)
  const donutChartContainerRef = useRef<HTMLDivElement>(null)
  const dentalServiceContainerRef = useRef<HTMLDivElement>(null)
  const topProceduresContainerRef = useRef<HTMLDivElement>(null)
  const paymentExpenseContainerRef = useRef<HTMLDivElement>(null)

  // Date range state - persisted to localStorage, default 30 days
  const { startDate, endDate, setRange } = usePersistentDateRange('dentistry', 30)

  const isConnected = connectionConfig !== null && session !== null
  const today = formatDate(new Date())
  const formatThaiDateSafe = useCallback((value?: string | null) => {
    if (!value) {
      return '-'
    }

    try {
      return formatDate(value)
    } catch {
      return value
    }
  }, [])

  const dentistrySummaryFn = useCallback(
    () => getDentistrySummary(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )

  const todayMetricsFn = useCallback(
    () => getTodayDentistryMetrics(connectionConfig!),
    [connectionConfig],
  )

  const { data: dentistry, isLoading, isError, error, execute } = useQuery<DentistrySummary>({
    queryFn: dentistrySummaryFn,
    enabled: isConnected,
  })

  const dentistryCasesPageFn = useCallback(
    () => getDentistryCasesPage(connectionConfig!, startDate, endDate, currentPage, PAGE_SIZE),
    [connectionConfig, startDate, endDate, currentPage],
  )

  const {
    data: dentistryCasesPage,
    isLoading: isCasesPageLoading,
    isError: isCasesPageError,
    error: casesPageError,
    execute: executeCasesPage,
  } = useQuery<DentistryCasesPage>({
    queryFn: dentistryCasesPageFn,
    enabled: isConnected,
  })

  const {
    data: todayMetrics,
    isLoading: isTodayMetricsLoading,
    isError: isTodayMetricsError,
    error: todayMetricsError,
    execute: executeTodayMetrics,
  } = useQuery<{
    totalVisits: number
    totalIPDCases: number
    yesterdayVisits: number
    yesterdayIPDCases: number
  }>({
    queryFn: todayMetricsFn,
    enabled: isConnected,
  })

  const doctorPerformanceFn = useCallback(
    () => getDoctorPerformance(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )

  const {
    data: doctorPerformance,
    isLoading: isDoctorPerfLoading,
    isError: isDoctorPerfError,
    error: doctorPerfError,
    execute: executeDoctorPerf,
  } = useQuery<DentistryDoctorPerformance[]>({
    queryFn: doctorPerformanceFn,
    enabled: isConnected,
  })

  const dentServiceFn = useCallback(
    () => getDentService(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )

  const {
    data: dentService,
    isLoading: isDentServiceLoading,
    isError: isDentServiceError,
    error: dentServiceError,
    execute: executeDentService,
  } = useQuery<DentistryServiceTypeCount[]>({
    queryFn: dentServiceFn,
    enabled: isConnected,
  })

  const dentalAppointmentStatusFn = useCallback(
    () => getDentalAppointmentStatus(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )

  const {
    data: appointmentStatus,
    isLoading: isAppointmentStatusLoading,
    isError: isAppointmentStatusError,
    error: appointmentStatusError,
    execute: executeAppointmentStatus,
  } = useQuery<DentalAppointmentStatus[]>({
    queryFn: dentalAppointmentStatusFn,
    enabled: isConnected,
  })

  const dentalOutServiceFn = useCallback(
    () => getDentalOutServiceCount(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )

  const {
    data: outServiceCount,
    isLoading: isOutServiceLoading,
    isError: isOutServiceError,
    error: outServiceError,
    execute: executeOutServiceCount,
  } = useQuery<DentalServicePlaceCount>({
    queryFn: dentalOutServiceFn,
    enabled: isConnected,
  })

  const dentalExpenseByPaymentFn = useCallback(
    () => getDentalExpenseByPaymentType(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )

  const {
    data: expenseByPayment,
    isLoading: isExpenseByPaymentLoading,
    isError: isExpenseByPaymentError,
    error: expenseByPaymentError,
    execute: executeExpenseByPayment,
  } = useQuery<DentalExpenseByPaymentType[]>({
    queryFn: dentalExpenseByPaymentFn,
    enabled: isConnected,
  })

  const topProceduresFn = useCallback(
    () => getDentistryTopProcedures(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )

  const {
    data: topProcedures,
    isLoading: isTopProceduresLoading,
    isError: isTopProceduresError,
    error: topProceduresError,
    execute: executeTopProcedures,
  } = useQuery<DentistryTopProcedureItem[]>({
    queryFn: topProceduresFn,
    enabled: isConnected,
  })

  const handleRangeChange = useCallback((newStart: string, newEnd: string) => {
    setRange(newStart, newEnd)
    setCurrentPage(0) // Reset to first page when date changes
  }, [setRange])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        execute(),
        executeCasesPage(),
        executeTodayMetrics(),
        executeDoctorPerf(),
        executeDentService(),
        executeAppointmentStatus(),
        executeOutServiceCount(),
        executeExpenseByPayment(),
        executeTopProcedures(),
      ])
      setLastUpdated(new Date())
    } finally {
      // Small delay so the user sees the spinner
      setTimeout(() => setIsRefreshing(false), 600)
    }
  }, [
    execute,
    executeCasesPage,
    executeTodayMetrics,
    executeDoctorPerf,
    executeDentService,
    executeAppointmentStatus,
    executeOutServiceCount,
    executeExpenseByPayment,
    executeTopProcedures,
  ])

  // Handle legend click to toggle visibility
  const handleLegendClick = useCallback((e: any) => {
    const dataKey = e.dataKey
    setVisibleSeries((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(dataKey)) {
        newSet.delete(dataKey)
      } else {
        newSet.add(dataKey)
      }
      return newSet
    })
  }, [])

  // Custom legend renderer for doctor performance chart
  const renderCustomLegend = useCallback((props: any) => {
    void props
    const legendItems = [
      { dataKey: 'c_vn', name: 'จำนวนผู้ป่วย' },
      { dataKey: 'c_dtmain', name: 'จำนวนหัตถการ' },
      { dataKey: 'sum_price', name: 'ยอดค่ารักษา' },
    ]

    return (
      <div className="flex flex-col gap-3">
        {legendItems.map((item) => {
          const isVisible = visibleSeries.has(item.dataKey)
          return (
            <div
              key={item.dataKey}
              onClick={() => handleLegendClick({ dataKey: item.dataKey })}
              className={cn(
                'flex items-center gap-2 cursor-pointer transition-opacity duration-200 whitespace-nowrap',
                isVisible ? 'opacity-100' : 'opacity-50',
              )}
            >
              <div
                className="w-3 h-3 rounded-sm shrink-0"
                style={{
                  backgroundColor:
                    item.dataKey === 'c_vn' ? 'hsl(var(--chart-1) / 0.75)' :
                    item.dataKey === 'c_dtmain' ? 'hsl(var(--chart-2) / 0.75)' :
                    'hsl(var(--chart-3))',
                }}
              />
              <span className={cn('text-sm', isVisible ? 'text-foreground' : 'text-muted-foreground')}>
                {item.name}
              </span>
            </div>
          )
        })}
      </div>
    )
  }, [visibleSeries, handleLegendClick])

  const getCardErrorMessage = useCallback(
    (queryError: Error | null) => {
      if (!isConnected) {
        return 'การเชื่อมต่อขาดหาย กรุณาเชื่อมต่อ BMS Session แล้วลองอีกครั้ง'
      }
      return queryError?.message ?? 'ไม่สามารถโหลดข้อมูลได้'
    },
    [isConnected],
  )

  const renderRetryAction = (onRetry: () => void, queryError: Error | null) => (
    <div className="flex min-h-[120px] items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-1.5 text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="text-sm">{getCardErrorMessage(queryError)}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={onRetry}
        >
          <RotateCcw className="h-3 w-3" />
          ลองอีกครั้ง
        </Button>
      </div>
    </div>
  )

  // ---------------------------------------------------------------------------
  // Pagination logic
  // ---------------------------------------------------------------------------
  const pagedCases = dentistryCasesPage?.cases ?? []
  const totalCaseCount = dentistryCasesPage?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCaseCount / PAGE_SIZE))

  const handlePreviousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 0))
  }, [])

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1))
  }, [totalPages])

  // Mask patient name for privacy in detail table:
  // - keep title/prefix visible
  // - given name: replace last 3 chars with "xxx"
  // - surname: keep first 3 chars, mask the rest with "xxx"
  const maskPatientName = useCallback((fullName: string): string => {
    const name = fullName?.trim()
    if (!name) return 'ไม่ระบุ'

    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length === 0) return 'ไม่ระบุ'

    const knownPrefixes = new Set([
      'นาย',
      'นาง',
      'นางสาว',
      'น.ส.',
      'นส.',
      'ด.ช.',
      'ด.ญ.',
      'เด็กชาย',
      'เด็กหญิง',
      'Mr.',
      'Mrs.',
      'Ms.',
      'Miss',
      'Dr.',
    ])

    const hasPrefix = parts.length >= 2 && knownPrefixes.has(parts[0])
    const prefix = hasPrefix ? parts[0] : ''
    const givenName = hasPrefix ? parts[1] : parts[0]
    const surname = hasPrefix
      ? (parts.length > 2 ? parts[parts.length - 1] : '')
      : (parts.length > 1 ? parts[parts.length - 1] : '')

    const maskedGiven = givenName.length > 3
      ? `${givenName.slice(0, -3)}xxx`
      : `${givenName.slice(0, -1)}x`
    if (!surname) return prefix ? `${prefix} ${maskedGiven}` : maskedGiven

    const maskedSurname = `${surname.slice(0, 3)}xxx`
    return prefix ? `${prefix} ${maskedGiven} ${maskedSurname}` : `${maskedGiven} ${maskedSurname}`
  }, [])

  // ---------------------------------------------------------------------------
  // Chart data transformation
  // ---------------------------------------------------------------------------
  const chartData = (dentistry?.casesByVisitType || []).map((item) => ({
    visitType: item.visitTypeName,
    cases: item.caseCount,
  }))

  interface InsuranceChartData {
    name: string
    value: number
  }

  const insuranceChartData: InsuranceChartData[] = (dentistry?.casesByInsurance || []).map(
    (item) => ({
      name: item.insuranceType,
      value: item.patientCount,
    }),
  )

  // Color palette for insurance types (theme-based)
  const insuranceColors = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(var(--chart-1) / 0.9)',
    'hsl(var(--chart-2) / 0.9)',
    'hsl(var(--chart-3) / 0.9)',
  ]

  const dentalServiceChartData = (dentService ?? []).map((item) => ({
    name: item.dentalCareTypeName,
    value: item.totalCount,
  }))

  const attendedAppointmentCount =
    (appointmentStatus ?? []).find((item) => item.statusName === 'มารับบริการแล้ว' || item.statusName === 'มาตามนัด')?.count ?? 0
  const noShowAppointmentCount =
    (appointmentStatus ?? []).find((item) => item.statusName === 'ไม่มาตามนัด')?.count ?? 0

  const paymentExpenseChartData = (expenseByPayment ?? []).map((item) => ({
    name: item.paymentType,
    value: item.totalAmount,
  }))
  const totalPaymentExpense = paymentExpenseChartData.reduce((sum, item) => sum + item.value, 0)

  // Top 10 หัตถการที่ทำบ่อย — grouped by procedure code
  const topProceduresChartData = topProcedures ?? []

  // Mini stat cards definition
  const miniStats = useMemo(
    () => [
      {
        label: 'จำนวนหัตถการ',
        value: dentistry?.totalCases,
        unit: 'รายการ',
        description: 'นับจำนวนหัตถการทั้งหมด',
        icon: <ToothIcon className="h-4 w-4" />,
        iconBadgeClassName: 'bg-purple-500/10 text-purple-600',
      },
      {
        label: 'ผู้ป่วยนอก',
        value: todayMetrics?.totalVisits,
        unit: 'ราย',
        icon: <Users className="h-4 w-4" />,
        iconBadgeClassName: 'bg-blue-500/10 text-blue-600',
      },
      {
        label: 'ผู้ป่วยใน',
        value: todayMetrics?.totalIPDCases,
        unit: 'ราย',
        icon: <BedDouble className="h-4 w-4" />,
        iconBadgeClassName: 'bg-green-500/10 text-green-600',
      },
    ],
    [dentistry, todayMetrics],
  )

  // Calculate percentage change vs yesterday
  const calculatePercentChange = (current: number, previous: number): { percent: number; isPositive: boolean } => {
    if (previous === 0) return { percent: 0, isPositive: true }
    return {
      percent: Number((((current - previous) / previous) * 100).toFixed(1)),
      isPositive: current >= previous,
    }
  }

  // ---------------------------------------------------------------------------
  // Content render
  // ---------------------------------------------------------------------------
  const renderContent = () => {
    return (
      <div className="space-y-6">
        {/* KPI row */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-12">
          {miniStats.map((stat) => {
            const isCompactPatientCard = stat.label === 'ผู้ป่วยนอก' || stat.label === 'ผู้ป่วยใน'
            const isCompactKpiCard = stat.label === 'จำนวนหัตถการ'

            return (
              <Card
                key={stat.label}
                className={cn(isCompactPatientCard ? 'p-2.5' : 'p-3', (isCompactPatientCard || isCompactKpiCard) ? 'xl:col-span-2' : 'xl:col-span-3')}
              >
                <CardContent className="flex flex-col gap-2 p-0">
                  <div className="flex items-center gap-2">
                    <div className={cn('flex h-6 w-6 items-center justify-center rounded-full', stat.iconBadgeClassName)}>
                      {stat.icon}
                    </div>
                    <p className={cn('text-black/90 font-semibold', isCompactPatientCard ? 'text-xs' : 'text-sm')}>
                      {stat.label}
                    </p>
                  </div>
                  {(stat.label === 'จำนวนหัตถการ' && isLoading) || ((stat.label === 'ผู้ป่วยนอก' || stat.label === 'ผู้ป่วยใน') && isTodayMetricsLoading) ? (
                    <div className="pt-1 space-y-1.5">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  ) : !isConnected || (isError && stat.label === 'จำนวนหัตถการ') || (isTodayMetricsError && (stat.label === 'ผู้ป่วยนอก' || stat.label === 'ผู้ป่วยใน')) ? (
                    <div className="pt-1">
                      {stat.label === 'จำนวนหัตถการ' ? renderRetryAction(execute, error) : renderRetryAction(executeTodayMetrics, todayMetricsError)}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2">
                        <p className={cn(
                          'font-bold text-2xl',
                          stat.label === 'ผู้ป่วยนอก' && 'text-blue-600',
                          stat.label === 'ผู้ป่วยใน' && 'text-green-600',
                          stat.label === 'จำนวนหัตถการ' && 'text-purple-600',
                        )}>
                          {stat.value?.toLocaleString() ?? '0'}
                        </p>
                        <p className="text-xs text-muted-foreground">{stat.unit}</p>
                      </div>
                      {stat.description && <p className="text-xs text-muted-foreground">{stat.description}</p>}
                      {(stat.label === 'ผู้ป่วยนอก' || stat.label === 'ผู้ป่วยใน') && (
                        <div className="text-xs text-muted-foreground pt-1">
                          {stat.label === 'ผู้ป่วยนอก' && (() => {
                            const { percent, isPositive } = calculatePercentChange(todayMetrics?.totalVisits ?? 0, todayMetrics?.yesterdayVisits ?? 0)
                            return (
                              <p>
                                เมื่อวาน {todayMetrics?.yesterdayVisits ?? 0} ราย
                                <span className={cn('ml-1 font-medium', isPositive ? 'text-green-600' : 'text-red-600')}>
                                  {isPositive ? '+' : ''}{percent}%
                                </span>
                              </p>
                            )
                          })()}
                          {stat.label === 'ผู้ป่วยใน' && (() => {
                            const { percent, isPositive } = calculatePercentChange(todayMetrics?.totalIPDCases ?? 0, todayMetrics?.yesterdayIPDCases ?? 0)
                            return (
                              <p>
                                เมื่อวาน {todayMetrics?.yesterdayIPDCases ?? 0} ราย
                                <span className={cn('ml-1 font-medium', isPositive ? 'text-green-600' : 'text-red-600')}>
                                  {isPositive ? '+' : ''}{percent}%
                                </span>
                              </p>
                            )
                          })()}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )
          })}
          <Card className="p-4 xl:col-span-3">
            <CardContent className="flex flex-col gap-5 p-0">
              <div className="flex items-center justify-center gap-2 text-center">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CalendarCheck2 className="h-3.5 w-3.5" />
                </span>
                <p className="text-sm text-muted-foreground font-medium">นัดหมาย</p>
              </div>
              {isAppointmentStatusLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : !isConnected || isAppointmentStatusError ? (
                <div className="flex items-center justify-center h-16">
                  {renderRetryAction(executeAppointmentStatus, appointmentStatusError)}
                </div>
              ) : (
                <div className="flex items-end justify-center gap-8">
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-2xl font-bold text-blue-600">{attendedAppointmentCount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">มารับบริการ</p>
                  </div>
                  <div className="h-12 w-px bg-border" />
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-2xl font-bold text-red-600">{noShowAppointmentCount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">ไม่มา</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="p-4 xl:col-span-3">
            <CardContent className="flex flex-col gap-5 p-0">
              <div className="flex items-center justify-center gap-2 text-center">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <ToothIcon className="h-3.5 w-3.5" />
                </span>
                <p className="text-sm text-muted-foreground font-medium">ตรวจสุขภาพฟัน</p>
              </div>
              {isOutServiceLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : !isConnected || isOutServiceError ? (
                <div className="flex items-center justify-center h-16">
                  {renderRetryAction(executeOutServiceCount, outServiceError)}
                </div>
              ) : (
                <div className="flex items-end justify-center gap-8">
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-2xl font-bold text-green-600">{(outServiceCount?.inService ?? 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">ในสถานบริการ</p>
                  </div>
                  <div className="h-12 w-px bg-border" />
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-2xl font-bold text-orange-600">{(outServiceCount?.outService ?? 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">นอกสถานบริการ</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Analytics row 1 */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:auto-rows-fr">
          {/* Top 10 หัตถการที่ทำบ่อย (left) */}
          <Card ref={topProceduresContainerRef} className="xl:col-span-8 xl:row-span-2">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">10 อันดับหัตถการที่ทำบ่อย</CardTitle>
              </div>
              {topProceduresChartData.length > 0 && (
                <ChartExportMenu
                  containerRef={topProceduresContainerRef}
                  data={topProceduresChartData}
                  title="10 อันดับหัตถการที่ทำบ่อย"
                />
              )}
            </CardHeader>
            <CardContent>
              {isTopProceduresLoading ? (
                <div className="flex h-[560px] items-center justify-center">
                  <Skeleton className="h-[520px] w-full" />
                </div>
              ) : !isConnected || isTopProceduresError ? (
                renderRetryAction(executeTopProcedures, topProceduresError)
              ) : topProceduresChartData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={Math.max(topProceduresChartData.length * 42 + 20, 560)}>
                    <BarChart
                      data={topProceduresChartData}
                      layout="vertical"
                      margin={{ top: 0, right: 48, left: 8, bottom: 0 }}
                      barCategoryGap="25%"
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="code"
                        width={110}
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        labelFormatter={(label, payload) => {
                          const item = payload?.[0]?.payload
                          const name = item?.procedureName || 'ไม่ระบุชื่อหัตถการ'
                          return `รหัสหัตถการ: ${label} (${name})`
                        }}
                        formatter={(value) => [`${value} ครั้ง`, 'จำนวน']}
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid hsl(var(--border))',
                          background: 'hsl(var(--card))',
                          fontSize: '12px',
                        }}
                        cursor={false}
                      />
                      <Bar
                        dataKey="count"
                        fill="hsl(var(--chart-2) / 0.75)"
                        radius={[0, 4, 4, 0]}
                        maxBarSize={28}
                        isAnimationActive={false}
                        label={{ position: 'right', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 border-t pt-3">
                    <p className="text-xs text-muted-foreground mb-2">คำอธิบาย: รหัสหัตถการ</p>
                    <div className="grid grid-cols-1 gap-1 text-xs md:grid-cols-2">
                      {topProceduresChartData.map((item) => (
                        <div key={item.code} className="flex items-start gap-2 min-w-0">
                          <span className="font-semibold text-foreground shrink-0">{item.code}</span>
                          <span className="text-muted-foreground truncate">{item.procedureName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <ToothIcon className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">ไม่มีข้อมูลในช่วงเวลาที่เลือก</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dental care service summary (right top) */}
          <Card ref={dentalServiceContainerRef} className="xl:col-span-4">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">ตรวจสุขภาพฟันแยกตามกลุ่มอายุ</CardTitle>
                <CardDescription>
                  {dentalServiceChartData.length > 0
                    ? `รวม ${dentalServiceChartData.reduce((sum, d) => sum + d.value, 0).toLocaleString()} ราย`
                    : 'ไม่มีข้อมูล'}
                </CardDescription>
              </div>
              {dentalServiceChartData.length > 0 && (
                <ChartExportMenu
                  containerRef={dentalServiceContainerRef}
                  data={dentalServiceChartData}
                  title="ตรวจสุขภาพฟันแยกตามกลุ่มอายุ"
                />
              )}
            </CardHeader>
            <CardContent>
              {isDentServiceLoading ? (
                <div className="flex h-[280px] items-center justify-center">
                  <Skeleton className="h-[240px] w-full" />
                </div>
              ) : !isConnected || isDentServiceError ? (
                renderRetryAction(executeDentService, dentServiceError)
              ) : dentalServiceChartData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <div className="basis-3/5 min-w-0">
                    <div className="mx-auto aspect-square w-full max-w-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                        <Pie
                          data={dentalServiceChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius="42%"
                          outerRadius="68%"
                          paddingAngle={2}
                          dataKey="value"
                          nameKey="name"
                          strokeWidth={0}
                        >
                          {dentalServiceChartData.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={insuranceColors[index % insuranceColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload || payload.length === 0) return null
                            const item = payload[0]
                            const groupLabel = label || item?.name || item?.payload?.name || 'ไม่ระบุ'
                            const value = item?.value ?? 0
                            return (
                              <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700 p-2 text-xs shadow-md">
                                <div className="text-slate-500 dark:text-slate-300">กลุ่ม: {groupLabel}</div>
                                <div className="text-slate-900 dark:text-slate-100 font-medium">จำนวน: {Number(value).toLocaleString()} ราย</div>
                              </div>
                            )
                          }}
                        />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="basis-2/5 min-w-0">
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      {dentalServiceChartData.map((item, index) => (
                        <div key={item.name} className="flex items-center gap-2 text-xs min-w-0">
                          <span
                            className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                            style={{ backgroundColor: insuranceColors[index % insuranceColors.length] }}
                          />
                          <span className="flex-1 truncate text-muted-foreground min-w-0">{item.name}</span>
                          <span className="font-medium tabular-nums shrink-0">{item.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <ToothIcon className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">ไม่มีข้อมูลในช่วงเวลาที่เลือก</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Insurance Distribution Doughnut Chart */}
          <Card ref={donutChartContainerRef} className="xl:col-span-4">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">ผู้ป่วยแยกตามสิทธิการรักษา</CardTitle>
                <CardDescription>
                  {insuranceChartData.length > 0
                    ? `รวม ${insuranceChartData.reduce((sum, d) => sum + d.value, 0).toLocaleString()} ราย`
                    : 'ไม่มีข้อมูล'}
                </CardDescription>
              </div>
              {insuranceChartData.length > 0 && (
                <ChartExportMenu containerRef={donutChartContainerRef} data={insuranceChartData} title="ผู้ป่วยแยกตามสิทธิการรักษา" />
              )}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex h-[280px] items-center justify-center">
                  <Skeleton className="h-[240px] w-full" />
                </div>
              ) : !isConnected || isError ? (
                renderRetryAction(execute, error)
              ) : insuranceChartData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <div className="basis-3/5 min-w-0">
                    <div className="mx-auto aspect-square w-full max-w-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                        <Pie
                          data={insuranceChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius="42%"
                          outerRadius="68%"
                          paddingAngle={2}
                          dataKey="value"
                          nameKey="name"
                          strokeWidth={0}
                        >
                          {insuranceChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={insuranceColors[index % insuranceColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={((value: unknown) => `${Number(value).toLocaleString()} เคส`) as never}
                          contentStyle={{
                            borderRadius: '8px',
                            border: '1px solid hsl(var(--border))',
                            background: 'hsl(var(--card))',
                            fontSize: '12px',
                          }}
                        />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="basis-2/5 min-w-0">
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      {insuranceChartData.map((item, index) => (
                        <div key={item.name} className="flex items-center gap-2 text-xs min-w-0">
                          <span
                            className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                            style={{ backgroundColor: insuranceColors[index % insuranceColors.length] }}
                          />
                          <span className="flex-1 truncate text-muted-foreground min-w-0">{item.name}</span>
                          <span className="font-medium tabular-nums shrink-0">{item.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <ToothIcon className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">ไม่มีข้อมูลในช่วงเวลาที่เลือก</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Doctor performance summary */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-lg">สรุปยอดผู้ป่วยตามแพทย์</CardTitle>
              <CardDescription>
                แสดงจำนวนผู้ป่วย หัตถการ และยอดค่ารักษาตามแพทย์
              </CardDescription>
            </div>
            <ChartExportMenu
              containerRef={barChartContainerRef}
              data={doctorPerformance ?? []}
              title="สรุปยอดผู้ป่วยตามแพทย์"
            />
          </CardHeader>
          <CardContent>
            {isDoctorPerfLoading ? (
              <div className="flex h-[280px] items-center justify-center">
                <Skeleton className="h-[240px] w-full" />
              </div>
            ) : !isConnected || isDoctorPerfError ? (
              renderRetryAction(executeDoctorPerf, doctorPerfError)
            ) : doctorPerformance && doctorPerformance.length > 0 ? (
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <ResponsiveContainer width="100%" height={520}>
                    <ComposedChart
                      data={doctorPerformance}
                      margin={{ top: 20, right: 20, left: 10, bottom: 100 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="doctorName"
                        angle={-45}
                        textAnchor="end"
                        interval={0}
                        height={100}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 12 }}
                        width={50}
                      />
                      <Tooltip cursor={false} />
                      {visibleSeries.has('c_vn') && (
                        <Bar
                          yAxisId="left"
                          dataKey="c_vn"
                          name="จำนวนผู้ป่วย"
                          fill="hsl(var(--chart-1) / 0.75)"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={40}
                          isAnimationActive={false}
                        />
                      )}
                      {visibleSeries.has('c_dtmain') && (
                        <Bar
                          yAxisId="left"
                          dataKey="c_dtmain"
                          name="จำนวนหัตถการ"
                          fill="hsl(var(--chart-2) / 0.75)"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={40}
                          isAnimationActive={false}
                        />
                      )}
                      {visibleSeries.has('sum_price') && (
                        <Line
                          yAxisId="right"
                          type="natural"
                          dataKey="sum_price"
                          name="ยอดค่ารักษา"
                          stroke="hsl(var(--chart-3))"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          dot={false}
                          isAnimationActive={false}
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col justify-start pt-12 shrink-0 w-32">
                  {renderCustomLegend({})}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <ToothIcon className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">ไม่มีข้อมูลในช่วงเวลาที่เลือก</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment + Visit Type row */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* Expense by Payment Type Doughnut Chart */}
          <Card ref={paymentExpenseContainerRef}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-lg">ค่าใช้จ่ายแยกตามประเภทการชำระเงิน</CardTitle>
              <CardDescription>
                {paymentExpenseChartData.length > 0
                  ? `รวม ${totalPaymentExpense.toLocaleString()} บาท`
                  : 'ไม่มีข้อมูล'}
              </CardDescription>
            </div>
            {paymentExpenseChartData.length > 0 && (
              <ChartExportMenu
                containerRef={paymentExpenseContainerRef}
                data={paymentExpenseChartData}
                title="ค่าใช้จ่ายแยกตามประเภทการชำระเงิน"
              />
            )}
          </CardHeader>
          <CardContent>
            {isExpenseByPaymentLoading ? (
              <div className="flex h-[260px] items-center justify-center">
                <Skeleton className="h-[220px] w-full" />
              </div>
            ) : !isConnected || isExpenseByPaymentError ? (
              renderRetryAction(executeExpenseByPayment, expenseByPaymentError)
            ) : paymentExpenseChartData.length > 0 ? (
              <div className="flex items-center gap-4">
                <div className="basis-3/5 min-w-0">
                  <div className="mx-auto aspect-square w-full max-w-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                      <Pie
                        data={paymentExpenseChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius="42%"
                        outerRadius="70%"
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        strokeWidth={0}
                      >
                        {paymentExpenseChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={insuranceColors[index % insuranceColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || payload.length === 0) return null
                          const item = payload[0]
                          const pct = totalPaymentExpense > 0
                            ? Math.round((Number(item.value) / totalPaymentExpense) * 100)
                            : 0
                          return (
                            <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700 p-2 text-xs shadow-md">
                              <div className="font-medium text-slate-900 dark:text-slate-100">{item.name}</div>
                              <div className="text-slate-500 dark:text-slate-300">ยอด: {Number(item.value).toLocaleString()} บาท</div>
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
                    {paymentExpenseChartData.map((item, index) => {
                      const pct = totalPaymentExpense > 0 ? Math.round((item.value / totalPaymentExpense) * 100) : 0
                      return (
                        <div key={item.name} className="flex items-center gap-2 text-sm">
                          <span
                            className="inline-block h-3 w-3 shrink-0 rounded-sm"
                            style={{ backgroundColor: insuranceColors[index % insuranceColors.length] }}
                          />
                          <span className="flex-1 truncate text-muted-foreground">{item.name}</span>
                          <span className="font-semibold tabular-nums shrink-0">{item.value.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground w-9 text-right shrink-0">{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <ToothIcon className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">ไม่มีข้อมูลในช่วงเวลาที่เลือก</p>
              </div>
            )}
          </CardContent>
          </Card>

          {/* Visit Type Distribution Chart */}
          <Card ref={barChartContainerRef}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">จำนวนหัตถการแยกตามประเภทการรับบริการ</CardTitle>
                <CardDescription>
                  {chartData.length > 0
                    ? `รวม ${chartData.reduce((sum, d) => sum + d.cases, 0).toLocaleString()} ราย`
                    : 'ไม่มีข้อมูล'}
                </CardDescription>
              </div>
              {chartData.length > 0 && (
                <ChartExportMenu containerRef={barChartContainerRef} data={chartData} title="หัตถการแยกตามประเภท" />
              )}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex h-[280px] items-center justify-center">
                  <Skeleton className="h-[240px] w-full" />
                </div>
              ) : !isConnected || isError ? (
                renderRetryAction(execute, error)
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 5, right: 10, left: 10, bottom: 48 }}
                    barCategoryGap="20%"
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                    <XAxis
                      dataKey="visitType"
                      type="category"
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      padding={{ left: 20, right: 20 }}
                      height={80}
                    />
                    <YAxis
                      type="number"
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      width={0}
                    />
                    <Tooltip
                      labelFormatter={(label) => `ประเภท: ${label}`}
                      formatter={(value) => [`${value} เคส`, 'จำนวน']}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        background: 'hsl(var(--card))',
                        fontSize: '12px',
                      }}
                      cursor={false}
                    />
                    <Bar
                      dataKey="cases"
                      fill="hsl(var(--chart-1) / 0.75)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <ToothIcon className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">ไม่มีข้อมูลในช่วงเวลาที่เลือก</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Patient Details Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">รายละเอียดผู้ป่วยรับบริการ</CardTitle>
            <CardDescription>
              แสดงรายละเอียดการรับบริการทันตกรรมของผู้ป่วย
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isCasesPageLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !isConnected || isCasesPageError ? (
              renderRetryAction(executeCasesPage, casesPageError)
            ) : totalCaseCount > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-10 text-center uppercase text-xs tracking-wider text-muted-foreground">
                          #
                        </TableHead>
                        <TableHead className="uppercase text-xs tracking-wider text-muted-foreground">
                          HN
                        </TableHead>
                        <TableHead className="uppercase text-xs tracking-wider text-muted-foreground">
                          ชื่อผู้ป่วย
                        </TableHead>
                        <TableHead className="uppercase text-xs tracking-wider text-muted-foreground">
                          หัตถการ
                        </TableHead>
                        <TableHead className="uppercase text-xs tracking-wider text-muted-foreground">
                          ทันตแพทย์
                        </TableHead>
                        <TableHead className="uppercase text-xs tracking-wider text-muted-foreground">
                          การรับบริการ
                        </TableHead>
                        <TableHead className="uppercase text-xs tracking-wider text-muted-foreground">
                          วันที่ตรวจ
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedCases.map((caseItem, idx) => {
                        const rowNumber = currentPage * PAGE_SIZE + idx + 1
                        return (
                          <TableRow
                            key={`${caseItem.vn}-${idx}`}
                            className={`transition-colors ${
                              idx % 2 === 0
                                ? 'bg-muted/30'
                                : ''
                            } hover:bg-primary/5`}
                          >
                            <TableCell className="text-center text-xs font-medium text-muted-foreground w-10">
                              {rowNumber}
                            </TableCell>
                            <TableCell className="text-xs font-medium">
                              <Badge variant="outline">{caseItem.hn}</Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {maskPatientName(caseItem.patientName || '')}
                            </TableCell>
                            <TableCell className="text-xs">{caseItem.tmName || '-'}</TableCell>
                            <TableCell className="text-xs">
                              {caseItem.doctorName || 'ไม่ระบุ'}
                            </TableCell>
                            <TableCell className="text-xs">
                              {caseItem.visitTypeName || 'ไม่ระบุ'}
                            </TableCell>
                            <TableCell className="text-xs">{formatThaiDateSafe(caseItem.vstdate)}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Info and Controls */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    แสดง {pagedCases.length > 0 ? currentPage * PAGE_SIZE + 1 : 0} ถึง{' '}
                    {Math.min((currentPage + 1) * PAGE_SIZE, totalCaseCount)} จาก{' '}
                    <span className="font-semibold">{totalCaseCount}</span> เคส
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={currentPage === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      ย้อนกลับ
                    </Button>
                    <span className="text-xs text-muted-foreground px-2">
                      หน้า {currentPage + 1} / {totalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={currentPage >= totalPages - 1}
                    >
                      ถัดไป
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <ToothIcon className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">ไม่มีข้อมูลในช่วงเวลาที่เลือก</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 shadow-md ring-1 ring-primary/20">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 to-transparent" />
            <ToothIcon className="relative h-10 w-10 text-primary drop-shadow-sm" />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-3xl font-bold tracking-tight">ระบบงานทันตกรรม</h2>
            <p className="text-base text-muted-foreground">Dentistry</p>
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
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 gap-1.5 sm:mt-0 text-blue dark:text-white dark:bg-orange-500/5 dark:border-orange-400/60 dark:hover:bg-orange-500/15 dark:hover:border-orange-300"
          onClick={handleRefresh}
          disabled={isRefreshing || !isConnected}
        >
          <RefreshCw
            className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')}
          />
          รีเฟรช
        </Button>
      </div>

      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onRangeChange={handleRangeChange}
        isLoading={isLoading}
      />

      {renderContent()}
    </div>
  )
}
