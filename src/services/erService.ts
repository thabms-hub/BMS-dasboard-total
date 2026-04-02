import type {
  ConnectionConfig,
  DatabaseType,
  ErDashboardKpis,
  ErDispositionItem,
  ErLeaveStatusItem,
  ErLevel1SurvivalStats,
  ErMonthlyTrendItem,
  ErProcedureVsVnStats,
  ErTopCauseItem,
  ErTopProcedureItem,
  ErTriageDistributionItem,
  ErTriagePeriodRow,
  ErAccidentTypeItem,
  ErWaitTimeStats,
  ErOutlierCase,
  ErCaseWithWaitTime,
  ErDoctorPatientLoadItem,
  SqlApiResponse,
} from '@/types'
import { executeSqlViaApi } from '@/services/bmsSession'
import { queryBuilder } from '@/services/queryBuilder'

function parseQueryResponse<T>(
  response: SqlApiResponse,
  mapper: (row: Record<string, unknown>) => T,
): T[] {
  if (!response.data || !Array.isArray(response.data)) {
    return []
  }
  return response.data.map((row) => mapper(row as Record<string, unknown>))
}

async function safeCount(sql: string, config: ConnectionConfig): Promise<number> {
  try {
    const response = await executeSqlViaApi(sql, config)
    const rows = parseQueryResponse(response, (row) => Number(row['total'] ?? 0))
    return rows[0] ?? 0
  } catch {
    return 0
  }
}

function monthStartExpr(dbType: DatabaseType): string {
  return queryBuilder.firstDayOfMonth(dbType)
}

