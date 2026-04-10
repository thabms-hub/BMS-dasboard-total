// =============================================================================
// Lab Dashboard Service - SQL queries and data fetching
// =============================================================================

import type {
  ConnectionConfig,
  LabOrderSummary,
  LabOrderByPriority,
  LabItemTop,
  LabGroupTop,
  LabOrderByLocation,
  LabOrderByDepartment,
  LabOrderVsPatient,
  LabOrderVsPatientByType,
  LabRejectedRadarItem,
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

/**
 * ข้อมูลจำนวนใบสั่งแลปทั้งหมด
 * - ข้อมูลจำนวนใบสั่งแลป รับรายการแล้ว (receive_date IS NOT NULL)
 * - ข้อมูลจำนวนใบสั่งแลปรายงานผลแล้ว (report_date IS NOT NULL)
 * - ข้อมูลจำนวนรายการ OUT LAB (items_is_outlab = 'Y')
 */
export async function getLabOrderSummary(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<LabOrderSummary> {
  const sql =
    `SELECT ` +
    `COUNT(DISTINCT lh.lab_order_number) as total_orders, ` +
    `COUNT(DISTINCT CASE WHEN lh.receive_date IS NOT NULL THEN lh.lab_order_number END) as received_orders, ` +
    `COUNT(DISTINCT CASE WHEN lh.report_date IS NOT NULL THEN lh.lab_order_number END) as reported_orders, ` +
    `COUNT(DISTINCT CASE WHEN li.items_is_outlab = 'Y' THEN lo.lab_order_number END) as outlab_count ` +
    `FROM lab_head lh ` +
    `LEFT JOIN lab_order lo ON lo.lab_order_number = lh.lab_order_number ` +
    `LEFT JOIN lab_items li ON li.lab_items_code = lo.lab_items_code ` +
    `WHERE lh.order_date >= '${startDate}' AND lh.order_date <= '${endDate}'`

  const response = await executeSqlViaApi(sql, config)
  const rows = parseQueryResponse(response, (row) => ({
    totalOrders: Number(row['total_orders'] ?? 0),
    receivedOrders: Number(row['received_orders'] ?? 0),
    reportedOrders: Number(row['reported_orders'] ?? 0),
    outlabCount: Number(row['outlab_count'] ?? 0),
  }))

  return rows[0] ?? {
    totalOrders: 0,
    receivedOrders: 0,
    reportedOrders: 0,
    outlabCount: 0,
  }
}

/**
 * จำนวนใบสั่งแลป แยกตามความเร่งด่วน แยกเป็นรายวัน
 */
export async function getLabOrderByPriority(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<LabOrderByPriority[]> {
  const sql =
    `SELECT ` +
    `DATE(lh.order_date) as order_date, ` +
    `COALESCE(lp.lab_priority_name, 'ไม่ระบุ') as priority_name, ` +
    `COUNT(DISTINCT lh.lab_order_number) as order_count ` +
    `FROM lab_head lh ` +
    `LEFT JOIN lab_priority lp ON lp.lab_priority_id = lh.lab_priority_id ` +
    `WHERE lh.order_date >= '${startDate}' AND lh.order_date <= '${endDate}' ` +
    `GROUP BY DATE(lh.order_date), lp.lab_priority_id, lp.lab_priority_name ` +
    `ORDER BY DATE(lh.order_date) ASC, order_count DESC`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => ({
    date: String(row['order_date'] ?? ''),
    priorityName: String(row['priority_name'] ?? 'ไม่ระบุ'),
    orderCount: Number(row['order_count'] ?? 0),
  }))
}

/**
 * อันดับรายการแลปที่ถูกสั่งจากมากไปน้อย (order by จำนวน DESC limit 10)
 */
export async function getLabItemsTop(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<LabItemTop[]> {
  const sql =
    `SELECT ` +
    `lo.lab_items_code, ` +
    `lo.lab_items_name_ref, ` +
    `COUNT(*) as order_count ` +
    `FROM lab_order lo ` +
    `INNER JOIN lab_head lh ON lo.lab_order_number = lh.lab_order_number ` +
    `WHERE lh.order_date >= '${startDate}' AND lh.order_date <= '${endDate}' ` +
    `GROUP BY lo.lab_items_code, lo.lab_items_name_ref ` +
    `ORDER BY order_count DESC ` +
    `LIMIT 10`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => ({
    labItemsCode: String(row['lab_items_code'] ?? ''),
    labItemsName: String(row['lab_items_name_ref'] ?? 'ไม่ระบุ'),
    orderCount: Number(row['order_count'] ?? 0),
  }))
}

/**
 * อันดับกลุ่มแลปที่ถูกสั่งจากมากไปน้อย (จาก lab_group หรือ category limit 10)
 * หมายเหตุ: ต้องเตือนว่า schema อาจต่างไปจาก assumptions นี้
 */
export async function getLabGroupTop(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<LabGroupTop[]> {
  const sql =
    `SELECT ` +
    `COALESCE(lg.lab_items_group_name, 'ไม่ระบุกลุ่ม') as group_name, ` +
    `COUNT(DISTINCT lh.lab_order_number) as order_count ` +
    `FROM lab_head lh ` +
    `INNER JOIN lab_order_service lo ON lo.lab_order_number = lh.lab_order_number ` +
    `LEFT JOIN lab_items lt ON lt.lab_items_code = lo.lab_code AND lo.lab_order_type = 'ITEM' ` +
    `LEFT JOIN lab_items_sub_group ls ON ls.lab_items_sub_group_code = lo.lab_code AND lo.lab_order_type = 'PROFILE' ` +
    `LEFT JOIN lab_items_group lg ON lg.lab_items_group_code = lt.lab_items_group OR lg.lab_items_group_code = ls.lab_items_group_code ` +
    `WHERE lh.order_date >= '${startDate}' AND lh.order_date <= '${endDate}' ` +
    `GROUP BY lg.lab_items_group_name ` +
    `ORDER BY order_count DESC ` +
    `LIMIT 10`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => ({
    groupName: String(row['group_name'] ?? 'ไม่ระบุกลุ่ม'),
    orderCount: Number(row['order_count'] ?? 0),
  }))
}

/**
 * จำนวนใบสั่งแลป แยกตามตึก (location/เขต)
 * หมายเหตุ: ใช้ข้อมูลจาก patient address หรือ department location
 */
export async function getLabOrderByLocation(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<LabOrderByLocation[]> {
  const sql =
    `SELECT ` +
    `DATE(lh.order_date) as order_date, ` +
    `COALESCE(w.shortname, w.name, 'ไม่ระบุตึก') as location_name, ` +
    `COUNT(DISTINCT lh.lab_order_number) as order_count ` +
    `FROM lab_head lh ` +
    `LEFT JOIN ipt ON ipt.an = lh.vn ` +
    `LEFT JOIN ward w ON w.ward = ipt.ward ` +
    `WHERE lh.order_date >= '${startDate}' AND lh.order_date <= '${endDate}' ` +
    `GROUP BY DATE(lh.order_date), w.ward, w.shortname, w.name ` +
    `ORDER BY DATE(lh.order_date) ASC, order_count DESC`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => ({
    date: String(row['order_date'] ?? ''),
    locationName: String(row['location_name'] ?? 'ไม่ระบุตึก'),
    orderCount: Number(row['order_count'] ?? 0),
  }))
}

/**
 * จำนวนใบสั่งแลป แยกแผนก
 */
export async function getLabOrderByDepartment(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<LabOrderByDepartment[]> {
  const sql =
    `SELECT ` +
    `DATE(lh.order_date) as order_date, ` +
    `COALESCE(kd.department, REPLACE(s.name, 'แผนก', ''), 'ไม่ระบุแผนก') as dept_name, ` +
    `COUNT(DISTINCT lh.lab_order_number) as order_count ` +
    `FROM lab_head lh ` +
    `INNER JOIN kskdepartment kd ON kd.depcode = lh.order_department ` +
    `LEFT JOIN spclty s ON s.spclty = kd.spclty ` +
    `WHERE lh.order_date >= '${startDate}' AND lh.order_date <= '${endDate}' ` +
    `GROUP BY DATE(lh.order_date), lh.order_department, kd.department, s.name ` +
    `ORDER BY DATE(lh.order_date) ASC, order_count DESC`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => ({
    date: String(row['order_date'] ?? ''),
    deptName: String(row['dept_name'] ?? 'ไม่ระบุแผนก'),
    orderCount: Number(row['order_count'] ?? 0),
  }))
}

/**
 * จำนวนใบสั่งแลป เทียบจำนวนผู้ป่วย
 */
export async function getLabOrderVsPatient(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<LabOrderVsPatient> {
  const sql =
    `SELECT ` +
    `COUNT(DISTINCT lh.lab_order_number) as total_orders, ` +
    `COUNT(DISTINCT lh.hn) as unique_patients ` +
    `FROM lab_head lh ` +
    `WHERE lh.order_date >= '${startDate}' AND lh.order_date <= '${endDate}'`

  const response = await executeSqlViaApi(sql, config)
  const rows = parseQueryResponse(response, (row) => ({
    totalOrders: Number(row['total_orders'] ?? 0),
    uniquePatients: Number(row['unique_patients'] ?? 0),
  }))

  return rows[0] ?? {
    totalOrders: 0,
    uniquePatients: 0,
  }
}

/**
 * เปรียบเทียบจำนวนผู้ป่วยและจำนวนใบสั่งแลป แยกตามประเภทผู้ป่วย (IPD/OPD)
 */
export async function getLabOrderVsPatientByType(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<LabOrderVsPatientByType[]> {
  const sql =
    `SELECT ` +
    `CASE WHEN ipt.an IS NOT NULL THEN 'IPD' ELSE 'OPD' END as patient_type, ` +
    `COUNT(DISTINCT lh.hn) as patient_count, ` +
    `COUNT(DISTINCT lh.lab_order_number) as order_count ` +
    `FROM lab_head lh ` +
    `LEFT JOIN ipt ON ipt.an = lh.vn ` +
    `WHERE lh.order_date >= '${startDate}' AND lh.order_date <= '${endDate}' ` +
    `GROUP BY CASE WHEN ipt.an IS NOT NULL THEN 'IPD' ELSE 'OPD' END`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => ({
    patientType: String(row['patient_type'] ?? 'OPD') === 'IPD' ? 'IPD' : 'OPD',
    patientCount: Number(row['patient_count'] ?? 0),
    orderCount: Number(row['order_count'] ?? 0),
  }))
}

/**
 * สรุป LAB ที่ถูก reject (lab_perform_status_id = 3) สำหรับแสดง Radar Chart
 */
export async function getLabRejectedRadar(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<LabRejectedRadarItem[]> {
  const sqlCandidates = [
    `SELECT ` +
      `lhrt.lab_head_reject_type_name as reason, ` +
      `COUNT(DISTINCT lh.lab_order_number) as rejected_count ` +
      `FROM lab_head lh ` +
      `LEFT JOIN lab_head_reject_type lhrt ON lhrt.lab_head_reject_type_id = lh.lab_head_reject_type_id ` +
      `WHERE lh.order_date >= '${startDate}' AND lh.order_date <= '${endDate}' ` +
      `AND lh.lab_perform_status_id = 3 ` +
      `GROUP BY lhrt.lab_head_reject_type_name ` +
      `ORDER BY rejected_count DESC ` +
      `LIMIT 10`
  ]

  for (const sql of sqlCandidates) {
    try {
      const response = await executeSqlViaApi(sql, config)
      const rows = parseQueryResponse(response, (row) => ({
        reason: String(row['reason'] ?? 'ไม่ระบุเหตุผล'),
        rejectedCount: Number(row['rejected_count'] ?? 0),
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
