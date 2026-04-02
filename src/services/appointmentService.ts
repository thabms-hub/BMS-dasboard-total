import type {
  AppointmentCancelReasonItem,
  AppointmentClinicRateItem,
  AppointmentKpis,
  AppointmentMonthlyTrendItem,
  AppointmentTopDoctorItem,
  ConnectionConfig,
  DatabaseType,
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

export async function getAppointmentKpis(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<AppointmentKpis> {
  const todayExpr = queryBuilder.currentDate(dbType)
  const visitVnExpr = queryBuilder.castToText(dbType, 'o.visit_vn')

  const sql =
    `SELECT ` +
    `COUNT(DISTINCT CASE WHEN (o.oapp_status_id IS NULL OR o.oapp_status_id < 4) THEN o.hn END) as total_today, ` +
    `COUNT(DISTINCT CASE WHEN (o.oapp_status_id IS NULL OR o.oapp_status_id < 4) AND ${visitVnExpr} IS NOT NULL AND ${visitVnExpr} <> '' THEN o.hn END) as attended_today, ` +
    `COUNT(DISTINCT CASE WHEN (o.oapp_status_id IS NULL OR o.oapp_status_id < 4) AND (${visitVnExpr} IS NULL OR ${visitVnExpr} = '') THEN o.hn END) as no_show_today, ` +
    `COUNT(DISTINCT CASE WHEN COALESCE(o.oapp_status_id, 0) = 4 THEN o.hn END) as cancelled_today ` +
    `FROM oapp o ` +
    `LEFT JOIN oapp_status os ON os.oapp_status_id = o.oapp_status_id ` +
    `WHERE o.nextdate = ${todayExpr}`

  const response = await executeSqlViaApi(sql, config)
  const rows = parseQueryResponse(response, (row) => ({
    totalToday: Number(row['total_today'] ?? 0),
    attendedToday: Number(row['attended_today'] ?? 0),
    noShowToday: Number(row['no_show_today'] ?? 0),
    cancelledToday: Number(row['cancelled_today'] ?? 0),
  }))

  return rows[0] ?? {
    totalToday: 0,
    attendedToday: 0,
    noShowToday: 0,
    cancelledToday: 0,
  }
}

export async function getAppointmentAttendanceByClinic(
  config: ConnectionConfig,
  dbType: DatabaseType,
  startDate: string,
  endDate: string,
): Promise<AppointmentClinicRateItem[]> {
  const depNameExpr = `COALESCE(${queryBuilder.castToText(dbType, 'k.department')}, 'ไม่ระบุคลินิก')`
  const depCodeExpr = `COALESCE(${queryBuilder.castToText(dbType, 'o.depcode')}, '')`

  const sql =
    `SELECT ` +
    `${depCodeExpr} as clinic_code, ` +
    `${depNameExpr} as clinic_name, ` +
    `COUNT(*) as total_appointments, ` +
    `SUM(CASE WHEN COALESCE(o.oapp_status_id, 0) = 2 THEN 1 ELSE 0 END) as attended_appointments ` +
    `FROM oapp o ` +
    `LEFT JOIN oapp_status os ON os.oapp_status_id = o.oapp_status_id ` +
    `LEFT JOIN kskdepartment k ON k.depcode = o.depcode ` +
    `WHERE o.nextdate >= '${startDate}' AND o.nextdate <= '${endDate}' ` +
    `GROUP BY ${depCodeExpr}, ${depNameExpr} ` +
    `ORDER BY total_appointments DESC ` +
    `LIMIT 12`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => {
    const totalAppointments = Number(row['total_appointments'] ?? 0)
    const attendedAppointments = Number(row['attended_appointments'] ?? 0)
    return {
      clinicCode: String(row['clinic_code'] ?? ''),
      clinicName: String(row['clinic_name'] ?? 'ไม่ระบุคลินิก'),
      totalAppointments,
      attendedAppointments,
      attendanceRate: totalAppointments > 0
        ? Number(((attendedAppointments / totalAppointments) * 100).toFixed(1))
        : 0,
    }
  })
}

export async function getAppointmentMonthlyTrend(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<AppointmentMonthlyTrendItem[]> {
  const monthExpr = queryBuilder.dateFormat(dbType, 'nextdate', '%Y-%m')
  const startExpr = queryBuilder.dateSubtract(dbType, 365)
  const todayExpr = queryBuilder.currentDate(dbType)

  const sql =
    `SELECT ` +
    `${monthExpr} as month_label, ` +
    `COUNT(*) as total_appointments, ` +
    `SUM(CASE WHEN COALESCE(o.oapp_status_id, 0) = 4 THEN 1 ELSE 0 END) as cancelled_appointments, ` +
    `SUM(CASE WHEN COALESCE(o.oapp_status_id, 0) = 3 THEN 1 ELSE 0 END) as no_show_appointments ` +
    `FROM oapp o ` +
    `WHERE o.nextdate >= ${startExpr} AND o.nextdate <= ${todayExpr} ` +
    `GROUP BY ${monthExpr} ` +
    `ORDER BY month_label ASC`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => ({
    month: String(row['month_label'] ?? ''),
    totalAppointments: Number(row['total_appointments'] ?? 0),
    cancelledAppointments: Number(row['cancelled_appointments'] ?? 0),
    noShowAppointments: Number(row['no_show_appointments'] ?? 0),
  }))
}

export async function getAppointmentCancelReasons(
  config: ConnectionConfig,
  dbType: DatabaseType,
  startDate: string,
  endDate: string,
): Promise<AppointmentCancelReasonItem[]> {
  const joinCandidates = [
    `LEFT JOIN oapp_cancel_type oct ON oct.oapp_cancel_type_id = o.oapp_cancel_type_id`,
    `LEFT JOIN oapp_cancel_type oct ON oct.oapp_cancel_type = o.oapp_cancel_type`,
  ]

  for (const joinExpr of joinCandidates) {
    const sql =
      `SELECT COALESCE(${queryBuilder.castToText(dbType, 'oct.oapp_cancel_type_name')}, 'ไม่ระบุเหตุผล') as cancel_reason, COUNT(*) as cancelled_count ` +
      `FROM oapp o ` +
      `${joinExpr} ` +
      `WHERE COALESCE(o.oapp_status_id, 0) = 4 ` +
      `AND o.nextdate >= '${startDate}' AND o.nextdate <= '${endDate}' ` +
      `GROUP BY COALESCE(${queryBuilder.castToText(dbType, 'oct.oapp_cancel_type_name')}, 'ไม่ระบุเหตุผล') ` +
      `ORDER BY cancelled_count DESC ` +
      `LIMIT 8`

    try {
      const response = await executeSqlViaApi(sql, config)
      return parseQueryResponse(response, (row) => ({
        reason: String(row['cancel_reason'] ?? 'ไม่ระบุเหตุผล'),
        cancelledCount: Number(row['cancelled_count'] ?? 0),
      }))
    } catch {
      continue
    }
  }

  const fallbackSql =
    `SELECT 'ยกเลิกนัด (ไม่ระบุเหตุผล)' as cancel_reason, COUNT(*) as cancelled_count ` +
    `FROM oapp o ` +
    `WHERE COALESCE(o.oapp_status_id, 0) = 4 ` +
    `AND o.nextdate >= '${startDate}' AND o.nextdate <= '${endDate}'`

  try {
    const response = await executeSqlViaApi(fallbackSql, config)
    return parseQueryResponse(response, (row) => ({
      reason: String(row['cancel_reason'] ?? 'ไม่ระบุเหตุผล'),
      cancelledCount: Number(row['cancelled_count'] ?? 0),
    })).filter((item) => item.cancelledCount > 0)
  } catch {
    return []
  }
}

export async function getAppointmentTopDoctors(
  config: ConnectionConfig,
  dbType: DatabaseType,
  startDate: string,
  endDate: string,
): Promise<AppointmentTopDoctorItem[]> {
  const doctorCodeExpr = `COALESCE(NULLIF(${queryBuilder.castToText(dbType, 'o.doctor')}, ''), 'ไม่ระบุรหัสแพทย์')`
  const doctorNameExpr = `COALESCE(${queryBuilder.castToText(dbType, 'd.name')}, 'ไม่ระบุชื่อแพทย์')`

  const sql =
    `SELECT ` +
    `${doctorCodeExpr} as doctor_code, ` +
    `${doctorNameExpr} as doctor_name, ` +
    `COUNT(*) as total_appointments ` +
    `FROM oapp o ` +
    `LEFT JOIN doctor d ON ${queryBuilder.castToText(dbType, 'd.code')} = ${queryBuilder.castToText(dbType, 'o.doctor')} ` +
    `WHERE o.nextdate >= '${startDate}' AND o.nextdate <= '${endDate}' ` +
    `GROUP BY ${doctorCodeExpr}, ${doctorNameExpr} ` +
    `ORDER BY total_appointments DESC ` +
    `LIMIT 10`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => ({
    doctorCode: String(row['doctor_code'] ?? 'ไม่ระบุรหัสแพทย์'),
    doctorName: String(row['doctor_name'] ?? 'ไม่ระบุชื่อแพทย์'),
    totalAppointments: Number(row['total_appointments'] ?? 0),
  }))
}