export async function getErDashboardKpis(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<ErDashboardKpis> {
  const todayExpr = queryBuilder.currentDate(dbType)
  const monthStart = monthStartExpr(dbType)
  const leaveStatusExpr = `COALESCE(${queryBuilder.castToText(dbType, 'er.er_leave_status_id')}, '')`

  const totalTodaySql = `SELECT COUNT(*) as total FROM er_regist WHERE vstdate = ${todayExpr}`
  const totalMonthSql = `SELECT COUNT(*) as total FROM er_regist WHERE vstdate >= ${monthStart} AND vstdate <= ${todayExpr}`

  const yesterdayExpr = queryBuilder.dateSubtract(dbType, 1)
  const totalYesterdaySql = `SELECT COUNT(*) as total FROM er_regist WHERE vstdate = ${yesterdayExpr}`

  const activeTreatmentSql =
    `SELECT COUNT(DISTINCT er.vn) as total ` +
    `FROM er_regist er ` +
    `WHERE er.vstdate = ${todayExpr} ` +
    `AND (${leaveStatusExpr} = '' OR ${leaveStatusExpr} = '0')`

  const [todayCount, yesterdayCount, monthCount, activeTreatmentCount] = await Promise.all([
    safeCount(totalTodaySql, config),
    safeCount(totalYesterdaySql, config),
    safeCount(totalMonthSql, config),
    safeCount(activeTreatmentSql, config),
  ])

  return {
    todayCount,
    yesterdayCount,
    monthCount,
    activeTreatmentCount,
  }
}

export async function getErTriageDistribution(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<ErTriageDistributionItem[]> {
  const sql =
    `SELECT ` +
    `COALESCE(et.name, 'ไม่ระบุ') as triage_level, ` +
    `COUNT(*) as patient_count ` +
    `FROM er_regist er ` +
    `LEFT JOIN er_emergency_type et ON et.er_emergency_type = er.er_emergency_type ` +
    `WHERE er.vstdate >= '${startDate}' AND er.vstdate <= '${endDate}' ` +
    `GROUP BY COALESCE(et.name, 'ไม่ระบุ') ` +
    `ORDER BY patient_count DESC`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => ({
    triageLevel: String(row['triage_level'] ?? 'ไม่ระบุ'),
    patientCount: Number(row['patient_count'] ?? 0),
  }))
}

export async function getErTriageByPeriod(
  config: ConnectionConfig,
  dbType: DatabaseType,
  startDate: string,
  endDate: string,
): Promise<ErTriagePeriodRow[]> {
  const exportCodeExpr = `COALESCE(${queryBuilder.castToText(dbType, 'et.export_code')}, '')`
  const emergencyNameExpr = queryBuilder.castToText(dbType, 'et.name')
  const level1MasterNameExpr =
    `(SELECT MIN(${queryBuilder.castToText(dbType, 'et2.name')}) ` +
    `FROM er_emergency_type et2 ` +
    `WHERE COALESCE(${queryBuilder.castToText(dbType, 'et2.export_code')}, '') = '1')`
  const level2MasterNameExpr =
    `(SELECT MIN(${queryBuilder.castToText(dbType, 'et2.name')}) ` +
    `FROM er_emergency_type et2 ` +
    `WHERE COALESCE(${queryBuilder.castToText(dbType, 'et2.export_code')}, '') = '2')`
  const level3MasterNameExpr =
    `(SELECT MIN(${queryBuilder.castToText(dbType, 'et2.name')}) ` +
    `FROM er_emergency_type et2 ` +
    `WHERE COALESCE(${queryBuilder.castToText(dbType, 'et2.export_code')}, '') = '3')`
  const level4MasterNameExpr =
    `(SELECT MIN(${queryBuilder.castToText(dbType, 'et2.name')}) ` +
    `FROM er_emergency_type et2 ` +
    `WHERE COALESCE(${queryBuilder.castToText(dbType, 'et2.export_code')}, '') = '4')`
  const level5MasterNameExpr =
    `(SELECT MIN(${queryBuilder.castToText(dbType, 'et2.name')}) ` +
    `FROM er_emergency_type et2 ` +
    `WHERE COALESCE(${queryBuilder.castToText(dbType, 'et2.export_code')}, '') = '5')`
  const periodExpr = `COALESCE(${queryBuilder.castToText(dbType, 'er.er_period')}, '')`
  const periodNameExpr =
    `CASE ` +
    `WHEN ${periodExpr} IN ('1', 'M', 'เช้า') THEN 'เวรเช้า' ` +
    `WHEN ${periodExpr} IN ('2', 'A', 'บ่าย') THEN 'เวรบ่าย' ` +
    `WHEN ${periodExpr} IN ('3', 'N', 'ดึก') THEN 'เวรดึก' ` +
    `WHEN ${periodExpr} = '' THEN 'ไม่ระบุเวร' ` +
    `ELSE ${periodExpr} END`

  const sql =
    `SELECT ` +
    `${periodNameExpr} as er_period, ` +
    `COALESCE(${level1MasterNameExpr}, MAX(CASE WHEN ${exportCodeExpr} = '1' THEN ${emergencyNameExpr} END), '') as level1_label, ` +
    `COALESCE(${level2MasterNameExpr}, MAX(CASE WHEN ${exportCodeExpr} = '2' THEN ${emergencyNameExpr} END), '') as level2_label, ` +
    `COALESCE(${level3MasterNameExpr}, MAX(CASE WHEN ${exportCodeExpr} = '3' THEN ${emergencyNameExpr} END), '') as level3_label, ` +
    `COALESCE(${level4MasterNameExpr}, MAX(CASE WHEN ${exportCodeExpr} = '4' THEN ${emergencyNameExpr} END), '') as level4_label, ` +
    `COALESCE(${level5MasterNameExpr}, MAX(CASE WHEN ${exportCodeExpr} = '5' THEN ${emergencyNameExpr} END), '') as level5_label, ` +
    `SUM(CASE WHEN ${exportCodeExpr} = '1' THEN 1 ELSE 0 END) as level1, ` +
    `SUM(CASE WHEN ${exportCodeExpr} = '2' THEN 1 ELSE 0 END) as level2, ` +
    `SUM(CASE WHEN ${exportCodeExpr} = '3' THEN 1 ELSE 0 END) as level3, ` +
    `SUM(CASE WHEN ${exportCodeExpr} = '4' THEN 1 ELSE 0 END) as level4, ` +
    `SUM(CASE WHEN ${exportCodeExpr} = '5' THEN 1 ELSE 0 END) as level5 ` +
    `FROM er_regist er ` +
    `LEFT JOIN er_emergency_type et ON et.er_emergency_type = er.er_emergency_type ` +
    `WHERE er.vstdate >= '${startDate}' AND er.vstdate <= '${endDate}' ` +
    `GROUP BY ${periodNameExpr} ` +
    `ORDER BY CASE ` +
    `WHEN ${periodNameExpr} = 'เวรเช้า' THEN 1 ` +
    `WHEN ${periodNameExpr} = 'เวรบ่าย' THEN 2 ` +
    `WHEN ${periodNameExpr} = 'เวรดึก' THEN 3 ` +
    `ELSE 99 END, er_period`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => ({
    erPeriod: String(row['er_period'] ?? 'ไม่ระบุเวร'),
    level1Label: row['level1_label'] ? String(row['level1_label']) : undefined,
    level2Label: row['level2_label'] ? String(row['level2_label']) : undefined,
    level3Label: row['level3_label'] ? String(row['level3_label']) : undefined,
    level4Label: row['level4_label'] ? String(row['level4_label']) : undefined,
    level5Label: row['level5_label'] ? String(row['level5_label']) : undefined,
    level1: Number(row['level1'] ?? 0),
    level2: Number(row['level2'] ?? 0),
    level3: Number(row['level3'] ?? 0),
    level4: Number(row['level4'] ?? 0),
    level5: Number(row['level5'] ?? 0),
  }))
}

