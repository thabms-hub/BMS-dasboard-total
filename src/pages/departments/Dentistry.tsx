// =============================================================================
// Department: ทันตกรรม (Dentistry)
// Displays dental case statistics, patient details table, and visit type distribution
// With date range filtering capabilities
// =============================================================================

import { useState, useCallback, useMemo, useRef } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, CalendarDays, Clock } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
import { DepartmentPageTemplate } from '@/components/dashboard/DepartmentPageTemplate'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { DateRangePicker } from '@/components/dashboard/DateRangePicker'
import { ChartExportMenu } from '@/components/dashboard/ChartExportMenu'
import { useBmsSessionContext } from '@/contexts/BmsSessionContext'
import { useQuery } from '@/hooks/useQuery'
import { getDentistrySummary } from '@/services/kpiService'
import { getDateRange, formatDate, formatDateTime } from '@/utils/dateUtils'
import { cn } from '@/lib/utils'
import type { DentistrySummary } from '@/types'

export default function Dentistry() {
  const { connectionConfig, session } = useBmsSessionContext()
  const [currentPage, setCurrentPage] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Chart container refs for export
  const barChartContainerRef = useRef<HTMLDivElement>(null)
  const donutChartContainerRef = useRef<HTMLDivElement>(null)

  // Date range state - default to today
  const defaultRange = useMemo(() => getDateRange(0), [])
  const [startDate, setStartDate] = useState(defaultRange.startDate)
  const [endDate, setEndDate] = useState(defaultRange.endDate)

  const isConnected = connectionConfig !== null && session !== null
  const today = formatDate(new Date())

  const dentistrySummaryFn = useCallback(
    () => getDentistrySummary(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )

  const { data: dentistry, isLoading, isError, error, execute } = useQuery<DentistrySummary>({
    queryFn: dentistrySummaryFn,
    enabled: isConnected,
  })

  const handleRangeChange = useCallback((newStart: string, newEnd: string) => {
    setStartDate(newStart)
    setEndDate(newEnd)
    setCurrentPage(0) // Reset to first page when date changes
  }, [])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await execute()
      setLastUpdated(new Date())
    } finally {
      // Small delay so the user sees the spinner
      setTimeout(() => setIsRefreshing(false), 600)
    }
  }, [execute])

  // ---------------------------------------------------------------------------
  // Pagination logic
  // ---------------------------------------------------------------------------
  const PAGE_SIZE = 10
  const allCases = dentistry?.cases || []
  const totalPages = Math.ceil(allCases.length / PAGE_SIZE)
  const pagedCases = allCases.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  const handlePreviousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 0))
  }, [])

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1))
  }, [totalPages])

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

  // Color palette for insurance types
  const insuranceColors = [
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#10b981', // Green
    '#f59e0b', // Amber
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#14b8a6', // Teal
  ]

  // Mini stat cards definition
  const miniStats = useMemo(
    () => [
      {
        label: 'จำนวนหัตถการ',
        value: dentistry?.totalCases,
        icon: <ToothIcon className="h-4 w-4" />,
      },
      {
        label: 'จำนวน Visit',
        value: dentistry?.totalVisits,
        icon: <Clock className="h-4 w-4" />,
      },
      {
        label: 'เคส IPD',
        value: dentistry?.totalIPDCases,
        icon: <Clock className="h-4 w-4" />,
      },
    ],
    [dentistry],
  )

  // ---------------------------------------------------------------------------
  // Content render
  // ---------------------------------------------------------------------------
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-6">
          {/* Mini stat cards Skeleton */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-3">
                <CardContent className="flex flex-col items-start gap-1.5 p-0">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Skeleton — Bar Chart and Pie Chart Side by Side */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-80 w-full" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-80 w-full" />
              </CardContent>
            </Card>
          </div>

          {/* Table Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-48" />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-10 text-center uppercase text-xs">#</TableHead>
                    <TableHead className="uppercase text-xs">HN</TableHead>
                    <TableHead className="uppercase text-xs">ชื่อผู้ป่วย</TableHead>
                    <TableHead className="uppercase text-xs">หัตถการ</TableHead>
                    <TableHead className="uppercase text-xs">ทันตแพทย์</TableHead>
                    <TableHead className="uppercase text-xs">การรับบริการ</TableHead>
                    <TableHead className="uppercase text-xs">วันที่ตรวจ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-center">
                        <Skeleton className="h-4 w-4 mx-auto" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )
    }

    if (isError) {
      return (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={<ToothIcon className="h-8 w-8" />}
              title="เกิดข้อผิดพลาด"
              description={error?.message ?? 'ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้'}
              action={
                <button
                  className="text-sm text-primary underline hover:no-underline"
                  onClick={execute}
                >
                  ลองอีกครั้ง
                </button>
              }
            />
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-6">
        {/* Mini stat cards — All 3 in one row */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {miniStats.map((stat) => (
            <Card key={stat.label} className="p-3">
              <CardContent className="flex flex-col items-start gap-1.5 p-0">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  {stat.icon}
                </div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold">
                  {stat.value?.toLocaleString() ?? '0'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row — Bar Chart and Doughnut Chart Side by Side */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Visit Type Distribution Chart */}
          <Card ref={barChartContainerRef}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">จำนวนหัตถการแยกตามประเภทการรับบริการ</CardTitle>
                <CardDescription>
                  {chartData.length > 0
                    ? `รวม ${chartData.reduce((sum, d) => sum + d.cases, 0).toLocaleString()} เคส`
                    : 'ไม่มีข้อมูล'}
                </CardDescription>
              </div>
              {chartData.length > 0 && (
                <ChartExportMenu containerRef={barChartContainerRef} data={chartData} title="หัตถการแยกตามประเภท" />
              )}
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="visitType"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(label) => `ประเภท: ${label}`}
                      formatter={(value) => [`${value} เคส`, 'จำนวน']}
                      cursor={false}
                    />
                    <Legend />
                    <Bar dataKey="cases" fill="hsl(var(--primary))" name="จำนวนหัตถการ" isAnimationActive={false} />
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

          {/* Insurance Distribution Doughnut Chart */}
          <Card ref={donutChartContainerRef}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">ผู้ป่วยแยกตามสิทธิการรักษา</CardTitle>
                <CardDescription>
                  {insuranceChartData.length > 0
                    ? `รวม ${insuranceChartData.reduce((sum, d) => sum + d.value, 0).toLocaleString()} ผู้ป่วย`
                    : 'ไม่มีข้อมูล'}
                </CardDescription>
              </div>
              {insuranceChartData.length > 0 && (
                <ChartExportMenu containerRef={donutChartContainerRef} data={insuranceChartData} title="ผู้ป่วยแยกตามสิทธิการรักษา" />
              )}
            </CardHeader>
            <CardContent>
              {insuranceChartData.length > 0 ? (
                <div className="flex items-center gap-4">
                  {/* Donut chart — 60% */}
                  <div className="basis-3/5 min-w-0 overflow-hidden">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={insuranceChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
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

                  {/* Legend — 40% */}
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

        {/* Patient Details Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">รายละเอียดผู้ป่วยรับบริการ</CardTitle>
            <CardDescription>
              แสดงรายละเอียดการรับบริการทันตกรรมของผู้ป่วย
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dentistry && dentistry.cases.length > 0 ? (
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
                              {caseItem.patientName || 'ไม่ระบุ'}
                            </TableCell>
                            <TableCell className="text-xs">{caseItem.tmName || '-'}</TableCell>
                            <TableCell className="text-xs">
                              {caseItem.doctorName || 'ไม่ระบุ'}
                            </TableCell>
                            <TableCell className="text-xs">
                              {caseItem.visitTypeName || 'ไม่ระบุ'}
                            </TableCell>
                            <TableCell className="text-xs">{caseItem.vstdate}</TableCell>
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
                    {Math.min((currentPage + 1) * PAGE_SIZE, dentistry?.cases.length ?? 0)} จาก{' '}
                    <span className="font-semibold">{dentistry?.cases.length ?? 0}</span> เคส
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
    <DepartmentPageTemplate
      title="ทันตกรรม"
      subtitle="Dentistry"
      icon={ToothIcon as any}
    >
      <div className="flex flex-col gap-6">
        {/* ------------------------------------------------------------------- */}
        {/* 1. Welcome Banner                                                    */}
        {/* ------------------------------------------------------------------- */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              ข้อมูลทันตกรรม
            </h2>
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
        {/* 2. Date Range Picker                                                 */}
        {/* ------------------------------------------------------------------- */}
        <DateRangePicker 
          startDate={startDate} 
          endDate={endDate} 
          onRangeChange={handleRangeChange}
          isLoading={isLoading}
        />

        {/* ------------------------------------------------------------------- */}
        {/* 3. Content — Changes based on state                                  */}
        {/* ------------------------------------------------------------------- */}
        {renderContent()}
      </div>
    </DepartmentPageTemplate>
  )
}
