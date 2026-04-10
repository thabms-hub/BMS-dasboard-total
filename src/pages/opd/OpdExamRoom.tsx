// =============================================================================
// OPD: งานห้องตรวจแพทย์
// =============================================================================

import { type ReactNode, useCallback, useState } from 'react'
import { Stethoscope, RefreshCw, CalendarDays, Clock, AlertCircle, ListOrdered, Timer, FileText, Users, UserRoundCheck, Hourglass, Info, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
} from 'recharts'
import { useBmsSessionContext } from '@/contexts/BmsSessionContext'
import { useQuery } from '@/hooks/useQuery'
import { usePersistentDateRange } from '@/hooks/usePersistentDateRange'
import { DateRangePicker } from '@/components/dashboard/DateRangePicker'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate, formatDateTime } from '@/utils/dateUtils'
import {
  getOpdExamDispositionSummary,
  getOpdExamDeformedCertSummary,
  getOpdExamDoctorCertByType,
  getOpdExamIcd10ByDoctor,
  getOpdExamOperationSetSummary,
  getOpdExamReferralBreakdown,
  getOpdExamReferralSummary,
  getOpdExamSlaWithin30Minutes,
  getOpdExamTopKpiSummary,
  getOpdExamTopDiagnoses,
  getOpdExamTopReferOutDiseases,
  getOpdExamWeekdayHourPatients,
  getOpdExamWaitTimeBySpclty,
} from '@/services/opdExamRoomService'
import type {
  OpdExamDispositionSummary,
  OpdExamDeformedCertSummary,
  OpdExamDoctorCertTypeItem,
  OpdExamDoctorIcd10Item,
  OpdExamOperationSetSummary,
  OpdExamReferralBreakdownItem,
  OpdExamReferralSummary,
  OpdExamReferOutDiseaseItem,
  OpdExamSlaSummary,
  OpdExamTopKpiSummary,
  OpdExamTopDiagnosisItem,
  OpdExamWeekdayHourItem,
  OpdExamWaitTimeItem,
} from '@/types'

type DiagnosisMode = 'principal' | 'all'

function truncateText(value: string, max = 28) {
  if (value.length <= max) return value
  return `${value.slice(0, max)}...`
}

function parseTimeToSeconds(value: string) {
  const parts = value.split(':').map(Number)
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return 0
  }

  const [hours, minutes, seconds] = parts
  return (hours * 3600) + (minutes * 60) + seconds
}

function getHeatmapBackground(value: number, maxValue: number, rgb: string) {
  if (value <= 0 || maxValue <= 0) {
    return undefined
  }

  const intensity = Math.max(0.12, Math.min(value / maxValue, 1))
  return `rgba(${rgb}, ${intensity * 0.55})`
}

function getCriticalValueClass(value: number, threshold: number) {
  return value >= threshold
    ? 'font-bold text-rose-700 dark:text-rose-300'
    : 'text-foreground'
}

function secondsToMinutes(value: number) {
  return Math.round((value / 60) * 10) / 10
}

function formatDurationTick(value: number) {
  if (value >= 60) {
    const h = value / 60
    return `${h >= 10 ? h.toFixed(0) : h.toFixed(1)} ชม.`
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} นาที`
}

function parseIsoDateOnly(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

function formatIsoDateOnly(value: Date) {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  const day = `${value.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getPreviousRange(startDate: string, endDate: string) {
  const start = parseIsoDateOnly(startDate)
  const end = parseIsoDateOnly(endDate)
  const diffMs = end.getTime() - start.getTime()
  const dayCount = Math.max(Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1, 1)

  const prevEnd = new Date(start)
  prevEnd.setDate(prevEnd.getDate() - 1)

  const prevStart = new Date(prevEnd)
  prevStart.setDate(prevStart.getDate() - (dayCount - 1))

  return {
    prevStartDate: formatIsoDateOnly(prevStart),
    prevEndDate: formatIsoDateOnly(prevEnd),
  }
}

function calculateTrendPercent(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) return 0
    return null
  }
  return ((current - previous) / previous) * 100
}

function renderInlineTrend(trend: number | null) {
  if (trend === null) {
    return <span className="text-xs font-medium text-muted-foreground">N/A</span>
  }

  const isUp = trend >= 0
  return (
    <span className={cn('text-xs font-medium', isUp ? 'text-green-600' : 'text-red-600')}>
      {isUp ? '+' : ''}{trend.toFixed(1)}%
    </span>
  )
}

