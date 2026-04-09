import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ConnectionConfig, SqlApiResponse } from '@/types'
import { getOpdExamReferralBreakdown } from '@/services/opdExamRoomService'
import { executeSqlViaApi } from '@/services/bmsSession'

vi.mock('@/services/bmsSession', () => ({
  executeSqlViaApi: vi.fn(),
}))

const executeSqlViaApiMock = vi.mocked(executeSqlViaApi)

const config: ConnectionConfig = {
  apiUrl: 'https://example.test/api/sql',
  bearerToken: 'token',
  databaseType: 'mysql',
  appIdentifier: 'BMS.Dashboard.React',
}

function createSqlApiResponse(data: Record<string, unknown>[]): SqlApiResponse {
  return {
    result: {},
    MessageCode: 200,
    Message: 'Success',
    RequestTime: '2026-04-09T00:00:00Z',
    data,
    field: [],
    field_name: [],
    record_count: data.length,
  }
}

describe('getOpdExamReferralBreakdown', () => {
  beforeEach(() => {
    executeSqlViaApiMock.mockReset()
  })

  it('joins hospcode and uses hospcode.name as destination label', async () => {
    executeSqlViaApiMock.mockResolvedValueOnce(
      createSqlApiResponse([
        { label: 'โรงพยาบาลศูนย์บุรีรัมย์', refer_count: 12 },
      ]),
    )

    const result = await getOpdExamReferralBreakdown(config, '2026-04-01', '2026-04-09')

    expect(executeSqlViaApiMock).toHaveBeenCalledTimes(1)
    expect(executeSqlViaApiMock).toHaveBeenCalledWith(
      expect.stringContaining('LEFT JOIN hospcode h ON h.hospcode = r.refer_hospcode'),
      config,
    )
    expect(executeSqlViaApiMock.mock.calls[0]?.[0]).toContain('COALESCE(h.name, r.refer_hospname, r.refer_hospcode')
    expect(result).toEqual([
      {
        label: 'โรงพยาบาลศูนย์บุรีรัมย์',
        referCount: 12,
        breakdownType: 'destination',
      },
    ])
  })

  it('falls back to the next destination query when hospcode join query fails', async () => {
    executeSqlViaApiMock
      .mockRejectedValueOnce(new Error('Unknown column r.refer_hospname'))
      .mockResolvedValueOnce(
        createSqlApiResponse([
          { label: 'โรงพยาบาลนางรอง', refer_count: 5 },
        ]),
      )

    const result = await getOpdExamReferralBreakdown(config, '2026-04-01', '2026-04-09')

    expect(executeSqlViaApiMock).toHaveBeenCalledTimes(2)
    expect(executeSqlViaApiMock.mock.calls[1]?.[0]).toContain('COALESCE(h.name, r.refer_hospcode,')
    expect(result).toEqual([
      {
        label: 'โรงพยาบาลนางรอง',
        referCount: 5,
        breakdownType: 'destination',
      },
    ])
  })
})