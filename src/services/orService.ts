// =============================================================================
// OR Dashboard Service - SQL queries and data fetching
// =============================================================================

import type {
  ConnectionConfig,
  OrSummary,
  OrTopOperationItem,
  OrUrgencyItem,
  OrOperationTypeItem,
  OrStatusItem,
  SqlApiResponse,
} from '@/types'
import { executeSqlViaApi } from '@/services/bmsSession'

function parseQueryResponse<T>(
  response: SqlApiResponse,
  mapper: (row: Record<string, unknown>) => T,
): T[] {
  if (!response.data || !Array.isArray(response.data)) {
    return []
  }
  return response.data.map(mapper)
}

async function getOrTotalAmount(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<number> {
  const sqlCandidates = [
    `SELECT COALESCE(SUM(op.sum_price), 0) AS total_amount ` +
      `FROM operation_set os ` +
      `LEFT JOIN opitemrece op ON op.vn = os.charge_vn ` +
      `WHERE os.operation_set_date >= '${startDate}' AND os.operation_set_date <= '${endDate}'`,
    `SELECT COALESCE(SUM(operation_amount), 0) AS total_amount ` +
      `FROM operation_list ` +
      `WHERE request_operation_date >= '${startDate}' AND request_operation_date <= '${endDate}'`,
    `SELECT COALESCE(SUM(price), 0) AS total_amount ` +
      `FROM operation_list ` +
      `WHERE request_operation_date >= '${startDate}' AND request_operation_date <= '${endDate}'`,
  ]

  for (const sql of sqlCandidates) {
    try {
      const response = await executeSqlViaApi(sql, config)
      if (response.MessageCode !== 200) {
        continue
      }
      const rows = parseQueryResponse(response, (row) => Number(row['total_amount'] ?? 0))
      return rows[0] ?? 0
    } catch {
      continue
    }
  }

  return 0
}

export async function getOrSummary(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<OrSummary> {
  const summarySql =
    `SELECT ` +
    `(SELECT COUNT(*) FROM operation_set os ` +
    ` WHERE os.operation_set_date >= '${startDate}' AND os.operation_set_date <= '${endDate}' ` +
    ` AND os.set_complete = 'N') AS pending_set_count, ` +
    `(SELECT COUNT(DISTINCT ol.hn) FROM operation_list ol ` +
    ` WHERE ol.request_operation_date >= '${startDate}' AND ol.request_operation_date <= '${endDate}') AS total_patients, ` +
    `(SELECT COUNT(*) FROM operation_list ol ` +
    ` WHERE ol.request_operation_date >= '${startDate}' AND ol.request_operation_date <= '${endDate}') AS total_surgeries`

  const response = await executeSqlViaApi(summarySql, config)
  if (response.MessageCode !== 200) {
    throw new Error(response.Message || `SQL Error (code ${response.MessageCode})`)
  }

  const rows = parseQueryResponse(response, (row) => ({
    pendingSetCount: Number(row['pending_set_count'] ?? 0),
    totalPatients: Number(row['total_patients'] ?? 0),
    totalSurgeries: Number(row['total_surgeries'] ?? 0),
  }))

  const amount = await getOrTotalAmount(config, startDate, endDate)
  const base = rows[0] ?? { pendingSetCount: 0, totalPatients: 0, totalSurgeries: 0 }

  return {
    ...base,
    totalAmount: amount,
  }
}

export async function getOrTopOperations(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<OrTopOperationItem[]> {
  const sql =
    `SELECT COALESCE(os.operation_name, 'ไม่ระบุรายการผ่าตัด') AS operation_name, ` +
    `COUNT(*) AS surgery_count ` +
    `FROM operation_set os ` +
    `WHERE os.operation_set_date >= '${startDate}' AND os.operation_set_date <= '${endDate}' ` +
    `GROUP BY os.operation_name ` +
    `ORDER BY surgery_count DESC ` +
    `LIMIT 10`

  const response = await executeSqlViaApi(sql, config)
  if (response.MessageCode !== 200) {
    throw new Error(response.Message || `SQL Error (code ${response.MessageCode})`)
  }

  return parseQueryResponse(response, (row) => ({
    operationName: String(row['operation_name'] ?? 'ไม่ระบุรายการผ่าตัด'),
    surgeryCount: Number(row['surgery_count'] ?? 0),
  }))
}

export async function getOrByUrgency(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<OrUrgencyItem[]> {
  const sql =
    `SELECT COALESCE(oe.emergency_name, 'ไม่ระบุ') AS urgency_name, ` +
    `COUNT(*) AS surgery_count ` +
    `FROM operation_list ol ` +
    `LEFT JOIN operation_emergency oe ON oe.emergency_id = ol.emergency_id ` +
    `WHERE ol.request_operation_date >= '${startDate}' AND ol.request_operation_date <= '${endDate}' ` +
    `GROUP BY oe.emergency_name ` +
    `ORDER BY surgery_count DESC`

  const response = await executeSqlViaApi(sql, config)
  if (response.MessageCode !== 200) {
    throw new Error(response.Message || `SQL Error (code ${response.MessageCode})`)
  }

  return parseQueryResponse(response, (row) => ({
    urgencyName: String(row['urgency_name'] ?? 'ไม่ระบุ'),
    surgeryCount: Number(row['surgery_count'] ?? 0),
  }))
}

export async function getOrByType(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<OrOperationTypeItem[]> {
  const sql =
    `SELECT COALESCE(ot.name, 'ไม่ระบุ') AS operation_type_name, ` +
    `COUNT(*) AS surgery_count ` +
    `FROM operation_list ol ` +
    `LEFT JOIN operation_type ot ON ot.operation_type_id = ol.operation_type_id ` +
    `WHERE ol.request_operation_date >= '${startDate}' AND ol.request_operation_date <= '${endDate}' ` +
    `GROUP BY ot.name ` +
    `ORDER BY surgery_count DESC`

  const response = await executeSqlViaApi(sql, config)
  if (response.MessageCode !== 200) {
    throw new Error(response.Message || `SQL Error (code ${response.MessageCode})`)
  }

  return parseQueryResponse(response, (row) => ({
    operationTypeName: String(row['operation_type_name'] ?? 'ไม่ระบุ'),
    surgeryCount: Number(row['surgery_count'] ?? 0),
  }))
}

export async function getOrByStatus(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<OrStatusItem[]> {
  const sql =
    `SELECT COALESCE(os.status_name, 'ไม่ระบุ') AS status_name, ` +
    `COUNT(*) AS surgery_count ` +
    `FROM operation_list ol ` +
    `LEFT JOIN operation_status os ON os.status_id = ol.status_id ` +
    `WHERE ol.request_operation_date >= '${startDate}' AND ol.request_operation_date <= '${endDate}' ` +
    `GROUP BY os.status_name ` +
    `ORDER BY surgery_count DESC`

  const response = await executeSqlViaApi(sql, config)
  if (response.MessageCode !== 200) {
    throw new Error(response.Message || `SQL Error (code ${response.MessageCode})`)
  }

  return parseQueryResponse(response, (row) => ({
    statusName: String(row['status_name'] ?? 'ไม่ระบุ'),
    surgeryCount: Number(row['surgery_count'] ?? 0),
  }))
}