function renderCardTitleWithTooltip(title: ReactNode, description: ReactNode, className = 'text-sm font-medium') {
  return (
    <CardTitle className={cn(className, 'flex items-center gap-2')}>
      <span>{title}</span>
      <span className="group relative inline-flex">
        <span
          className="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-primary"
          aria-label="ข้อมูลการ์ด"
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

const CERT_CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
]

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function OpdExamRoom() {
  const { connectionConfig, session } = useBmsSessionContext()
  const { colorTheme } = useTheme()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [diagnosisMode, setDiagnosisMode] = useState<DiagnosisMode>('principal')
  const [visibleWaitSeries, setVisibleWaitSeries] = useState({ waitDoctorAvgMinutes: true, doctorTimeAvgMinutes: true })
  const [waitTimePage, setWaitTimePage] = useState(0)

  const { startDate, endDate, setRange } = usePersistentDateRange('opd-exam-room', 30)
  const isConnected = connectionConfig !== null && session !== null
  const today = formatDate(new Date())
  const { prevStartDate, prevEndDate } = getPreviousRange(startDate, endDate)

  const topDiagnosesFn = useCallback(
    () => getOpdExamTopDiagnoses(connectionConfig!, startDate, endDate, diagnosisMode === 'principal'),
    [connectionConfig, startDate, endDate, diagnosisMode],
  )

  const doctorIcd10Fn = useCallback(
    () => getOpdExamIcd10ByDoctor(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )

  const referOutFn = useCallback(
    () => getOpdExamTopReferOutDiseases(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )

  const operationSetFn = useCallback(
    () => getOpdExamOperationSetSummary(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )

  const doctorCertByTypeFn = useCallback(
    () => getOpdExamDoctorCertByType(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )

  const deformedCertFn = useCallback(
    () => getOpdExamDeformedCertSummary(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )

  const waitTimeFn = useCallback(
    () => getOpdExamWaitTimeBySpclty(connectionConfig!, session!.databaseType, startDate, endDate),
    [connectionConfig, session, startDate, endDate],
  )

  const weekdayHourFn = useCallback(
    () => getOpdExamWeekdayHourPatients(connectionConfig!, session!.databaseType, startDate, endDate),
    [connectionConfig, session, startDate, endDate],
  )

  const referralSummaryFn = useCallback(
    () => getOpdExamReferralSummary(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )

  const referralBreakdownFn = useCallback(
    () => getOpdExamReferralBreakdown(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )

  const slaFn = useCallback(
    () => getOpdExamSlaWithin30Minutes(connectionConfig!, session!.databaseType, startDate, endDate),
    [connectionConfig, session, startDate, endDate],
  )

  const dispositionFn = useCallback(
    () => getOpdExamDispositionSummary(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )

  const topKpiFn = useCallback(
    () => getOpdExamTopKpiSummary(connectionConfig!, session!.databaseType, startDate, endDate, prevStartDate, prevEndDate),
    [connectionConfig, session, startDate, endDate, prevStartDate, prevEndDate],
  )

  const {
    data: topDiagnoses,
    isLoading: isDiagnosesLoading,
    isError: isDiagnosesError,
    error: diagnosesError,
    execute: executeDiagnoses,
  } = useQuery<OpdExamTopDiagnosisItem[]>({
    queryFn: topDiagnosesFn,
    enabled: isConnected,
  })

  const {
    data: doctorIcd10Data,
    isLoading: isDoctorLoading,
    isError: isDoctorError,
    error: doctorError,
    execute: executeDoctor,
  } = useQuery<OpdExamDoctorIcd10Item[]>({
    queryFn: doctorIcd10Fn,
    enabled: isConnected,
  })

  const {
    data: referOutDiseases,
    isLoading: isReferOutLoading,
    isError: isReferOutError,
    error: referOutError,
    execute: executeReferOut,
  } = useQuery<OpdExamReferOutDiseaseItem[]>({
    queryFn: referOutFn,
    enabled: isConnected,
  })

  const {
    data: operationSetSummary,
    isLoading: isOperationLoading,
    isError: isOperationError,
    execute: executeOperation,
  } = useQuery<OpdExamOperationSetSummary>({
    queryFn: operationSetFn,
    enabled: isConnected,
  })

  const {
    data: doctorCertByType,
    isLoading: isDoctorCertLoading,
    isError: isDoctorCertError,
    error: doctorCertError,
    execute: executeDoctorCert,
  } = useQuery<OpdExamDoctorCertTypeItem[]>({
    queryFn: doctorCertByTypeFn,
    enabled: isConnected,
  })

  const {
    data: deformedCertSummary,
    isLoading: isDeformedCertLoading,
    isError: isDeformedCertError,
    execute: executeDeformedCert,
  } = useQuery<OpdExamDeformedCertSummary>({
    queryFn: deformedCertFn,
    enabled: isConnected,
  })

  const {
    data: waitTimeData,
    isLoading: isWaitTimeLoading,
    isError: isWaitTimeError,
    error: waitTimeError,
    execute: executeWaitTime,
  } = useQuery<OpdExamWaitTimeItem[]>({
    queryFn: waitTimeFn,
    enabled: isConnected,
  })

  const {
    data: topKpiSummary,
    isLoading: isTopKpiLoading,
    isError: isTopKpiError,
    execute: executeTopKpi,
  } = useQuery<OpdExamTopKpiSummary>({
    queryFn: topKpiFn,
    enabled: isConnected,
  })

  const {
    data: weekdayHourRows,
    isLoading: isWeekdayHourLoading,
    isError: isWeekdayHourError,
    error: weekdayHourError,
    execute: executeWeekdayHour,
  } = useQuery<OpdExamWeekdayHourItem[]>({
    queryFn: weekdayHourFn,
    enabled: isConnected,
  })

  const {
    data: referralSummary,
    isLoading: isReferralSummaryLoading,
    execute: executeReferralSummary,
  } = useQuery<OpdExamReferralSummary>({
    queryFn: referralSummaryFn,
    enabled: isConnected,
  })

  const {
    data: referralBreakdown,
    isLoading: isReferralBreakdownLoading,
    isError: isReferralBreakdownError,
    error: referralBreakdownError,
    execute: executeReferralBreakdown,
  } = useQuery<OpdExamReferralBreakdownItem[]>({
    queryFn: referralBreakdownFn,
    enabled: isConnected,
  })

  const {
    data: slaSummary,
    isLoading: isSlaLoading,
    isError: isSlaError,
    error: slaError,
    execute: executeSla,
  } = useQuery<OpdExamSlaSummary>({
    queryFn: slaFn,
    enabled: isConnected,
  })

  const {
    data: dispositionSummary,
    isLoading: isDispositionLoading,
    isError: isDispositionError,
    error: dispositionError,
    execute: executeDisposition,
  } = useQuery<OpdExamDispositionSummary>({
    queryFn: dispositionFn,
    enabled: isConnected,
  })

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        executeDiagnoses(),
        executeDoctor(),
        executeReferOut(),
        executeOperation(),
        executeWaitTime(),
        executeDoctorCert(),
        executeDeformedCert(),
        executeTopKpi(),
        executeWeekdayHour(),
        executeReferralSummary(),
        executeReferralBreakdown(),
        executeSla(),
        executeDisposition(),
      ])
      setLastUpdated(new Date())
    } finally {
      setIsRefreshing(false)
    }
  }, [executeDiagnoses, executeDoctor, executeReferOut, executeOperation, executeWaitTime, executeDoctorCert, executeDeformedCert, executeTopKpi, executeWeekdayHour, executeReferralSummary, executeReferralBreakdown, executeSla, executeDisposition])

  const handleWaitLegendClick = useCallback((key: string) => {
    setVisibleWaitSeries((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))
  }, [])

  const waitTimeRows = waitTimeData ?? []
  const WAIT_TIME_PAGE_SIZE = 10
  const waitTimeSortedRows = [...waitTimeRows].sort((a, b) => parseTimeToSeconds(b.doctorTimeAvg) - parseTimeToSeconds(a.doctorTimeAvg))
  const waitTimeTotalPages = Math.ceil(waitTimeSortedRows.length / WAIT_TIME_PAGE_SIZE)
  const waitTimePageIndex = waitTimeTotalPages > 0 ? Math.min(waitTimePage, waitTimeTotalPages - 1) : 0
  const pagedWaitTimeRows = waitTimeSortedRows.slice(
    waitTimePageIndex * WAIT_TIME_PAGE_SIZE,
    (waitTimePageIndex + 1) * WAIT_TIME_PAGE_SIZE,
  )

  const handlePreviousWaitTimePage = useCallback(() => {
    setWaitTimePage((prev) => Math.max(prev - 1, 0))
  }, [])

  const handleNextWaitTimePage = useCallback(() => {
    setWaitTimePage((prev) => Math.min(prev + 1, Math.max(waitTimeTotalPages - 1, 0)))
  }, [waitTimeTotalPages])

  const noDataEverywhere =
    !isDiagnosesLoading &&
    !isDoctorLoading &&
    !isReferOutLoading &&
    !isOperationLoading &&
    !isDoctorCertLoading &&
    !isDeformedCertLoading &&
    !isTopKpiLoading &&
    !isWeekdayHourLoading &&
    !isReferralSummaryLoading &&
    !isReferralBreakdownLoading &&
    !isSlaLoading &&
    !isDispositionLoading &&
    !isWaitTimeLoading &&
    (topDiagnoses?.length ?? 0) === 0 &&
    (doctorIcd10Data?.length ?? 0) === 0 &&
    (referOutDiseases?.length ?? 0) === 0 &&
    (operationSetSummary?.operationOrderCount ?? 0) === 0 &&
    (doctorCertByType?.length ?? 0) === 0 &&
    (deformedCertSummary?.deformedCertCount ?? 0) === 0 &&
    (topKpiSummary?.totalPatientsCurrent ?? 0) === 0 &&
    (topKpiSummary?.referredCurrent ?? 0) === 0 &&
    (weekdayHourRows?.length ?? 0) === 0 &&
    (referralSummary?.totalReferrals ?? 0) === 0 &&
    (referralBreakdown?.length ?? 0) === 0 &&
    (slaSummary?.totalCases ?? 0) === 0 &&
    (dispositionSummary?.totalCount ?? 0) === 0 &&
    (waitTimeData?.length ?? 0) === 0

  const topDiagnosesData = topDiagnoses ?? []
  const doctorIcd10Rows = doctorIcd10Data ?? []
  const referOutRows = referOutDiseases ?? []
  const doctorCertRows = doctorCertByType ?? []
  const doctorCertTotal = doctorCertRows.reduce((sum, item) => sum + item.certCount, 0)
  const weekdayHourData = weekdayHourRows ?? []
  const referralBreakdownRows = referralBreakdown ?? []
  const dispositionTotal = dispositionSummary?.totalCount ?? 0
  const admitRatio = dispositionTotal > 0 ? ((dispositionSummary?.admitCount ?? 0) / dispositionTotal) * 100 : 0
  const referRatio = dispositionTotal > 0 ? ((dispositionSummary?.referCount ?? 0) / dispositionTotal) * 100 : 0
  const homeRatio = dispositionTotal > 0 ? ((dispositionSummary?.homeCount ?? 0) / dispositionTotal) * 100 : 0
  const hourBinStarts = Array.from({ length: 12 }, (_, i) => i * 2)
  const weekdayTotals = WEEKDAY_LABELS.map((_, weekdayIndex) =>
    weekdayHourData
      .filter((item) => item.weekdayIndex === weekdayIndex)
      .reduce((sum, item) => sum + item.patientCount, 0),
  )
  const maxWeekdayTotal = Math.max(...weekdayTotals, 1)
  const heatmapMatrix = hourBinStarts.map((startHour) =>
    WEEKDAY_LABELS.map((_, weekdayIndex) =>
      weekdayHourData
        .filter((item) => item.weekdayIndex === weekdayIndex && Math.floor(item.hourOfDay / 2) * 2 === startHour)
        .reduce((sum, item) => sum + item.patientCount, 0),
    ),
  )
  const maxHeatValue = Math.max(...heatmapMatrix.flat(), 1)
  const totalPatientsTrend = calculateTrendPercent(topKpiSummary?.totalPatientsCurrent ?? 0, topKpiSummary?.totalPatientsPrevious ?? 0)
  const avgWaitTrend = calculateTrendPercent(topKpiSummary?.avgWaitMinutesCurrent ?? 0, topKpiSummary?.avgWaitMinutesPrevious ?? 0)
  const referredTrend = calculateTrendPercent(topKpiSummary?.referredCurrent ?? 0, topKpiSummary?.referredPrevious ?? 0)
  const waitDoctorAvgMaxSeconds = Math.max(...waitTimeRows.map((row) => parseTimeToSeconds(row.waitDoctorAvg)), 1)
  const waitDoctorMaxMaxSeconds = Math.max(...waitTimeRows.map((row) => parseTimeToSeconds(row.waitDoctorMax)), 1)
  const doctorTimeAvgMaxSeconds = Math.max(...waitTimeRows.map((row) => parseTimeToSeconds(row.doctorTimeAvg)), 1)
  const doctorTimeMaxMaxSeconds = Math.max(...waitTimeRows.map((row) => parseTimeToSeconds(row.doctorTimeMax)), 1)
  const criticalWaitDoctorSeconds = 60 * 60 * 3  // 3 ชั่วโมง
  const criticalDoctorTimeSeconds = 60 * 60      // 1 ชั่วโมง
  const waitTimeChartData = waitTimeRows.map((row) => ({
    spcltyName: truncateText(row.spcltyName, 16),
    spcltyNameFull: row.spcltyName,
    waitDoctorAvgMinutes: secondsToMinutes(parseTimeToSeconds(row.waitDoctorAvg)),
    doctorTimeAvgMinutes: secondsToMinutes(parseTimeToSeconds(row.doctorTimeAvg)),
    waitDoctorAvg: row.waitDoctorAvg,
    doctorTimeAvg: row.doctorTimeAvg,
  }))
  const isBlueTheme = colorTheme === 'blue'
  const primaryChartColor = isBlueTheme ? '#362FD9' : 'hsl(var(--primary))'
  const secondaryChartColor = isBlueTheme ? '#537FE7' : 'hsl(var(--accent))'
  const tertiaryChartColor = isBlueTheme ? '#60A5FA' : 'hsl(var(--chart-4))'
  const iconToneClass = colorTheme === 'green'
    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    : colorTheme === 'orange'
      ? 'bg-orange-500/10 text-orange-700 dark:text-orange-300'
      : 'bg-sky-500/10 text-sky-700 dark:text-sky-300'

  if (!isConnected) {
    return (
      <EmptyState
        icon={<Stethoscope className="h-5 w-5" />}
        title="ยังไม่เชื่อมต่อ BMS Session"
        description="กรุณาเชื่อมต่อ Session ก่อนใช้งานแดชบอร์ดห้องตรวจแพทย์"
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 shadow-md ring-1 ring-primary/20">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 to-transparent" />
            <Stethoscope className="relative h-10 w-10 text-primary drop-shadow-sm" />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-3xl font-bold tracking-tight">งานห้องตรวจแพทย์</h2>
            <p className="text-base text-muted-foreground">Outpatient Examination Room</p>
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
        onRangeChange={(newStartDate, newEndDate) => {
          setRange(newStartDate, newEndDate)
          setWaitTimePage(0)
        }}
        isLoading={isRefreshing}
      />

      <div className="grid gap-6 grid-cols-6">
        <Card className="card-shadow h-full p-2.5">
          <CardContent className="flex flex-col gap-2 p-0">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/10 text-sky-600">
                <Users className="h-3.5 w-3.5" />
              </div>
              {renderCardTitleWithTooltip('ผู้ป่วยมารับบริการ', 'จำนวนผู้ป่วยที่เข้ารับบริการในช่วงวันที่ที่เลือก', 'text-xs font-semibold text-black/90')}
            </div>
            {isTopKpiLoading ? <Skeleton className="h-6 w-24" /> : isTopKpiError ? <p className="text-xs text-destructive">โหลดไม่สำเร็จ</p> : (
              <>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-sky-600">{(topKpiSummary?.totalPatientsCurrent ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">ราย</p>
                </div>
                <p className="pt-1 text-xs text-muted-foreground">
                  เมื่อวาน {(topKpiSummary?.totalPatientsPrevious ?? 0).toLocaleString()} ราย
                  <span className="ml-1">{renderInlineTrend(totalPatientsTrend)}</span>
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="card-shadow h-full p-2.5">
          <CardContent className="flex flex-col gap-2 p-0">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                <Hourglass className="h-3.5 w-3.5" />
              </div>
              {renderCardTitleWithTooltip('เวลาเฉลี่ย', 'ระยะเวลารอเฉลี่ยในช่วงวันที่ที่เลือก', 'text-xs font-semibold text-black/90')}
            </div>
            {isTopKpiLoading ? <Skeleton className="h-6 w-24" /> : isTopKpiError ? <p className="text-xs text-destructive">โหลดไม่สำเร็จ</p> : (
              <>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-amber-600">{(topKpiSummary?.avgWaitMinutesCurrent ?? 0).toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">min</p>
                </div>
                <p className="pt-1 text-xs text-muted-foreground">
                  เมื่อวาน {(topKpiSummary?.avgWaitMinutesPrevious ?? 0).toFixed(1)} min
                  <span className="ml-1">{renderInlineTrend(avgWaitTrend)}</span>
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="card-shadow h-full p-2.5">
          <CardContent className="flex flex-col gap-2 p-0">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/10 text-violet-600">
                <UserRoundCheck className="h-3.5 w-3.5" />
              </div>
              {renderCardTitleWithTooltip('Refer Out', 'จำนวนผู้ป่วยที่ส่งต่อในช่วงวันที่ที่เลือก', 'text-xs font-semibold text-black/90')}
            </div>
            {isTopKpiLoading ? <Skeleton className="h-6 w-24" /> : isTopKpiError ? <p className="text-xs text-destructive">โหลดไม่สำเร็จ</p> : (
              <>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-violet-600">{(topKpiSummary?.referredCurrent ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">ราย</p>
                </div>
                <p className="pt-1 text-xs text-muted-foreground">
                  เมื่อวาน {(topKpiSummary?.referredPrevious ?? 0).toLocaleString()} ราย
                  <span className="ml-1">{renderInlineTrend(referredTrend)}</span>
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="h-full p-2.5">
          <CardContent className="flex flex-col gap-2 p-0">
            <div className="flex items-center gap-2">
              <div className={cn('flex h-6 w-6 items-center justify-center rounded-full', iconToneClass)}>
                <ListOrdered className="h-3.5 w-3.5" />
              </div>
              {renderCardTitleWithTooltip('คำสั่งผ่าตัด', 'จำนวนคำสั่งผ่าตัดจากตาราง operation_set', 'text-xs font-semibold text-black/90')}
            </div>
            {isOperationLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : isOperationError ? (
              <p className="text-xs text-destructive">โหลดไม่สำเร็จ</p>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">{(operationSetSummary?.operationOrderCount ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">รายการ</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="card-shadow h-full p-2.5">
          <CardContent className="flex flex-col gap-2 p-0">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <FileText className="h-3.5 w-3.5" />
              </div>
              {renderCardTitleWithTooltip('ใบรับรองความพิการ', 'รวมตามช่วงวันที่ที่เลือก', 'text-xs font-semibold text-black/90')}
            </div>
            {isDeformedCertLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : isDeformedCertError ? (
              <p className="text-xs text-destructive">โหลดข้อมูลไม่สำเร็จ</p>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-emerald-600">{(deformedCertSummary?.deformedCertCount ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">ฉบับ</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="card-shadow h-full p-2.5">
          <CardContent className="flex flex-col gap-2 p-0">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
                <FileText className="h-3.5 w-3.5" />
              </div>
              {renderCardTitleWithTooltip('ใบรับรองแพทย์', 'รวมทุกประเภทตามช่วงวันที่ที่เลือก', 'text-xs font-semibold text-black/90')}
            </div>
            {isDoctorCertLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : isDoctorCertError ? (
              <p className="text-xs text-destructive">โหลดข้อมูลใบรับรองแพทย์ไม่สำเร็จ: {doctorCertError?.message}</p>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-blue-600">{doctorCertTotal.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">ฉบับ</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-12">
        <div className="col-span-4 h-full">
          <Card className="card-shadow h-full">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                {renderCardTitleWithTooltip(
                  <span className="flex items-center gap-2"><FileText className="h-4 w-4" />10 อันดับโรคที่พบบ่อยผู้ป่วยนอก</span>,
                  <>เรียงจากจำนวนผู้ป่วยสูงสุด ({diagnosisMode === 'principal' ? 'diagtype = 1' : 'ทุก diagtype'})</>,
                )}
            </div>
            <div className="flex items-center gap-1 rounded-md border bg-muted/30 p-1">
              <div className="flex items-center gap-1 rounded-md border bg-background/60 p-0.5">
                <button
                  type="button"
                  className={`rounded px-2 py-1 text-xs font-medium ${diagnosisMode === 'principal' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                  onClick={() => setDiagnosisMode('principal')}
                >
                  PDx
                </button>
                <button
                  type="button"
                  className={`rounded px-2 py-1 text-xs font-medium ${diagnosisMode === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                  onClick={() => setDiagnosisMode('all')}
                >
                  ทุกประเภท
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isDiagnosesLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : isDiagnosesError ? (
              <p className="text-sm text-destructive">โหลดข้อมูลโรคไม่สำเร็จ: {diagnosesError?.message}</p>
            ) : topDiagnosesData.length === 0 ? (
              <EmptyState title="ไม่พบข้อมูลโรค" description="ลองเปลี่ยนช่วงวันที่หรือรูปแบบการวินิจฉัย" className="py-8" />
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topDiagnosesData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis
                      dataKey="diagnosisName"
                      type="category"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      width={190}
                      tickFormatter={(value: string) => truncateText(value, 26)}
                    />
                    <Tooltip
                      cursor={false}
                      formatter={(value) => [Number(value ?? 0).toLocaleString(), 'ราย']}
                      labelFormatter={(label) => String(label ?? '')}
                    />
                    <Bar dataKey="patientCount" fill={primaryChartColor} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        </div>

        <div className="col-span-4 h-full">
          <Card className="card-shadow h-full">
            <CardHeader className="pb-3">
              {renderCardTitleWithTooltip('10 อันดับโรค Refer Out', 'เรียงตามจำนวนครั้งที่ส่งต่อออกมากที่สุด')}
          </CardHeader>
          <CardContent>
            {isReferOutLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded-full shrink-0" />
                    <Skeleton className="h-3 flex-1" />
                    <Skeleton className="h-3 w-12 shrink-0" />
                  </div>
                ))}
              </div>
            ) : isReferOutError ? (
              <p className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                โหลดข้อมูล refer out ไม่สำเร็จ: {referOutError?.message}
              </p>
            ) : referOutRows.length === 0 ? (
              <EmptyState title="ไม่พบข้อมูลโรค Refer Out" description="อาจไม่มีข้อมูลในช่วงวันที่ที่เลือก หรือโครงสร้างตารางไม่รองรับ" className="py-8" />
            ) : (
              <div className="space-y-1.5">
                {referOutRows.slice(0, 10).map((item, index) => (
                  <div key={`${item.icd10}-${index}`} className="flex items-center gap-2">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                      {index + 1}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium">{`${item.icd10 || '-'} ${item.diagnosisName || '-'}`}</span>
                    <span className="shrink-0 text-xs font-semibold text-muted-foreground">{item.referCount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </div>

        <div className="col-span-4 h-full">
          <Card className="card-shadow h-full">
            <CardHeader className="pb-3">
              {renderCardTitleWithTooltip('Top 10 สถานพยาบาลที่ส่งต่อ', 'Top 10 อันดับโรงพยาบาลที่ส่งผู้ป่วยไปมากที่สุด')}
            </CardHeader>
            <CardContent>
              {isReferralBreakdownLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-5 w-full" />
                  ))}
                </div>
              ) : isReferralBreakdownError ? (
                <p className="text-xs text-destructive">โหลดข้อมูลไม่สำเร็จ: {referralBreakdownError?.message}</p>
              ) : referralBreakdownRows.length === 0 ? (
                <EmptyState title="ไม่มีข้อมูลส่งต่อ" className="py-6" />
              ) : (
                <div className="space-y-1.5">
                  {referralBreakdownRows.slice(0, 10).map((item, index) => (
                    <div key={`${item.label}-${index}`} className="flex items-center gap-2">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">{index + 1}</div>
                      <span className="min-w-0 flex-1 truncate text-xs">{item.label}</span>
                      <span className="shrink-0 text-xs font-semibold text-muted-foreground">{item.referCount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-12">
        <div className="col-span-6 grid gap-6 grid-cols-1">
          <Card className="card-shadow flex flex-col h-full">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                {renderCardTitleWithTooltip('ปริมาณการบันทึก ICD10 แยกตามแพทย์ OPD', 'จำนวนผู้ป่วยและจำนวนรหัส ICD10 ต่อแพทย์')}
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col pb-4">
          {isDoctorLoading ? (
            <Skeleton className="h-[250px] w-full" />
          ) : isDoctorError ? (
            <p className="text-sm text-destructive">โหลดข้อมูลแพทย์ไม่สำเร็จ: {doctorError?.message}</p>
          ) : doctorIcd10Rows.length === 0 ? (
            <EmptyState title="ไม่พบข้อมูลการบันทึก ICD10" className="py-8" />
          ) : (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={doctorIcd10Rows} margin={{ left: 0, right: 6, top: 6, bottom: 56 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="doctorName"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => truncateText(String(value), 18)}
                    angle={-30}
                    textAnchor="end"
                    height={44}
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    formatter={(value, name) => [Number(value ?? 0).toLocaleString(), String(name) === 'patientCount' ? 'ผู้ป่วย' : 'รหัส ICD10']}
                  />
                  <Bar dataKey="patientCount" fill={secondaryChartColor} name="patientCount" radius={[4, 4, 0, 0]} maxBarSize={36}>
                    <LabelList dataKey="patientCount" position="top" style={{ fontSize: 11 }} formatter={(value) => Number(value ?? 0).toLocaleString()} />
                  </Bar>
                  <Bar dataKey="uniqueIcd10Count" fill={tertiaryChartColor} name="uniqueIcd10Count" radius={[4, 4, 0, 0]} maxBarSize={36}>
                    <LabelList dataKey="uniqueIcd10Count" position="top" style={{ fontSize: 11 }} formatter={(value) => Number(value ?? 0).toLocaleString()} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

          <Card className="card-shadow h-full">
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-muted-foreground" />
                เปรียบเทียบระยะเวลารอคอยเฉลี่ยตามสาขา
              </CardTitle>
              <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
                {([
                  { key: 'waitDoctorAvgMinutes', label: 'รอพบแพทย์ (เฉลี่ย)', color: secondaryChartColor },
                  { key: 'doctorTimeAvgMinutes', label: 'เวลาพบแพทย์ (เฉลี่ย)', color: tertiaryChartColor },
                ] as const).map((item) => {
                  const isVisible = visibleWaitSeries[item.key]
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleWaitLegendClick(item.key)}
                      className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
                      style={{ opacity: isVisible ? 1 : 0.35, cursor: 'pointer' }}
                    >
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />
                      <span className="text-xs leading-tight">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </CardHeader>
        <CardContent>
          {isWaitTimeLoading ? (
            <Skeleton className="h-[240px] w-full" />
          ) : isWaitTimeError ? (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              โหลดข้อมูลระยะเวลาไม่สำเร็จ: {waitTimeError?.message}
            </p>
          ) : waitTimeRows.length === 0 ? (
            <EmptyState
              title="ไม่พบข้อมูลระยะเวลารอคอย"
              description="ตรวจสอบว่ามีข้อมูล ovst_service_time ในช่วงวันที่เลือก"
              className="py-8"
            />
          ) : (
            <div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={waitTimeChartData} margin={{ left: 4, right: 12, top: 6, bottom: 64 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                    <XAxis
                      dataKey="spcltyName"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      angle={-30}
                      textAnchor="end"
                      height={52}
                      interval={0}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      tickFormatter={(v: number) => formatDurationTick(v)}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                      labelFormatter={(label) => {
                        const row = waitTimeChartData.find((r) => r.spcltyName === label)
                        return `สาขา: ${row?.spcltyNameFull ?? String(label)}`
                      }}
                      formatter={(value, name, item) => {
                        const payload = item.payload as { waitDoctorAvg: string; doctorTimeAvg: string }
                        if (String(name) === 'waitDoctorAvgMinutes') {
                          return [`${Number(value).toFixed(1)} นาที (${payload.waitDoctorAvg})`, 'รอพบแพทย์']
                        }
                        return [`${Number(value).toFixed(1)} นาที (${payload.doctorTimeAvg})`, 'เวลาพบแพทย์']
                      }}
                    />
                    {visibleWaitSeries.waitDoctorAvgMinutes && (
                      <Bar dataKey="waitDoctorAvgMinutes" fill={secondaryChartColor} radius={[4, 4, 0, 0]} maxBarSize={28} />
                    )}
                    {visibleWaitSeries.doctorTimeAvgMinutes && (
                      <Bar dataKey="doctorTimeAvgMinutes" fill={tertiaryChartColor} radius={[4, 4, 0, 0]} maxBarSize={28} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          )}
        </CardContent>
          </Card>
        </div>

        <div className="col-span-6 h-full">
          <Card className="card-shadow h-full">
            <CardHeader>
              {renderCardTitleWithTooltip('จำนวนผู้ป่วยตามวันในสัปดาห์และช่วงเวลา', 'ผู้ป่วยตามวันในสัปดาห์และช่วงเวลา พร้อมจำนวนผู้ป่วยต่อชั่วโมง โดยอ้างอิงจากวันที่ของการเปิด visit มารับบริการ')}
        </CardHeader>
        <CardContent>
          {isWeekdayHourLoading ? (
            <Skeleton className="h-[420px] w-full" />
          ) : isWeekdayHourError ? (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              โหลดข้อมูลช่วงวันเวลาไม่สำเร็จ: {weekdayHourError?.message}
            </p>
          ) : weekdayHourData.length === 0 ? (
            <EmptyState title="ไม่พบข้อมูลช่วงวันเวลา" description="ยังไม่มีข้อมูลเวลามารับบริการในช่วงวันที่ที่เลือก" className="py-8" />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-8 gap-2 items-end">
                <div className="text-[11px] text-muted-foreground">วัน</div>
                {WEEKDAY_LABELS.map((label, index) => {
                  const total = weekdayTotals[index]
                  const barHeight = Math.max((total / maxWeekdayTotal) * 84, 6)
                  const isPeak = total === maxWeekdayTotal
                  return (
                    <div key={label} className="flex flex-col items-center gap-1">
                      <span className={cn('text-[11px] font-semibold', isPeak ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground')}>{total.toLocaleString()}</span>
                      <div className={cn('w-6 rounded-sm', isPeak ? 'bg-rose-500' : 'bg-muted')} style={{ height: `${barHeight}px` }} />
                      <span className="text-[11px] text-muted-foreground">{label}</span>
                    </div>
                  )
                })}
              </div>

              <div className="space-y-1.5">
                <div className="grid grid-cols-8 gap-2">
                  <div className="text-[11px] text-muted-foreground">Hours</div>
                  {WEEKDAY_LABELS.map((label) => (
                    <div key={`h-${label}`} className="text-center text-[11px] font-medium text-muted-foreground">{label}</div>
                  ))}
                </div>
                {hourBinStarts.map((startHour, rowIndex) => (
                  <div key={`slot-${startHour}`} className="grid grid-cols-8 gap-2 items-center">
                    <div className="text-[11px] text-muted-foreground">{`${String(startHour).padStart(2, '0')}-${String(startHour + 1).padStart(2, '0')}`}</div>
                    {heatmapMatrix[rowIndex].map((value, colIndex) => {
                      const intensity = value > 0 ? Math.max(0.1, value / maxHeatValue) : 0
                      return (
                        <div
                          key={`cell-${rowIndex}-${colIndex}`}
                          className={cn(
                            'h-7 rounded-md text-center text-[11px] font-semibold leading-7',
                            value > 0 ? 'text-rose-900 dark:text-rose-100' : 'text-muted-foreground',
                          )}
                          style={{ backgroundColor: value > 0 ? `rgba(239, 68, 68, ${intensity * 0.8})` : 'rgba(148, 163, 184, 0.12)' }}
                        >
                          {value > 0 ? value : '-'}
                        </div>
                      )
                    })}
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
        <div className="col-span-4 h-full">
          <Card className="card-shadow h-full">
            <CardHeader className="pb-3">
              {renderCardTitleWithTooltip('ประสิทธิภาพตาม SLA', 'เปอร์เซ็นประสิทธิภาพของผู้ป่วยที่ได้รับการดูแลภายใน 30 นาที ต่อผู้ป่วยทั้งหมดที่เข้ารับบริการ (อ้างอิงจากเวลาที่บันทึกใน ovst_service_time )')}
            </CardHeader>
            <CardContent>
              {isSlaLoading ? (
                <Skeleton className="h-[140px] w-full" />
              ) : isSlaError ? (
                <p className="text-xs text-destructive">โหลดข้อมูลไม่สำเร็จ: {slaError?.message}</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-end gap-2">
                    <p className="text-3xl font-bold tracking-tight">{(slaSummary?.withinTargetPercent ?? 0).toFixed(1)}%</p>
                    <span className="pb-1 text-xs text-muted-foreground">Within Target</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.min(Math.max(slaSummary?.withinTargetPercent ?? 0, 0), 100)}%` }} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <p className="text-emerald-600 dark:text-emerald-400">Within: {(slaSummary?.withinTargetCount ?? 0).toLocaleString()}</p>
                    <p className="text-rose-600 dark:text-rose-400 text-right">Missed: {(slaSummary?.missedTargetCount ?? 0).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-8 h-full">
          <Card className="card-shadow h-full">
            <CardHeader className="pb-3">
              {renderCardTitleWithTooltip('สัดส่วนสถานะผู้ป่วย (Admit / Refer / กลับบ้าน)', 'จำแนกจากการเชื่อมโยง VN กับ referout และ ipt')}
            </CardHeader>
            <CardContent>
              {isDispositionLoading ? (
                <Skeleton className="h-[96px] w-full" />
              ) : isDispositionError ? (
                <p className="text-xs text-destructive">โหลดข้อมูลไม่สำเร็จ: {dispositionError?.message}</p>
              ) : dispositionTotal === 0 ? (
                <EmptyState title="ไม่มีข้อมูลสถานะผู้ป่วย" className="py-6" />
              ) : (
                <div className="space-y-3">
                  <div className="flex h-12 w-full overflow-hidden rounded-sm border">
                    <div className="bg-gray-400" style={{ width: `${admitRatio}%` }} />
                    <div className="bg-amber-400" style={{ width: `${referRatio}%` }} />
                    <div className="bg-green-600" style={{ width: `${homeRatio}%` }} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-sm bg-gray-400" />
                        <span className="text-xs font-medium">Admit</span>
                      </div>
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{(dispositionSummary?.admitCount ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-sm bg-amber-400" />
                        <span className="text-xs font-medium">Refer</span>
                      </div>
                      <span className="text-sm font-bold text-amber-700 dark:text-amber-300">{(dispositionSummary?.referCount ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-sm bg-green-600" />
                        <span className="text-xs font-medium">กลับบ้าน</span>
                      </div>
                      <span className="text-sm font-bold text-green-700 dark:text-green-300">{(dispositionSummary?.homeCount ?? 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-12">
        <div className="col-span-8 h-full">
          <Card className="card-shadow h-full">
            <CardHeader>
              {renderCardTitleWithTooltip(
                <span className="flex items-center gap-2"><Timer className="h-4 w-4 text-muted-foreground" />ระยะเวลารอคอยเฉลี่ยแยกตามสาขา</span>,
                'ใช้ heatmap ในช่องเฉลี่ยและสูงสุด โดยค่าที่เกิน 1 ชั่วโมงจะถูกเน้นเป็นพิเศษ',
              )}
            </CardHeader>
        <CardContent>
          {isWaitTimeLoading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : isWaitTimeError ? (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              โหลดข้อมูลระยะเวลาไม่สำเร็จ: {waitTimeError?.message}
            </p>
          ) : waitTimeRows.length === 0 ? (
            <EmptyState
              title="ไม่พบข้อมูลระยะเวลารอคอย"
              description="ตรวจสอบว่ามีข้อมูล ovst_service_time ในช่วงวันที่เลือก"
              className="py-8"
            />
          ) : (
            <>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead rowSpan={2} className="align-middle">สาขา</TableHead>
                    <TableHead colSpan={3} className="text-center border-l">รอพบแพทย์ (หลัง screen)</TableHead>
                    <TableHead colSpan={3} className="text-center border-l">เวลาพบแพทย์</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead className="text-center border-l text-xs">เฉลี่ย</TableHead>
                    <TableHead className="text-center text-xs">สูงสุด</TableHead>
                    <TableHead className="text-center text-xs">ต่ำสุด</TableHead>
                    <TableHead className="text-center border-l text-xs">เฉลี่ย</TableHead>
                    <TableHead className="text-center text-xs">สูงสุด</TableHead>
                    <TableHead className="text-center text-xs">ต่ำสุด</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedWaitTimeRows.map((row) => {
                    const waitDoctorAvgSeconds = parseTimeToSeconds(row.waitDoctorAvg)
                    const waitDoctorMaxSeconds = parseTimeToSeconds(row.waitDoctorMax)
                    const doctorTimeAvgSeconds = parseTimeToSeconds(row.doctorTimeAvg)
                    const doctorTimeMaxSeconds = parseTimeToSeconds(row.doctorTimeMax)

                    return (
                      <TableRow key={row.spcltyName}>
                        <TableCell className="font-medium">{row.spcltyName}</TableCell>
                        <TableCell
                          className={cn(
                            'border-l text-center tabular-nums transition-colors',
                            getCriticalValueClass(waitDoctorAvgSeconds, criticalWaitDoctorSeconds),
                          )}
                          style={{ backgroundColor: getHeatmapBackground(waitDoctorAvgSeconds, waitDoctorAvgMaxSeconds, '245, 158, 11') }}
                        >
                          {row.waitDoctorAvg}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-center tabular-nums transition-colors',
                            'text-rose-700 dark:text-rose-300',
                            getCriticalValueClass(waitDoctorMaxSeconds, criticalWaitDoctorSeconds),
                          )}
                          style={{ backgroundColor: getHeatmapBackground(waitDoctorMaxSeconds, waitDoctorMaxMaxSeconds, '239, 68, 68') }}
                        >
                          {row.waitDoctorMax}
                        </TableCell>
                        <TableCell className="text-center tabular-nums text-emerald-600 dark:text-emerald-400">{row.waitDoctorMin}</TableCell>
                        <TableCell
                          className={cn(
                            'border-l text-center tabular-nums transition-colors',
                            getCriticalValueClass(doctorTimeAvgSeconds, criticalDoctorTimeSeconds),
                          )}
                          style={{ backgroundColor: getHeatmapBackground(doctorTimeAvgSeconds, doctorTimeAvgMaxSeconds, '59, 130, 246') }}
                        >
                          {row.doctorTimeAvg}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-center tabular-nums transition-colors',
                            'text-rose-700 dark:text-rose-300',
                            getCriticalValueClass(doctorTimeMaxSeconds, criticalDoctorTimeSeconds),
                          )}
                          style={{ backgroundColor: getHeatmapBackground(doctorTimeMaxSeconds, doctorTimeMaxMaxSeconds, '168, 85, 247') }}
                        >
                          {row.doctorTimeMax}
                        </TableCell>
                        <TableCell className="text-center tabular-nums text-emerald-600 dark:text-emerald-400">{row.doctorTimeMin}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            {waitTimeSortedRows.length > 0 && (
              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  แสดง {pagedWaitTimeRows.length > 0 ? waitTimePageIndex * WAIT_TIME_PAGE_SIZE + 1 : 0} ถึง{' '}
                  {Math.min((waitTimePageIndex + 1) * WAIT_TIME_PAGE_SIZE, waitTimeSortedRows.length)} จาก{' '}
                  <span className="font-semibold">{waitTimeSortedRows.length}</span> สาขา
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousWaitTimePage}
                    disabled={waitTimePageIndex === 0}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    ย้อนกลับ
                  </Button>
                  <span className="px-2 text-xs text-muted-foreground">
                    หน้า {waitTimePageIndex + 1} / {waitTimeTotalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextWaitTimePage}
                    disabled={waitTimePageIndex >= waitTimeTotalPages - 1}
                  >
                    ถัดไป
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            </>
          )}
        </CardContent>
          </Card>
        </div>

        <div className="col-span-4 h-full">
          <Card className="card-shadow h-full">
            <CardHeader className="pb-3">
              {renderCardTitleWithTooltip('การออกใบรับรองแพทย์แยกประเภท', 'สัดส่วนการออกใบรับรองแพทย์ตามประเภทในช่วงวันที่ที่เลือก')}
            </CardHeader>
            <CardContent>
              {isDoctorCertLoading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : isDoctorCertError ? (
                <p className="text-sm text-destructive">โหลดข้อมูลใบรับรองแพทย์ไม่สำเร็จ: {doctorCertError?.message}</p>
              ) : doctorCertRows.length === 0 ? (
                <EmptyState title="ไม่มีข้อมูลใบรับรองแพทย์" description="ยังไม่พบข้อมูลตามช่วงวันที่ที่เลือก" className="py-8" />
              ) : (
                <div className="space-y-3">
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={doctorCertRows}
                          dataKey="certCount"
                          nameKey="doctorCertTypeName"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                        >
                          {doctorCertRows.map((_, index) => (
                            <Cell key={`cert-cell-${index}`} fill={CERT_CHART_COLORS[index % CERT_CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: unknown) => [Number(value).toLocaleString(), 'ฉบับ']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                    {doctorCertRows.map((item, index) => (
                      <div key={`${item.doctorCertTypeName}-${index}`} className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: CERT_CHART_COLORS[index % CERT_CHART_COLORS.length] }} />
                        <span className="min-w-0 flex-1 truncate text-xs">{item.doctorCertTypeName}</span>
                        <span className="shrink-0 text-xs font-semibold text-muted-foreground">{item.certCount.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="pt-1 text-xs text-muted-foreground border-t">รวม {doctorCertTotal.toLocaleString()} ฉบับ</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {noDataEverywhere && (
        <EmptyState
          title="ยังไม่พบข้อมูลในช่วงวันที่นี้"
          description="ลองขยายช่วงวันที่ หรือกดรีเฟรชเพื่อดึงข้อมูลอีกครั้ง"
          className="py-10"
        />
      )}
    </div>
  )
}
