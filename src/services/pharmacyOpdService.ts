// =============================================================================
// Pharmacy OPD Dashboard Service - SQL queries and data fetching
// =============================================================================

import type {
  ConnectionConfig,
  PharmacyOpdSummary,
  PharmacyPatientCompare,
  PharmacyPaymentByType,
  PharmacyTopDoctorItem,
  PharmacyTopUsageItem,
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

async function executeFirstSuccess<T>(
  config: ConnectionConfig,
  sqlCandidates: string[],
  mapper: (row: Record<string, unknown>) => T,
): Promise<T[]> {
  for (const sql of sqlCandidates) {
    try {
      const response = await executeSqlViaApi(sql, config)
      if (response.MessageCode !== 200) {
        continue
      }
      return parseQueryResponse(response, mapper)
    } catch {
      continue
    }
  }
  return []
}

function buildOpdRxBaseSql(startDate: string, endDate: string): string {
  return (
    `SELECT ` +
    `op.hos_guid, ` +
    `op.vn, ` +
    `op.hn, ` +
    `op.an, ` +
    `op.icode, ` +
    `Concat(d.name, ' ', d.strength, ' ', d.units) AS drug, ` +
    `Concat_Ws('', opi.usage_line1, ' ', opi.usage_line2, ' ', opi.usage_line3) AS usage_line, ` +
    `COALESCE(op.qty, 0) AS qty, ` +
    `COALESCE(op.sum_price, 0) AS sum_price, ` +
    `op.paidst, ` +
    `i.name AS income, ` +
    `op.rxdate, ` +
    `op.rxtime, ` +
    `op.dep_code, ` +
    `kd.department, ` +
    `dt.name AS doctor, ` +
    `o1.officer_name AS officer_1, ` +
    `r1.rx_dispenser_datetime AS rx_dispenser_datetime_1, ` +
    `o2.officer_name AS officer_2, ` +
    `r2.rx_dispenser_datetime AS rx_dispenser_datetime_2, ` +
    `o3.officer_name AS officer_3, ` +
    `r3.rx_dispenser_datetime AS rx_dispenser_datetime_3, ` +
    `o4.officer_name AS officer_4, ` +
    `r4.rx_dispenser_datetime AS rx_dispenser_datetime_4, ` +
    `dd.drug_control_type_id, ` +
    `dd.drugaccount, ` +
    `Coalesce(op.stock_department_id,0) as stock_department_id, ` +
    `Coalesce(sd.department_name,'ไม่ระบุ') as department_name ` +
    `FROM opitemrece op ` +
    `INNER JOIN s_drugitems d ON d.icode = op.icode ` +
    `INNER JOIN income i ON i.income = op.income ` +
    `LEFT JOIN drugitems dd ON dd.icode = op.icode ` +
    `LEFT JOIN opi_dispense opi ON opi.hos_guid = op.hos_guid ` +
    `LEFT JOIN rx_dispenser_detail r1 ON r1.vn = op.vn AND r1.rx_dispenser_type_id = '1' ` +
    `LEFT JOIN rx_dispenser_detail r2 ON r2.vn = op.vn AND r2.rx_dispenser_type_id = '2' ` +
    `LEFT JOIN rx_dispenser_detail r3 ON r3.vn = op.vn AND r3.rx_dispenser_type_id = '3' ` +
    `LEFT JOIN rx_dispenser_detail r4 ON r4.vn = op.vn AND r4.rx_dispenser_type_id = '4' ` +
    `LEFT JOIN doctor dt ON dt.code = op.doctor ` +
    `LEFT JOIN officer o1 ON o1.officer_login_name = r1.staff ` +
    `LEFT JOIN officer o2 ON o2.officer_login_name = r2.staff ` +
    `LEFT JOIN officer o3 ON o3.officer_login_name = r3.staff ` +
    `LEFT JOIN officer o4 ON o4.officer_login_name = r4.staff ` +
    `LEFT JOIN kskdepartment kd ON kd.depcode = op.dep_code ` +
    `LEFT JOIN stock_department sd ON sd.department_id = op.stock_department_id ` +
    `WHERE i.income_group IN ('12') ` +
    `AND op.rxdate >= '${startDate}' AND op.rxdate <= '${endDate}'`
  )
}

export async function getPharmacyOpdSummary(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<PharmacyOpdSummary> {
  const baseSql = buildOpdRxBaseSql(startDate, endDate)

  const sqlCandidates = [
    `WITH opd_rx AS (${baseSql}) ` +
      `SELECT ` +
      `COUNT(DISTINCT hn) AS total_patients, ` +
      `COALESCE(SUM(sum_price), 0) AS total_amount, ` +
      `COUNT(*) AS total_drug_item_count, ` +
      `COUNT(DISTINCT CASE WHEN rx_dispenser_datetime_1 IS NOT NULL THEN vn END) AS prescription_count, ` +
      `COUNT(DISTINCT CASE WHEN rx_dispenser_datetime_3 IS NOT NULL THEN vn END) AS checked_count, ` +
      `COUNT(DISTINCT CASE WHEN rx_dispenser_datetime_2 IS NOT NULL THEN vn END) AS prepared_count, ` +
      `COUNT(DISTINCT CASE WHEN rx_dispenser_datetime_1 IS NOT NULL AND rx_dispenser_datetime_4 IS NOT NULL THEN vn END) AS dispensed_count ` +
      `FROM opd_rx`,
    `WITH opd_rx AS (${baseSql}) ` +
      `SELECT ` +
      `COUNT(DISTINCT hn) AS total_patients, ` +
      `COALESCE(SUM(sum_price), 0) AS total_amount, ` +
      `COUNT(*) AS total_drug_item_count, ` +
      `COUNT(DISTINCT vn) AS prescription_count, ` +
      `COUNT(DISTINCT vn) AS checked_count, ` +
      `COUNT(DISTINCT vn) AS prepared_count, ` +
      `COUNT(DISTINCT vn) AS dispensed_count ` +
      `FROM opd_rx`,
  ]

  const rows = await executeFirstSuccess(config, sqlCandidates, (row) => ({
    totalPatients: Number(row['total_patients'] ?? 0),
    totalAmount: Number(row['total_amount'] ?? 0),
    totalDrugItemCount: Number(row['total_drug_item_count'] ?? 0),
    prescriptionCount: Number(row['prescription_count'] ?? 0),
    checkedCount: Number(row['checked_count'] ?? 0),
    preparedCount: Number(row['prepared_count'] ?? 0),
    dispensedCount: Number(row['dispensed_count'] ?? 0),
  }))

  return rows[0] ?? {
    totalPatients: 0,
    totalAmount: 0,
    totalDrugItemCount: 0,
    prescriptionCount: 0,
    checkedCount: 0,
    preparedCount: 0,
    dispensedCount: 0,
  }
}

export async function getPharmacyOpdTopDrugs(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<PharmacyTopUsageItem[]> {
  // ยา: income_group IN ('12') และรหัสค่าใช้จ่าย (icode) ขึ้นต้นด้วย '1'
  const sqlCandidates = [
    `SELECT ` +
      `op.icode AS item_code, ` +
      `COALESCE(NULLIF(d.item_name, ''), 'ไม่ระบุรายการ') AS item_name, ` +
      `COUNT(*) AS item_count, ` +
      `COALESCE(SUM(op.qty), 0) AS total_qty, ` +
      `COALESCE(SUM(op.sum_price), 0) AS total_amount ` +
      `FROM opitemrece op ` +
      `INNER JOIN (` +
      `  SELECT icode, MAX(TRIM(CONCAT_WS(' ', name, strength, units))) AS item_name ` +
      `  FROM s_drugitems ` +
      `  GROUP BY icode` +
      `) d ON d.icode = op.icode ` +
      `INNER JOIN income i ON i.income = op.income ` +
      `WHERE i.income_group IN ('12') ` +
      `AND op.icode LIKE '1%' ` +
      `AND op.rxdate >= '${startDate}' AND op.rxdate <= '${endDate}' ` +
        `GROUP BY op.icode, d.item_name ` +
      `ORDER BY item_count DESC, total_qty DESC ` +
      `LIMIT 10`,
  ]

  return executeFirstSuccess(config, sqlCandidates, (row) => ({
    itemCode: String(row['item_code'] ?? ''),
    itemName: String(row['item_name'] ?? 'ไม่ระบุรายการ'),
    itemCount: Number(row['item_count'] ?? 0),
    totalQty: Number(row['total_qty'] ?? 0),
    totalAmount: Number(row['total_amount'] ?? 0),
  }))
}

export async function getPharmacyOpdTopSupplies(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<PharmacyTopUsageItem[]> {
  // เวชภัณฑ์: income_group IN ('12') และรหัสค่าใช้จ่าย (icode) ขึ้นต้นด้วย '3'
  const sqlCandidates = [
    `SELECT ` +
      `op.icode AS item_code, ` +
      `COALESCE(NULLIF(d.item_name, ''), 'ไม่ระบุรายการ') AS item_name, ` +
      `COUNT(*) AS item_count, ` +
      `COALESCE(SUM(op.qty), 0) AS total_qty, ` +
      `COALESCE(SUM(op.sum_price), 0) AS total_amount ` +
      `FROM opitemrece op ` +
      `INNER JOIN (` +
      `  SELECT icode, MAX(TRIM(CONCAT_WS(' ', name, strength, units))) AS item_name ` +
      `  FROM s_drugitems ` +
      `  GROUP BY icode` +
      `) d ON d.icode = op.icode ` +
      `INNER JOIN income i ON i.income = op.income ` +
      `WHERE i.income_group IN ('12') ` +
      `AND op.icode LIKE '3%' ` +
      `AND op.rxdate >= '${startDate}' AND op.rxdate <= '${endDate}' ` +
        `GROUP BY op.icode, d.item_name ` +
      `ORDER BY item_count DESC, total_qty DESC ` +
      `LIMIT 10`,
  ]

  return executeFirstSuccess(config, sqlCandidates, (row) => ({
    itemCode: String(row['item_code'] ?? ''),
    itemName: String(row['item_name'] ?? 'ไม่ระบุรายการ'),
    itemCount: Number(row['item_count'] ?? 0),
    totalQty: Number(row['total_qty'] ?? 0),
    totalAmount: Number(row['total_amount'] ?? 0),
  }))
}

export async function getPharmacyOpdNonEssentialCompare(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<PharmacyPatientCompare> {
  const baseSql = buildOpdRxBaseSql(startDate, endDate)
  const sqlCandidates = [
    `WITH opd_rx AS (${baseSql}) ` +
      `SELECT ` +
      `COUNT(DISTINCT hn) AS hn_count, ` +
      `COUNT(DISTINCT vn) AS vn_count, ` +
      `COUNT(*) AS drug_count ` +
      `FROM opd_rx ` +
      `WHERE TRIM(COALESCE(drugaccount, '')) = '-'`,
    `WITH opd_rx AS (${baseSql}) ` +
      `SELECT ` +
      `COUNT(DISTINCT hn) AS hn_count, ` +
      `COUNT(DISTINCT vn) AS vn_count, ` +
      `COUNT(*) AS drug_count ` +
      `FROM opd_rx ` +
      `WHERE COALESCE(drugaccount, '') = '-'`,
  ]

  const rows = await executeFirstSuccess(config, sqlCandidates, (row) => ({
    hnCount: Number(row['hn_count'] ?? 0),
    vnCount: Number(row['vn_count'] ?? 0),
    drugCount: Number(row['drug_count'] ?? 0),
  }))

  return rows[0] ?? { hnCount: 0, vnCount: 0, drugCount: 0 }
}

export async function getPharmacyOpdTopNonEssential(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<PharmacyTopUsageItem[]> {
  const baseSql = buildOpdRxBaseSql(startDate, endDate)
  const sqlCandidates = [
    `WITH opd_rx AS (${baseSql}) ` +
      `SELECT ` +
      `icode AS item_code, ` +
      `COALESCE(drug, 'ไม่ระบุรายการ') AS item_name, ` +
      `COUNT(*) AS item_count, ` +
      `COALESCE(SUM(qty), 0) AS total_qty, ` +
      `COALESCE(SUM(sum_price), 0) AS total_amount ` +
      `FROM opd_rx ` +
      `WHERE TRIM(COALESCE(drugaccount, '')) = '-' ` +
      `GROUP BY icode, drug ` +
      `ORDER BY item_count DESC, total_qty DESC ` +
      `LIMIT 10`,
    `WITH opd_rx AS (${baseSql}) ` +
      `SELECT ` +
      `icode AS item_code, ` +
      `COALESCE(drug, 'ไม่ระบุรายการ') AS item_name, ` +
      `COUNT(*) AS item_count, ` +
      `COALESCE(SUM(qty), 0) AS total_qty, ` +
      `COALESCE(SUM(sum_price), 0) AS total_amount ` +
      `FROM opd_rx ` +
      `WHERE COALESCE(drugaccount, '') = '-' ` +
      `GROUP BY icode, drug ` +
      `ORDER BY item_count DESC, total_qty DESC ` +
      `LIMIT 10`,
  ]

  return executeFirstSuccess(config, sqlCandidates, (row) => ({
    itemCode: String(row['item_code'] ?? ''),
    itemName: String(row['item_name'] ?? 'ไม่ระบุรายการ'),
    itemCount: Number(row['item_count'] ?? 0),
    totalQty: Number(row['total_qty'] ?? 0),
    totalAmount: Number(row['total_amount'] ?? 0),
  }))
}

export async function getPharmacyOpdNarcoticCompare(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<PharmacyPatientCompare> {
  const baseSql = buildOpdRxBaseSql(startDate, endDate)
  const sqlCandidates = [
    `WITH opd_rx AS (${baseSql}) ` +
      `SELECT ` +
      `COUNT(DISTINCT hn) AS hn_count, ` +
      `COUNT(DISTINCT vn) AS vn_count, ` +
      `COUNT(*) AS drug_count ` +
      `FROM opd_rx ` +
      `WHERE COALESCE(drug_control_type_id, 0) IN (1, 2, 11, 12, 13, 14, 15)`,
    `WITH opd_rx AS (${baseSql}) ` +
      `SELECT ` +
      `COUNT(DISTINCT hn) AS hn_count, ` +
      `COUNT(DISTINCT vn) AS vn_count, ` +
      `COUNT(*) AS drug_count ` +
      `FROM opd_rx ` +
      `WHERE COALESCE(drug_control_type_id, 0) IN ('1', '2', '11', '12', '13', '14', '15')`,
  ]

  const rows = await executeFirstSuccess(config, sqlCandidates, (row) => ({
    hnCount: Number(row['hn_count'] ?? 0),
    vnCount: Number(row['vn_count'] ?? 0),
    drugCount: Number(row['drug_count'] ?? 0),
  }))

  return rows[0] ?? { hnCount: 0, vnCount: 0, drugCount: 0 }
}

export async function getPharmacyOpdTopNarcotic(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<PharmacyTopUsageItem[]> {
  const baseSql = buildOpdRxBaseSql(startDate, endDate)
  const sqlCandidates = [
    `WITH opd_rx AS (${baseSql}) ` +
      `SELECT ` +
      `icode AS item_code, ` +
      `COALESCE(drug, 'ไม่ระบุรายการ') AS item_name, ` +
      `COUNT(*) AS item_count, ` +
      `COALESCE(SUM(qty), 0) AS total_qty, ` +
      `COALESCE(SUM(sum_price), 0) AS total_amount ` +
      `FROM opd_rx ` +
      `WHERE COALESCE(drug_control_type_id, 0) IN (1, 2, 11, 12, 13, 14, 15) ` +
      `GROUP BY icode, drug ` +
      `ORDER BY item_count DESC, total_qty DESC ` +
      `LIMIT 10`,
    `WITH opd_rx AS (${baseSql}) ` +
      `SELECT ` +
      `icode AS item_code, ` +
      `COALESCE(drug, 'ไม่ระบุรายการ') AS item_name, ` +
      `COUNT(*) AS item_count, ` +
      `COALESCE(SUM(qty), 0) AS total_qty, ` +
      `COALESCE(SUM(sum_price), 0) AS total_amount ` +
      `FROM opd_rx ` +
        `WHERE COALESCE(drug_control_type_id, 0) IN ('1', '2', '11', '12', '13', '14', '15') ` +
      `GROUP BY icode, drug ` +
      `ORDER BY item_count DESC, total_qty DESC ` +
      `LIMIT 10`,
  ]

  return executeFirstSuccess(config, sqlCandidates, (row) => ({
    itemCode: String(row['item_code'] ?? ''),
    itemName: String(row['item_name'] ?? 'ไม่ระบุรายการ'),
    itemCount: Number(row['item_count'] ?? 0),
    totalQty: Number(row['total_qty'] ?? 0),
    totalAmount: Number(row['total_amount'] ?? 0),
  }))
}

export async function getPharmacyOpdNonEssentialPaymentByType(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<PharmacyPaymentByType[]> {
  const baseSql = buildOpdRxBaseSql(startDate, endDate)
  const sqlCandidates = [
    `WITH opd_rx AS (${baseSql}) ` +
      `SELECT ` +
      `COALESCE(pa.name, 'ไม่ระบุ') AS payment_type, ` +
      `COALESCE(SUM(opd_rx.sum_price), 0) AS total_amount ` +
      `FROM opd_rx ` +
      `LEFT JOIN paidst pa ON pa.paidst = opd_rx.paidst ` +
      `WHERE TRIM(COALESCE(opd_rx.drugaccount, '')) = '-' ` +
      `GROUP BY payment_type ` +
      `HAVING COALESCE(SUM(opd_rx.sum_price), 0) > 0 ` +
      `ORDER BY total_amount DESC`,
    `WITH opd_rx AS (${baseSql}) ` +
      `SELECT ` +
      `COALESCE(pa.name, 'ไม่ระบุ') AS payment_type, ` +
      `COALESCE(SUM(opd_rx.sum_price), 0) AS total_amount ` +
      `FROM opd_rx ` +
      `LEFT JOIN paidst pa ON pa.paidst = opd_rx.paidst ` +
      `WHERE COALESCE(opd_rx.drugaccount, '') = '-' ` +
      `GROUP BY payment_type ` +
      `HAVING COALESCE(SUM(opd_rx.sum_price), 0) > 0 ` +
      `ORDER BY total_amount DESC`,
  ]

  return executeFirstSuccess(config, sqlCandidates, (row) => ({
    paymentType: String(row['payment_type'] ?? 'ไม่ระบุ'),
    totalAmount: Number(row['total_amount'] ?? 0),
  }))
}

export async function getPharmacyOpdNarcoticPaymentByType(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<PharmacyPaymentByType[]> {
  const baseSql = buildOpdRxBaseSql(startDate, endDate)
  const sqlCandidates = [
    `WITH opd_rx AS (${baseSql}) ` +
      `SELECT ` +
      `COALESCE(pa.name, 'ไม่ระบุ') AS payment_type, ` +
      `COALESCE(SUM(opd_rx.sum_price), 0) AS total_amount ` +
      `FROM opd_rx ` +
      `LEFT JOIN paidst pa ON pa.paidst = opd_rx.paidst ` +
      `WHERE COALESCE(opd_rx.drug_control_type_id, 0) IN (1, 2, 11, 12, 13, 14, 15) ` +
      `GROUP BY payment_type ` +
      `HAVING COALESCE(SUM(opd_rx.sum_price), 0) > 0 ` +
      `ORDER BY total_amount DESC`,
    `WITH opd_rx AS (${baseSql}) ` +
      `SELECT ` +
      `COALESCE(pa.name, 'ไม่ระบุ') AS payment_type, ` +
      `COALESCE(SUM(opd_rx.sum_price), 0) AS total_amount ` +
      `FROM opd_rx ` +
      `LEFT JOIN paidst pa ON pa.paidst = opd_rx.paidst ` +
      `WHERE COALESCE(opd_rx.drug_control_type_id, 0) IN ('1', '2', '11', '12', '13', '14', '15') ` +
      `GROUP BY payment_type ` +
      `HAVING COALESCE(SUM(opd_rx.sum_price), 0) > 0 ` +
      `ORDER BY total_amount DESC`,
  ]

  return executeFirstSuccess(config, sqlCandidates, (row) => ({
    paymentType: String(row['payment_type'] ?? 'ไม่ระบุ'),
    totalAmount: Number(row['total_amount'] ?? 0),
  }))
}

export async function getPharmacyOpdTopDoctorsNonEssential(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<PharmacyTopDoctorItem[]> {
  const baseSql = buildOpdRxBaseSql(startDate, endDate)
  const sqlCandidates = [
    `WITH opd_rx AS (${baseSql}) ` +
      `SELECT ` +
      `COALESCE(NULLIF(TRIM(doctor), ''), 'ไม่ระบุแพทย์') AS doctor_name, ` +
      `COUNT(DISTINCT vn) AS visit_count, ` +
      `COUNT(*) AS item_count, ` +
      `COALESCE(SUM(sum_price), 0) AS total_amount ` +
      `FROM opd_rx ` +
      `WHERE TRIM(COALESCE(drugaccount, '')) = '-' ` +
      `GROUP BY doctor_name ` +
      `ORDER BY item_count DESC, total_amount DESC ` +
      `LIMIT 10`,
    `WITH opd_rx AS (${baseSql}) ` +
      `SELECT ` +
      `COALESCE(NULLIF(TRIM(doctor), ''), 'ไม่ระบุแพทย์') AS doctor_name, ` +
      `COUNT(DISTINCT vn) AS visit_count, ` +
      `COUNT(*) AS item_count, ` +
      `COALESCE(SUM(sum_price), 0) AS total_amount ` +
      `FROM opd_rx ` +
      `WHERE COALESCE(drugaccount, '') = '-' ` +
      `GROUP BY doctor_name ` +
      `ORDER BY item_count DESC, total_amount DESC ` +
      `LIMIT 10`,
  ]

  return executeFirstSuccess(config, sqlCandidates, (row) => ({
    doctorName: String(row['doctor_name'] ?? 'ไม่ระบุแพทย์'),
    visitCount: Number(row['visit_count'] ?? 0),
    itemCount: Number(row['item_count'] ?? 0),
    totalAmount: Number(row['total_amount'] ?? 0),
  }))
}

export async function getPharmacyOpdTopDoctorsNarcotic(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<PharmacyTopDoctorItem[]> {
  const baseSql = buildOpdRxBaseSql(startDate, endDate)
  const sqlCandidates = [
    `WITH opd_rx AS (${baseSql}) ` +
      `SELECT ` +
      `COALESCE(NULLIF(TRIM(doctor), ''), 'ไม่ระบุแพทย์') AS doctor_name, ` +
      `COUNT(DISTINCT vn) AS visit_count, ` +
      `COUNT(*) AS item_count, ` +
      `COALESCE(SUM(sum_price), 0) AS total_amount ` +
      `FROM opd_rx ` +
      `WHERE COALESCE(drug_control_type_id, 0) IN (1, 2, 11, 12, 13, 14, 15) ` +
      `GROUP BY doctor_name ` +
      `ORDER BY item_count DESC, total_amount DESC ` +
      `LIMIT 10`,
    `WITH opd_rx AS (${baseSql}) ` +
      `SELECT ` +
      `COALESCE(NULLIF(TRIM(doctor), ''), 'ไม่ระบุแพทย์') AS doctor_name, ` +
      `COUNT(DISTINCT vn) AS visit_count, ` +
      `COUNT(*) AS item_count, ` +
      `COALESCE(SUM(sum_price), 0) AS total_amount ` +
      `FROM opd_rx ` +
      `WHERE COALESCE(drug_control_type_id, 0) IN ('1', '2', '11', '12', '13', '14', '15') ` +
      `GROUP BY doctor_name ` +
      `ORDER BY item_count DESC, total_amount DESC ` +
      `LIMIT 10`,
  ]

  return executeFirstSuccess(config, sqlCandidates, (row) => ({
    doctorName: String(row['doctor_name'] ?? 'ไม่ระบุแพทย์'),
    visitCount: Number(row['visit_count'] ?? 0),
    itemCount: Number(row['item_count'] ?? 0),
    totalAmount: Number(row['total_amount'] ?? 0),
  }))
}
