// =============================================================================
// BMS Session KPI Dashboard - Date Range Picker Component (T056)
// Professional showcase redesign with active presets, icon, and visual grouping
// =============================================================================

import { useCallback, useMemo } from 'react'
import { CalendarDays } from 'lucide-react'
import { getDateRange } from '@/utils/dateUtils'

interface DateRangePickerProps {
  startDate: string
  endDate: string
  onRangeChange: (start: string, end: string) => void
  isLoading?: boolean
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

  const handlePresetClick = useCallback(
    (days: number) => {
      const range = getDateRange(days)
      onRangeChange(range.startDate, range.endDate)
    },
    [onRangeChange],
  )

  const handleStartDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onRangeChange(e.target.value, endDate)
    },
    [endDate, onRangeChange],
  )

  const handleEndDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onRangeChange(startDate, e.target.value)
    },
    [startDate, onRangeChange],
  )

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
              htmlFor="start-date"
              className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              จาก
            </label>
            <input
              id="start-date"
              type="date"
              lang="th"
              value={startDate}
              onChange={handleStartDateChange}
              disabled={isLoading}
              className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            />
          </div>

          <span className="mb-1.5 text-xs text-muted-foreground">&ndash;</span>

          {/* End date input */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="end-date"
              className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              ถึง
            </label>
            <input
              id="end-date"
              type="date"
              lang="th"
              value={endDate}
              onChange={handleEndDateChange}
              disabled={isLoading}
              className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
