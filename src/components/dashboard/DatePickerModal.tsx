// =============================================================================
// Date Picker Modal - Custom Thai Buddhist Era Calendar (day / month / year)
// =============================================================================

import { useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  THAI_MONTHS_FULL,
  THAI_MONTHS_SHORT,
  THAI_WEEKDAYS_SHORT,
  ceYearToBe,
  formatThaiDateShort,
} from '@/utils/thaiCalendar'
import { cn } from '@/lib/utils'

interface DatePickerModalProps {
  selectedDate: string
  onConfirm: (date: string) => void
  onCancel: () => void
  className?: string
}

type PickerView = 'day' | 'month' | 'year'

/** yyyy-MM-dd → local Date (no UTC shift) */
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** local Date → yyyy-MM-dd */
function toLocalISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function DatePickerModal({
  selectedDate,
  onConfirm,
  onCancel,
  className,
}: DatePickerModalProps) {
  const initial = parseLocalDate(selectedDate)

  const [tempDate, setTempDate] = useState<Date>(initial)
  const [viewYear, setViewYear] = useState(initial.getFullYear())
  const [viewMonth, setViewMonth] = useState(initial.getMonth())
  const [pickerView, setPickerView] = useState<PickerView>('day')
  // Year grid: 12 years starting from yearRangeStart
  const [yearRangeStart, setYearRangeStart] = useState(
    Math.floor(initial.getFullYear() / 12) * 12,
  )

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // ── Navigation handlers ─────────────────────────────────────────────────────

  const goToToday = () => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    setTempDate(t)
    setViewYear(t.getFullYear())
    setViewMonth(t.getMonth())
    setPickerView('day')
  }

  const handlePrev = () => {
    if (pickerView === 'day') {
      if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
      else setViewMonth((m) => m - 1)
    } else if (pickerView === 'month') {
      setViewYear((y) => y - 1)
    } else {
      setYearRangeStart((s) => s - 12)
    }
  }

  const handleNext = () => {
    if (pickerView === 'day') {
      if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
      else setViewMonth((m) => m + 1)
    } else if (pickerView === 'month') {
      setViewYear((y) => y + 1)
    } else {
      setYearRangeStart((s) => s + 12)
    }
  }

  const handleConfirm = () => onConfirm(toLocalISO(tempDate))

  // ── Month picker ────────────────────────────────────────────────────────────
  const handleMonthSelect = (monthIndex: number) => {
    setViewMonth(monthIndex)
    setPickerView('day')
  }

  // ── Year picker ─────────────────────────────────────────────────────────────
  const handleYearSelect = (ceYear: number) => {
    setViewYear(ceYear)
    setPickerView('month')
  }

  // ── Day grid ────────────────────────────────────────────────────────────────
  const firstDay = new Date(viewYear, viewMonth, 1)
  const lastDay = new Date(viewYear, viewMonth + 1, 0)
  const grid: (Date | null)[] = []
  for (let i = 0; i < firstDay.getDay(); i++) grid.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) grid.push(new Date(viewYear, viewMonth, d))
  while (grid.length % 7 !== 0) grid.push(null)

  // ── Navigation label ────────────────────────────────────────────────────────
  const thaiYear = ceYearToBe(viewYear)
  const yearRangeEnd = yearRangeStart + 11

  const navLabel =
    pickerView === 'day' ? null : // day uses split month+year buttons
    pickerView === 'month' ? `${thaiYear}` :
    `${ceYearToBe(yearRangeStart)}–${ceYearToBe(yearRangeEnd)}`

  return (
    <div className={cn('bg-background rounded-2xl shadow-2xl overflow-hidden w-72 select-none', className)}>

      {/* ── Blue header: selected date ─────────────────────────────────────── */}
      <div className="bg-primary px-5 pt-4 pb-4 text-primary-foreground">
        <p className="text-3xl font-light tracking-tight">
          {formatThaiDateShort(toLocalISO(tempDate))}
        </p>
      </div>

      {/* ── Navigation bar ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border">
        <button
          onClick={handlePrev}
          aria-label="ก่อนหน้า"
          className="p-1.5 rounded-full hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </button>

        {pickerView === 'day' ? (
          // Day view: separate clickable month and year
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPickerView('month')}
              className="flex items-center gap-0.5 px-2 py-1 rounded-md hover:bg-muted transition-colors text-sm font-semibold text-foreground"
            >
              {THAI_MONTHS_FULL[viewMonth]}
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
            <button
              onClick={() => setPickerView('year')}
              className="flex items-center gap-0.5 px-2 py-1 rounded-md hover:bg-muted transition-colors text-sm font-semibold text-foreground"
            >
              {thaiYear}
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setPickerView(pickerView === 'month' ? 'year' : 'month')}
            className="flex items-center gap-0.5 px-2 py-1 rounded-md hover:bg-muted transition-colors text-sm font-semibold text-foreground"
          >
            {navLabel}
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
        )}

        <button
          onClick={handleNext}
          aria-label="ถัดไป"
          className="p-1.5 rounded-full hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="px-3 pt-2 pb-2 min-h-[220px]">

        {/* Day view */}
        {pickerView === 'day' && (
          <>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {THAI_WEEKDAYS_SHORT.map((label) => (
                <div
                  key={label}
                  className="h-8 flex items-center justify-center text-[11px] text-muted-foreground font-medium"
                >
                  {label}
                </div>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7">
              {grid.map((day, idx) => {
                if (!day) return <div key={idx} className="h-9 w-9" />
                const selected = isSameDay(day, tempDate)
                const isToday = isSameDay(day, today)
                return (
                  <button
                    key={idx}
                    onClick={() => setTempDate(day)}
                    className={cn(
                      'h-9 w-9 mx-auto flex items-center justify-center rounded-full text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      selected && 'bg-primary text-primary-foreground font-semibold',
                      !selected && isToday && 'border-2 border-primary text-primary font-semibold',
                      !selected && !isToday && 'hover:bg-muted text-foreground',
                    )}
                  >
                    {day.getDate()}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Month view */}
        {pickerView === 'month' && (
          <div className="grid grid-cols-3 gap-1 pt-2">
            {THAI_MONTHS_SHORT.map((label, idx) => (
              <button
                key={idx}
                onClick={() => handleMonthSelect(idx)}
                className={cn(
                  'py-2.5 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  idx === viewMonth && viewYear === tempDate.getFullYear()
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'hover:bg-muted text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Year view */}
        {pickerView === 'year' && (
          <div className="grid grid-cols-3 gap-1 pt-2">
            {Array.from({ length: 12 }, (_, i) => yearRangeStart + i).map((ceYear) => {
              const beYear = ceYearToBe(ceYear)
              return (
                <button
                  key={ceYear}
                  onClick={() => handleYearSelect(ceYear)}
                  className={cn(
                    'py-2.5 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    ceYear === viewYear
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : ceYear === today.getFullYear()
                      ? 'border-2 border-primary text-primary font-semibold'
                      : 'hover:bg-muted text-foreground',
                  )}
                >
                  {beYear}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Action buttons ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 pb-3">
        {/* Today shortcut */}
        <Button
          variant="ghost"
          size="sm"
          onClick={goToToday}
          className="text-primary hover:text-primary hover:bg-primary/10 font-medium"
        >
          วันปัจจุบัน
        </Button>

        {/* Confirm / Cancel */}
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground font-medium"
          >
            ยกเลิก
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleConfirm}
            className="text-primary hover:text-primary hover:bg-primary/10 font-medium"
          >
            ตกลง
          </Button>
        </div>
      </div>
    </div>
  )
}
