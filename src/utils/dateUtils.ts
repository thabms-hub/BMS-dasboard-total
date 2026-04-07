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
 * Returns the ISO date strings for an inclusive date range of exactly N days ending today.
 *
 * Both start and end dates are counted, so the range always spans exactly `days` days.
 *
 * @example getDateRange(7)  // today=2026-03-17 → { startDate: "2026-03-11", endDate: "2026-03-17" } (7 days)
 * @example getDateRange(30) // today=2026-03-17 → { startDate: "2026-02-16", endDate: "2026-03-17" } (30 days)
 * @example getDateRange(0)  // { startDate: today, endDate: today } (today only)
 *
 * @param days - Total number of days in the range (inclusive of both endpoints).
 * @returns An object with `startDate` and `endDate` in `'yyyy-MM-dd'` format.
 */
export function getDateRange(days: number): { startDate: string; endDate: string } {
  const today = new Date();
  // Subtract (days - 1) so both start and end are counted: a range of N days
  // has N-1 gaps between them. Special-case days=0 → today only (same as days=1).
  const start = subDays(today, Math.max(0, days - 1));

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