export async function getErLeaveStatusDistribution(
  config: ConnectionConfig,
  dbType: DatabaseType,
  startDate: string,
  endDate: string,
): Promise<ErLeaveStatusItem[]> {
  const sql =
    `SELECT ` +
    `COALESCE(${queryBuilder.castToText(dbType, 'el.er_leave_status_name')}, 'ไม่ระบุสถานะ') as leave_status, ` +
    `COUNT(*) as patient_count ` +
    `FROM er_regist er ` +
    `LEFT JOIN er_leave_status el ON el.er_leave_status_id = er.er_leave_status_id ` +
    `WHERE er.vstdate >= '${startDate}' AND er.vstdate <= '${endDate}' ` +
    `GROUP BY COALESCE(${queryBuilder.castToText(dbType, 'el.er_leave_status_name')}, 'ไม่ระบุสถานะ') ` +
    `ORDER BY patient_count DESC`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => ({
    leaveStatus: String(row['leave_status'] ?? 'ไม่ระบุสถานะ'),
    patientCount: Number(row['patient_count'] ?? 0),
  }))
}

export async function getErLevel1SurvivalStats(
  config: ConnectionConfig,
  dbType: DatabaseType,
  startDate: string,
  endDate: string,
): Promise<ErLevel1SurvivalStats> {
  const exportCodeExpr = `COALESCE(${queryBuilder.castToText(dbType, 'et.export_code')}, '')`

  const level1TotalSql =
    `SELECT COUNT(DISTINCT er.vn) as total ` +
    `FROM er_regist er ` +
    `LEFT JOIN er_emergency_type et ON et.er_emergency_type = er.er_emergency_type ` +
    `WHERE er.vstdate >= '${startDate}' AND er.vstdate <= '${endDate}' ` +
    `AND ${exportCodeExpr} = '1'`

  const level1DeathSql =
    `SELECT COUNT(DISTINCT er.vn) as total ` +
    `FROM er_regist er ` +
    `LEFT JOIN er_emergency_type et ON et.er_emergency_type = er.er_emergency_type ` +
    `INNER JOIN death d ON d.hn = er.hn AND d.death_date = er.vstdate ` +
    `WHERE er.vstdate >= '${startDate}' AND er.vstdate <= '${endDate}' ` +
    `AND ${exportCodeExpr} = '1'`

  const [level1Total, deathCount] = await Promise.all([
    safeCount(level1TotalSql, config),
    safeCount(level1DeathSql, config),
  ])

  const survivedCount = Math.max(level1Total - deathCount, 0)
  const survivalRate = level1Total > 0
    ? Number(((survivedCount / level1Total) * 100).toFixed(1))
    : 0

  return {
    level1Total,
    survivedCount,
    deathCount,
    survivalRate,
  }
}

