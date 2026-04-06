import type {
  AppointmentCancelReasonItem,
  AppointmentDepartmentOption,
  AppointmentClinicRateItem,
  AppointmentKpis,
  AppointmentMonthlyTrendItem,
  AppointmentTopClinicItem,
  AppointmentTopDoctorItem,
  AppointmentWalkInComparison,
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

function buildTextInFilter(
  dbType: DatabaseType,
  fieldExpr: string,
  values?: string[],
): string {
  if (!values || values.length === 0) {
    return ''
  }

  // Expand pipe-separated values (สำหรับ "ไม่ระบุคลินิก" ที่เป็น A001|A002)
  const expanded = values.flatMap(value => value.includes('|') ? value.split('|') : value)

  const normalized = expanded
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map((value) => `'${value.replace(/'/g, "''")}'`)

  if (normalized.length === 0) {
    return ''
  }

  return ` AND ${queryBuilder.castToText(dbType, fieldExpr)} IN (${normalized.join(', ')})`
}

export async function getAppointmentDepartments(
  config: ConnectionConfig,
  dbType: DatabaseType,
  startDate: string,
  endDate: string,
): Promise<AppointmentDepartmentOption[]> {
  const depCodeExpr = `COALESCE(${queryBuilder.castToText(dbType, 'o.depcode')}, '')`
  const clinicNameExpr = `COALESCE(${queryBuilder.castToText(dbType, 'cl.name')}, 'ไม่ระบุคลินิก')`
  const departmentNameExpr = `COALESCE(${queryBuilder.castToText(dbType, 'k.department')}, 'ไม่ระบุคลินิก')`

  const queryCandidates = [
    `SELECT DISTINCT ` +
      `${depCodeExpr} as department_code, ` +
      `${clinicNameExpr} as department_name ` +
      `FROM oapp o ` +
      `LEFT JOIN clinic cl ON ${queryBuilder.castToText(dbType, 'cl.clinic')} = ${queryBuilder.castToText(dbType, 'o.depcode')} ` +
      `WHERE o.nextdate >= '${startDate}' AND o.nextdate <= '${endDate}' ` +
      `AND ${depCodeExpr} <> '' ` +
      `ORDER BY department_name ASC`,
    `SELECT DISTINCT ` +
      `${depCodeExpr} as department_code, ` +
      `${departmentNameExpr} as department_name ` +
      `FROM oapp o ` +
      `LEFT JOIN kskdepartment k ON k.depcode = o.depcode ` +
      `WHERE o.nextdate >= '${startDate}' AND o.nextdate <= '${endDate}' ` +
      `AND ${depCodeExpr} <> '' ` +
      `ORDER BY department_name ASC`,
  ]

  for (const sql of queryCandidates) {
    try {
      const response = await executeSqlViaApi(sql, config)
      const rows = parseQueryResponse(response, (row) => {
        const departmentCode = String(row['department_code'] ?? '')
        const rawName = String(row['department_name'] ?? 'ไม่ระบุคลินิก').trim()

        return {
          departmentCode,
          departmentName: rawName,
        }
      })

      if (rows.length > 0) {
        // จัดกลุ่ม "ไม่ระบุคลินิก" ทั้งหมดเป็นแถวเดียว โดยแยกรหัสด้วย | (pipe)
        const unspecifiedCodes: string[] = []
        const result: AppointmentDepartmentOption[] = []

        for (const row of rows) {
          if (row.departmentName === 'ไม่ระบุคลินิก') {
            unspecifiedCodes.push(row.departmentCode)
          } else {
            result.push(row)
          }
        }

        // เพิ่มกลุ่ม "ไม่ระบุคลินิก" ถ้ามี
        if (unspecifiedCodes.length > 0) {
          result.push({
            departmentCode: unspecifiedCodes.join('|'),
            departmentName: 'ไม่ระบุคลินิก',
          })
        }

        return result
      }
    } catch {
      continue
    }
  }

  return []
}

export async function getAppointmentKpis(
  config: ConnectionConfig,
  dbType: DatabaseType,
  departmentCodes?: string[],
): Promise<AppointmentKpis> {
  const todayExpr = queryBuilder.currentDate(dbType)
  const visitVnExpr = queryBuilder.castToText(dbType, 'o.visit_vn')
  const labTextExpr = queryBuilder.castToText(dbType, 'o.lab_list_text')
  const xrayTextExpr = queryBuilder.castToText(dbType, 'o.xray_list_text')
  const departmentFilter = buildTextInFilter(dbType, 'o.depcode', departmentCodes)

  const sql =
    `SELECT ` +
    `COUNT(DISTINCT CASE WHEN (o.oapp_status_id IS NULL OR o.oapp_status_id < 4) THEN o.hn END) as total_today, ` +
    `COUNT(DISTINCT CASE WHEN (o.oapp_status_id IS NULL OR o.oapp_status_id < 4) AND ${visitVnExpr} IS NOT NULL AND ${visitVnExpr} <> '' THEN o.hn END) as attended_today, ` +
    `COUNT(DISTINCT CASE WHEN (o.oapp_status_id IS NULL OR o.oapp_status_id < 4) AND (${visitVnExpr} IS NULL OR ${visitVnExpr} = '') THEN o.hn END) as no_show_today, ` +
    `COUNT(DISTINCT CASE WHEN COALESCE(o.oapp_status_id, 0) = 4 THEN o.hn END) as cancelled_today, ` +
    `COUNT(DISTINCT CASE WHEN (o.oapp_status_id IS NULL OR o.oapp_status_id < 4) AND ${labTextExpr} IS NOT NULL AND ${labTextExpr} <> '' THEN o.hn END) as lab_pre_order_today, ` +
    `COUNT(DISTINCT CASE WHEN (o.oapp_status_id IS NULL OR o.oapp_status_id < 4) AND ${xrayTextExpr} IS NOT NULL AND ${xrayTextExpr} <> '' THEN o.hn END) as xray_pre_order_today ` +
    `FROM oapp o ` +
    `LEFT JOIN oapp_status os ON os.oapp_status_id = o.oapp_status_id ` +
    `WHERE o.nextdate = ${todayExpr}` +
    departmentFilter

  const response = await executeSqlViaApi(sql, config)
  const rows = parseQueryResponse(response, (row) => {
    const totalToday = Number(row['total_today'] ?? 0)
    const noShowToday = Number(row['no_show_today'] ?? 0)

    return {
      totalToday,
      attendedToday: Number(row['attended_today'] ?? 0),
      noShowToday,
      cancelledToday: Number(row['cancelled_today'] ?? 0),
      noShowRate: totalToday > 0 ? Number(((noShowToday / totalToday) * 100).toFixed(1)) : 0,
      labPreOrderToday: Number(row['lab_pre_order_today'] ?? 0),
      xrayPreOrderToday: Number(row['xray_pre_order_today'] ?? 0),
    }
  })

  return rows[0] ?? {
    totalToday: 0,
    attendedToday: 0,
    noShowToday: 0,
    cancelledToday: 0,
    noShowRate: 0,
    labPreOrderToday: 0,
    xrayPreOrderToday: 0,
  }
}

export async function getAppointmentAttendanceByClinic(
  config: ConnectionConfig,
  dbType: DatabaseType,
  startDate: string,
  endDate: string,
  departmentCodes?: string[],
): Promise<AppointmentClinicRateItem[]> {
  const depNameExpr = `COALESCE(${queryBuilder.castToText(dbType, 'k.department')}, 'ไม่ระบุคลินิก')`
  const depCodeExpr = `COALESCE(${queryBuilder.castToText(dbType, 'o.depcode')}, '')`
  const departmentFilter = buildTextInFilter(dbType, 'o.depcode', departmentCodes)

  const sql =
    `SELECT ` +
    `${depCodeExpr} as clinic_code, ` +
    `${depNameExpr} as clinic_name, ` +
    `SUM(CASE WHEN (o.oapp_status_id IS NULL OR o.oapp_status_id < 4) THEN 1 ELSE 0 END) as total_appointments, ` +
    `SUM(CASE WHEN COALESCE(o.oapp_status_id, 0) = 2 THEN 1 ELSE 0 END) as attended_appointments, ` +
    `SUM(CASE WHEN COALESCE(o.oapp_status_id, 0) = 3 THEN 1 ELSE 0 END) as no_show_appointments ` +
    `FROM oapp o ` +
    `LEFT JOIN oapp_status os ON os.oapp_status_id = o.oapp_status_id ` +
    `LEFT JOIN kskdepartment k ON k.depcode = o.depcode ` +
    `WHERE o.nextdate >= '${startDate}' AND o.nextdate <= '${endDate}' ` +
    departmentFilter +
    `GROUP BY ${depCodeExpr}, ${depNameExpr} ` +
    `ORDER BY total_appointments DESC ` +
    `LIMIT 12`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => {
    const totalAppointments = Number(row['total_appointments'] ?? 0)
    const attendedAppointments = Number(row['attended_appointments'] ?? 0)
    const noShowAppointments = Number(row['no_show_appointments'] ?? 0)
    const attendanceBase = attendedAppointments + noShowAppointments

    return {
      clinicCode: String(row['clinic_code'] ?? ''),
      clinicName: String(row['clinic_name'] ?? 'ไม่ระบุคลินิก'),
      totalAppointments,
      attendedAppointments,
      noShowAppointments,
      attendanceRate: attendanceBase > 0
        ? Number(((attendedAppointments / attendanceBase) * 100).toFixed(1))
        : 0,
    }
  })
}

