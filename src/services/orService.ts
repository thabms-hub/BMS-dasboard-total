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
  OrRoomUsageByShiftItem,
  OrAnesthesiaTypeItem,
  OrOperationDurationItem,
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

function buildOrCaseBaseSql(startDate: string, endDate: string): string {
  return (
    `SELECT ` +
    `Concat(os.operation_set_id) AS operation_set_id, ` +
    `Concat(ol.operation_id) AS operation_id, ` +
    `Coalesce(ol.hn, os.hn) AS hn, ` +
    `Coalesce(ol.vn, os.vn) AS vn, ` +
    `Coalesce(ol.an, os.an) AS an, ` +
    `Coalesce(ol.patient_department, case when os.an is not null and os.an <> '' then 'IPD' else 'OPD' end) AS patient_department, ` +
    `Concat(p.pname, p.fname, ' ', p.lname) AS pt_name, ` +
    `Coalesce(ol.request_date, os.operation_request_date) AS operation_request_date, ` +
    `Coalesce(ol.request_time, os.operation_request_time) AS operation_request_time, ` +
    `d.name AS request_doctor_name, ` +
    `os.operation_set_date, ` +
    `os.operation_set_time, ` +
    `Coalesce(ol.operation_name, os.operation_name) AS operation_name, ` +
    `oy.name AS operation_type_name, ` +
    `os.operation_position, ` +
    `os.operation_side, ` +
    `os.duration_hour, ` +
    `os.duration_minute, ` +
    `e.emergency_name, ` +
    `tt.operation_time_type_name, ` +
    `r.room_name, ` +
    `os.note, ` +
    `os.provision_diagnosis_text, ` +
    `st.status_name, ` +
    `Replace(s.name, 'แผนก', '') AS spclty, ` +
    `Coalesce(w.shortname, w.name) AS ward ` +
    `FROM operation_set os ` +
    `INNER JOIN patient p ON p.hn = os.hn ` +
    `LEFT JOIN operation_list ol ON ol.operation_set_id = os.operation_set_id ` +
    `LEFT JOIN ipt ON ipt.an = ol.an ` +
    `LEFT JOIN doctor d ON d.code = Coalesce(ol.request_doctor, os.operation_set_doctor_code) AND d.position_id IN (1, 2) ` +
    `LEFT JOIN operation_type oy ON oy.operation_type_id = Coalesce(ol.operation_type_id, os.operation_type_id) ` +
    `LEFT JOIN operation_emergency e ON e.emergency_id = Coalesce(ol.emergency_id, os.emergency_id) ` +
    `LEFT JOIN operation_room r ON r.room_id = Coalesce(ol.room_id, os.room_id) ` +
    `LEFT JOIN operation_status st ON st.status_id = ol.status_id ` +
    `LEFT JOIN operation_time_type tt ON tt.operation_time_type_id = Coalesce(ol.operation_time_type_id, os.operation_time_type_id) ` +
    `LEFT JOIN ward w ON w.ward = ipt.ward ` +
    `LEFT JOIN spclty s ON s.spclty = ol.spclty ` +
    `WHERE Coalesce(ol.request_date, os.operation_request_date, os.operation_set_date) >= '${startDate}' ` +
    `AND Coalesce(ol.request_date, os.operation_request_date, os.operation_set_date) <= '${endDate}'`
  )
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
    `WITH or_base AS (${buildOrCaseBaseSql(startDate, endDate)}) ` +
    `SELECT COALESCE(operation_name, 'ไม่ระบุรายการผ่าตัด') AS operation_name, ` +
    `COUNT(*) AS surgery_count ` +
    `FROM or_base ` +
    `GROUP BY operation_name ` +
    `ORDER BY surgery_count DESC, operation_name ASC`

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
    `WITH or_base AS (${buildOrCaseBaseSql(startDate, endDate)}) ` +
    `SELECT COALESCE(emergency_name, 'ไม่ระบุ') AS urgency_name, ` +
    `COUNT(*) AS surgery_count ` +
    `FROM or_base ` +
    `GROUP BY emergency_name ` +
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
    `WITH or_base AS (${buildOrCaseBaseSql(startDate, endDate)}) ` +
    `SELECT COALESCE(operation_type_name, 'ไม่ระบุ') AS operation_type_name, ` +
    `COUNT(*) AS surgery_count ` +
    `FROM or_base ` +
    `GROUP BY operation_type_name ` +
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
    `WITH or_base AS (${buildOrCaseBaseSql(startDate, endDate)}) ` +
    `SELECT COALESCE(status_name, 'ไม่ระบุ') AS status_name, ` +
    `COUNT(*) AS surgery_count ` +
    `FROM or_base ` +
    `GROUP BY status_name ` +
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

export async function getOrRoomUsageByShift(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<OrRoomUsageByShiftItem[]> {
  const sql =
    `WITH or_base AS (${buildOrCaseBaseSql(startDate, endDate)}) ` +
    `SELECT COALESCE(room_name, 'ไม่ระบุห้อง') AS room_name, ` +
    `COALESCE(operation_time_type_name, 'ไม่ระบุเวร') AS shift_name, ` +
    `COUNT(*) AS usage_count ` +
    `FROM or_base ` +
    `GROUP BY room_name, shift_name ` +
    `ORDER BY room_name ASC, shift_name ASC`

  const response = await executeSqlViaApi(sql, config)
  if (response.MessageCode !== 200) {
    throw new Error(response.Message || `SQL Error (code ${response.MessageCode})`)
  }

  return parseQueryResponse(response, (row) => ({
    roomName: String(row['room_name'] ?? 'ไม่ระบุห้อง'),
    shiftName: String(row['shift_name'] ?? 'ไม่ระบุเวร'),
    usageCount: Number(row['usage_count'] ?? 0),
  }))
}

export async function getOrAnesthesiaTypes(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<OrAnesthesiaTypeItem[]> {
  const sql =
    `SELECT COALESCE(ant.anes_name, 'ไม่ระบุประเภทวิสัญญี') AS anes_name, ` +
    `COUNT(*) AS case_count ` +
    `FROM operation_anes oa ` +
    `INNER JOIN operation_anes_type ant ON ant.anes_type_id = oa.anes_type_id ` +
    `WHERE oa.begin_date >= '${startDate}' AND oa.begin_date <= '${endDate}' ` +
    `GROUP BY ant.anes_name ` +
    `ORDER BY case_count DESC`

  const response = await executeSqlViaApi(sql, config)
  if (response.MessageCode !== 200) {
    throw new Error(response.Message || `SQL Error (code ${response.MessageCode})`)
  }

  return parseQueryResponse(response, (row) => ({
    anesName: String(row['anes_name'] ?? 'ไม่ระบุประเภทวิสัญญี'),
    caseCount: Number(row['case_count'] ?? 0),
  }))
}

export async function getOrAverageDurationByOperation(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<OrOperationDurationItem[]> {
  const sqlCandidates = [
    `WITH operation_detail_base AS (` +
    `SELECT ` +
    `Concat(od.operation_detail_id) AS operation_detail_id, ` +
    `Concat(od.operation_id) AS operation_id, ` +
    `oi.name AS operation_name, ` +
    `od.operation_time_hour, ` +
    `od.operation_time_minute ` +
    `FROM operation_detail od ` +
    `INNER JOIN operation_item oi ON oi.operation_item_id = od.operation_item_id` +
    `), or_base AS (${buildOrCaseBaseSql(startDate, endDate)}) ` +
    `SELECT COALESCE(od.operation_name, or_base.operation_name, 'ไม่ระบุรายการผ่าตัด') AS operation_name, ` +
    `AVG((COALESCE(od.operation_time_hour, 0) * 60) + COALESCE(od.operation_time_minute, 0)) AS avg_duration_minutes, ` +
    `COUNT(*) AS case_count ` +
    `FROM operation_detail_base od ` +
    `INNER JOIN or_base ON od.operation_id = or_base.operation_id ` +
    `WHERE ((COALESCE(od.operation_time_hour, 0) * 60) + COALESCE(od.operation_time_minute, 0)) > 0 ` +
    `GROUP BY COALESCE(od.operation_name, or_base.operation_name, 'ไม่ระบุรายการผ่าตัด') ` +
    `ORDER BY avg_duration_minutes DESC, operation_name ASC`,
    `WITH or_base AS (${buildOrCaseBaseSql(startDate, endDate)}) ` +
    `SELECT COALESCE(operation_name, 'ไม่ระบุรายการผ่าตัด') AS operation_name, ` +
    `AVG((COALESCE(duration_hour, 0) * 60) + COALESCE(duration_minute, 0)) AS avg_duration_minutes, ` +
    `COUNT(*) AS case_count ` +
    `FROM or_base ` +
    `WHERE ((COALESCE(duration_hour, 0) * 60) + COALESCE(duration_minute, 0)) > 0 ` +
    `GROUP BY operation_name ` +
    `ORDER BY avg_duration_minutes DESC, operation_name ASC`,
  ]

  for (const sql of sqlCandidates) {
    try {
      const response = await executeSqlViaApi(sql, config)
      if (response.MessageCode !== 200) {
        continue
      }

      const rows = parseQueryResponse(response, (row) => ({
        operationName: String(row['operation_name'] ?? 'ไม่ระบุรายการผ่าตัด'),
        avgDurationMinutes: Number(row['avg_duration_minutes'] ?? 0),
        caseCount: Number(row['case_count'] ?? 0),
      }))

      if (rows.length > 0) {
        return rows
      }
    } catch {
      continue
    }
  }

  return []
}
