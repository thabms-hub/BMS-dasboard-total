// =============================================================================
// Date Picker Modal - Thai Calendar Dialog Component
// =============================================================================

import { useState } from 'react'
import { Edit2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { formatThaiDateShort, THAI_MONTHS_FULL, ceYearToBe } from '@/utils/thaiCalendar'
import { cn } from '@/lib/utils'

interface DatePickerModalProps {
  selectedDate: string
  onConfirm: (date: string) => void
  onCancel: () => void
  title?: string
  className?: string
}

export function DatePickerModal({
  selectedDate,
  onConfirm,
  onCancel,
  title = 'เลือกวันที่',
  className,
}: DatePickerModalProps) {
  const [tempDate, setTempDate] = useState<Date | undefined>(new Date(selectedDate))
  const [displayMonth, setDisplayMonth] = useState<Date>(new Date(selectedDate))

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setTempDate(date)
    }
  }

  const handleConfirm = () => {
    if (tempDate) {
      const isoString = tempDate.toISOString().split('T')[0]
      onConfirm(isoString)
    }
  }

  const currentMonth = displayMonth.getMonth()
  const currentYear = displayMonth.getFullYear()
  const thaiYear = ceYearToBe(currentYear)
  const monthName = THAI_MONTHS_FULL[currentMonth]

  const handlePrevMonth = () => {
    setDisplayMonth(new Date(currentYear, currentMonth - 1, 1))
  }

  const handleNextMonth = () => {
    setDisplayMonth(new Date(currentYear, currentMonth + 1, 1))
  }

  return (
    <div className={cn('bg-white dark:bg-slate-950 rounded-lg shadow-lg p-6 w-80', className)}>
      {/* Header with title */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>

      {/* Selected date display */}
      <div className="mb-6 flex items-center justify-between bg-muted/50 dark:bg-slate-900 rounded-lg p-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">วันที่เลือก</p>
          <p className="text-2xl font-bold text-foreground">{formatThaiDateShort(selectedDate)}</p>
        </div>
        <button
          onClick={() => {}}
          className="p-2 hover:bg-muted dark:hover:bg-slate-800 rounded-md transition-colors"
          title="Edit"
        >
          <Edit2 className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Month/Year navigation */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          className="p-1.5 hover:bg-muted dark:hover:bg-slate-800 rounded-md transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5 text-muted-foreground" />
        </button>

        <div className="text-center">
          <p className="font-semibold text-foreground">
            {monthName} {thaiYear}
          </p>
        </div>

        <button
          onClick={handleNextMonth}
          className="p-1.5 hover:bg-muted dark:hover:bg-slate-800 rounded-md transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Calendar */}
      <div className="mb-6 flex justify-center">
        <Calendar
          mode="single"
          selected={tempDate}
          onSelect={handleDateSelect}
          month={displayMonth}
          onMonthChange={setDisplayMonth}
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          ยกเลิก
        </Button>
        <Button
          onClick={handleConfirm}
          className="flex-1"
        >
          ตกลง
        </Button>
      </div>
    </div>
  )
}