export async function getAppointmentMonthlyTrend(
  config: ConnectionConfig,
  dbType: DatabaseType,
  departmentCodes?: string[],
): Promise<AppointmentMonthlyTrendItem[]> {
  const monthExpr = queryBuilder.dateFormat(dbType, 'nextdate', '%Y-%m')
  const startExpr = queryBuilder.dateSubtract(dbType, 365)
  const todayExpr = queryBuilder.currentDate(dbType)
  const visitVnExpr = queryBuilder.castToText(dbType, 'o.visit_vn')
  const departmentFilter = buildTextInFilter(dbType, 'o.depcode', departmentCodes)

  const sql =
    `SELECT ` +
    `${monthExpr} as month_label, ` +
    `COUNT(DISTINCT CASE WHEN (o.oapp_status_id IS NULL OR o.oapp_status_id < 4) THEN o.hn END) as total_appointments, ` +
    `COUNT(DISTINCT CASE WHEN COALESCE(o.oapp_status_id, 0) = 4 THEN o.hn END) as cancelled_appointments, ` +
    `COUNT(DISTINCT CASE WHEN (o.oapp_status_id IS NULL OR o.oapp_status_id < 4) AND (${visitVnExpr} IS NULL OR ${visitVnExpr} = '') THEN o.hn END) as no_show_appointments ` +
    `FROM oapp o ` +
    `WHERE o.nextdate >= ${startExpr} AND o.nextdate <= ${todayExpr} ` +
    departmentFilter +
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
  departmentCodes?: string[],
): Promise<AppointmentCancelReasonItem[]> {
  const departmentFilter = buildTextInFilter(dbType, 'o.depcode', departmentCodes)
  const reasonExpr = `COALESCE(${queryBuilder.castToText(dbType, 'ct.oapp_cancel_type_name')}, 'ไม่ระบุเหตุผล')`
  const cancelSourceCandidates = [
    {
      fromClause:
        `FROM oapp_cancel c ` +
        `JOIN oapp_cancel_type ct ON ct.oapp_cancel_type_id = c.oapp_cancel_type_id ` +
        `JOIN oapp o ON o.oapp_id = c.oapp_id `,
    },
    {
      fromClause:
        `FROM oapp_cancel c ` +
        `JOIN oapp_cancel_type ct ON ct.oapp_cancel_type_id = c.oapp_cancel_type_id ` +
        `JOIN oapp o ON o.hn = c.hn AND o.nextdate = c.nextdate `,
    },
  ]

  for (const candidate of cancelSourceCandidates) {
    const sql =
      `SELECT ${reasonExpr} as cancel_reason, COUNT(*) as cancelled_count ` +
      candidate.fromClause +
      `WHERE o.nextdate >= '${startDate}' AND o.nextdate <= '${endDate}' ` +
      departmentFilter +
      `GROUP BY ${reasonExpr} ` +
      `ORDER BY cancelled_count DESC ` +
      `LIMIT 8`

    try {
      const response = await executeSqlViaApi(sql, config)
      const rows = parseQueryResponse(response, (row) => ({
        reason: String(row['cancel_reason'] ?? 'ไม่ระบุเหตุผล'),
        cancelledCount: Number(row['cancelled_count'] ?? 0),
      }))

      if (rows.length > 0) {
        return rows
      }
    } catch {
      continue
    }
  }

  const fallbackSql =
    `SELECT 'ยกเลิกนัด (ไม่ระบุเหตุผล)' as cancel_reason, COUNT(*) as cancelled_count ` +
    `FROM oapp o ` +
    `WHERE COALESCE(o.oapp_status_id, 0) = 4 ` +
    `AND o.nextdate >= '${startDate}' AND o.nextdate <= '${endDate}'` +
    departmentFilter

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
  departmentCodes?: string[],
): Promise<AppointmentTopDoctorItem[]> {
  const doctorCodeExpr = `COALESCE(NULLIF(${queryBuilder.castToText(dbType, 'o.doctor')}, ''), 'ไม่ระบุรหัสแพทย์')`
  const doctorNameExpr = `COALESCE(${queryBuilder.castToText(dbType, 'd.name')}, 'ไม่ระบุชื่อแพทย์')`
  const departmentFilter = buildTextInFilter(dbType, 'o.depcode', departmentCodes)

  const sql =
    `SELECT ` +
    `${doctorCodeExpr} as doctor_code, ` +
    `${doctorNameExpr} as doctor_name, ` +
    `COUNT(*) as total_appointments ` +
    `FROM oapp o ` +
    `LEFT JOIN doctor d ON ${queryBuilder.castToText(dbType, 'd.code')} = ${queryBuilder.castToText(dbType, 'o.doctor')} ` +
    `WHERE o.nextdate >= '${startDate}' AND o.nextdate <= '${endDate}' ` +
    departmentFilter +
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

export async function getAppointmentWalkInComparison(
  config: ConnectionConfig,
  dbType: DatabaseType,
  startDate: string,
  endDate: string,
  departmentCodes?: string[],
): Promise<AppointmentWalkInComparison> {
  const ovstDepartmentFilter = buildTextInFilter(dbType, 'v.cur_dep', departmentCodes)

  const sql =
    `SELECT ` +
    `COUNT(DISTINCT CASE WHEN oa.visit_vn IS NOT NULL THEN v.vn END) as booked_count, ` +
    `COUNT(DISTINCT CASE WHEN oa.visit_vn IS NULL THEN v.vn END) as walk_in_count ` +
    `FROM ovst v ` +
    `LEFT JOIN oapp oa ON oa.visit_vn = v.vn AND (oa.oapp_status_id IS NULL OR oa.oapp_status_id < 4) ` +
    `WHERE v.vstdate >= '${startDate}' AND v.vstdate <= '${endDate}'` +
    ovstDepartmentFilter

  const response = await executeSqlViaApi(sql, config)
  const rows = parseQueryResponse(response, (row) => {
    const bookedCount = Number(row['booked_count'] ?? 0)
    const walkInCount = Number(row['walk_in_count'] ?? 0)
    const totalCount = bookedCount + walkInCount

    return {
      bookedCount,
      walkInCount,
      bookedRate: totalCount > 0 ? Number(((bookedCount / totalCount) * 100).toFixed(1)) : 0,
      walkInRate: totalCount > 0 ? Number(((walkInCount / totalCount) * 100).toFixed(1)) : 0,
    }
  })

  return rows[0] ?? {
    bookedCount: 0,
    walkInCount: 0,
    bookedRate: 0,
    walkInRate: 0,
  }
}

export async function getAppointmentTopClinics(
  config: ConnectionConfig,
  dbType: DatabaseType,
  startDate: string,
  endDate: string,
  departmentCodes?: string[],
): Promise<AppointmentTopClinicItem[]> {
  // Group by clinic name (not depcode) so multiple exam rooms under the same clinic are merged.
  // Rows with no matching clinic entry all become "ไม่ระบุคลินิก" automatically via COALESCE + GROUP BY.
  const clinicNameExpr = `COALESCE(${queryBuilder.castToText(dbType, 'cl.name')}, 'ไม่ระบุคลินิก')`
  const depNameExpr = `COALESCE(${queryBuilder.castToText(dbType, 'k.department')}, 'ไม่ระบุคลินิก')`
  const visitVnExpr = queryBuilder.castToText(dbType, 'o.visit_vn')
  const departmentFilter = buildTextInFilter(dbType, 'o.depcode', departmentCodes)

  const countFragment =
    `COUNT(DISTINCT CASE WHEN (o.oapp_status_id IS NULL OR o.oapp_status_id < 4) THEN o.hn END) as total_appointments, ` +
    `COUNT(DISTINCT CASE WHEN (o.oapp_status_id IS NULL OR o.oapp_status_id < 4) AND (${visitVnExpr} IS NULL OR ${visitVnExpr} = '') THEN o.hn END) as no_show_appointments `

  const queryCandidates = [
    // Primary: join clinic table — groups by clinic name, hides room-level detail
    `SELECT ${clinicNameExpr} as clinic_name, ${countFragment}` +
    `FROM oapp o ` +
    `LEFT JOIN clinic cl ON ${queryBuilder.castToText(dbType, 'cl.clinic')} = ${queryBuilder.castToText(dbType, 'o.depcode')} ` +
    `WHERE o.nextdate >= '${startDate}' AND o.nextdate <= '${endDate}' ` +
    departmentFilter +
    `GROUP BY ${clinicNameExpr} ` +
    `ORDER BY total_appointments DESC ` +
    `LIMIT 8`,
    // Fallback: join kskdepartment — groups by department name if clinic table is unavailable
    `SELECT ${depNameExpr} as clinic_name, ${countFragment}` +
    `FROM oapp o ` +
    `LEFT JOIN kskdepartment k ON k.depcode = o.depcode ` +
    `WHERE o.nextdate >= '${startDate}' AND o.nextdate <= '${endDate}' ` +
    departmentFilter +
    `GROUP BY ${depNameExpr} ` +
    `ORDER BY total_appointments DESC ` +
    `LIMIT 8`,
  ]

  for (const sql of queryCandidates) {
    try {
      const response = await executeSqlViaApi(sql, config)
      const rows = parseQueryResponse(response, (row) => {
        const totalAppointments = Number(row['total_appointments'] ?? 0)
        const noShowAppointments = Number(row['no_show_appointments'] ?? 0)

        return {
          clinicCode: '',
          clinicName: String(row['clinic_name'] ?? 'ไม่ระบุคลินิก'),
          totalAppointments,
          noShowAppointments,
          noShowRate: totalAppointments > 0 ? Number(((noShowAppointments / totalAppointments) * 100).toFixed(1)) : 0,
        }
      })

      if (rows.length > 0) {
        return rows
      }
    } catch {
      continue
    }
  }

  return []
}
