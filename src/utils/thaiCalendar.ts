// =============================================================================
// Thai Calendar Utilities - Buddhist Era (พ.ศ.) conversion and formatting
// =============================================================================

// Thai calendar utilities - no need for format from date-fns

export const CE_TO_BE_OFFSET = 543

export const THAI_MONTHS_FULL = [
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
] as const

export const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'กพ.',
  'มีค.',
  'เมษ.',
  'พค.',
  'มิถ.',
  'กค.',
  'สค.',
  'กย.',
  'ตค.',
  'พย.',
  'ธค.',
] as const

export const THAI_WEEKDAYS = [
  'อาทิตย์',
  'จันทร์',
  'อังคาร',
  'พุธ',
  'พฤหัส',
  'ศุกร์',
  'เสาร์',
] as const

export const THAI_WEEKDAYS_SHORT = [
  'อา',
  'จ',
  'อ',
  'พ',
  'พฤ',
  'ศ',
  'ส',
] as const

/**
 * Convert Common Era (ค.ศ.) year to Buddhist Era (พ.ศ.) year
 * @example ceYearToBe(2026) => 2569
 */
export function ceYearToBe(ceYear: number): number {
  return ceYear + CE_TO_BE_OFFSET
}

/**
 * Convert Buddhist Era (พ.ศ.) year to Common Era (ค.ศ.) year
 * @example beYearToCe(2569) => 2026
 */
export function beYearToCe(beYear: number): number {
  return beYear - CE_TO_BE_OFFSET
}

/**
 * Format an ISO date string to Thai date format (long form)
 * @example formatThaiDate("2026-03-17") => "17 มีนาคม 2569"
 */
export function formatThaiDate(isoString: string): string {
  const date = new Date(isoString)
  const day = date.getDate()
  const month = THAI_MONTHS_FULL[date.getMonth()]
  const year = ceYearToBe(date.getFullYear())
  return `${day} ${month} ${year}`
}

/**
 * Format an ISO date string to Thai date format (short form)
 * @example formatThaiDateShort("2026-03-17") => "17 มี.ค. 2569"
 */
export function formatThaiDateShort(isoString: string): string {
  const date = new Date(isoString)
  const day = date.getDate()
  const month = THAI_MONTHS_SHORT[date.getMonth()]
  const year = ceYearToBe(date.getFullYear())
  return `${day} ${month} ${year}`
}

/**
 * Formatters for react-day-picker v9 with Thai locale
 * Used with DayPicker's `formatters` prop
 */
export const thaiDayPickerFormatters = {
  formatCaption: (month: Date): string => {
    const monthName = THAI_MONTHS_FULL[month.getMonth()]
    const year = ceYearToBe(month.getFullYear())
    return `${monthName} ${year}`
  },

  formatWeekdayName: (day: Date): string => {
    return THAI_WEEKDAYS_SHORT[day.getDay()]
  },

  formatDayOfMonth: (day: Date): string => {
    return day.getDate().toString()
  },

  formatMonthCaption: (month: Date): string => {
    return `${THAI_MONTHS_FULL[month.getMonth()]} ${ceYearToBe(month.getFullYear())}`
  },

  formatYearCaption: (year: Date): string => {
    return ceYearToBe(year.getFullYear()).toString()
  },
} as const
