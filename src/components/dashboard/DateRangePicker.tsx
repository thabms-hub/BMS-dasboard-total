// =============================================================================
// BMS Session KPI Dashboard - Date Range Picker Component (T056)
// =============================================================================

import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { getDateRange } from '@/utils/dateUtils'

interface DateRangePickerProps {
  startDate: string
  endDate: string
  onRangeChange: (start: string, end: string) => void
  isLoading?: boolean
}

const PRESETS = [
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
] as const

export function DateRangePicker({
  startDate,
  endDate,
  onRangeChange,
  isLoading = false,
}: DateRangePickerProps) {
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
    <div className="flex flex-wrap items-end gap-2">
      {/* Preset buttons */}
      {PRESETS.map((preset) => (
        <Button
          key={preset.days}
          variant="outline"
          size="sm"
          disabled={isLoading}
          onClick={() => handlePresetClick(preset.days)}
        >
          {preset.label}
        </Button>
      ))}

      {/* Start date input */}
      <div className="flex flex-col gap-1">
        <label htmlFor="start-date" className="text-xs text-muted-foreground">
          Start Date
        </label>
        <input
          id="start-date"
          type="date"
          value={startDate}
          onChange={handleStartDateChange}
          disabled={isLoading}
          className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
        />
      </div>

      {/* End date input */}
      <div className="flex flex-col gap-1">
        <label htmlFor="end-date" className="text-xs text-muted-foreground">
          End Date
        </label>
        <input
          id="end-date"
          type="date"
          value={endDate}
          onChange={handleEndDateChange}
          disabled={isLoading}
          className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
        />
      </div>
    </div>
  )
}
