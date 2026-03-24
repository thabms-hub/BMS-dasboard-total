// =============================================================================
// BMS Session KPI Dashboard - Date Range Picker Component (T056)
// Professional showcase redesign with calendar picker and active presets
// =============================================================================

import { useMemo, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { getDateRange } from '@/utils/dateUtils'
import { formatThaiDateShort } from '@/utils/thaiCalendar'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import { DatePickerModal } from '@/components/dashboard/DatePickerModal'
import { Button } from '@/components/ui/button'

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
  const [isStartCalendarOpen, setIsStartCalendarOpen] = useState(false)
  const [isEndCalendarOpen, setIsEndCalendarOpen] = useState(false)

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

  const handleStartDateSelect = (isoString: string) => {
    onRangeChange(isoString, endDate)
    setIsStartCalendarOpen(false)
  }

  const handleEndDateSelect = (isoString: string) => {
    onRangeChange(startDate, isoString)
    setIsEndCalendarOpen(false)
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

        {/* Date pickers with calendar icon */}
        <div className="flex items-end gap-2">
          <CalendarDays className="mb-1.5 h-4 w-4 text-muted-foreground shrink-0" />

          {/* Start date picker */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              จาก
            </label>
            <Popover open={isStartCalendarOpen} onOpenChange={setIsStartCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  className="h-8 px-3 text-sm font-normal"
                >
                  {formatThaiDateShort(startDate)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <DatePickerModal
                  selectedDate={startDate}
                  onConfirm={handleStartDateSelect}
                  onCancel={() => setIsStartCalendarOpen(false)}
                  title="เลือกวันที่เริ่มต้น"
                />
              </PopoverContent>
            </Popover>
          </div>

          <span className="mb-1.5 text-xs text-muted-foreground">&ndash;</span>

          {/* End date picker */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              ถึง
            </label>
            <Popover open={isEndCalendarOpen} onOpenChange={setIsEndCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  className="h-8 px-3 text-sm font-normal"
                >
                  {formatThaiDateShort(endDate)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <DatePickerModal
                  selectedDate={endDate}
                  onConfirm={handleEndDateSelect}
                  onCancel={() => setIsEndCalendarOpen(false)}
                  title="เลือกวันที่สิ้นสุด"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  )
}
