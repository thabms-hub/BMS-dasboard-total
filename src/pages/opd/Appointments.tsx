import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarCheck2, RefreshCw, AlertCircle, RotateCcw, Check, ChevronDown } from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts'
import { useBmsSessionContext } from '@/contexts/BmsSessionContext'
import { useQuery } from '@/hooks/useQuery'
import {
  getAppointmentDepartments,
  getAppointmentKpis,
  getAppointmentMonthlyTrend,
  getAppointmentCancelReasons,
  getAppointmentTopClinics,
  getAppointmentTopDoctors,
  getAppointmentWalkInComparison,
} from '@/services/appointmentService'
import { getDateRange } from '@/utils/dateUtils'
import { DateRangePicker } from '@/components/dashboard/DateRangePicker'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { cn } from '@/lib/utils'
import type {
  AppointmentCancelReasonItem,
  AppointmentDepartmentOption,
  AppointmentKpis,
  AppointmentMonthlyTrendItem,
  AppointmentTopClinicItem,
  AppointmentTopDoctorItem,
  AppointmentWalkInComparison,
} from '@/types'

export default function Appointments() {
  const { connectionConfig, session } = useBmsSessionContext()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const defaultRange = useMemo(() => getDateRange(0), [])
  const [startDate, setStartDate] = useState(defaultRange.startDate)
  const [endDate, setEndDate] = useState(defaultRange.endDate)
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [isClinicDropdownOpen, setIsClinicDropdownOpen] = useState(false)
  const clinicDropdownRef = useRef<HTMLDivElement | null>(null)

  const isConnected = connectionConfig !== null && session !== null

  const departmentsFn = useCallback(
    () => getAppointmentDepartments(connectionConfig!, session!.databaseType, startDate, endDate),
    [connectionConfig, session, startDate, endDate],
  )

  const kpisFn = useCallback(
    () => getAppointmentKpis(connectionConfig!, session!.databaseType, selectedDepartments),
    [connectionConfig, session, selectedDepartments],
  )
  const monthlyTrendFn = useCallback(
    () => getAppointmentMonthlyTrend(connectionConfig!, session!.databaseType, selectedDepartments),
    [connectionConfig, session, selectedDepartments],
  )
  const cancelReasonsFn = useCallback(
    () => getAppointmentCancelReasons(connectionConfig!, session!.databaseType, startDate, endDate, selectedDepartments),
    [connectionConfig, session, startDate, endDate, selectedDepartments],
  )
  const topDoctorsFn = useCallback(
    () => getAppointmentTopDoctors(connectionConfig!, session!.databaseType, startDate, endDate, selectedDepartments),
    [connectionConfig, session, startDate, endDate, selectedDepartments],
  )
  const walkInComparisonFn = useCallback(
    () => getAppointmentWalkInComparison(connectionConfig!, session!.databaseType, startDate, endDate, selectedDepartments),
    [connectionConfig, session, startDate, endDate, selectedDepartments],
  )
  const topClinicsFn = useCallback(
    () => getAppointmentTopClinics(connectionConfig!, session!.databaseType, startDate, endDate, selectedDepartments),
    [connectionConfig, session, startDate, endDate, selectedDepartments],
  )

  const {
    data: departmentOptions,
    isLoading: isDepartmentOptionsLoading,
    isError: isDepartmentOptionsError,
    error: departmentOptionsError,
    execute: executeDepartmentOptions,
  } = useQuery<AppointmentDepartmentOption[]>({
    queryFn: departmentsFn,
    enabled: isConnected,
  })

  const {
    data: kpis,
    isLoading: isKpisLoading,
    isError: isKpisError,
    error: kpisError,
    execute: executeKpis,
  } = useQuery<AppointmentKpis>({
    queryFn: kpisFn,
    enabled: isConnected,
  })

  const {
    data: monthlyTrend,
    isLoading: isMonthlyTrendLoading,
    isError: isMonthlyTrendError,
    error: monthlyTrendError,
    execute: executeMonthlyTrend,
  } = useQuery<AppointmentMonthlyTrendItem[]>({
    queryFn: monthlyTrendFn,
    enabled: isConnected,
  })

  const {
    data: cancelReasons,
    isLoading: isCancelReasonsLoading,
    isError: isCancelReasonsError,
    error: cancelReasonsError,
    execute: executeCancelReasons,
  } = useQuery<AppointmentCancelReasonItem[]>({
    queryFn: cancelReasonsFn,
    enabled: isConnected,
  })

  const {
    data: topDoctors,
    isLoading: isTopDoctorsLoading,
    isError: isTopDoctorsError,
    error: topDoctorsError,
    execute: executeTopDoctors,
  } = useQuery<AppointmentTopDoctorItem[]>({
    queryFn: topDoctorsFn,
    enabled: isConnected,
  })

  const {
    data: walkInComparison,
    isLoading: isWalkInComparisonLoading,
    isError: isWalkInComparisonError,
    error: walkInComparisonError,
    execute: executeWalkInComparison,
  } = useQuery<AppointmentWalkInComparison>({
    queryFn: walkInComparisonFn,
    enabled: isConnected,
  })

  const {
    data: topClinics,
    isLoading: isTopClinicsLoading,
    isError: isTopClinicsError,
    error: topClinicsError,
    execute: executeTopClinics,
  } = useQuery<AppointmentTopClinicItem[]>({
    queryFn: topClinicsFn,
    enabled: isConnected,
  })

  useEffect(() => {
    const optionCodes = new Set((departmentOptions ?? []).map((item) => item.departmentCode))
    setSelectedDepartments((prev) => prev.filter((code) => optionCodes.has(code)))
  }, [departmentOptions])

  useEffect(() => {
    if (!isClinicDropdownOpen) {
      return
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (clinicDropdownRef.current && !clinicDropdownRef.current.contains(event.target as Node)) {
        setIsClinicDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isClinicDropdownOpen])

  const selectedDepartmentLabel = useMemo(() => {
    if (selectedDepartments.length === 0) {
      return 'ทุกคลินิก'
    }

    const selectedNames = (departmentOptions ?? [])
      .filter((item) => selectedDepartments.includes(item.departmentCode))
      .map((item) => item.departmentName)

    if (selectedNames.length <= 2) {
      return selectedNames.join(', ')
    }

    return `${selectedNames.slice(0, 2).join(', ')} +${selectedNames.length - 2} คลินิก`
  }, [departmentOptions, selectedDepartments])

  const handleToggleClinic = useCallback((code: string) => {
    setSelectedDepartments((prev) => (
      prev.includes(code)
        ? prev.filter((item) => item !== code)
        : [...prev, code]
    ))
  }, [])

  const walkInTotal = (walkInComparison?.bookedCount ?? 0) + (walkInComparison?.walkInCount ?? 0)

  const handleRangeChange = useCallback((newStartDate: string, newEndDate: string) => {
    setStartDate(newStartDate)
    setEndDate(newEndDate)
  }, [])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        executeDepartmentOptions(),
        executeKpis(),
        executeMonthlyTrend(),
        executeCancelReasons(),
        executeTopDoctors(),
        executeWalkInComparison(),
        executeTopClinics(),
      ])
    } finally {
      setTimeout(() => setIsRefreshing(false), 600)
    }
  }, [executeDepartmentOptions, executeKpis, executeMonthlyTrend, executeCancelReasons, executeTopDoctors, executeWalkInComparison, executeTopClinics])

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
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={onRetry}>
          <RotateCcw className="h-3 w-3" />
          ลองอีกครั้ง
        </Button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10">
            <CalendarCheck2 className="h-5 w-5 text-sky-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">ระบบนัดหมายผู้ป่วย</h2>
            <p className="text-sm text-muted-foreground">Appointment Dashboard</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 gap-1.5 sm:mt-0"
          onClick={handleRefresh}
          disabled={isRefreshing || !isConnected}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
          รีเฟรช
        </Button>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
        <div className="min-w-0 flex-1">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onRangeChange={handleRangeChange}
            isLoading={isCancelReasonsLoading || isTopDoctorsLoading || isDepartmentOptionsLoading}
          />
        </div>
        <div className="w-full xl:w-80">
          <label className="mb-2 block text-sm font-medium text-foreground">คลินิก</label>
          {isDepartmentOptionsLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : !isConnected || isDepartmentOptionsError ? (
            <div className="rounded-md border border-dashed border-destructive/40 p-3">
              {renderRetryAction(executeDepartmentOptions, departmentOptionsError)}
            </div>
          ) : (
            <div className="relative" ref={clinicDropdownRef}>
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full justify-between"
                onClick={() => setIsClinicDropdownOpen((prev) => !prev)}
              >
                <span className="truncate text-left">{selectedDepartmentLabel}</span>
                <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', isClinicDropdownOpen && 'rotate-180')} />
              </Button>

              {isClinicDropdownOpen && (
                <div className="absolute z-20 mt-2 w-full rounded-md border bg-popover p-2 shadow-md">
                  <div className="mb-2 flex items-center justify-between gap-2 border-b pb-2">
                    <button
                      type="button"
                      className="text-xs text-sky-600 hover:underline"
                      onClick={() => setSelectedDepartments((departmentOptions ?? []).map((item) => item.departmentCode))}
                    >
                      เลือกทั้งหมด
                    </button>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:underline"
                      onClick={() => setSelectedDepartments([])}
                    >
                      ล้างการเลือก
                    </button>
                  </div>

                  <div className="max-h-56 space-y-1 overflow-y-auto">
                    {(departmentOptions ?? []).map((item) => {
                      const checked = selectedDepartments.includes(item.departmentCode)
                      return (
                        <label
                          key={item.departmentCode}
                          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleClinic(item.departmentCode)}
                            className="sr-only"
                          />
                          <span className={cn('inline-flex h-4 w-4 items-center justify-center rounded border', checked && 'border-sky-600 bg-sky-600')}>
                            {checked && <Check className="h-3 w-3 text-white" />}
                          </span>
                          <span className="truncate">{item.departmentName}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

           
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>นัดวันนี้</CardDescription>
            <CardTitle className="text-3xl">
              {isKpisLoading ? <Skeleton className="h-9 w-24" /> : !isConnected || isKpisError ? '-' : (kpis?.totalToday ?? 0).toLocaleString()}
            </CardTitle>
            <CardDescription className="text-xs">นับจำนวนผู้ป่วยแบบไม่ซ้ำ HN และไม่นับรายการยกเลิก</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>มาตามนัด</CardDescription>
            <CardTitle className="text-3xl text-emerald-600">
              {isKpisLoading ? <Skeleton className="h-9 w-24" /> : !isConnected || isKpisError ? '-' : (kpis?.attendedToday ?? 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>ไม่มา</CardDescription>
            <CardTitle className="text-3xl text-amber-600">
              {isKpisLoading ? <Skeleton className="h-9 w-24" /> : !isConnected || isKpisError ? '-' : (kpis?.noShowToday ?? 0).toLocaleString()}
            </CardTitle>
            <CardDescription className="text-xs">
              {isKpisLoading
                ? 'กำลังคำนวณ...'
                : !isConnected || isKpisError
                  ? 'ไม่สามารถคำนวณอัตราได้'
                  : `คิดเป็น ${kpis?.noShowRate.toFixed(1) ?? '0.0'}% ของนัดที่ยังไม่ยกเลิกวันนี้`}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>ยกเลิก</CardDescription>
            <CardTitle className="text-3xl text-rose-600">
              {isKpisLoading ? <Skeleton className="h-9 w-24" /> : !isConnected || isKpisError ? '-' : (kpis?.cancelledToday ?? 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          {!isKpisLoading && (!isConnected || isKpisError) && (
            <CardContent>
              {renderRetryAction(executeKpis, kpisError)}
            </CardContent>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-6">
          <CardHeader>
            <CardTitle>ผู้รับบริการ Walk-in เทียบกับผู้ที่นัดมา</CardTitle>
            <CardDescription>สัดส่วนผู้มารับบริการจริงในช่วงวันที่เลือก ({selectedDepartmentLabel})</CardDescription>
          </CardHeader>
          <CardContent>
            {isWalkInComparisonLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : !isConnected || isWalkInComparisonError ? (
              renderRetryAction(executeWalkInComparison, walkInComparisonError)
            ) : walkInTotal > 0 ? (
              <div className="space-y-5">
                <div className="overflow-hidden rounded-full bg-muted">
                  <div className="flex h-4 w-full">
                    <div className="bg-sky-500" style={{ width: `${walkInComparison?.bookedRate ?? 0}%` }} />
                    <div className="bg-amber-500" style={{ width: `${walkInComparison?.walkInRate ?? 0}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border bg-sky-50/70 p-4 dark:bg-sky-950/20">
                    <p className="text-sm text-muted-foreground">นัดล่วงหน้า</p>
                    <p className="mt-1 text-2xl font-semibold text-sky-700 dark:text-sky-300">{(walkInComparison?.bookedCount ?? 0).toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{(walkInComparison?.bookedRate ?? 0).toFixed(1)}%</p>
                  </div>
                  <div className="rounded-lg border bg-amber-50/70 p-4 dark:bg-amber-950/20">
                    <p className="text-sm text-muted-foreground">ไม่ได้นัดล่วงหน้า</p>
                    <p className="mt-1 text-2xl font-semibold text-amber-700 dark:text-amber-300">{(walkInComparison?.walkInCount ?? 0).toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{(walkInComparison?.walkInRate ?? 0).toFixed(1)}%</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">รวมผู้รับบริการ {walkInTotal.toLocaleString()} ครั้งในช่วงวันที่เลือก</p>
              </div>
            ) : (
              <EmptyState title="ไม่พบข้อมูลผู้รับบริการ" description="ยังไม่มีข้อมูล walk-in หรือผู้ที่นัดมาในช่วงวันที่ที่เลือก" />
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-6">
          <CardHeader>
            <CardTitle>สรุปสาเหตุการยกเลิกนัด</CardTitle>
            <CardDescription>แสดงความถี่เหตุผลยกเลิกนัดในรูปแบบ Radar Chart</CardDescription>
          </CardHeader>
          <CardContent className="h-56">
            {isCancelReasonsLoading ? (
              <Skeleton className="h-full w-full" />
            ) : !isConnected || isCancelReasonsError ? (
              renderRetryAction(executeCancelReasons, cancelReasonsError)
            ) : (cancelReasons?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={cancelReasons ?? []} outerRadius="72%">
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis
                    dataKey="reason"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => String(value).slice(0, 24)}
                  />
                  <PolarRadiusAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    cursor={false}
                    formatter={((value: unknown) => [Number(value).toLocaleString(), 'จำนวนครั้ง']) as never}
                  />
                  <Legend />
                  <Radar
                    name="จำนวนการยกเลิก"
                    dataKey="cancelledCount"
                    stroke="hsl(var(--destructive))"
                    fill="hsl(var(--destructive))"
                    fillOpacity={0.35}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="ไม่พบข้อมูลการยกเลิกนัด" description="ยังไม่มีเคสยกเลิกในช่วงวันที่ที่เลือก" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-12">
          <CardHeader>
            <CardTitle>แนวโน้มการนัดหมายรายเดือน</CardTitle>
            <CardDescription>ย้อนหลัง 12 เดือน</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {isMonthlyTrendLoading ? (
              <Skeleton className="h-full w-full" />
            ) : !isConnected || isMonthlyTrendError ? (
              renderRetryAction(executeMonthlyTrend, monthlyTrendError)
            ) : (monthlyTrend?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend ?? []}>
                  <defs>
                    <linearGradient id="appointment-total-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="appointment-cancelled-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="appointment-noshow-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    cursor={false}
                    formatter={((value: unknown, name: string) => [Number(value).toLocaleString(), name]) as never}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="totalAppointments"
                    name="จำนวนการนัด"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    fill="url(#appointment-total-gradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="cancelledAppointments"
                    name="ยกเลิกนัด"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    fill="url(#appointment-cancelled-gradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="noShowAppointments"
                    name="ไม่มาตามนัด"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2}
                    fill="url(#appointment-noshow-gradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="ไม่พบข้อมูลแนวโน้มการนัดหมาย" description="ยังไม่มีข้อมูลนัดย้อนหลัง 12 เดือน" />
            )}
          </CardContent>
        </Card>

      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-6">
          <CardHeader>
            <CardTitle>คลินิกที่มีการนัดหมายสูงสุด</CardTitle>
            <CardDescription>จัดอันดับตามจำนวนผู้ป่วยนัด พร้อมสัดส่วนผู้ไม่มาตามนัด ({selectedDepartmentLabel})</CardDescription>
          </CardHeader>
          <CardContent>
            {isTopClinicsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : !isConnected || isTopClinicsError ? (
              renderRetryAction(executeTopClinics, topClinicsError)
            ) : (topClinics?.length ?? 0) > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">อันดับ</TableHead>
                    <TableHead>คลินิก</TableHead>
                    <TableHead className="text-right">นัด</TableHead>
                    <TableHead className="text-right">ไม่มา</TableHead>
                    <TableHead className="text-right">% ไม่มา</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(topClinics ?? []).map((item, index) => (
                    <TableRow key={`${item.clinicCode}-${index}`}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{item.clinicName}</TableCell>
                      <TableCell className="text-right">{item.totalAppointments.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{item.noShowAppointments.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium text-amber-600">{item.noShowRate.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="ไม่พบข้อมูลคลินิกนัดหมาย" description="ยังไม่มีข้อมูลการนัดในช่วงวันที่ที่เลือก" />
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-6">
          <CardHeader>
            <CardTitle>Top 10 แพทย์ที่มีนัดมากที่สุด</CardTitle>
            <CardDescription>เรียงตามจำนวนนัดในช่วงวันที่ที่เลือก</CardDescription>
          </CardHeader>
          <CardContent>
            {isTopDoctorsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : !isConnected || isTopDoctorsError ? (
              renderRetryAction(executeTopDoctors, topDoctorsError)
            ) : (topDoctors?.length ?? 0) > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">อันดับ</TableHead>
                    <TableHead>แพทย์</TableHead>
                    <TableHead className="text-right">จำนวนนัด</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(topDoctors ?? []).map((item, index) => (
                    <TableRow key={`${item.doctorCode}-${index}`}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{item.doctorName}</TableCell>
                      <TableCell className="text-right">{item.totalAppointments.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="ไม่พบข้อมูลแพทย์" description="ยังไม่มีข้อมูลนัดของแพทย์ในช่วงวันที่ที่เลือก" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
