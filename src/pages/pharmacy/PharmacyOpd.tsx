// =============================================================================
// Pharmacy: ห้องยาผู้ป่วยนอก
// =============================================================================

import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Pill,
  Users,
  CircleDollarSign,
  ClipboardList,
  CheckCircle2,
  PackageCheck,
  HandCoins,
  Info,
} from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Line,
  Cell,
} from 'recharts'
import { useBmsSessionContext } from '@/contexts/BmsSessionContext'
import { usePersistentDateRange } from '@/hooks/usePersistentDateRange'
import { useQuery } from '@/hooks/useQuery'
import { DepartmentPageTemplate } from '@/components/dashboard/DepartmentPageTemplate'
import { ChartExportMenu } from '@/components/dashboard/ChartExportMenu'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/dashboard/EmptyState'
import {
  getPharmacyOpdSummary,
  getPharmacyOpdTopDrugs,
  getPharmacyOpdTopSupplies,
  getPharmacyOpdNonEssentialCompare,
  getPharmacyOpdNonEssentialPaymentByType,
  getPharmacyOpdTopNonEssential,
  getPharmacyOpdNarcoticCompare,
  getPharmacyOpdNarcoticPaymentByType,
  getPharmacyOpdTopNarcotic,
  getPharmacyOpdTopDoctorsNonEssential,
  getPharmacyOpdTopDoctorsNarcotic,
} from '@/services/pharmacyOpdService'
import type {
  PharmacyOpdSummary,
  PharmacyPatientCompare,
  PharmacyPaymentByType,
  PharmacyTopDoctorItem,
  PharmacyTopUsageItem,
} from '@/types'

const tooltipStyle = {
  borderRadius: '8px',
  border: '1px solid hsl(var(--border))',
  backgroundColor: 'hsl(var(--popover))',
  color: 'hsl(var(--popover-foreground))',
  fontSize: '12px',
}

const topChartColors = {
  itemCount: 'hsl(var(--chart-1))',
  totalQty: 'hsl(var(--chart-2))',
  totalAmount: 'hsl(var(--chart-4))',
}

const paymentDonutColors = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
]

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function truncateLabel(label: string, maxLength = 16): string {
  if (label.length <= maxLength) {
    return label
  }
  return `${label.slice(0, maxLength).trimEnd()}...`
}

type RankingTickProps = {
  x?: number
  y?: number
  payload?: {
    value?: string
  }
}

function RankingYAxisTick({ x = 0, y = 0, payload }: RankingTickProps) {
  const rawLabel = payload?.value ? String(payload.value) : ''
  const displayLabel = truncateLabel(rawLabel, 20)

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-102} y={4} fontSize={10} fill="hsl(var(--muted-foreground))">
        {displayLabel}
      </text>
      <title>{rawLabel}</title>
    </g>
  )
}

function getRankingBarFill(index: number, total: number): string {
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
    <div className="flex items-center gap-1.5">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
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
    </div>
  )
}

type SeriesKey = 'itemCount' | 'totalQty' | 'totalAmount'

type TopUsageCardProps = {
  title: string
  data: PharmacyTopUsageItem[]
  isLoading: boolean
  hiddenSeries: Set<SeriesKey>
  onToggleSeries: (key: SeriesKey) => void
  chartRef: React.RefObject<HTMLDivElement | null>
}