export async function getErTopCauses(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<ErTopCauseItem[]> {
  const sql =
    `SELECT ` +
    `CASE ` +
    `WHEN pt.name IS NOT NULL THEN pt.name ` +
    `ELSE 'ไม่ระบุประเภท' END as cause_name, ` +
    `COUNT(*) as case_count ` +
    `FROM er_regist er ` +
    `LEFT JOIN er_pt_type pt ON pt.er_pt_type = er.er_pt_type ` +
    `WHERE er.vstdate >= '${startDate}' AND er.vstdate <= '${endDate}' ` +
    `GROUP BY CASE ` +
    `WHEN pt.name IS NOT NULL THEN pt.name ` +
    `ELSE 'ไม่ระบุประเภท' END ` +
    `ORDER BY case_count DESC ` +
    `LIMIT 10`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => ({
    causeName: String(row['cause_name'] ?? 'ไม่ระบุประเภท'),
    caseCount: Number(row['case_count'] ?? 0),
  }))
}

export async function getErTopProcedures(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<ErTopProcedureItem[]> {
  const sql =
    `SELECT ` +
    `d.er_oper_code AS oper_code, ` +
    `COALESCE(e.name, 'ไม่ระบุหัตถการ') AS oper_name, ` +
    `COUNT(*) AS case_count ` +
    `FROM er_regist er ` +
    `INNER JOIN doctor_operation d ON d.vn = er.vn ` +
    `LEFT OUTER JOIN er_oper_code e ON e.er_oper_code = d.er_oper_code ` +
    `WHERE er.vstdate >= '${startDate}' AND er.vstdate <= '${endDate}' ` +
    `GROUP BY d.er_oper_code, COALESCE(e.name, 'ไม่ระบุหัตถการ') ` +
    `ORDER BY case_count DESC ` +
    `LIMIT 10`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => ({
    operCode: String(row['oper_code'] ?? '-'),
    operName: String(row['oper_name'] ?? 'ไม่ระบุหัตถการ'),
    caseCount: Number(row['case_count'] ?? 0),
  }))
}

export async function getErDoctorPatientLoad(
  config: ConnectionConfig,
  dbType: DatabaseType,
  startDate: string,
  endDate: string,
): Promise<ErDoctorPatientLoadItem[]> {
  const doctorCodeExpr = `COALESCE(NULLIF(${queryBuilder.castToText(dbType, 'er.er_doctor')}, ''), 'ไม่ระบุรหัสแพทย์')`
  const doctorNameExpr = `COALESCE(${queryBuilder.castToText(dbType, 'd.name')}, 'ไม่ระบุชื่อแพทย์')`

  const sql =
    `SELECT ` +
    `${doctorCodeExpr} as doctor_code, ` +
    `${doctorNameExpr} as doctor_name, ` +
    `COUNT(*) as patient_count ` +
    `FROM er_regist er ` +
    `LEFT JOIN doctor d ON ${queryBuilder.castToText(dbType, 'd.code')} = ${queryBuilder.castToText(dbType, 'er.er_doctor')} ` +
    `WHERE er.vstdate >= '${startDate}' AND er.vstdate <= '${endDate}' ` +
    `GROUP BY ${doctorCodeExpr}, ${doctorNameExpr} ` +
    `ORDER BY patient_count DESC, doctor_code ASC`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => ({
    doctorCode: String(row['doctor_code'] ?? 'ไม่ระบุรหัสแพทย์'),
    doctorName: String(row['doctor_name'] ?? 'ไม่ระบุชื่อแพทย์'),
    patientCount: Number(row['patient_count'] ?? 0),
  }))
}

