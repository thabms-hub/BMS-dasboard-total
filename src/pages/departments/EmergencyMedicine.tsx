import { useCallback, useMemo, useState } from 'react'
import { Siren, RefreshCw, CalendarDays, Clock, AlertCircle, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  BarChart,
  Bar,
  LabelList,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
  type TooltipProps,
} from 'recharts'
import { useBmsSessionContext } from '@/contexts/BmsSessionContext'
import { useQuery } from '@/hooks/useQuery'
import {
  getErDashboardKpis,
  getErLeaveStatusDistribution,
  getErLevel1SurvivalStats,
  getErTriageByPeriod,
  getErDispositionDistribution,
  getErMonthlyTrend,
  getErTopCauses,
  getErTopProcedures,
  getErDoctorPatientLoad,
  getErProcedureVsVnStats,
  getErAccidentTypeDistribution,
  getErWaitTimeStats,
  getErCasesWithWaitTimes,
} from '@/services/erService'
import { formatDate, formatDateTime, getDateRange } from '@/utils/dateUtils'
import { DateRangePicker } from '@/components/dashboard/DateRangePicker'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type {
  ErDashboardKpis,
  ErDispositionItem,
  ErLeaveStatusItem,
  ErLevel1SurvivalStats,
  ErMonthlyTrendItem,
  ErProcedureVsVnStats,
  ErTopCauseItem,
  ErTopProcedureItem,
  ErDoctorPatientLoadItem,
  ErTriagePeriodRow,
  ErAccidentTypeItem,
  ErWaitTimeStats,
  ErCaseWithWaitTime,
} from '@/types'

const DISPOSITION_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
]
const LEAVE_STATUS_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--muted-foreground))',
]
const ACCIDENT_TYPE_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
]

interface CustomTooltipProps extends TooltipProps<number, string> {
  nameKey?: string
  active?: boolean
  payload?: Array<{ payload: Record<string, unknown> }>
}

const LeaveStatusTooltip = (props: CustomTooltipProps) => {
  const { active, payload } = props
  if (active && payload && payload.length > 0) {
    const data = payload[0]?.payload as unknown as ErLeaveStatusItem | undefined
    if (!data) return null
    return (
      <div className="rounded-lg border border-border bg-background p-2 shadow-md">
        <p className="font-medium text-foreground">{data.leaveStatus}</p>
        <p className="text-sm text-muted-foreground">{data.patientCount.toLocaleString()} ราย</p>
      </div>
    )
  }
  return null
}

const DispositionTooltip = (props: CustomTooltipProps) => {
  const { active, payload } = props
  if (active && payload && payload.length > 0) {
    const data = payload[0]?.payload as unknown as ErDispositionItem | undefined
    if (!data) return null
    return (
      <div className="rounded-lg border border-border bg-background p-2 shadow-md">
        <p className="font-medium text-foreground">{data.disposition}</p>
        <p className="text-sm text-muted-foreground">{data.caseCount.toLocaleString()} ราย</p>
      </div>
    )
  }
  return null
}