function TopUsageCard({ title, data, isLoading, hiddenSeries, onToggleSeries, chartRef }: TopUsageCardProps) {
  const chartData = useMemo(
    () => data.map((item) => ({
      ...item,
      shortName: truncateLabel(item.itemName),
    })),
    [data],
  )

  return (
    <Card className="card-shadow h-full" ref={chartRef}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <CardTitle>{title}</CardTitle>
        {data.length > 0 && (
          <ChartExportMenu containerRef={chartRef} data={data} title={title} />
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[320px] w-full" />
        ) : chartData.length === 0 ? (
          <EmptyState title="ไม่มีข้อมูล" className="py-8" />
        ) : (
          <div className="space-y-3">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ left: 12, right: 8, top: 6, bottom: 44 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="shortName"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    angle={-28}
                    textAnchor="end"
                    height={46}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tickFormatter={(value: number) => value.toLocaleString()}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: number) => value.toLocaleString()}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelFormatter={(_label: unknown, payload: unknown) => {
                      const rows = Array.isArray(payload) ? payload : []
                      const rawName = rows.length > 0
                        ? String((rows[0] as { payload?: { itemName?: string } })?.payload?.itemName ?? '')
                        : ''
                      return rawName || ''
                    }}
                    formatter={((value: unknown, name: unknown) => {
                      if (name === 'totalAmount') {
                        return [formatCurrency(Number(value)), 'มูลค่ารวม']
                      }
                      if (name === 'totalQty') {
                        return [Number(value).toLocaleString(), 'จำนวนเม็ด']
                      }
                      return [Number(value).toLocaleString(), 'จำนวนรายการ']
                    }) as never}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="itemCount"
                    name="itemCount"
                    hide={hiddenSeries.has('itemCount')}
                    fill={topChartColors.itemCount}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="totalQty"
                    name="totalQty"
                    hide={hiddenSeries.has('totalQty')}
                    fill={topChartColors.totalQty}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="totalAmount"
                    name="totalAmount"
                    hide={hiddenSeries.has('totalAmount')}
                    stroke={topChartColors.totalAmount}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-1">
              {[
                { key: 'itemCount' as const, label: 'จำนวนรายการ', color: topChartColors.itemCount },
                { key: 'totalQty' as const, label: 'จำนวนเม็ด', color: topChartColors.totalQty },
                { key: 'totalAmount' as const, label: 'มูลค่ารวม', color: topChartColors.totalAmount },
              ].map((legend) => (
                <button
                  key={legend.key}
                  type="button"
                  onClick={() => onToggleSeries(legend.key)}
                  className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
                  style={{ opacity: hiddenSeries.has(legend.key) ? 0.35 : 1 }}
                >
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: legend.color }} />
                  <span className="text-xs">{legend.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

type CompareCardProps = {
  title: string
  compareData: PharmacyPatientCompare | null
  isLoading: boolean
  chartRef: React.RefObject<HTMLDivElement | null>
}

function CompareCard({ title, compareData, isLoading, chartRef }: CompareCardProps) {
  const bars = useMemo(
    () => [
      { label: 'HN', value: compareData?.hnCount ?? 0 },
      { label: 'VN', value: compareData?.vnCount ?? 0 },
      { label: 'จำนวนรายการยา', value: compareData?.drugCount ?? 0 },
    ],
    [compareData],
  )

  return (
    <Card className="card-shadow h-full" ref={chartRef}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>
            {bars.some((item) => item.value > 0)
              ? `รวม ${bars.reduce((sum, item) => sum + item.value, 0).toLocaleString()} รายการ`
              : 'ไม่มีข้อมูล'}
          </CardDescription>
        </div>
        {bars.some((item) => item.value > 0) && (
          <ChartExportMenu containerRef={chartRef} data={bars} title={title} />
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[280px] items-center justify-center">
            <Skeleton className="h-[240px] w-full" />
          </div>
        ) : bars.every((item) => item.value === 0) ? (
          <EmptyState title="ไม่มีข้อมูล" className="py-6" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={bars}
              margin={{ top: 5, right: 10, left: 10, bottom: 32 }}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis
                dataKey="label"
                type="category"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                padding={{ left: 20, right: 20 }}
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
                formatter={((value: unknown) => [`${Number(value).toLocaleString()} รายการ`, 'จำนวน']) as never}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--card))',
                  fontSize: '12px',
                }}
                cursor={false}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false}>
                {bars.map((item, index) => (
                  <Cell key={`${item.label}-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}) / 0.75)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

type PaymentDonutCardProps = {
  title: string
  data: PharmacyPaymentByType[]
  isLoading: boolean
  chartRef: React.RefObject<HTMLDivElement | null>
}

function PaymentDonutCard({ title, data, isLoading, chartRef }: PaymentDonutCardProps) {
  const donutData = useMemo(
    () => data.map((item) => ({ name: item.paymentType, value: item.totalAmount })),
    [data],
  )

  const totalAmount = useMemo(
    () => donutData.reduce((sum, item) => sum + item.value, 0),
    [donutData],
  )

  return (
    <Card className="card-shadow h-full" ref={chartRef}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>
            {donutData.length > 0 ? `รวม ${formatCurrency(totalAmount)} บาท` : 'ไม่มีข้อมูล'}
          </CardDescription>
        </div>
        {donutData.length > 0 && <ChartExportMenu containerRef={chartRef} data={donutData} title={title} />}
      </CardHeader>
      <CardContent className="h-[300px] overflow-hidden">
        {isLoading ? (
          <div className="flex h-[280px] items-center justify-center">
            <Skeleton className="h-[240px] w-full" />
          </div>
        ) : donutData.length === 0 ? (
          <EmptyState title="ไม่มีข้อมูล" className="py-6" />
        ) : (
          <div className="flex h-full flex-col gap-2">
            <div className="relative mx-auto h-[180px] w-full max-w-[220px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="58%"
                    outerRadius="82%"
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {donutData.map((item, index) => (
                      <Cell
                        key={`${item.name}-${index}`}
                        fill={paymentDonutColors[index % paymentDonutColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={((value: unknown) => [formatCurrency(Number(value)), 'มูลค่า']) as never}
                    labelFormatter={(label) => `ประเภทการชำระ: ${label}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="min-h-0 space-y-1 overflow-y-auto">
              {donutData.map((item, index) => {
                const pct = totalAmount > 0 ? (item.value / totalAmount) * 100 : 0
                return (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: paymentDonutColors[index % paymentDonutColors.length] }}
                    />
                    <span className="flex-1 truncate text-muted-foreground" title={item.name}>{item.name}</span>
                    <span className="shrink-0 font-medium tabular-nums">{formatCurrency(item.value)}</span>
                    <span className="w-10 shrink-0 text-right text-muted-foreground tabular-nums">{pct.toFixed(1)}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

type TopDoctorTableCardProps = {
  title: string
  data: PharmacyTopDoctorItem[]
  isLoading: boolean
  chartRef: React.RefObject<HTMLDivElement | null>
}

function TopDoctorTableCard({ title, data, isLoading, chartRef }: TopDoctorTableCardProps) {
  const tableData = useMemo(() => data.slice(0, 10), [data])

  return (
    <Card className="card-shadow h-full" ref={chartRef}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>
            {tableData.length > 0 ? `${tableData.length.toLocaleString()} แพทย์` : 'ไม่มีข้อมูล'}
          </CardDescription>
        </div>
        {tableData.length > 0 && <ChartExportMenu containerRef={chartRef} data={tableData} title={title} />}
      </CardHeader>
      <CardContent className="h-[300px] overflow-hidden">
        {isLoading ? (
          <div className="flex h-[280px] items-center justify-center">
            <Skeleton className="h-[240px] w-full" />
          </div>
        ) : tableData.length === 0 ? (
          <EmptyState title="ไม่มีข้อมูล" className="py-6" />
        ) : (
          <div className="h-full overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">#</TableHead>
                  <TableHead>แพทย์ผู้สั่ง</TableHead>
                  <TableHead className="text-right">VN</TableHead>
                  <TableHead className="text-right">รายการยา</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map((row, index) => (
                  <TableRow key={`${row.doctorName}-${index}`}>
                    <TableCell className="text-center font-medium">{index + 1}</TableCell>
                    <TableCell className="max-w-[160px] truncate" title={row.doctorName}>{row.doctorName}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.visitCount.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.itemCount.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

type HorizontalRankingCardProps = {
  title: string
  data: PharmacyTopUsageItem[]
  isLoading: boolean
  chartRef: React.RefObject<HTMLDivElement | null>
  sortBy: 'qty' | 'amount'
  onSortChange: (sortBy: 'qty' | 'amount') => void
}

function HorizontalRankingCard({ 
  title, 
  data, 
  isLoading, 
  chartRef, 
  sortBy, 
  onSortChange, 
}: HorizontalRankingCardProps) {
  const chartData = useMemo(
    () => [...data]
      .sort((left, right) => {
        if (sortBy === 'amount') {
          return right.totalAmount - left.totalAmount || right.totalQty - left.totalQty
        }
        return right.totalQty - left.totalQty || right.totalAmount - left.totalAmount
      })
      .slice(0, 10),
    [data, sortBy],
  )

  return (
    <Card className="card-shadow h-full" ref={chartRef}>
      <CardHeader className="flex flex-col gap-3">
        <div className="flex flex-row items-start justify-between space-y-0">
          <CardTitle>{title}</CardTitle>
          {chartData.length > 0 && <ChartExportMenu containerRef={chartRef} data={chartData} title={title} />}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>เรียงตาม:</span>
          <button
            onClick={() => onSortChange('qty')}
            className={`rounded px-2 py-1 transition-colors ${
              sortBy === 'qty'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            จำนวนยา
          </button>
          <button
            onClick={() => onSortChange('amount')}
            className={`rounded px-2 py-1 transition-colors ${
              sortBy === 'amount'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            มูลค่า
          </button>
        </div>
      </CardHeader>
      <CardContent className="h-[300px] flex flex-col">
        {isLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : chartData.length === 0 ? (
          <EmptyState title="ไม่มีข้อมูล" className="py-6" />
        ) : (
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={chartData} margin={{ left: 16, right: 20, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tickFormatter={(value: number) => {
                    if (sortBy === 'amount' && value >= 1000) {
                      return `${(value / 1000).toFixed(0)}K`
                    }
                    return value.toLocaleString()
                  }}
                />
                <YAxis
                  type="category"
                  dataKey="itemName"
                  width={112}
                  tick={<RankingYAxisTick />}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    backgroundColor: 'hsl(var(--card))',
                    color: 'hsl(var(--popover-foreground))',
                    fontSize: '12px',
                  }}
                  cursor={false}
                  formatter={((value: unknown) => {
                    if (sortBy === 'amount') {
                      return [formatCurrency(Number(value)), 'มูลค่ารวม']
                    }
                    return [Number(value).toLocaleString() + ' หน่วย', 'จำนวนยา']
                  }) as never}
                  labelFormatter={(label) => {
                    const item = chartData.find((entry) => entry.itemName === label)
                    return item
                      ? `${item.itemName}\nจำนวนยา: ${item.totalQty.toLocaleString()} หน่วย\nมูลค่า: ${formatCurrency(item.totalAmount)}`
                      : `รายการยา: ${label}`
                  }}
                />
                <Bar 
                  dataKey={sortBy === 'amount' ? 'totalAmount' : 'totalQty'}
                  radius={[0, 4, 4, 0]} 
                  maxBarSize={18} 
                  isAnimationActive={false}
                >
                  {chartData.map((item, index) => (
                    <Cell key={`ranking-bar-${item.itemCode}-${index}`} fill={getRankingBarFill(index, chartData.length)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function PharmacyOpd() {
  const { connectionConfig, session } = useBmsSessionContext()
  const isConnected = connectionConfig !== null && session !== null

  const { startDate, endDate, setRange } = usePersistentDateRange('pharmacy-opd', 30)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const [hiddenTopDrugSeries, setHiddenTopDrugSeries] = useState<Set<SeriesKey>>(new Set())
  const [hiddenTopSupplySeries, setHiddenTopSupplySeries] = useState<Set<SeriesKey>>(new Set())
  const [nonEssentialSortBy, setNonEssentialSortBy] = useState<'qty' | 'amount'>('qty')
  const [narcoticSortBy, setNarcoticSortBy] = useState<'qty' | 'amount'>('qty')

  const topDrugRef = useRef<HTMLDivElement>(null)
  const topSupplyRef = useRef<HTMLDivElement>(null)
  const nonEssentialCompareRef = useRef<HTMLDivElement>(null)
  const nonEssentialPaymentRef = useRef<HTMLDivElement>(null)
  const nonEssentialDoctorRef = useRef<HTMLDivElement>(null)
  const nonEssentialRankRef = useRef<HTMLDivElement>(null)
  const narcoticCompareRef = useRef<HTMLDivElement>(null)
  const narcoticPaymentRef = useRef<HTMLDivElement>(null)
  const narcoticDoctorRef = useRef<HTMLDivElement>(null)
  const narcoticRankRef = useRef<HTMLDivElement>(null)

  const summaryFn = useCallback(
    () => getPharmacyOpdSummary(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )
  const topDrugFn = useCallback(
    () => getPharmacyOpdTopDrugs(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )
  const topSupplyFn = useCallback(
    () => getPharmacyOpdTopSupplies(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )
  const nonEssentialCompareFn = useCallback(
    () => getPharmacyOpdNonEssentialCompare(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )
  const topNonEssentialFn = useCallback(
    () => getPharmacyOpdTopNonEssential(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )
  const nonEssentialPaymentFn = useCallback(
    () => getPharmacyOpdNonEssentialPaymentByType(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )
  const nonEssentialDoctorFn = useCallback(
    () => getPharmacyOpdTopDoctorsNonEssential(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )
  const narcoticCompareFn = useCallback(
    () => getPharmacyOpdNarcoticCompare(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )
  const narcoticPaymentFn = useCallback(
    () => getPharmacyOpdNarcoticPaymentByType(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )
  const narcoticDoctorFn = useCallback(
    () => getPharmacyOpdTopDoctorsNarcotic(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )
  const topNarcoticFn = useCallback(
    () => getPharmacyOpdTopNarcotic(connectionConfig!, startDate, endDate),
    [connectionConfig, startDate, endDate],
  )

  const { data: summary, isLoading: isSummaryLoading, execute: executeSummary } = useQuery<PharmacyOpdSummary>({
    queryFn: summaryFn,
    enabled: isConnected,
  })
  const { data: topDrugs, isLoading: isTopDrugsLoading, execute: executeTopDrugs } = useQuery<PharmacyTopUsageItem[]>({
    queryFn: topDrugFn,
    enabled: isConnected,
  })
  const { data: topSupplies, isLoading: isTopSuppliesLoading, execute: executeTopSupplies } = useQuery<PharmacyTopUsageItem[]>({
    queryFn: topSupplyFn,
    enabled: isConnected,
  })
  const {
    data: nonEssentialCompare,
    isLoading: isNonEssentialCompareLoading,
    execute: executeNonEssentialCompare,
  } = useQuery<PharmacyPatientCompare>({
    queryFn: nonEssentialCompareFn,
    enabled: isConnected,
  })
  const {
    data: topNonEssential,
    isLoading: isTopNonEssentialLoading,
    execute: executeTopNonEssential,
  } = useQuery<PharmacyTopUsageItem[]>({
    queryFn: topNonEssentialFn,
    enabled: isConnected,
  })
  const {
    data: nonEssentialPayment,
    isLoading: isNonEssentialPaymentLoading,
    execute: executeNonEssentialPayment,
  } = useQuery<PharmacyPaymentByType[]>({
    queryFn: nonEssentialPaymentFn,
    enabled: isConnected,
  })
  const {
    data: nonEssentialTopDoctors,
    isLoading: isNonEssentialTopDoctorsLoading,
    execute: executeNonEssentialTopDoctors,
  } = useQuery<PharmacyTopDoctorItem[]>({
    queryFn: nonEssentialDoctorFn,
    enabled: isConnected,
  })
  const {
    data: narcoticCompare,
    isLoading: isNarcoticCompareLoading,
    execute: executeNarcoticCompare,
  } = useQuery<PharmacyPatientCompare>({
    queryFn: narcoticCompareFn,
    enabled: isConnected,
  })
  const {
    data: narcoticPayment,
    isLoading: isNarcoticPaymentLoading,
    execute: executeNarcoticPayment,
  } = useQuery<PharmacyPaymentByType[]>({
    queryFn: narcoticPaymentFn,
    enabled: isConnected,
  })
  const {
    data: narcoticTopDoctors,
    isLoading: isNarcoticTopDoctorsLoading,
    execute: executeNarcoticTopDoctors,
  } = useQuery<PharmacyTopDoctorItem[]>({
    queryFn: narcoticDoctorFn,
    enabled: isConnected,
  })
  const {
    data: topNarcotic,
    isLoading: isTopNarcoticLoading,
    execute: executeTopNarcotic,
  } = useQuery<PharmacyTopUsageItem[]>({
    queryFn: topNarcoticFn,
    enabled: isConnected,
  })

  const handleRangeChange = useCallback((newStartDate: string, newEndDate: string) => {
    setRange(newStartDate, newEndDate)
  }, [setRange])

  const handleRefresh = useCallback(async () => {
    if (!isConnected) return
    setIsRefreshing(true)
    try {
      await Promise.all([
        executeSummary(),
        executeTopDrugs(),
        executeTopSupplies(),
        executeNonEssentialCompare(),
        executeNonEssentialPayment(),
        executeNonEssentialTopDoctors(),
        executeTopNonEssential(),
        executeNarcoticCompare(),
        executeNarcoticPayment(),
        executeNarcoticTopDoctors(),
        executeTopNarcotic(),
      ])
      setLastUpdated(new Date())
    } finally {
      setIsRefreshing(false)
    }
  }, [
    isConnected,
    executeSummary,
    executeTopDrugs,
    executeTopSupplies,
    executeNonEssentialCompare,
    executeNonEssentialPayment,
    executeNonEssentialTopDoctors,
    executeTopNonEssential,
    executeNarcoticCompare,
    executeNarcoticPayment,
    executeNarcoticTopDoctors,
    executeTopNarcotic,
  ])

  const toggleTopDrugSeries = useCallback((key: SeriesKey) => {
    setHiddenTopDrugSeries((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const toggleTopSupplySeries = useCallback((key: SeriesKey) => {
    setHiddenTopSupplySeries((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const cards = [
    {
      title: 'จำนวนผู้ป่วยทั้งหมด',
      description: 'นับ HN ที่ไม่ซ้ำกัน',
      icon: Users,
      value: summary?.totalPatients ?? 0,
      format: 'number' as const,
      colorClass: 'bg-blue-100 text-blue-700',
    },
    {
      title: 'มูลค่าทั้งหมด',
      description: 'มูลค่ารวมของรายการยาทั้งหมด',
      icon: CircleDollarSign,
      value: summary?.totalAmount ?? 0,
      format: 'currency' as const,
      colorClass: 'bg-emerald-100 text-emerald-700',
    },
    {
      title: 'บันทึกรายการใบสั่งยา',
      description: 'ผู้บันทึกใบสั่งยา rx_dispenser_type = 1',
      icon: ClipboardList,
      value: summary?.prescriptionCount ?? 0,
      format: 'number' as const,
      colorClass: 'bg-orange-100 text-orange-700',
    },
    {
      title: 'ตรวจสอบยา',
      description: 'ผู้ตรวจสอบยา rx_dispenser_type = 3',
      icon: CheckCircle2,
      value: summary?.checkedCount ?? 0,
      format: 'number' as const,
      colorClass: 'bg-cyan-100 text-cyan-700',
    },
    {
      title: 'จัดยา',
      description: 'ผู้จัดยา rx_dispenser_type = 2',
      icon: PackageCheck,
      value: summary?.preparedCount ?? 0,
      format: 'number' as const,
      colorClass: 'bg-amber-100 text-amber-700',
    },
    {
      title: 'จ่ายยา',
      description: 'ผู้จ่ายยา rx_dispenser_type = 4',
      icon: HandCoins,
      value: summary?.dispensedCount ?? 0,
      format: 'number' as const,
      colorClass: 'bg-violet-100 text-violet-700',
    },
  ] as const

  return (
    <DepartmentPageTemplate
      title="ห้องยาผู้ป่วยนอก"
      subtitle="Outpatient Pharmacy"
      icon={Pill}
      enableDateFilter
      dateRangeStorageKey="pharmacy-opd"
      defaultDateRangeDays={30}
      isDateFilterLoading={isRefreshing}
      onDateRangeChange={handleRangeChange}
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
      lastUpdated={lastUpdated}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-6 gap-4">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <Card key={card.title} className="col-span-6 sm:col-span-3 lg:col-span-1">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="mb-2 flex items-center justify-center gap-2">
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${card.colorClass}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <HeaderTitleWithTooltip title={card.title} description={card.description} />
                    </div>
                    {isSummaryLoading ? (
                      <Skeleton className="mx-auto mt-2 h-8 w-24" />
                    ) : (
                      <p className="mt-2 text-2xl font-bold">
                        {card.format === 'currency'
                          ? formatCurrency(card.value)
                          : card.value.toLocaleString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 xl:col-span-6">
            <TopUsageCard
              title="อันดับยาที่ใช้มากที่สุด"
              data={topDrugs ?? []}
              isLoading={isTopDrugsLoading}
              hiddenSeries={hiddenTopDrugSeries}
              onToggleSeries={toggleTopDrugSeries}
              chartRef={topDrugRef}
            />
          </div>
          <div className="col-span-12 xl:col-span-6">
            <TopUsageCard
              title="อันดับเวชภัณฑ์ที่ใช้มากที่สุด"
              data={topSupplies ?? []}
              isLoading={isTopSuppliesLoading}
              hiddenSeries={hiddenTopSupplySeries}
              onToggleSeries={toggleTopSupplySeries}
              chartRef={topSupplyRef}
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 xl:col-span-3">
            <CompareCard
              title="ผู้ป่วย OPD ที่ได้รับยานอกบัญชี HN เทียบ VN เทียบจำนวนรายการยา"
              compareData={nonEssentialCompare}
              isLoading={isNonEssentialCompareLoading}
              chartRef={nonEssentialCompareRef}
            />
          </div>
          <div className="col-span-12 xl:col-span-3">
            <PaymentDonutCard
              title="ค่าใช้จ่ายยานอกบัญชีแยกตามประเภทการชำระ"
              data={nonEssentialPayment ?? []}
              isLoading={isNonEssentialPaymentLoading}
              chartRef={nonEssentialPaymentRef}
            />
          </div>
          <div className="col-span-12 xl:col-span-3">
            <TopDoctorTableCard
              title="Top 10 แพทย์สั่งยานอกบัญชี"
              data={nonEssentialTopDoctors ?? []}
              isLoading={isNonEssentialTopDoctorsLoading}
              chartRef={nonEssentialDoctorRef}
            />
          </div>
          <div className="col-span-12 xl:col-span-3">
            <HorizontalRankingCard
              title="อันดับยานอกบัญชี 10 อันดับ"
              data={topNonEssential ?? []}
              isLoading={isTopNonEssentialLoading}
              chartRef={nonEssentialRankRef}
              sortBy={nonEssentialSortBy}
              onSortChange={setNonEssentialSortBy}
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 xl:col-span-3">
            <CompareCard
              title="ผู้ป่วย OPD ที่ได้รับยาเสพติด HN เทียบ VN เทียบจำนวนรายการยา"
              compareData={narcoticCompare}
              isLoading={isNarcoticCompareLoading}
              chartRef={narcoticCompareRef}
            />
          </div>
          <div className="col-span-12 xl:col-span-3">
            <PaymentDonutCard
              title="ค่าใช้จ่ายยาเสพติดแยกตามประเภทการชำระ"
              data={narcoticPayment ?? []}
              isLoading={isNarcoticPaymentLoading}
              chartRef={narcoticPaymentRef}
            />
          </div>
          <div className="col-span-12 xl:col-span-3">
            <TopDoctorTableCard
              title="Top 10 แพทย์สั่งยาเสพติด"
              data={narcoticTopDoctors ?? []}
              isLoading={isNarcoticTopDoctorsLoading}
              chartRef={narcoticDoctorRef}
            />
          </div>
          <div className="col-span-12 xl:col-span-3">
            <HorizontalRankingCard
              title="อันดับยาเสพติด 10 อันดับ"
              data={topNarcotic ?? []}
              isLoading={isTopNarcoticLoading}
              chartRef={narcoticRankRef}
              sortBy={narcoticSortBy}
              onSortChange={setNarcoticSortBy}
            />
          </div>
        </div>
      </div>
    </DepartmentPageTemplate>
  )
}
