// =============================================================================
// usePersistentDateRange - Persists date range selection to localStorage
// =============================================================================

import { useCallback, useState } from 'react'
import { getDateRange } from '@/utils/dateUtils'

const STORAGE_PREFIX = 'bms_date_range_'

function loadFromStorage(key: string): { startDate: string; endDate: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed.startDate === 'string' && typeof parsed.endDate === 'string') {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

function saveToStorage(key: string, startDate: string, endDate: string) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify({ startDate, endDate }))
  } catch {
    // ignore storage errors (e.g. private browsing quota)
  }
}

export function usePersistentDateRange(key: string, defaultDays: number) {
  const [startDate, setStartDate] = useState<string>(() => {
    const saved = loadFromStorage(key)
    return saved?.startDate ?? getDateRange(defaultDays).startDate
  })

  const [endDate, setEndDate] = useState<string>(() => {
    const saved = loadFromStorage(key)
    return saved?.endDate ?? getDateRange(defaultDays).endDate
  })

  const setRange = useCallback((newStart: string, newEnd: string) => {
    setStartDate(newStart)
    setEndDate(newEnd)
    saveToStorage(key, newStart, newEnd)
  }, [key])

  return { startDate, endDate, setRange }
}
