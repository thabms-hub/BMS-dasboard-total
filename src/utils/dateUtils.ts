// =============================================================================
// BMS Session KPI Dashboard - Date Formatting Helpers (T020)
// =============================================================================

import { format, subDays, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

/**
 * Normalises a `Date` object or ISO-8601 string into a `Date`.
 */
function toDate(date: Date | string): Date {
  if (typeof date === 'string') {
    return parseISO(date);
  }
  return date;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Formats a date as a human-readable string with Buddhist Era year (พ.ศ.).
 *
 * @example formatDate(new Date(2026, 2, 17)) // "17 มี.ค. 2569"
 *
 * @param date - A `Date` object or ISO-8601 string.
 * @returns The formatted date string with Buddhist Era year.
 */
export function formatDate(date: Date | string): string {
  const d = toDate(date);
  const beYear = d.getFullYear() + 543;
  return format(d, 'd MMM', { locale: th }) + ' ' + beYear;
}

/**
 * Formats a date with time as a human-readable string with Buddhist Era year (พ.ศ.).
 *
 * @example formatDateTime(new Date(2026, 2, 17, 14, 30)) // "17 มี.ค. 2569 14:30"
 *
 * @param date - A `Date` object or ISO-8601 string.
 * @returns The formatted date-time string with Buddhist Era year.
 */
export function formatDateTime(date: Date | string): string {
  const d = toDate(date);
  const beYear = d.getFullYear() + 543;
  return format(d, 'd MMM', { locale: th }) + ' ' + beYear + format(d, ' HH:mm');
}

/**
 * Formats a date as an ISO-8601 date string (date portion only).
 *
 * @example formatDateISO(new Date(2026, 2, 17)) // "2026-03-17"
 *
 * @param date - A `Date` object or ISO-8601 string.
 * @returns The formatted date string in `'yyyy-MM-dd'` format.
 */
export function formatDateISO(date: Date | string): string {
  return format(toDate(date), 'yyyy-MM-dd');
}

/**
 * Returns the ISO date strings for a range spanning the last N days up to today.
 *
 * @example getDateRange(7) // { startDate: "2026-03-10", endDate: "2026-03-17" }
 *
 * @param days - Number of days to look back from today.
 * @returns An object with `startDate` and `endDate` in `'yyyy-MM-dd'` format.
 */
export function getDateRange(days: number): { startDate: string; endDate: string } {
  const today = new Date();
  const start = subDays(today, days);

  return {
    startDate: formatDateISO(start),
    endDate: formatDateISO(today),
  };
}

/**
 * Returns a `Date` object representing N days ago from today.
 *
 * @param days - Number of days to subtract from today.
 * @returns A `Date` object N days in the past.
 */
export function getRelativeDate(days: number): Date {
  return subDays(new Date(), days);
}
