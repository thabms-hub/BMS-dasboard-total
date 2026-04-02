import { useCallback, useMemo, useState } from 'react'
import { CalendarCheck2, RefreshCw, AlertCircle, RotateCcw } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'
import { useBmsSessionContext } from '@/contexts/BmsSessionContext'
import { useQuery } from '@/hooks/useQuery'
import {
  getAppointmentKpis,
  getAppointmentAttendanceByClinic,
  getAppointmentMonthlyTrend,
  getAppointmentCancelReasons,
  getAppointmentTopDoctors,
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
  AppointmentClinicRateItem,
  AppointmentKpis,
  AppointmentMonthlyTrendItem,
  AppointmentTopDoctorItem,
} from '@/types'

const CANCEL_REASON_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#0ea5e9', '#6366f1', '#a855f7', '#94a3b8']

export default function Appointments() {
  const { connectionConfig, session } = useBmsSessionContext()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const defaultRange = useMemo(() => getDateRange(30), [])
  const [startDate, setStartDate] = useState(defaultRange.startDate)
  const [endDate, setEndDate] = useState(defaultRange.endDate)

  const isConnected = connectionConfig !== null && session !== null

  const kpisFn = useCallback(
    () => getAppointmentKpis(connectionConfig!, session!.databaseType),
    [connectionConfig, session],
  )
  const clinicRateFn = useCallback(
    () => getAppointmentAttendanceByClinic(connectionConfig!, session!.databaseType, startDate, endDate),
    [connectionConfig, session, startDate, endDate],
  )
  const monthlyTrendFn = useCallback(
    () => getAppointmentMonthlyTrend(connectionConfig!, session!.databaseType),
    [connectionConfig, session],
  )
  const cancelReasonsFn = useCallback(
    () => getAppointmentCancelReasons(connectionConfig!, session!.databaseType, startDate, endDate),
    [connectionConfig, session, startDate, endDate],
  )
  const topDoctorsFn = useCallback(
    () => getAppointmentTopDoctors(connectionConfig!, session!.databaseType, startDate, endDate),
    [connectionConfig, session, startDate, endDate],
  )

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
    data: clinicRates,
    isLoading: isClinicRatesLoading,
    isError: isClinicRatesError,
    error: clinicRatesError,
    execute: executeClinicRates,
  } = useQuery<AppointmentClinicRateItem[]>({
    queryFn: clinicRateFn,
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

  const handleRangeChange = useCallback((newStartDate: string, newEndDate: string) => {
    setStartDate(newStartDate)
    setEndDate(newEndDate)
  }, [])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        executeKpis(),
        executeClinicRates(),
        executeMonthlyTrend(),
        executeCancelReasons(),
        executeTopDoctors(),
      ])
    } finally {
      setTimeout(() => setIsRefreshing(false), 600)
    }
  }, [executeKpis, executeClinicRates, executeMonthlyTrend, executeCancelReasons, executeTopDoctors])

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

      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onRangeChange={handleRangeChange}
        isLoading={isClinicRatesLoading || isCancelReasonsLoading || isTopDoctorsLoading}
      />

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
        <Card className="xl:col-span-7">
          <CardHeader>
            <CardTitle>อัตรามาตามนัดแยกรายคลินิก</CardTitle>
            <CardDescription>เปอร์เซ็นต์จากจำนวนที่มาตามนัดเทียบกับนัดทั้งหมด</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {isClinicRatesLoading ? (
              <Skeleton className="h-full w-full" />
            ) : !isConnected || isClinicRatesError ? (
              renderRetryAction(executeClinicRates, clinicRatesError)
            ) : (clinicRates?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clinicRates ?? []} layout="vertical" margin={{ top: 8, right: 16, left: 110, bottom: 8 }}>
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                  <YAxis dataKey="clinicName" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip
                    cursor={false}
                    formatter={((value: unknown, name: string) => {
                      if (name === 'อัตรามาตามนัด') {
                        return [`${Number(value).toFixed(1)}%`, name]
                      }
                      return [Number(value).toLocaleString(), name]
                    }) as never}
                  />
                  <Legend />
                  <Bar dataKey="attendanceRate" name="อัตรามาตามนัด" fill="#0ea5e9" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="ไม่พบข้อมูลคลินิก" description="ยังไม่มีข้อมูลนัดในช่วงวันที่ที่เลือก" />
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-5">
          <CardHeader>
            <CardTitle>สรุปสาเหตุการยกเลิกนัด</CardTitle>
            <CardDescription>สรุปจากข้อมูลนัดที่สถานะยกเลิก</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {isCancelReasonsLoading ? (
              <Skeleton className="h-full w-full" />
            ) : !isConnected || isCancelReasonsError ? (
              renderRetryAction(executeCancelReasons, cancelReasonsError)
            ) : (cancelReasons?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={cancelReasons ?? []} dataKey="cancelledCount" nameKey="reason" innerRadius={60} outerRadius={105}>
                    {(cancelReasons ?? []).map((entry, index) => (
                      <Cell key={`${entry.reason}-${index}`} fill={CANCEL_REASON_COLORS[index % CANCEL_REASON_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    cursor={false}
                    formatter={((value: unknown) => [Number(value).toLocaleString(), 'จำนวน']) as never}
                  />
                  <Legend verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="ไม่พบข้อมูลการยกเลิกนัด" description="ยังไม่มีเคสยกเลิกในช่วงวันที่ที่เลือก" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-7">
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
                <LineChart data={monthlyTrend ?? []}>
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip cursor={false} formatter={((value: unknown) => [Number(value).toLocaleString(), 'นัด']) as never} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="totalAppointments"
                    name="จำนวนการนัด"
                    stroke="#0284c7"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cancelledAppointments"
                    name="ยกเลิกนัด"
                    stroke="#e11d48"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="noShowAppointments"
                    name="ไม่มาตามนัด"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="ไม่พบข้อมูลแนวโน้มการนัดหมาย" description="ยังไม่มีข้อมูลนัดย้อนหลัง 12 เดือน" />
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-5">
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
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{item.doctorName}</span>
                          <span className="text-xs text-muted-foreground">รหัส: {item.doctorCode}</span>
                        </div>
                      </TableCell>
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