export default function EmergencyMedicine() {
  const { connectionConfig, session } = useBmsSessionContext()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [visibleSeries, setVisibleSeries] = useState({ procedureCount: true, vnCount: true, treatmentAmount: true })
  const [currentPage, setCurrentPage] = useState(0)
  const [currentDoctorPage, setCurrentDoctorPage] = useState(0)
  const [sortBy, setSortBy] = useState<'wait' | 'exam' | 'queue'>('queue')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedTriageLevel, setSelectedTriageLevel] = useState<string>('')

  const defaultRange = useMemo(() => getDateRange(0), [])
  const [startDate, setStartDate] = useState(defaultRange.startDate)
  const [endDate, setEndDate] = useState(defaultRange.endDate)

  const isConnected = connectionConfig !== null && session !== null
  const today = formatDate(new Date())

  const kpisFn = useCallback(
    () => getErDashboardKpis(connectionConfig!, session!.databaseType),
    [connectionConfig, session],
  )
  const topCausesFn = useCallback(
    () => getErTopCauses(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )
  const triageByPeriodFn = useCallback(
    () => getErTriageByPeriod(connectionConfig!, session!.databaseType, startDate, endDate),
    [connectionConfig, session, startDate, endDate],
  )
  const leaveStatusFn = useCallback(
    () => getErLeaveStatusDistribution(connectionConfig!, session!.databaseType, startDate, endDate),
    [connectionConfig, session, startDate, endDate],
  )
  const level1SurvivalFn = useCallback(
    () => getErLevel1SurvivalStats(connectionConfig!, session!.databaseType, startDate, endDate),
    [connectionConfig, session, startDate, endDate],
  )
  const dispositionFn = useCallback(
    () => getErDispositionDistribution(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )
  const monthlyTrendFn = useCallback(
    () => getErMonthlyTrend(connectionConfig!, session!.databaseType),
    [connectionConfig, session],
  )
  const accidentTypeFn = useCallback(
    () => getErAccidentTypeDistribution(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )
  const topProceduresFn = useCallback(
    () => getErTopProcedures(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )
  const doctorLoadFn = useCallback(
    () => getErDoctorPatientLoad(connectionConfig!, session!.databaseType, startDate, endDate),
    [connectionConfig, session, startDate, endDate],
  )
  const procedureVsVnFn = useCallback(
    () => getErProcedureVsVnStats(connectionConfig!, session!.databaseType),
    [connectionConfig, session],
  )
  const waitTimeStatsFn = useCallback(
    () => getErWaitTimeStats(connectionConfig!, session!.databaseType),
    [connectionConfig, session],
  )
  const casesWithWaitTimesFn = useCallback(
    () => getErCasesWithWaitTimes(connectionConfig!, session!.databaseType),
    [connectionConfig, session],
  )

  const {
    data: kpis,
    isLoading: isKpisLoading,
    isError: isKpisError,
    error: kpisError,
    execute: executeKpis,
  } = useQuery<ErDashboardKpis>({
    queryFn: kpisFn,
    enabled: isConnected,
  })

  const {
    data: topCauseData,
    isLoading: isTopCauseLoading,
    isError: isTopCauseError,
    error: topCauseError,
    execute: executeTopCause,
  } = useQuery<ErTopCauseItem[]>({
    queryFn: topCausesFn,
    enabled: isConnected,
  })

  const {
    data: triageByPeriodData,
    isLoading: isTriageByPeriodLoading,
    isError: isTriageByPeriodError,
    error: triageByPeriodError,
    execute: executeTriageByPeriod,
  } = useQuery<ErTriagePeriodRow[]>({
    queryFn: triageByPeriodFn,
    enabled: isConnected,
  })

  const {
    data: leaveStatusData,
    isLoading: isLeaveStatusLoading,
    isError: isLeaveStatusError,
    error: leaveStatusError,
    execute: executeLeaveStatus,
  } = useQuery<ErLeaveStatusItem[]>({
    queryFn: leaveStatusFn,
    enabled: isConnected,
  })

  const {
    data: level1Survival,
    isLoading: isLevel1SurvivalLoading,
    isError: isLevel1SurvivalError,
    error: level1SurvivalError,
    execute: executeLevel1Survival,
  } = useQuery<ErLevel1SurvivalStats>({
    queryFn: level1SurvivalFn,
    enabled: isConnected,
  })

  const {
    data: dispositionData,
    isLoading: isDispositionLoading,
    isError: isDispositionError,
    error: dispositionError,
    execute: executeDisposition,
  } = useQuery<ErDispositionItem[]>({
    queryFn: dispositionFn,
    enabled: isConnected,
  })

  const {
    data: monthlyTrendData,
    isLoading: isTrendLoading,
    isError: isTrendError,
    error: trendError,
    execute: executeTrend,
  } = useQuery<ErMonthlyTrendItem[]>({
    queryFn: monthlyTrendFn,
    enabled: isConnected,
  })

  const {
    data: accidentTypeData,
    isLoading: isAccidentTypeLoading,
    isError: isAccidentTypeError,
    error: accidentTypeError,
    execute: executeAccidentType,
  } = useQuery<ErAccidentTypeItem[]>({
    queryFn: accidentTypeFn,
    enabled: isConnected,
  })

  const {
    data: topProceduresData,
    isLoading: isTopProceduresLoading,
    isError: isTopProceduresError,
    error: topProceduresError,
    execute: executeTopProcedures,
  } = useQuery<ErTopProcedureItem[]>({
    queryFn: topProceduresFn,
    enabled: isConnected,
  })

  const {
    data: doctorLoadData,
    isLoading: isDoctorLoadLoading,
    isError: isDoctorLoadError,
    error: doctorLoadError,
    execute: executeDoctorLoad,
  } = useQuery<ErDoctorPatientLoadItem[]>({
    queryFn: doctorLoadFn,
    enabled: isConnected,
  })

  const {
    data: procedureVsVnData,
    isLoading: isProcedureVsVnLoading,
    isError: isProcedureVsVnError,
    error: procedureVsVnError,
    execute: executeProcedureVsVn,
  } = useQuery<ErProcedureVsVnStats[]>({
    queryFn: procedureVsVnFn,
    enabled: isConnected,
  })

  const {
    data: waitTimeStats,
    isLoading: isWaitTimeStatsLoading,
    isError: isWaitTimeStatsError,
    error: waitTimeStatsError,
    execute: executeWaitTimeStats,
  } = useQuery<ErWaitTimeStats>({
    queryFn: waitTimeStatsFn,
    enabled: isConnected,
  })

  const {
    data: casesWithWaitTimesData,
    isLoading: isCasesWithWaitTimesLoading,
    isError: isCasesWithWaitTimesError,
    error: casesWithWaitTimesError,
    execute: executeCasesWithWaitTimes,
  } = useQuery<ErCaseWithWaitTime[]>({
    queryFn: casesWithWaitTimesFn,
    enabled: isConnected,
  })

  const dispositionChartData = useMemo(
    () => (dispositionData ?? []).filter((item) => item.caseCount > 0),
    [dispositionData],
  )

  const leaveStatusChartData = useMemo(
    () => (leaveStatusData ?? []).filter((item) => item.patientCount > 0),
    [leaveStatusData],
  )

  const accidentTypeChartData = useMemo(
    () => (accidentTypeData ?? []).filter((item) => item.patientCount > 0),
    [accidentTypeData],
  )

  const triageTableRows = useMemo(() => {
    const periods = triageByPeriodData ?? []
    const getLabel = (key: 'level1Label' | 'level2Label' | 'level3Label' | 'level4Label' | 'level5Label', fallback: string) => {
      return periods.find((period) => period[key])?.[key] ?? fallback
    }

    return [
      {
        level: getLabel('level1Label', ''),
        values: periods.map((period) => period.level1),
        className: 'bg-red-100/70 dark:bg-red-500/20',
      },
      {
        level: getLabel('level2Label', ''),
        values: periods.map((period) => period.level2),
        className: 'bg-orange-100/70 dark:bg-orange-500/20',
      },
      {
        level: getLabel('level3Label', ''),
        values: periods.map((period) => period.level3),
        className: 'bg-yellow-100/70 dark:bg-yellow-500/20',
      },
      {
        level: getLabel('level4Label', ''),
        values: periods.map((period) => period.level4),
        className: 'bg-green-100/70 dark:bg-green-500/20',
      },
      {
        level: getLabel('level5Label', ''),
        values: periods.map((period) => period.level5),
        className: 'bg-cyan-100/70 dark:bg-cyan-500/20',
      },
    ]
  }, [triageByPeriodData])

  const procedureVsVnChartData = useMemo(() => procedureVsVnData ?? [], [procedureVsVnData])

  // Get unique triage levels from cases data
  const uniqueTriageLevels = useMemo(() => {
    const levels = new Set(casesWithWaitTimesData?.map(c => c.triageLevel) ?? [])
    return Array.from(levels).sort()
  }, [casesWithWaitTimesData])

  // Filter and sort cases
  const filteredAndSortedCases = useMemo(() => {
    let data = [...(casesWithWaitTimesData ?? [])]

    // Filter by triage level
    if (selectedTriageLevel) {
      data = data.filter(c => c.triageLevel === selectedTriageLevel)
    }

    // Sort
    data.sort((a, b) => {
      if (sortBy === 'queue') {
        const compare = (a.oqueue ?? '').localeCompare(b.oqueue ?? '', undefined, { numeric: true, sensitivity: 'base' })
        return sortOrder === 'asc' ? compare : -compare
      }

      const sortField = sortBy === 'wait' ? 'waitBeforeDoctorMinutes' : 'doctorExamMinutes'
      const aVal = a[sortField]
      const bVal = b[sortField]
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
    })

    return data
  }, [casesWithWaitTimesData, sortBy, sortOrder, selectedTriageLevel])

  const PAGE_SIZE = 10
  const casesData = filteredAndSortedCases
  const totalPages = Math.ceil(casesData.length / PAGE_SIZE)
  const pagedCases = casesData.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  const DOCTOR_PAGE_SIZE = 10
  const doctorCasesData = doctorLoadData ?? []
  const doctorTotalPages = Math.ceil(doctorCasesData.length / DOCTOR_PAGE_SIZE)
  const pagedDoctorLoadData = doctorCasesData.slice(
    currentDoctorPage * DOCTOR_PAGE_SIZE,
    (currentDoctorPage + 1) * DOCTOR_PAGE_SIZE,
  )

  const handlePreviousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 0))
  }, [])

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1))
  }, [totalPages])

  const handlePreviousDoctorPage = useCallback(() => {
    setCurrentDoctorPage((prev) => Math.max(prev - 1, 0))
  }, [])

  const handleNextDoctorPage = useCallback(() => {
    setCurrentDoctorPage((prev) => Math.min(prev + 1, doctorTotalPages - 1))
  }, [doctorTotalPages])

  // Reset to first page when filter or sort changes
  const handleFilterChange = useCallback((triageLevel: string) => {
    setSelectedTriageLevel(triageLevel)
    setCurrentPage(0)
  }, [])

  const handleHeaderSort = useCallback((newSortBy: 'wait' | 'exam') => {
    setCurrentPage(0)
    if (sortBy === newSortBy) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortBy(newSortBy)
    setSortOrder('desc')
  }, [sortBy])

  const handleLegendClick = useCallback((seriesKey: string) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [seriesKey]: !prev[seriesKey as keyof typeof prev],
    }))
  }, [])

  const renderCustomLegend = useCallback(() => {
    const legendItems = [
      { key: 'procedureCount', label: 'หัตถการ', color: 'hsl(var(--chart-1))' },
      { key: 'vnCount', label: 'VN', color: 'hsl(var(--chart-2))' },
      { key: 'treatmentAmount', label: 'ค่ารักษา', color: 'hsl(var(--chart-3))' },
    ]

    return (
      <div className="flex flex-col gap-2">
        {legendItems.map((item) => {
          const isVisible = visibleSeries[item.key as keyof typeof visibleSeries]
          return (
            <button
              key={item.key}
              onClick={() => handleLegendClick(item.key)}
              className={cn(
                'flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded transition-opacity duration-200',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                !isVisible && 'opacity-50',
              )}
              type="button"
            >
              <div
                className="h-3 w-3 rounded-sm shrink-0"
                style={{
                  backgroundColor: isVisible ? item.color : 'hsl(var(--muted-foreground))',
                  opacity: isVisible ? 1 : 0.5,
                }}
              />
              <span className={cn('text-xs font-medium', !isVisible && 'text-muted-foreground')}>{
                item.label
              }</span>
            </button>
          )
        })}
      </div>
    )
  }, [visibleSeries, handleLegendClick])

  const handleRangeChange = useCallback((newStartDate: string, newEndDate: string) => {
    setStartDate(newStartDate)
    setEndDate(newEndDate)
    setCurrentPage(0)
    setCurrentDoctorPage(0)
  }, [])

  const formatTimeOnly = useCallback((value: string) => {
    if (!value || value === '-') {
      return '-'
    }

    const fullTimeMatch = value.match(/(\d{2}:\d{2}:\d{2})/)
    if (fullTimeMatch) {
      return fullTimeMatch[1]
    }

    const shortTimeMatch = value.match(/(\d{2}:\d{2})/)
    if (shortTimeMatch) {
      return shortTimeMatch[1]
    }

    return value
  }, [])

  const truncateText = useCallback((value: string, maxLength = 16) => {
    if (!value) return ''
    return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value
  }, [])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        executeKpis(),
        executeTriageByPeriod(),
        executeLeaveStatus(),
        executeLevel1Survival(),
        executeTopCause(),
        executeDisposition(),
        executeTrend(),
        executeAccidentType(),
        executeTopProcedures(),
        executeDoctorLoad(),
        executeProcedureVsVn(),
        executeWaitTimeStats(),
        executeCasesWithWaitTimes(),
      ])
      setLastUpdated(new Date())
    } finally {
      setTimeout(() => setIsRefreshing(false), 600)
    }
  }, [
    executeAccidentType,
    executeCasesWithWaitTimes,
    executeDoctorLoad,
    executeDisposition,
    executeKpis,
    executeLeaveStatus,
    executeLevel1Survival,
    executeTopCause,
    executeProcedureVsVn,
    executeTopProcedures,
    executeTriageByPeriod,
    executeTrend,
    executeWaitTimeStats,
  ])

  const getCardErrorMessage = useCallback(
    (error: Error | null) => {
      if (!isConnected) {
        return 'การเชื่อมต่อขาดหาย กรุณาเชื่อมต่อ BMS Session แล้วลองอีกครั้ง'
      }
      return error?.message ?? 'ไม่สามารถโหลดข้อมูลได้'
    },
    [isConnected],
  )

  const renderRetryAction = (onRetry: () => void, error: Error | null) => (
    <div className="flex min-h-[140px] items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-1.5 text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="text-sm">{getCardErrorMessage(error)}</p>
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
            <Siren className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">ระบบงานเวชศาสตร์ฉุกเฉิน</h2>
            <p className="text-sm text-muted-foreground">Emergency Medicine (ER)</p>
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
          <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
          รีเฟรช
        </Button>
      </div>

      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onRangeChange={handleRangeChange}
        isLoading={isKpisLoading}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-black">ผู้ป่วย ER วันนี้</CardDescription>
            <CardTitle className="text-3xl">
              {isKpisLoading ? <Skeleton className="h-9 w-24" /> : !isConnected || isKpisError ? '-' : (kpis?.todayCount ?? 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3 text-xs text-muted-foreground">
            {!isKpisLoading && (!isConnected || isKpisError) ? (
              renderRetryAction(executeKpis, kpisError)
            ) : !isKpisLoading && kpis ? (
              (() => {
                const diff = kpis.todayCount - kpis.yesterdayCount
                const pct = kpis.yesterdayCount > 0 ? ((diff / kpis.yesterdayCount) * 100).toFixed(1) : '0.0'
                const isUp = diff >= 0
                return (
                  <p>
                    เมื่อวาน {kpis.yesterdayCount.toLocaleString()} ราย{' '}
                    <span className={cn('font-medium', isUp ? 'text-green-600' : 'text-red-600')}>
                      {isUp ? '+' : ''}{pct}%
                    </span>
                  </p>
                )
              })()
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-black">ผู้ป่วย ER เดือนนี้</CardDescription>
            <CardTitle className="text-3xl">
              {isKpisLoading ? <Skeleton className="h-9 w-24" /> : !isConnected || isKpisError ? '-' : (kpis?.monthCount ?? 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {!isKpisLoading && (!isConnected || isKpisError)
              ? renderRetryAction(executeKpis, kpisError)
              : 'นับตั้งแต่ต้นเดือนถึงปัจจุบัน'}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-black">กำลังรักษาอยู่</CardDescription>
            <CardTitle className="text-3xl">
              {isKpisLoading ? <Skeleton className="h-9 w-24" /> : !isConnected || isKpisError ? '-' : (kpis?.activeTreatmentCount ?? 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {!isKpisLoading && (!isConnected || isKpisError)
              ? renderRetryAction(executeKpis, kpisError)
              : 'ผู้ป่วยที่ยังไม่ได้ลงข้อมูลออกจากห้อง ER'}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-black">ประสิทธิภาพงานฉุกเฉิน</CardDescription>
            <CardTitle className="text-3xl text-emerald-600">
              {isLevel1SurvivalLoading
                ? <Skeleton className="h-9 w-24" />
                : !isConnected || isLevel1SurvivalError
                  ? '-'
                  : `${(level1Survival?.survivalRate ?? 0).toFixed(1)}%`}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {isLevel1SurvivalLoading
              ? 'กำลังคำนวณ...'
              : !isConnected || isLevel1SurvivalError
                ? renderRetryAction(executeLevel1Survival, level1SurvivalError)
                : `ผู้ป่วยผู้ป่วยฉุกเฉินเร่งด่วน ${level1Survival?.level1Total ?? 0} ราย รอดชีวิต ${level1Survival?.survivedCount ?? 0} `}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-black">เวลารอแพทย์ตรวจ (เฉลี่ย)</CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              {isWaitTimeStatsLoading ? (
                <Skeleton className="h-9 w-24" />
              ) : !isConnected || isWaitTimeStatsError ? (
                '-'
              ) : (
                `${(waitTimeStats?.avgWaitBeforeDoctorMinutes ?? 0).toFixed(1)} นาที`
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {isWaitTimeStatsLoading
              ? 'กำลังคำนวณ...'
              : !isConnected || isWaitTimeStatsError
                ? renderRetryAction(executeWaitTimeStats, waitTimeStatsError)
                : `คำนวณจาก เวลาแพทย์เริ่มตรวจ - เวลาเข้าห้อง ER (${waitTimeStats?.caseCount ?? 0} ราย)`}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-black">เวลาแพทย์ตรวจ (เฉลี่ย)</CardDescription>
            <CardTitle className="text-3xl text-emerald-600">
              {isWaitTimeStatsLoading ? (
                <Skeleton className="h-9 w-24" />
              ) : !isConnected || isWaitTimeStatsError ? (
                '-'
              ) : (
                `${(waitTimeStats?.avgDoctorExamMinutes ?? 0).toFixed(1)} นาที`
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {isWaitTimeStatsLoading
              ? 'กำลังคำนวณ...'
              : !isConnected || isWaitTimeStatsError
                ? renderRetryAction(executeWaitTimeStats, waitTimeStatsError)
                : `คำนวณจาก เวลาสิ้นสุดรักษา - เวลาแพทย์เริ่มตรวจ (${waitTimeStats?.caseCount ?? 0} ราย)`}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>จำนวนผู้ป่วยแยกตามกลุ่มอุบัติเหตุ</CardTitle>
            <CardDescription>แสดงประเภทอุบัติเหตุ (er_accident_type)</CardDescription>
          </CardHeader>
          <CardContent className="h-[420px]">
            {isAccidentTypeLoading ? (
              <Skeleton className="h-full w-full" />
            ) : !isConnected || isAccidentTypeError ? (
              renderRetryAction(executeAccidentType, accidentTypeError)
            ) : accidentTypeChartData.length > 0 ? (
              <div className="flex h-full flex-col">
                <div className="min-h-0 flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 12, right: 12, left: 12, bottom: 12 }}>
                      <Pie
                        data={accidentTypeChartData}
                        dataKey="patientCount"
                        nameKey="accidentTypeName"
                        cx="50%"
                        cy="50%"
                        innerRadius="45%"
                        outerRadius="70%"
                      >
                        {accidentTypeChartData.map((entry, index) => (
                          <Cell key={entry.accidentTypeName} fill={ACCIDENT_TYPE_COLORS[index % ACCIDENT_TYPE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        cursor={false}
                        formatter={((value: unknown, _name: string, item: { payload?: Record<string, unknown> }) => {
                          const label = String(item?.payload?.accidentTypeName ?? 'ประเภทอุบัติเหตุ')
                          return [Number(value).toLocaleString(), label]
                        }) as never}
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 max-h-24 overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 gap-1 text-xs">
                    {accidentTypeChartData.map((item, index) => (
                      <div key={item.accidentTypeName} className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: ACCIDENT_TYPE_COLORS[index % ACCIDENT_TYPE_COLORS.length] }}
                        />
                        <span className="truncate text-muted-foreground">{item.accidentTypeName}</span>
                        <span className="ml-auto shrink-0 font-medium tabular-nums">{item.patientCount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState title="ไม่พบข้อมูลอุบัติเหตุ" description="ช่วงวันที่นี้ไม่มีข้อมูลประเภทอุบัติเหตุที่มีจำนวน" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ผู้ป่วยตามความเร่งด่วน แยกเวร</CardTitle>
            <CardDescription>เทียบจำนวนผู้ป่วยตามเวร และระดับ Triage</CardDescription>
          </CardHeader>
          <CardContent>
            {isTriageByPeriodLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : !isConnected || isTriageByPeriodError ? (
              renderRetryAction(executeTriageByPeriod, triageByPeriodError)
            ) : (triageByPeriodData?.length ?? 0) > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">ความเร่งด่วน</TableHead>
                      {(triageByPeriodData ?? []).map((period, index) => (
                        <TableHead key={`${period.erPeriod}-${index}`} className="text-center">
                          {period.erPeriod}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {triageTableRows.map((row) => (
                      <TableRow key={row.level}>
                        <TableCell className="font-medium">{row.level}</TableCell>
                        {row.values.map((value, index) => (
                          <TableCell key={`${row.level}-${index}`} className={`text-center ${row.className}`}>
                            {value}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState title="ไม่พบข้อมูลเวร ER" description="ยังไม่มีข้อมูล er_period ในช่วงวันที่ที่เลือก" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ผลลัพธ์การดูแลผู้ป่วย</CardTitle>
            <CardDescription>วิเคราะห์จากการลงข้อมูลโดยตรง เพื่อให้ได้สถิติการ Admit / Refer / เสียชีวิต</CardDescription>
          </CardHeader>
          <CardContent className="h-[420px]">
            {isDispositionLoading ? (
              <Skeleton className="h-full w-full" />
            ) : !isConnected || isDispositionError ? (
              renderRetryAction(executeDisposition, dispositionError)
            ) : dispositionChartData.length > 0 ? (
              <div className="flex h-full flex-col">
                <div className="min-h-0 flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 12, right: 12, left: 12, bottom: 12 }}>
                      <Pie
                        data={dispositionChartData}
                        dataKey="caseCount"
                        nameKey="disposition"
                        cx="50%"
                        cy="50%"
                        innerRadius="45%"
                        outerRadius="70%"
                      >
                        {dispositionChartData.map((entry, index) => (
                          <Cell key={entry.disposition} fill={DISPOSITION_COLORS[index % DISPOSITION_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<DispositionTooltip />} cursor={false} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 max-h-24 overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 gap-1 text-xs">
                    {dispositionChartData.map((item, index) => (
                      <div key={item.disposition} className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: DISPOSITION_COLORS[index % DISPOSITION_COLORS.length] }}
                        />
                        <span className="truncate text-muted-foreground">{item.disposition}</span>
                        <span className="ml-auto shrink-0 font-medium tabular-nums">{item.caseCount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState title="ไม่พบข้อมูล Disposition" description="ลองปรับช่วงวันที่เพื่อดูแนวโน้มการจำหน่ายผู้ป่วย" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7 xl:col-span-5">
          <CardHeader>
            <CardTitle>อันดับหัตถการที่ทำบ่อย (ER)</CardTitle>
            <CardDescription>เรียงจากจำนวนมากไปน้อย</CardDescription>
          </CardHeader>
          <CardContent className="min-h-80">
            {isTopProceduresLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : !isConnected || isTopProceduresError ? (
              renderRetryAction(executeTopProcedures, topProceduresError)
            ) : (topProceduresData?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max((topProceduresData?.length ?? 0) * 42 + 20, 300)}>
                <BarChart
                  data={topProceduresData || []}
                  layout="vertical"
                  margin={{ top: 0, right: 60, left: 8, bottom: 0 }}
                  barCategoryGap="25%"
                >
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis
                    dataKey="operCode"
                    type="category"
                    width={55}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={false}
                    formatter={((value: unknown, _name: unknown, props: { payload?: Record<string, unknown> }) => {
                      const name = String(props?.payload?.operName ?? 'จำนวน')
                      return [Number(value).toLocaleString(), name]
                    }) as never}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="caseCount" fill="hsl(var(--chart-1))" radius={[0, 6, 6, 0]}>
                      <LabelList
                        dataKey="operName"
                        position="insideLeft"
                        formatter={(value: unknown) => truncateText(String(value ?? ''), 18)}
                        style={{ fontSize: 11, fill: 'hsl(var(--primary-foreground))' }}
                      />
                    <LabelList dataKey="caseCount" position="right" style={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="ไม่พบข้อมูลหัตถการ ER" description="ยังไม่มีข้อมูลหัตถการในช่วงวันที่ที่เลือก" />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5 xl:col-span-4">
          <CardHeader>
            <CardTitle>จำนวนผู้ป่วยแยกตามสถานะการออกจากห้อง ER</CardTitle>
            <CardDescription>ตามการลงข้อมูลที่แท็บห้องฉุกเฉิน</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {isLeaveStatusLoading ? (
              <Skeleton className="h-full w-full" />
            ) : !isConnected || isLeaveStatusError ? (
              renderRetryAction(executeLeaveStatus, leaveStatusError)
            ) : leaveStatusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leaveStatusChartData}
                    dataKey="patientCount"
                    nameKey="leaveStatus"
                    innerRadius={65}
                    outerRadius={105}
                  >
                    {leaveStatusChartData.map((entry, index) => (
                      <Cell key={entry.leaveStatus} fill={LEAVE_STATUS_COLORS[index % LEAVE_STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<LeaveStatusTooltip />} cursor={false} />
                  <Legend verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="ไม่พบข้อมูลสถานะการออกจาก ER" description="ช่วงวันที่นี้ไม่มีข้อมูลสถานะที่มีจำนวนมากกว่า 0" />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-12 xl:col-span-3">
          <CardHeader>
            <CardTitle>ประเภทผู้ป่วย ER</CardTitle>
            <CardDescription>แสดงสัดส่วนในรูปแบบ Radar Chart</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {isTopCauseLoading ? (
              <Skeleton className="h-full w-full" />
            ) : !isConnected || isTopCauseError ? (
              renderRetryAction(executeTopCause, topCauseError)
            ) : (topCauseData?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={topCauseData ?? []} outerRadius="72%">
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis
                    dataKey="causeName"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => truncateText(String(value), 14)}
                  />
                  <PolarRadiusAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    cursor={false}
                    formatter={((value: unknown) => [Number(value).toLocaleString(), 'จำนวน']) as never}
                    labelFormatter={((label: unknown) => `ประเภท: ${String(label)}`) as never}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Radar
                    name="จำนวนผู้ป่วย"
                    dataKey="caseCount"
                    stroke="hsl(var(--chart-2))"
                    fill="hsl(var(--chart-2))"
                    fillOpacity={0.35}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="ไม่พบข้อมูลประเภทผู้ป่วย ER" description="ยังไม่มีข้อมูลประเภทผู้ป่วยในช่วงวันที่ที่เลือก" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader className="space-y-0">
            <div className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>จำนวนหัตถการเทียบกับจำนวน VN (สัปดาห์นี้)</CardTitle>
                <CardDescription>สรุปข้อมูลภายในสัปดาห์นี้ แยกตามวัน (คลิก legend เพื่อซ่อน/แสดง)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isProcedureVsVnLoading ? (
              <Skeleton className="h-[520px] w-full" />
            ) : !isConnected || isProcedureVsVnError ? (
              <div className="h-[520px] flex items-center justify-center">
                {renderRetryAction(executeProcedureVsVn, procedureVsVnError)}
              </div>
            ) : procedureVsVnChartData.length === 0 ? (
              <EmptyState title="ไม่พบข้อมูลรายสัปดาห์" description="ยังไม่มีข้อมูลหัตถการในช่วงวันที่ที่เลือก" />
            ) : (
              <div className="flex gap-3 h-[520px]">
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={procedureVsVnChartData} margin={{ top: 20, right: 20, left: 10, bottom: 100 }}>
                      <XAxis dataKey="dayLabel" angle={-45} textAnchor="end" height={100} />
                      {visibleSeries.procedureCount && (
                        <YAxis yAxisId="count" allowDecimals={false} />
                      )}
                      {visibleSeries.treatmentAmount && (
                        <YAxis yAxisId="amount" orientation="right" tickFormatter={(value) => Number(value).toLocaleString()} />
                      )}
                      <Tooltip
                        cursor={false}
                        formatter={((value: unknown, name: string) => {
                          const numericValue = Number(value)
                          if (name === 'ค่ารักษา') {
                            return [`${numericValue.toLocaleString()} บาท`, name]
                          }
                          return [numericValue.toLocaleString(), name]
                        }) as never}
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                      />
                      {visibleSeries.procedureCount && (
                        <Bar yAxisId="count" dataKey="procedureCount" name="หัตถการ" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
                      )}
                      {visibleSeries.vnCount && (
                        <Bar yAxisId="count" dataKey="vnCount" name="VN" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} />
                      )}
                      {visibleSeries.treatmentAmount && (
                        <Line
                          yAxisId="amount"
                          type="monotone"
                          dataKey="treatmentAmount"
                          name="ค่ารักษา"
                          stroke="hsl(var(--chart-3))"
                          strokeWidth={2}
                          dot={{ r: 3, fill: 'hsl(var(--chart-3))', strokeWidth: 0 }}
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-32 shrink-0 pt-5">
                  {renderCustomLegend()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>ผู้ป่วยต่อแพทย์ (ER)</CardTitle>
            <CardDescription>แสดงชื่อแพทย์และจำนวนผู้ป่วย (10 รายการต่อหน้า)</CardDescription>
          </CardHeader>
          <CardContent>
            {isDoctorLoadLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : !isConnected || isDoctorLoadError ? (
              renderRetryAction(executeDoctorLoad, doctorLoadError)
            ) : (doctorLoadData?.length ?? 0) > 0 ? (
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">อันดับ</TableHead>
                      <TableHead>แพทย์</TableHead>
                      <TableHead className="text-right">จำนวนผู้ป่วย</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedDoctorLoadData.map((item, index) => (
                      <TableRow key={`${item.doctorCode}-${index}`}>
                        <TableCell>{currentDoctorPage * DOCTOR_PAGE_SIZE + index + 1}</TableCell>
                        <TableCell className="font-medium">{item.doctorName}</TableCell>
                        <TableCell className="text-right">{item.patientCount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    แสดง {pagedDoctorLoadData.length > 0 ? currentDoctorPage * DOCTOR_PAGE_SIZE + 1 : 0} ถึง{' '}
                    {Math.min((currentDoctorPage + 1) * DOCTOR_PAGE_SIZE, doctorCasesData.length)} จาก{' '}
                    <span className="font-semibold">{doctorCasesData.length}</span> แพทย์
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousDoctorPage}
                      disabled={currentDoctorPage === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      ย้อนกลับ
                    </Button>
                    <span className="text-xs text-muted-foreground px-2">
                      หน้า {currentDoctorPage + 1} / {doctorTotalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextDoctorPage}
                      disabled={currentDoctorPage >= doctorTotalPages - 1}
                    >
                      ถัดไป
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState title="ไม่พบข้อมูลแพทย์ ER" description="ยังไม่มีข้อมูลการลงรหัสแพทย์ในช่วงวันที่ที่เลือก" />
            )}
          </CardContent>
        </Card>

      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-12">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>ผู้ป่วยใน ER และเวลาการรักษา</CardTitle>
            <CardDescription>แสดงเวลาเข้า ER, เวลาแพทย์เริ่มตรวจ, เวลาสิ้นสุดรักษา และส่วนต่างเป็นนาที</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium whitespace-nowrap">ระดับความเร่งด่วน:</span>
            <select
              value={selectedTriageLevel}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="text-xs px-2 py-1 border rounded-md text-slate-900 dark:text-slate-100"
            >
              <option value="">ทั้งหมด</option>
              {uniqueTriageLevels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isCasesWithWaitTimesLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : !isConnected || isCasesWithWaitTimesError ? (
            renderRetryAction(executeCasesWithWaitTimes, casesWithWaitTimesError)
          ) : (casesWithWaitTimesData?.length ?? 0) > 0 ? (
            <div>
              {/* Table */}
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">อันดับ</TableHead>
                    <TableHead className="w-24">HN</TableHead>
                    <TableHead className="w-24">VN</TableHead>
                    <TableHead className="w-24">คิว</TableHead>
                    <TableHead className="whitespace-nowrap">เวลาเข้า ER</TableHead>
                    <TableHead className="whitespace-nowrap">เวลาแพทย์เริ่มตรวจ</TableHead>
                    <TableHead className="whitespace-nowrap">เวลาสิ้นสุดรักษา</TableHead>
                    <TableHead className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium"
                        onClick={() => handleHeaderSort('wait')}
                      >
                        เวลารอแพทย์ (เริ่มตรวจ - เข้า ER) {sortBy === 'wait' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium"
                        onClick={() => handleHeaderSort('exam')}
                      >
                        เวลาแพทย์ตรวจ (สิ้นสุดรักษา - เริ่มตรวจ) {sortBy === 'exam' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
                      </Button>
                    </TableHead>
                    <TableHead>Triage Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedCases.map((item, index) => {
                    const isAnomalous = item.waitBeforeDoctorMinutes < 0 || item.doctorExamMinutes < 0
                    return (
                      <TableRow
                        key={`${item.hn}-${item.vn}-${index}`}
                        className={cn(isAnomalous && 'bg-red-50 dark:bg-red-950/20')}
                      >
                        <TableCell className="font-mono text-xs">{currentPage * PAGE_SIZE + index + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{item.hn}</TableCell>
                        <TableCell className="font-mono text-xs">{item.vn}</TableCell>
                        <TableCell className="font-mono text-xs">{item.oqueue}</TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap">{formatTimeOnly(item.enterErTime)}</TableCell>
                        <TableCell className={cn('font-mono text-xs whitespace-nowrap', item.waitBeforeDoctorMinutes < 0 && 'text-red-600 font-bold')}>{formatTimeOnly(item.doctorTxTime)}</TableCell>
                        <TableCell className={cn('font-mono text-xs whitespace-nowrap', item.doctorExamMinutes < 0 && 'text-red-600 font-bold')}>{formatTimeOnly(item.finishTime)}</TableCell>
                        <TableCell className={cn('text-right font-mono text-xs', item.waitBeforeDoctorMinutes < 0 && 'text-red-600 font-bold')}>{item.waitBeforeDoctorMinutes.toLocaleString()} นาที</TableCell>
                        <TableCell className={cn('text-right font-mono text-xs', item.doctorExamMinutes < 0 && 'text-red-600 font-bold')}>{item.doctorExamMinutes.toLocaleString()} นาที</TableCell>
                        <TableCell className="font-mono text-xs max-w-[200px] truncate">{item.triageLevel}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            </div>
          ) : (
            <EmptyState title="ไม่พบข้อมูล" description="ยังไม่มีเคสในห้อง ER ที่มีข้อมูลครบ" />
          )}
          {(casesWithWaitTimesData?.length ?? 0) > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                แสดง {pagedCases.length > 0 ? currentPage * PAGE_SIZE + 1 : 0} ถึง{' '}
                {Math.min((currentPage + 1) * PAGE_SIZE, casesData.length)} จาก{' '}
                <span className="font-semibold">{casesData.length}</span> เคส
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
          )}
        </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>แนวโน้มจำนวนผู้ป่วย ER รายเดือน</CardTitle>
          <CardDescription>ย้อนหลัง 12 เดือน</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {isTrendLoading ? (
            <Skeleton className="h-full w-full" />
          ) : !isConnected || isTrendError ? (
            renderRetryAction(executeTrend, trendError)
          ) : (monthlyTrendData?.length ?? 0) > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrendData ?? []}>
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip
                  cursor={false}
                  formatter={((value: unknown) => [Number(value).toLocaleString(), 'ราย']) as never}
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="patientCount"
                  name="จำนวนผู้ป่วย ER"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={3}
                  dot={{ r: 4, fill: 'hsl(var(--chart-1))', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: 'hsl(var(--chart-1))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="ไม่พบข้อมูลแนวโน้มรายเดือน" description="ยังไม่มีข้อมูล ER ในช่วง 12 เดือนล่าสุด" />
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        ช่วงข้อมูลหลัก: {startDate} ถึง {endDate}
      </p>
    </div>
  )
}
