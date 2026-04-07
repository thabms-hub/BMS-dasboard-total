// =============================================================================
// OPD: งานห้องตรวจแพทย์
// =============================================================================

import { useCallback, useMemo, useState } from 'react'
import { Stethoscope, RefreshCw, CalendarDays, Clock, AlertCircle, ListOrdered, Timer } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
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
import { formatDate, formatDateTime } from '@/utils/dateUtils'
import {
  getOpdExamIcd10ByDoctor,
  getOpdExamOperationSetSummary,
  getOpdExamTopDiagnoses,
  getOpdExamTopReferOutDiseases,
  getOpdExamWaitTimeBySpclty,
} from '@/services/opdExamRoomService'
import type {
  OpdExamDoctorIcd10Item,
  OpdExamOperationSetSummary,
  OpdExamReferOutDiseaseItem,
  OpdExamTopDiagnosisItem,
  OpdExamWaitTimeItem,
} from '@/types'

type DiagnosisMode = 'principal' | 'all'

function truncateText(value: string, max = 28) {
  if (value.length <= max) return value
  return `${value.slice(0, max)}...`
}

export default function OpdExamRoom() {
  const { connectionConfig, session } = useBmsSessionContext()
  const { colorTheme } = useTheme()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [diagnosisMode, setDiagnosisMode] = useState<DiagnosisMode>('principal')

  const { startDate, endDate, setRange } = usePersistentDateRange('opd-exam-room', 30)
  const isConnected = connectionConfig !== null && session !== null
  const today = formatDate(new Date())

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

  const waitTimeFn = useCallback(
    () => getOpdExamWaitTimeBySpclty(connectionConfig!, session!.databaseType, startDate, endDate),
    [connectionConfig, session, startDate, endDate],
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
    data: waitTimeData,
    isLoading: isWaitTimeLoading,
    isError: isWaitTimeError,
    error: waitTimeError,
    execute: executeWaitTime,
  } = useQuery<OpdExamWaitTimeItem[]>({
    queryFn: waitTimeFn,
    enabled: isConnected,
  })

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([executeDiagnoses(), executeDoctor(), executeReferOut(), executeOperation(), executeWaitTime()])
      setLastUpdated(new Date())
    } finally {
      setIsRefreshing(false)
    }
  }, [executeDiagnoses, executeDoctor, executeReferOut, executeOperation, executeWaitTime])

  const waitTimeRows = waitTimeData ?? []

  const noDataEverywhere =
    !isDiagnosesLoading &&
    !isDoctorLoading &&
    !isReferOutLoading &&
    !isOperationLoading &&
    !isWaitTimeLoading &&
    (topDiagnoses?.length ?? 0) === 0 &&
    (doctorIcd10Data?.length ?? 0) === 0 &&
    (referOutDiseases?.length ?? 0) === 0 &&
    (operationSetSummary?.operationOrderCount ?? 0) === 0 &&
    (waitTimeData?.length ?? 0) === 0

  const topDiagnosesData = topDiagnoses ?? []
  const doctorIcd10Rows = doctorIcd10Data ?? []
  const referOutRows = referOutDiseases ?? []
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

      <DateRangePicker startDate={startDate} endDate={endDate} onRangeChange={setRange} isLoading={isRefreshing} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="sm:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span>10 อันดับโรคที่พบบ่อยผู้ป่วยนอก</span>
              <div className="flex items-center gap-1 rounded-md border bg-muted/30 p-1">
                <button
                  type="button"
                  className={`rounded px-2 py-1 text-xs font-medium ${diagnosisMode === 'principal' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                  onClick={() => setDiagnosisMode('principal')}
                >
                  Main Dx
                </button>
                <button
                  type="button"
                  className={`rounded px-2 py-1 text-xs font-medium ${diagnosisMode === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                  onClick={() => setDiagnosisMode('all')}
                >
                  ทุกการวินิจฉัย
                </button>
              </div>
            </CardTitle>
            <CardDescription>เรียงจากจำนวนผู้ป่วยสูงสุด ({diagnosisMode === 'principal' ? 'diagtype = 1' : 'ทุก diagtype'})</CardDescription>
          </CardHeader>
          <CardContent>
            {isDiagnosesLoading ? (
              <Skeleton className="h-[320px] w-full" />
            ) : isDiagnosesError ? (
              <p className="text-sm text-destructive">โหลดข้อมูลโรคไม่สำเร็จ: {diagnosesError?.message}</p>
            ) : topDiagnosesData.length === 0 ? (
              <EmptyState title="ไม่พบข้อมูลโรค" description="ลองเปลี่ยนช่วงวันที่หรือรูปแบบการวินิจฉัย" className="py-8" />
            ) : (
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topDiagnosesData} layout="vertical" margin={{ top: 8, right: 64, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="diagnosisName" width={0} tick={false} axisLine={false} />
                    <Tooltip
                      formatter={(value) => [Number(value ?? 0).toLocaleString(), 'ผู้ป่วย']}
                      labelFormatter={(label) => `โรค: ${String(label ?? '')}`}
                    />
                    <Bar dataKey="patientCount" fill={primaryChartColor} radius={[0, 6, 6, 0]}>
                      <LabelList dataKey="diagnosisName" position="insideLeft" style={{ fill: '#fff', fontSize: 12, fontWeight: 500 }} formatter={(value) => truncateText(String(value ?? ''), 32)} />
                      <LabelList dataKey="patientCount" position="right" style={{ fill: 'currentColor', fontSize: 12 }} formatter={(value) => Number(value ?? 0).toLocaleString()} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${iconToneClass}`}>
              <ListOrdered className="h-5 w-5" />
            </div>
            <CardDescription>คำสั่งผ่าตัด</CardDescription>
          </CardHeader>
          <CardContent>
            {isOperationLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : isOperationError ? (
              <p className="text-xs text-destructive">โหลดไม่สำเร็จ</p>
            ) : (
              <>
                <p className="text-3xl font-bold tracking-tight">
                  {(operationSetSummary?.operationOrderCount ?? 0).toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">คำสั่ง (operation_set)</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ปริมาณการบันทึก ICD10 แยกตามแพทย์ OPD</CardTitle>
          <CardDescription>แสดงจำนวนผู้ป่วยที่ได้รับการบันทึก ICD10 โดยแพทย์แต่ละคน</CardDescription>
        </CardHeader>
        <CardContent>
          {isDoctorLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : isDoctorError ? (
            <p className="text-sm text-destructive">โหลดข้อมูลแพทย์ไม่สำเร็จ: {doctorError?.message}</p>
          ) : doctorIcd10Rows.length === 0 ? (
            <EmptyState title="ไม่พบข้อมูลการบันทึก ICD10" className="py-8" />
          ) : (
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={doctorIcd10Rows} margin={{ top: 24, right: 16, left: 8, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="doctorName"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => truncateText(String(value), 20)}
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [Number(value ?? 0).toLocaleString(), String(name) === 'patientCount' ? 'ผู้ป่วย' : 'รหัส ICD10']}
                  />
                  <Bar dataKey="patientCount" fill={secondaryChartColor} name="patientCount" radius={[6, 6, 0, 0]}>
                    <LabelList dataKey="patientCount" position="top" style={{ fontSize: 11 }} formatter={(value) => Number(value ?? 0).toLocaleString()} />
                  </Bar>
                  <Bar dataKey="uniqueIcd10Count" fill={tertiaryChartColor} name="uniqueIcd10Count" radius={[6, 6, 0, 0]}>
                    <LabelList dataKey="uniqueIcd10Count" position="top" style={{ fontSize: 11 }} formatter={(value) => Number(value ?? 0).toLocaleString()} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>10 อันดับโรค Refer Out</CardTitle>
          <CardDescription>โรคที่ถูกส่งต่อออกบ่อยที่สุดในช่วงวันที่เลือก</CardDescription>
        </CardHeader>
        <CardContent>
          {isReferOutLoading ? (
            <Skeleton className="h-[320px] w-full" />
          ) : isReferOutError ? (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              โหลดข้อมูล refer out ไม่สำเร็จ: {referOutError?.message}
            </p>
          ) : referOutRows.length === 0 ? (
            <EmptyState title="ไม่พบข้อมูลโรค Refer Out" description="อาจไม่มีข้อมูลในช่วงวันที่ที่เลือก หรือโครงสร้างตารางไม่รองรับ" className="py-8" />
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">อันดับ</TableHead>
                    <TableHead className="w-28">ICD10</TableHead>
                    <TableHead>ชื่อโรค</TableHead>
                    <TableHead className="text-right">จำนวนครั้ง</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referOutRows.map((item, index) => (
                    <TableRow key={`${item.icd10}-${index}`}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{item.icd10 || '-'}</TableCell>
                      <TableCell>{item.diagnosisName || '-'}</TableCell>
                      <TableCell className="text-right font-medium">{item.referCount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            ระยะเวลารอคอยเฉลี่ยแยกตามสาขา
          </CardTitle>
          <CardDescription>เวลารอพบแพทย์ (หลัง screen) และเวลาพบแพทย์เฉลี่ยต่อสาขา</CardDescription>
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
                  {waitTimeRows.map((row) => (
                    <TableRow key={row.spcltyName}>
                      <TableCell className="font-medium">{row.spcltyName}</TableCell>
                      <TableCell className="text-center tabular-nums border-l">{row.waitDoctorAvg}</TableCell>
                      <TableCell className="text-center tabular-nums text-rose-600 dark:text-rose-400">{row.waitDoctorMax}</TableCell>
                      <TableCell className="text-center tabular-nums text-emerald-600 dark:text-emerald-400">{row.waitDoctorMin}</TableCell>
                      <TableCell className="text-center tabular-nums border-l">{row.doctorTimeAvg}</TableCell>
                      <TableCell className="text-center tabular-nums text-rose-600 dark:text-rose-400">{row.doctorTimeMax}</TableCell>
                      <TableCell className="text-center tabular-nums text-emerald-600 dark:text-emerald-400">{row.doctorTimeMin}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