export async function getErProcedureVsVnStats(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<ErProcedureVsVnStats[]> {
  const dayLabelExpr = dbType === 'mysql'
    ? `DATE_FORMAT(er.vstdate, '%a')`
    : `TO_CHAR(er.vstdate, 'Dy')`
  const sortDayExpr = dbType === 'mysql'
    ? `WEEKDAY(er.vstdate)`
    : `EXTRACT(ISODOW FROM er.vstdate)`
  const weekStartExpr = dbType === 'mysql'
    ? `DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)`
    : `DATE_TRUNC('week', CURRENT_DATE)::date`
  const weekEndExpr = dbType === 'mysql'
    ? `DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 6 DAY)`
    : `(DATE_TRUNC('week', CURRENT_DATE)::date + INTERVAL '6 days')::date`

  const sql =
    `SELECT ` +
    `${dayLabelExpr} AS day_label, ` +
    `COUNT(*) AS procedure_count, ` +
    `COUNT(DISTINCT er.vn) AS vn_count, ` +
    `SUM(COALESCE(d.price, 0)) AS treatment_amount ` +
    `FROM er_regist er ` +
    `INNER JOIN doctor_operation d ON d.vn = er.vn ` +
    `WHERE er.vstdate >= ${weekStartExpr} AND er.vstdate <= ${weekEndExpr} ` +
    `GROUP BY ${dayLabelExpr}, ${sortDayExpr} ` +
    `ORDER BY ${sortDayExpr} ASC`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => ({
    dayLabel: String(row['day_label'] ?? ''),
    procedureCount: Number(row['procedure_count'] ?? 0),
    vnCount: Number(row['vn_count'] ?? 0),
    treatmentAmount: Number(row['treatment_amount'] ?? 0),
  }))
}

