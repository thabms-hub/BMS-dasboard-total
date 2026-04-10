// =============================================================================
// X-Ray Dashboard Service - SQL queries and data fetching
// =============================================================================

import type {
  ConnectionConfig,
  XraySummary,
  XrayItemTop,
  XrayByDept,
  XrayByWard,
  XrayDoctorRead,
  XrayOpdOrder,
  XrayBySex,
  XrayByUrgency,
  XrayMonthlyOrder,
  SqlApiResponse,
} from '@/types'
import { executeSqlViaApi } from '@/services/bmsSession'
import { queryBuilder } from '@/services/queryBuilder'
import { addMonths, format, startOfMonth, subMonths } from 'date-fns'

function parseQueryResponse<T>(
  response: SqlApiResponse,
  mapper: (row: Record<string, unknown>) => T,
): T[] {
  if (!response.data || !Array.isArray(response.data)) {
    return []
  }
  return response.data.map(mapper)
}

/**
 * ข้อมูลสรุปใบสั่ง X-Ray
 * - total_orders: ใบสั่ง X-Ray ทั้งหมด
 * - accepted_orders: มี accept_date (xr.confirm) = ยืนยันรับตัวแล้ว
 * - examined_orders: มี confirm_radiology_date (xr.confirm_radiology) = ยืนยันฉายแล้ว
 * - confirmed_read_orders: มี report_date (xr.confirm_read_film) = ยืนยันอ่านผลแล้ว
 * อ้างอิงจากชุด query หลักบน xray_report และ filter ด้วย request_date
 */
