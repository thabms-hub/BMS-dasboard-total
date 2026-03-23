// =============================================================================
// BMS Session KPI Dashboard - Date Range Picker Component (T056)
// Professional showcase redesign with active presets, icon, and visual grouping
// =============================================================================

import { useMemo } from 'react'
import { CalendarDays } from 'lucide-react'
import { getDateRange } from '@/utils/dateUtils'

interface DateRangePickerProps {
  startDate: string
  endDate: string
  onRangeChange: (start: string, end: string) => void
  isLoading?: boolean
}

const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
]

const CE_TO_BE_OFFSET = 543

interface ThaiDateInputProps {
  id: string
  value: string
  onChange: (iso: string) => void
  disabled?: boolean
}

function ThaiDateInput({ id, value, onChange, disabled }: ThaiDateInputProps) {
  // Parse ISO into parts; fall back gracefully if value is empty/invalid
  const parsed = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const ceYear = parsed ? parseInt(parsed[1], 10) : new Date().getFullYear()
  const month = parsed ? parseInt(parsed[2], 10) : new Date().getMonth() + 1
  const day = parsed ? parseInt(parsed[3], 10) : new Date().getDate()

  const beYear = ceYear + CE_TO_BE_OFFSET

  // Days in the currently selected month
  const daysInMonth = new Date(ceYear, month, 0).getDate()

  const emit = (newDay: number, newMonth: number, newBeYear: number) => {
    const newCeYear = newBeYear - CE_TO_BE_OFFSET
    const clampedDay = Math.min(
      newDay,
      new Date(newCeYear, newMonth, 0).getDate(),
    )
    const mm = String(newMonth).padStart(2, '0')
    const dd = String(clampedDay).padStart(2, '0')
    onChange(`${newCeYear}-${mm}-${dd}`)
  }

  const selectClass =
    'h-8 rounded-md border border-input bg-background px-2 text-sm shadow-sm ' +
    'transition-colors focus-visible:outline-none focus-visible:ring-1 ' +
    'focus-visible:ring-ring disabled:opacity-50'

  return (
    <div className="flex items-center gap-1">
      {/* Day */}
      <select
        id={`${id}-day`}
        value={day}
        disabled={disabled}
        onChange={(e) => emit(Number(e.target.value), month, beYear)}
        className={selectClass}
        aria-label="วัน"
      >
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      {/* Month */}
      <select
        id={`${id}-month`}
        value={month}
        disabled={disabled}
        onChange={(e) => emit(day, Number(e.target.value), beYear)}
        className={selectClass}
        aria-label="เดือน"
      >
        {THAI_MONTHS.map((name, i) => (
          <option key={i + 1} value={i + 1}>
            {name}
          </option>
        ))}
      </select>

      {/* Year (BE) */}
      <select
        id={`${id}-year`}
        value={beYear}
        disabled={disabled}
        onChange={(e) => emit(day, month, Number(e.target.value))}
        className={selectClass}
        aria-label="ปี พ.ศ."
      >
        {Array.from({ length: 10 }, (_, i) => {
          // Show current BE year ±5 years window
          const currentBe = new Date().getFullYear() + CE_TO_BE_OFFSET
          return currentBe - 5 + i
        }).map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  )
}

const PRESETS = [
  { label: '7 วัน', days: 7 },
  { label: '30 วัน', days: 30 },
  { label: '90 วัน', days: 90 },
] as const

export function DateRangePicker({
  startDate,
  endDate,
  onRangeChange,
  isLoading = false,
}: DateRangePickerProps) {
  // Determine which preset is currently active by comparing dates
  const activePreset = useMemo(() => {
    for (const preset of PRESETS) {
      const range = getDateRange(preset.days)
      if (range.startDate === startDate && range.endDate === endDate) {
        return preset.days
      }
    }
    return 'custom' as const
  }, [startDate, endDate])

  const handlePresetClick = (days: number) => {
    const range = getDateRange(days)
    onRangeChange(range.startDate, range.endDate)
  }

  return (
    <div className="bg-muted/30 rounded-lg p-3">
      <div className="flex flex-wrap items-end gap-3">
        {/* Preset buttons */}
        <div className="flex items-center gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.days}
              type="button"
              disabled={isLoading}
              onClick={() => handlePresetClick(preset.days)}
              className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${
                activePreset === preset.days
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted hover:bg-muted/80 text-foreground'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Separator */}
        <div className="hidden sm:block h-8 w-px bg-border" />

        {/* Date inputs with icon */}
        <div className="flex items-end gap-2">
          <CalendarDays className="mb-1.5 h-4 w-4 text-muted-foreground shrink-0" />

          {/* Start date input */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="start-date-day"
              className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              จาก
            </label>
            <ThaiDateInput
              id="start-date"
              value={startDate}
              disabled={isLoading}
              onChange={(iso) => onRangeChange(iso, endDate)}
            />
          </div>

          <span className="mb-1.5 text-xs text-muted-foreground">&ndash;</span>

          {/* End date input */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="end-date-day"
              className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              ถึง
            </label>
            <ThaiDateInput
              id="end-date"
              value={endDate}
              disabled={isLoading}
              onChange={(iso) => onRangeChange(startDate, iso)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