export async function getErDispositionDistribution(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<ErDispositionItem[]> {
  const totalSql =
    `SELECT COUNT(*) as total FROM er_regist WHERE vstdate >= '${startDate}' AND vstdate <= '${endDate}'`

  const admittedSql =
    `SELECT COUNT(DISTINCT er.vn) as total ` +
    `FROM er_regist er ` +
    `INNER JOIN ipt i ON i.vn = er.vn ` +
    `WHERE er.vstdate >= '${startDate}' AND er.vstdate <= '${endDate}'`

  const referredSql =
    `SELECT COUNT(DISTINCT er.vn) as total ` +
    `FROM er_regist er ` +
    `INNER JOIN referout r ON r.vn = er.vn ` +
    `WHERE er.vstdate >= '${startDate}' AND er.vstdate <= '${endDate}'`

  const deathSql =
    `SELECT COUNT(DISTINCT er.vn) as total ` +
    `FROM er_regist er ` +
    `INNER JOIN death d ON d.hn = er.hn AND d.death_date = er.vstdate ` +
    `WHERE er.vstdate >= '${startDate}' AND er.vstdate <= '${endDate}'`

  const [total, admitted, referred, death] = await Promise.all([
    safeCount(totalSql, config),
    safeCount(admittedSql, config),
    safeCount(referredSql, config),
    safeCount(deathSql, config),
  ])

  const home = Math.max(total - admitted - referred - death, 0)

  return [
    { disposition: 'กลับบ้าน', caseCount: home },
    { disposition: 'Admit', caseCount: admitted },
    { disposition: 'ส่งต่อ', caseCount: referred },
    { disposition: 'เสียชีวิต', caseCount: death },
  ]
}

export async function getErMonthlyTrend(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<ErMonthlyTrendItem[]> {
  const monthExpr = queryBuilder.dateFormat(dbType, 'vstdate', '%Y-%m')
  const startExpr = queryBuilder.dateSubtract(dbType, 365)
  const todayExpr = queryBuilder.currentDate(dbType)

  const sql =
    `SELECT ${monthExpr} as visit_month, COUNT(*) as patient_count ` +
    `FROM er_regist ` +
    `WHERE vstdate >= ${startExpr} AND vstdate <= ${todayExpr} ` +
    `GROUP BY ${monthExpr} ` +
    `ORDER BY visit_month ASC`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => ({
    month: String(row['visit_month'] ?? ''),
    patientCount: Number(row['patient_count'] ?? 0),
  }))
}

export async function getErAccidentTypeDistribution(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<ErAccidentTypeItem[]> {
  const sql =
    `SELECT ` +
    `COALESCE(et.er_accident_type_name, 'ไม่ระบุประเภทอุบัติเหตุ') as accident_type, ` +
    `COUNT(*) as patient_count ` +
    `FROM er_regist er ` +
    `LEFT JOIN er_nursing_detail en ON en.vn = er.vn ` +
    `LEFT JOIN er_accident_type et ON et.er_accident_type_id = en.er_accident_type_id ` +
    `WHERE er.vstdate >= '${startDate}' AND er.vstdate <= '${endDate}' ` +
    `GROUP BY COALESCE(et.er_accident_type_name, 'ไม่ระบุประเภทอุบัติเหตุ') ` +
    `ORDER BY patient_count DESC`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => ({
    accidentTypeName: String(row['accident_type'] ?? 'ไม่ระบุประเภทอุบัติเหตุ'),
    patientCount: Number(row['patient_count'] ?? 0),
  }))
}

export async function getErWaitTimeStats(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<ErWaitTimeStats> {
  const todayExpr = queryBuilder.currentDate(dbType)
  
  const timeDiffWaitExpr = dbType === 'mysql'
    ? `TIMESTAMPDIFF(MINUTE, enter_er_time, doctor_tx_time)`
    : `EXTRACT(EPOCH FROM (doctor_tx_time - enter_er_time))::int / 60`
  
  const timeDiffExamExpr = dbType === 'mysql'
    ? `TIMESTAMPDIFF(MINUTE, doctor_tx_time, finish_time)`
    : `EXTRACT(EPOCH FROM (finish_time - doctor_tx_time))::int / 60`

  const sql =
    `SELECT ` +
    `ROUND(AVG(CASE WHEN enter_er_time IS NOT NULL AND doctor_tx_time IS NOT NULL THEN ${timeDiffWaitExpr} ELSE NULL END), 1) as avg_wait_before_doctor, ` +
    `ROUND(AVG(CASE WHEN doctor_tx_time IS NOT NULL AND finish_time IS NOT NULL THEN ${timeDiffExamExpr} ELSE NULL END), 1) as avg_doctor_exam, ` +
    `COUNT(*) as total_cases ` +
    `FROM er_regist ` +
    `WHERE vstdate = ${todayExpr}`

  const response = await executeSqlViaApi(sql, config)
  const rows = parseQueryResponse(response, (row) => ({
    avgWaitBeforeDoctorMinutes: Number(row['avg_wait_before_doctor'] ?? 0),
    avgDoctorExamMinutes: Number(row['avg_doctor_exam'] ?? 0),
    caseCount: Number(row['total_cases'] ?? 0),
  }))
  
  return rows[0] ?? {
    avgWaitBeforeDoctorMinutes: 0,
    avgDoctorExamMinutes: 0,
    caseCount: 0,
  }
}

export async function getErOutlierCases(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<ErOutlierCase[]> {
  const todayExpr = queryBuilder.currentDate(dbType)
  
  const timeDiffExpr = dbType === 'mysql'
    ? `TIMESTAMPDIFF(MINUTE, enter_er_time, doctor_tx_time)`
    : `EXTRACT(EPOCH FROM (doctor_tx_time - enter_er_time))::int / 60`

  const sql =
    `SELECT ` +
    `er.hn, ` +
    `er.vn, ` +
    `${timeDiffExpr} as wait_minutes, ` +
    `COALESCE(et.name, 'ไม่ระบุ') as triage_level, ` +
    `COALESCE(d.name, 'ไม่ระบุ') as doctor_name ` +
    `FROM er_regist er ` +
    `LEFT JOIN er_emergency_type et ON et.er_emergency_type = er.er_emergency_type ` +
    `LEFT JOIN doctor d ON d.doctor_id = er.doctor_id ` +
    `WHERE er.vstdate = ${todayExpr} ` +
    `AND er.enter_er_time IS NOT NULL ` +
    `AND er.doctor_tx_time IS NOT NULL ` +
    `ORDER BY wait_minutes DESC ` +
    `LIMIT 10`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => ({
    hn: String(row['hn'] ?? ''),
    vn: String(row['vn'] ?? ''),
    waitMinutes: Number(row['wait_minutes'] ?? 0),
    triageLevel: String(row['triage_level'] ?? 'ไม่ระบุ'),
    doctorName: String(row['doctor_name'] ?? 'ไม่ระบุ'),
  }))
}

export async function getErCasesWithWaitTimes(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<ErCaseWithWaitTime[]> {
  const todayExpr = queryBuilder.currentDate(dbType)
  
  const waitBeforeDoctorExpr = dbType === 'mysql'
    ? `TIMESTAMPDIFF(MINUTE, er.enter_er_time, er.doctor_tx_time)`
    : `EXTRACT(EPOCH FROM (er.doctor_tx_time - er.enter_er_time))::int / 60`

  const doctorExamExpr = dbType === 'mysql'
    ? `TIMESTAMPDIFF(MINUTE, er.doctor_tx_time, er.finish_time)`
    : `EXTRACT(EPOCH FROM (er.finish_time - er.doctor_tx_time))::int / 60`

  const sql =
    `SELECT ` +
    `o.hn, ` +
    `er.vn, ` +
    `COALESCE(${queryBuilder.castToText(dbType, 'o.oqueue')}, '') as oqueue, ` +
    `COALESCE(${queryBuilder.castToText(dbType, 'er.enter_er_time')}, '-') as enter_er_time, ` +
    `COALESCE(${queryBuilder.castToText(dbType, 'er.doctor_tx_time')}, '-') as doctor_tx_time, ` +
    `COALESCE(${queryBuilder.castToText(dbType, 'er.finish_time')}, '-') as finish_time, ` +
    `${waitBeforeDoctorExpr} as wait_before_doctor, ` +
    `${doctorExamExpr} as doctor_exam, ` +
    `COALESCE(et.name, 'ไม่ระบุ') as triage_level ` +
    `FROM er_regist er ` +
    `LEFT JOIN ovst o ON o.vn = er.vn ` +
    `LEFT JOIN er_emergency_type et ON et.er_emergency_type = er.er_emergency_type ` +
    `WHERE er.vstdate = ${todayExpr} ` +
    `AND er.enter_er_time IS NOT NULL ` +
    `AND er.doctor_tx_time IS NOT NULL ` +
    `AND er.finish_time IS NOT NULL ` +
    `ORDER BY er.enter_er_time ASC`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => ({
    hn: String(row['hn'] ?? ''),
    vn: String(row['vn'] ?? ''),
    oqueue: String(row['oqueue'] ?? ''),
    enterErTime: String(row['enter_er_time'] ?? '-'),
    doctorTxTime: String(row['doctor_tx_time'] ?? '-'),
    finishTime: String(row['finish_time'] ?? '-'),
    waitBeforeDoctorMinutes: Number(row['wait_before_doctor'] ?? 0),
    doctorExamMinutes: Number(row['doctor_exam'] ?? 0),
    triageLevel: String(row['triage_level'] ?? 'ไม่ระบุ'),
  }))
}