export async function getXraySummary(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<XraySummary> {
  const sql =
    `SELECT ` +
    `COUNT(*) AS total_orders, ` +
    `COUNT(CASE WHEN x.accept_date IS NOT NULL THEN 1 END) AS accepted_orders, ` +
    `COUNT(CASE WHEN x.confirm_radiology_date IS NOT NULL THEN 1 END) AS examined_orders, ` +
    `COUNT(CASE WHEN x.report_date IS NOT NULL THEN 1 END) AS confirmed_read_orders ` +
    `FROM xray_report x ` +
    `WHERE x.request_date >= '${startDate}' AND x.request_date <= '${endDate}'`

  const response = await executeSqlViaApi(sql, config)
  if (response.MessageCode !== 200) {
    throw new Error(response.Message || `SQL Error (code ${response.MessageCode})`)
  }
  const rows = parseQueryResponse(response, (row) => ({
    totalOrders: Number(row['total_orders'] ?? 0),
    acceptedOrders: Number(row['accepted_orders'] ?? 0),
    examinedOrders: Number(row['examined_orders'] ?? 0),
    confirmedReadOrders: Number(row['confirmed_read_orders'] ?? 0),
  }))

  return rows[0] ?? {
    totalOrders: 0,
    acceptedOrders: 0,
    examinedOrders: 0,
    confirmedReadOrders: 0,
  }
}

/** Top 10 รายการสั่ง X-Ray (จาก xray_items) */
export async function getXrayItemsTop(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<XrayItemTop[]> {
  const sql =
    `SELECT xi.xray_items_code, xi.xray_items_name, COUNT(*) AS order_count ` +
    `FROM xray_report xr ` +
    `INNER JOIN xray_items xi ON xi.xray_items_code = xr.xray_items_code ` +
    `WHERE xr.request_date >= '${startDate}' AND xr.request_date <= '${endDate}' ` +
    `GROUP BY xi.xray_items_code, xi.xray_items_name ` +
    `ORDER BY order_count DESC LIMIT 10`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => ({
    xrayItemsCode: String(row['xray_items_code'] ?? ''),
    xrayItemsName: String(row['xray_items_name'] ?? ''),
    orderCount: Number(row['order_count'] ?? 0),
  }))
}

/** จำนวนผู้ป่วยแยกแผนก รายวัน (stacked) */
export async function getXrayByDept(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<XrayByDept[]> {
  const sql =
    `SELECT xr.request_date AS order_date, ` +
    `REPLACE(s.name, 'แผนก', '') AS dept_name, ` +
    `COUNT(*) AS order_count ` +
    `FROM xray_report xr ` +
    `INNER JOIN kskdepartment kd ON kd.depcode = xr.request_depcode ` +
    `INNER JOIN spclty s ON s.spclty = kd.spclty ` +
    `WHERE xr.request_date >= '${startDate}' AND xr.request_date <= '${endDate}' ` +
    `GROUP BY xr.request_date, dept_name ` +
    `ORDER BY xr.request_date`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => ({
    date: String(row['order_date'] ?? ''),
    deptName: String(row['dept_name'] ?? 'ไม่ระบุ'),
    orderCount: Number(row['order_count'] ?? 0),
  }))
}

/** รายการสั่งแยกตามตึก/ward รายวัน (stacked) */
export async function getXrayByWard(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<XrayByWard[]> {
  const sql =
    `SELECT xr.request_date AS order_date, ` +
    `COALESCE(w.name, w.shortname, 'OPD') AS ward_name, ` +
    `COUNT(*) AS order_count ` +
    `FROM xray_report xr ` +
    `LEFT JOIN ipt ON ipt.an = xr.an ` +
    `LEFT JOIN ward w ON w.ward = ipt.ward ` +
    `WHERE xr.request_date >= '${startDate}' AND xr.request_date <= '${endDate}' ` +
    `GROUP BY xr.request_date, ward_name ` +
    `ORDER BY xr.request_date`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => ({
    date: String(row['order_date'] ?? ''),
    wardName: String(row['ward_name'] ?? 'OPD'),
    orderCount: Number(row['order_count'] ?? 0),
  }))
}

/** Top 15 แพทย์อ่านผล X-Ray (report_date IS NOT NULL) */
export async function getXrayDoctorRead(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<XrayDoctorRead[]> {
  const sql =
    `SELECT COALESCE(dc.name, xr.report_doctor, 'ไม่ระบุ') AS doctor_name, ` +
    `COUNT(*) AS read_count ` +
    `FROM xray_report xr ` +
    `LEFT JOIN doctor dc ON dc.code = xr.report_doctor ` +
    `WHERE xr.request_date >= '${startDate}' AND xr.request_date <= '${endDate}' ` +
    `AND xr.report_date IS NOT NULL ` +
    `AND xr.report_doctor IS NOT NULL AND xr.report_doctor <> '' ` +
    `GROUP BY xr.report_doctor, doctor_name ` +
    `ORDER BY read_count DESC LIMIT 15`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => ({
    doctorName: String(row['doctor_name'] ?? 'ไม่ระบุ'),
    readCount: Number(row['read_count'] ?? 0),
  }))
}

/** ผู้ป่วยนัดหมาย OPD ที่มีรายการ X-Ray รายวัน */
export async function getXrayOpdOrders(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<XrayOpdOrder[]> {
  const xrayTextExpr = queryBuilder.castToText(config.databaseType, 'o.xray_list_text')

  const sql =
    `SELECT o.nextdate AS order_date, ` +
    `COUNT(*) AS order_count, ` +
    `COUNT(DISTINCT o.hn) AS patient_count ` +
    `FROM oapp o ` +
    `WHERE o.nextdate >= '${startDate}' AND o.nextdate <= '${endDate}' ` +
    `AND ${xrayTextExpr} IS NOT NULL ` +
    `AND TRIM(${xrayTextExpr}) <> '' ` +
    `AND LOWER(TRIM(${xrayTextExpr})) <> 'null' ` +
    `GROUP BY o.nextdate ` +
    `ORDER BY o.nextdate`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => ({
    date: String(row['order_date'] ?? ''),
    orderCount: Number(row['order_count'] ?? 0),
    patientCount: Number(row['patient_count'] ?? 0),
  }))
}

/** จำนวนผู้ป่วยแยกตามเพศ รวมตั้งครรภ์ */
export async function getXrayBySex(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<XrayBySex[]> {
  const sql =
    `SELECT ` +
    `CASE WHEN xr.pregnant = 'Y' THEN 'ตั้งครรภ์' ELSE COALESCE(sx.name, 'ไม่ระบุ') END AS sex_label, ` +
    `COUNT(DISTINCT xr.hn) AS patient_count ` +
    `FROM xray_report xr ` +
    `INNER JOIN patient pt ON pt.hn = xr.hn ` +
    `LEFT JOIN sex sx ON sx.code = pt.sex ` +
    `WHERE xr.request_date >= '${startDate}' AND xr.request_date <= '${endDate}' ` +
    `GROUP BY sex_label ` +
    `ORDER BY patient_count DESC`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => ({
    sexLabel: String(row['sex_label'] ?? 'ไม่ระบุ'),
    patientCount: Number(row['patient_count'] ?? 0),
  }))
}

/** จำนวนรายการเอกซเรย์แยกตามความเร่งด่วน */
export async function getXrayByUrgency(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<XrayByUrgency[]> {
  const sql =
    `SELECT ` +
    `COALESCE(xp.priority_name, 'ไม่ระบุ') AS urgency_label, ` +
    `COUNT(*) AS order_count ` +
    `FROM xray_report xr ` +
    `LEFT JOIN xray_priority xp ON xp.xray_priority_id = xr.xray_priority_id ` +
    `WHERE xr.request_date >= '${startDate}' AND xr.request_date <= '${endDate}' ` +
    `GROUP BY COALESCE(xp.priority_name, 'ไม่ระบุ'), xp.priority_name ` +
    `ORDER BY order_count DESC`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => ({
    urgencyLabel: String(row['urgency_label'] ?? 'ไม่ระบุ'),
    orderCount: Number(row['order_count'] ?? 0),
  }))
}

/** จำนวนการสั่งเอกซเรย์รายเดือนย้อนหลัง 12 เดือน (รวมเดือนปัจจุบัน) */
export async function getXrayMonthlyOrders(config: ConnectionConfig): Promise<XrayMonthlyOrder[]> {
  const monthKeyExpr = queryBuilder.dateFormat(config.databaseType, 'xr.request_date', '%Y-%m')
  const rangeStart = format(startOfMonth(subMonths(new Date(), 11)), 'yyyy-MM-dd')
  const rangeEndExclusive = format(startOfMonth(addMonths(new Date(), 1)), 'yyyy-MM-dd')

  const sql =
    `SELECT ` +
    `${monthKeyExpr} AS month_key, ` +
    `COUNT(*) AS order_count ` +
    `FROM xray_report xr ` +
    `WHERE xr.request_date >= '${rangeStart}' ` +
    `AND xr.request_date < '${rangeEndExclusive}' ` +
    `GROUP BY ${monthKeyExpr} ` +
    `ORDER BY month_key ASC`

  const response = await executeSqlViaApi(sql, config)
  if (response.MessageCode !== 200) {
    throw new Error(response.Message || `SQL Error (code ${response.MessageCode})`)
  }
  return parseQueryResponse(response, (row) => ({
    monthKey: String(row['month_key'] ?? ''),
    orderCount: Number(row['order_count'] ?? 0),
  }))
}
