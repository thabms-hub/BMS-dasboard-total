import type {
  ConnectionConfig,
  DatabaseType,
  OpdExamDispositionSummary,
  OpdExamDeformedCertSummary,
  OpdExamDoctorCertTypeItem,
  OpdExamDoctorIcd10Item,
  OpdExamOperationSetSummary,
  OpdExamReferralBreakdownItem,
  OpdExamReferralSummary,
  OpdExamReferOutDiseaseItem,
  OpdExamSlaSummary,
  OpdExamTopKpiSummary,
  OpdExamTopDiagnosisItem,
  OpdExamWeekdayHourItem,
  OpdExamWaitTimeItem,
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

export async function getOpdExamTopDiagnoses(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
  principalOnly: boolean,
): Promise<OpdExamTopDiagnosisItem[]> {
  const diagTypeFilter = principalOnly ? ` AND COALESCE(od.diagtype, '') = '1' ` : ' '
  const sql =
    `SELECT od.icd10, COALESCE(i.name, od.icd10) as diagnosis_name, COUNT(DISTINCT od.vn) as patient_count ` +
    `FROM ovstdiag od ` +
    `LEFT JOIN icd101 i ON i.code = od.icd10 ` +
    `WHERE od.vstdate >= '${startDate}' AND od.vstdate <= '${endDate}' ${diagTypeFilter}` +
    `GROUP BY od.icd10, i.name ` +
    `ORDER BY patient_count DESC ` +
    `LIMIT 10`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => ({
    icd10: String(row['icd10'] ?? ''),
    diagnosisName: String(row['diagnosis_name'] ?? row['icd10'] ?? 'ไม่ระบุโรค'),
    patientCount: Number(row['patient_count'] ?? 0),
  }))
}

export async function getOpdExamIcd10ByDoctor(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<OpdExamDoctorIcd10Item[]> {
  const sql =
    `SELECT COALESCE(o.doctor, '') as doctor_code, ` +
    `COALESCE(d.name, 'ไม่ระบุแพทย์') as doctor_name, ` +
    `COUNT(DISTINCT od.vn) as patient_count, ` +
    `COUNT(DISTINCT od.icd10) as unique_icd10_count ` +
    `FROM ovstdiag od ` +
    `INNER JOIN ovst o ON o.vn = od.vn ` +
    `LEFT JOIN doctor d ON d.code = o.doctor ` +
    `WHERE od.vstdate >= '${startDate}' AND od.vstdate <= '${endDate}' ` +
    `GROUP BY o.doctor, d.name ` +
    `ORDER BY patient_count DESC ` +
    `LIMIT 10`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => ({
    doctorCode: String(row['doctor_code'] ?? ''),
    doctorName: String(row['doctor_name'] ?? 'ไม่ระบุแพทย์'),
    patientCount: Number(row['patient_count'] ?? 0),
    uniqueIcd10Count: Number(row['unique_icd10_count'] ?? 0),
  }))
}

export async function getOpdExamTopReferOutDiseases(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<OpdExamReferOutDiseaseItem[]> {
  const sql =
    `SELECT r.pdx as icd10, COALESCE(i.name, r.pdx) as diagnosis_name, COUNT(*) as refer_count ` +
    `FROM referout r ` +
    `LEFT JOIN icd101 i ON i.code = r.pdx ` +
    `WHERE r.refer_date >= '${startDate}' AND r.refer_date <= '${endDate}' ` +
    `AND COALESCE(r.pdx, '') <> '' ` +
    `GROUP BY r.pdx, i.name ` +
    `ORDER BY refer_count DESC ` +
    `LIMIT 10`

  const response = await executeSqlViaApi(sql, config)

  return parseQueryResponse(response, (row) => ({
    icd10: String(row['icd10'] ?? ''),
    diagnosisName: String(row['diagnosis_name'] ?? row['icd10'] ?? 'ไม่ระบุโรค'),
    referCount: Number(row['refer_count'] ?? 0),
  }))
}

export async function getOpdExamWaitTimeBySpclty(
  config: ConnectionConfig,
  dbType: DatabaseType,
  startDate: string,
  endDate: string,
): Promise<OpdExamWaitTimeItem[]> {
  const sql = dbType === 'postgresql'
    ? `SELECT spclty_name,
         to_char(
           SUM(CASE WHEN tt.begin_doctor > tt.end_screen THEN tt.begin_doctor - tt.end_screen END)
           / NULLIF(SUM(CASE WHEN tt.begin_doctor > tt.end_screen THEN 1 END), 0),
           'HH24:MI:SS'
         ) AS wait_doctor_avg,
         to_char(MAX(CASE WHEN tt.begin_doctor > tt.end_screen THEN tt.begin_doctor - tt.end_screen END), 'HH24:MI:SS') AS wait_doctor_max,
         to_char(MIN(CASE WHEN tt.begin_doctor > tt.end_screen THEN tt.begin_doctor - tt.end_screen END), 'HH24:MI:SS') AS wait_doctor_min,
         to_char(
           SUM(CASE WHEN tt.end_doctor > tt.begin_doctor THEN tt.end_doctor - tt.begin_doctor END)
           / NULLIF(SUM(CASE WHEN tt.end_doctor > tt.begin_doctor THEN 1 END), 0),
           'HH24:MI:SS'
         ) AS doctor_time_avg,
         to_char(MAX(CASE WHEN tt.end_doctor > tt.begin_doctor THEN tt.end_doctor - tt.begin_doctor END), 'HH24:MI:SS') AS doctor_time_max,
         to_char(MIN(CASE WHEN tt.end_doctor > tt.begin_doctor THEN tt.end_doctor - tt.begin_doctor END), 'HH24:MI:SS') AS doctor_time_min
       FROM (
         SELECT ov.vn, s.name AS spclty_name,
           (SELECT MIN(service_end_datetime)::TIME FROM ovst_service_time
            WHERE vn = ov.vn AND ovst_service_time_type_code = 'OPD-SCREEN')   AS end_screen,
           (SELECT MIN(service_begin_datetime)::TIME FROM ovst_service_time
            WHERE vn = ov.vn AND ovst_service_time_type_code = 'OPD-DOCTOR')  AS begin_doctor,
           (SELECT MIN(service_end_datetime)::TIME FROM ovst_service_time
            WHERE vn = ov.vn AND ovst_service_time_type_code = 'OPD-DOCTOR')  AS end_doctor
         FROM ovst ov
         JOIN spclty s ON s.spclty = ov.spclty
         WHERE ov.vstdate BETWEEN '${startDate}' AND '${endDate}'
       ) tt
       GROUP BY spclty_name
       HAVING
         to_char(
           SUM(CASE WHEN tt.begin_doctor > tt.end_screen THEN tt.begin_doctor - tt.end_screen END)
           / NULLIF(SUM(CASE WHEN tt.begin_doctor > tt.end_screen THEN 1 END), 0),
           'HH24:MI:SS'
         ) IS NOT NULL
       ORDER BY spclty_name`
    : `SELECT spclty_name,
         SEC_TO_TIME(
           SUM(CASE WHEN TIME(begin_doctor) > TIME(end_screen)
               THEN TIME_TO_SEC(TIMEDIFF(TIME(begin_doctor), TIME(end_screen))) END)
           / NULLIF(SUM(CASE WHEN TIME(begin_doctor) > TIME(end_screen) THEN 1 END), 0)
         ) AS wait_doctor_avg,
         SEC_TO_TIME(MAX(CASE WHEN TIME(begin_doctor) > TIME(end_screen) THEN TIME_TO_SEC(TIMEDIFF(TIME(begin_doctor), TIME(end_screen))) END)) AS wait_doctor_max,
         SEC_TO_TIME(MIN(CASE WHEN TIME(begin_doctor) > TIME(end_screen) THEN TIME_TO_SEC(TIMEDIFF(TIME(begin_doctor), TIME(end_screen))) END)) AS wait_doctor_min,
         SEC_TO_TIME(
           SUM(CASE WHEN TIME(end_doctor) > TIME(begin_doctor)
               THEN TIME_TO_SEC(TIMEDIFF(TIME(end_doctor), TIME(begin_doctor))) END)
           / NULLIF(SUM(CASE WHEN TIME(end_doctor) > TIME(begin_doctor) THEN 1 END), 0)
         ) AS doctor_time_avg,
         SEC_TO_TIME(MAX(CASE WHEN TIME(end_doctor) > TIME(begin_doctor) THEN TIME_TO_SEC(TIMEDIFF(TIME(end_doctor), TIME(begin_doctor))) END)) AS doctor_time_max,
         SEC_TO_TIME(MIN(CASE WHEN TIME(end_doctor) > TIME(begin_doctor) THEN TIME_TO_SEC(TIMEDIFF(TIME(end_doctor), TIME(begin_doctor))) END)) AS doctor_time_min
       FROM (
         SELECT ov.vn, s.name AS spclty_name,
           (SELECT MIN(TIME(service_end_datetime)) FROM ovst_service_time
            WHERE vn = ov.vn AND ovst_service_time_type_code = 'OPD-SCREEN')   AS end_screen,
           (SELECT MIN(TIME(service_begin_datetime)) FROM ovst_service_time
            WHERE vn = ov.vn AND ovst_service_time_type_code = 'OPD-DOCTOR')  AS begin_doctor,
           (SELECT MIN(TIME(service_end_datetime)) FROM ovst_service_time
            WHERE vn = ov.vn AND ovst_service_time_type_code = 'OPD-DOCTOR')  AS end_doctor
         FROM ovst ov
         JOIN spclty s ON s.spclty = ov.spclty
         WHERE ov.vstdate BETWEEN '${startDate}' AND '${endDate}'
       ) tt
       GROUP BY spclty_name
       HAVING wait_doctor_avg IS NOT NULL
       ORDER BY spclty_name`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => ({
    spcltyName: String(row['spclty_name'] ?? 'ไม่ระบุ'),
    waitDoctorAvg: String(row['wait_doctor_avg'] ?? '-'),
    waitDoctorMax: String(row['wait_doctor_max'] ?? '-'),
    waitDoctorMin: String(row['wait_doctor_min'] ?? '-'),
    doctorTimeAvg: String(row['doctor_time_avg'] ?? '-'),
    doctorTimeMax: String(row['doctor_time_max'] ?? '-'),
    doctorTimeMin: String(row['doctor_time_min'] ?? '-'),
  }))
}

export async function getOpdExamOperationSetSummary(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<OpdExamOperationSetSummary> {
  const sqlCandidates = [
    `SELECT COUNT(*) as total_orders FROM operation_set WHERE operation_request_date >= '${startDate}' AND operation_request_date <= '${endDate}'`
  ]

  for (const sql of sqlCandidates) {
    try {
      const response = await executeSqlViaApi(sql, config)
      const rows = parseQueryResponse(response, (row) => ({
        operationOrderCount: Number(row['total_orders'] ?? 0),
      }))

      return rows[0] ?? { operationOrderCount: 0 }
    } catch {
      continue
    }
  }

  return { operationOrderCount: 0 }
}

export async function getOpdExamDoctorCertByType(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<OpdExamDoctorCertTypeItem[]> {
  const sql =
    `SELECT dt.doctor_cert_type_name, COUNT(d.doctor_cert_id) as cert_count ` +
    `FROM doctor_cert d ` +
    `JOIN doctor_cert_type dt ON dt.doctor_cert_type_id = d.doctor_cert_type_id ` +
    `WHERE d.doctor_cert_date >= '${startDate}' AND d.doctor_cert_date <= '${endDate}' ` +
    `GROUP BY dt.doctor_cert_type_name ` +
    `ORDER BY cert_count DESC`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => ({
    doctorCertTypeName: String(row['doctor_cert_type_name'] ?? 'ไม่ระบุประเภท'),
    certCount: Number(row['cert_count'] ?? 0),
  }))
}

export async function getOpdExamDeformedCertSummary(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<OpdExamDeformedCertSummary> {
  const sql =
    `SELECT COUNT(doctor_deformed_cert_id) as total_certs ` +
    `FROM doctor_deformed_cert ` +
    `WHERE cert_date >= '${startDate}' AND cert_date <= '${endDate}'`

  const response = await executeSqlViaApi(sql, config)
  const rows = parseQueryResponse(response, (row) => ({
    deformedCertCount: Number(row['total_certs'] ?? 0),
  }))

  return rows[0] ?? { deformedCertCount: 0 }
}

export async function getOpdExamTopKpiSummary(
  config: ConnectionConfig,
  dbType: DatabaseType,
  startDate: string,
  endDate: string,
  prevStartDate: string,
  prevEndDate: string,
): Promise<OpdExamTopKpiSummary> {
  const patientSql =
    `SELECT ` +
    `(SELECT COUNT(DISTINCT vn) FROM ovst WHERE vstdate >= '${startDate}' AND vstdate <= '${endDate}') as total_patients_current, ` +
    `(SELECT COUNT(DISTINCT vn) FROM ovst WHERE vstdate >= '${prevStartDate}' AND vstdate <= '${prevEndDate}') as total_patients_previous, ` +
    `(SELECT COUNT(*) FROM referout WHERE refer_date >= '${startDate}' AND refer_date <= '${endDate}') as referred_current, ` +
    `(SELECT COUNT(*) FROM referout WHERE refer_date >= '${prevStartDate}' AND refer_date <= '${prevEndDate}') as referred_previous`

  const waitSql = dbType === 'postgresql'
    ? `SELECT COALESCE(ROUND(AVG(wait_seconds) / 60.0, 2), 0) AS avg_wait_minutes
       FROM (
         SELECT EXTRACT(EPOCH FROM (tt.begin_doctor - tt.end_screen)) AS wait_seconds
         FROM (
           SELECT ov.vn,
             (SELECT MIN(service_end_datetime)::TIME FROM ovst_service_time
              WHERE vn = ov.vn AND ovst_service_time_type_code = 'OPD-SCREEN') AS end_screen,
             (SELECT MIN(service_begin_datetime)::TIME FROM ovst_service_time
              WHERE vn = ov.vn AND ovst_service_time_type_code = 'OPD-DOCTOR') AS begin_doctor
           FROM ovst ov
           WHERE ov.vstdate BETWEEN '%START_DATE%' AND '%END_DATE%'
         ) tt
         WHERE tt.begin_doctor > tt.end_screen
       ) x`
    : `SELECT COALESCE(ROUND(AVG(wait_seconds) / 60, 2), 0) AS avg_wait_minutes
       FROM (
         SELECT TIME_TO_SEC(TIMEDIFF(TIME(tt.begin_doctor), TIME(tt.end_screen))) AS wait_seconds
         FROM (
           SELECT ov.vn,
             (SELECT MIN(TIME(service_end_datetime)) FROM ovst_service_time
              WHERE vn = ov.vn AND ovst_service_time_type_code = 'OPD-SCREEN') AS end_screen,
             (SELECT MIN(TIME(service_begin_datetime)) FROM ovst_service_time
              WHERE vn = ov.vn AND ovst_service_time_type_code = 'OPD-DOCTOR') AS begin_doctor
           FROM ovst ov
           WHERE ov.vstdate BETWEEN '%START_DATE%' AND '%END_DATE%'
         ) tt
         WHERE TIME(tt.begin_doctor) > TIME(tt.end_screen)
       ) x`

  const currentWaitSql = waitSql.replace('%START_DATE%', startDate).replace('%END_DATE%', endDate)
  const previousWaitSql = waitSql.replace('%START_DATE%', prevStartDate).replace('%END_DATE%', prevEndDate)

  const [patientResponse, currentWaitResponse, previousWaitResponse] = await Promise.all([
    executeSqlViaApi(patientSql, config),
    executeSqlViaApi(currentWaitSql, config),
    executeSqlViaApi(previousWaitSql, config),
  ])

  const patientRows = parseQueryResponse(patientResponse, (row) => ({
    totalPatientsCurrent: Number(row['total_patients_current'] ?? 0),
    totalPatientsPrevious: Number(row['total_patients_previous'] ?? 0),
    referredCurrent: Number(row['referred_current'] ?? 0),
    referredPrevious: Number(row['referred_previous'] ?? 0),
  }))

  const currentWaitRows = parseQueryResponse(currentWaitResponse, (row) => Number(row['avg_wait_minutes'] ?? 0))
  const previousWaitRows = parseQueryResponse(previousWaitResponse, (row) => Number(row['avg_wait_minutes'] ?? 0))

  const patientData = patientRows[0] ?? {
    totalPatientsCurrent: 0,
    totalPatientsPrevious: 0,
    referredCurrent: 0,
    referredPrevious: 0,
  }

  return {
    totalPatientsCurrent: patientData.totalPatientsCurrent,
    totalPatientsPrevious: patientData.totalPatientsPrevious,
    avgWaitMinutesCurrent: currentWaitRows[0] ?? 0,
    avgWaitMinutesPrevious: previousWaitRows[0] ?? 0,
    referredCurrent: patientData.referredCurrent,
    referredPrevious: patientData.referredPrevious,
  }
}

export async function getOpdExamWeekdayHourPatients(
  config: ConnectionConfig,
  dbType: DatabaseType,
  startDate: string,
  endDate: string,
): Promise<OpdExamWeekdayHourItem[]> {
  const sql = dbType === 'postgresql'
    ? `SELECT
         CASE
           WHEN CAST(EXTRACT(DOW FROM vstdate) AS INTEGER) = 0 THEN 6
           ELSE CAST(EXTRACT(DOW FROM vstdate) AS INTEGER) - 1
         END AS weekday_index,
         CAST(EXTRACT(HOUR FROM vsttime) AS INTEGER) AS hour_of_day,
         COUNT(*) AS patient_count
       FROM ovst
       WHERE vstdate >= '${startDate}' AND vstdate <= '${endDate}'
         AND vsttime IS NOT NULL
       GROUP BY 1, 2
       ORDER BY 1, 2`
    : `SELECT
         CASE
           WHEN DAYOFWEEK(vstdate) = 1 THEN 6
           ELSE DAYOFWEEK(vstdate) - 2
         END AS weekday_index,
         HOUR(vsttime) AS hour_of_day,
         COUNT(*) AS patient_count
       FROM ovst
       WHERE vstdate >= '${startDate}' AND vstdate <= '${endDate}'
         AND vsttime IS NOT NULL
       GROUP BY 1, 2
       ORDER BY 1, 2`

  const response = await executeSqlViaApi(sql, config)
  return parseQueryResponse(response, (row) => ({
    weekdayIndex: Number(row['weekday_index'] ?? 0),
    hourOfDay: Number(row['hour_of_day'] ?? 0),
    patientCount: Number(row['patient_count'] ?? 0),
  }))
}

export async function getOpdExamReferralSummary(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<OpdExamReferralSummary> {
  const sql =
    `SELECT COUNT(*) as total_referrals, COUNT(DISTINCT hn) as unique_patients ` +
    `FROM referout ` +
    `WHERE refer_date >= '${startDate}' AND refer_date <= '${endDate}'`

  const response = await executeSqlViaApi(sql, config)
  const rows = parseQueryResponse(response, (row) => ({
    totalReferrals: Number(row['total_referrals'] ?? 0),
    uniquePatients: Number(row['unique_patients'] ?? 0),
  }))

  return rows[0] ?? { totalReferrals: 0, uniquePatients: 0 }
}

export async function getOpdExamReferralBreakdown(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<OpdExamReferralBreakdownItem[]> {
  const sqlCandidates: Array<{ sql: string; breakdownType: 'destination' | 'reason' }> = [
    {
      sql:
        `SELECT COALESCE(h.name, r.refer_hospname, r.refer_hospcode, 'ไม่ระบุปลายทาง') as label, COUNT(*) as refer_count ` +
        `FROM referout r ` +
        `LEFT JOIN hospcode h ON h.hospcode = r.refer_hospcode ` +
        `WHERE r.refer_date >= '${startDate}' AND r.refer_date <= '${endDate}' ` +
        `GROUP BY COALESCE(h.name, r.refer_hospname, r.refer_hospcode, 'ไม่ระบุปลายทาง') ` +
        `ORDER BY refer_count DESC ` +
        `LIMIT 10`,
      breakdownType: 'destination',
    },
    {
      sql:
        `SELECT COALESCE(h.name, r.refer_hospcode, 'ไม่ระบุปลายทาง') as label, COUNT(*) as refer_count ` +
        `FROM referout r ` +
        `LEFT JOIN hospcode h ON h.hospcode = r.refer_hospcode ` +
        `WHERE r.refer_date >= '${startDate}' AND r.refer_date <= '${endDate}' ` +
        `GROUP BY COALESCE(h.name, r.refer_hospcode, 'ไม่ระบุปลายทาง') ` +
        `ORDER BY refer_count DESC ` +
        `LIMIT 10`,
      breakdownType: 'destination',
    },
    {
      sql:
        `SELECT COALESCE(r.refer_hospname, r.refer_hospcode, 'ไม่ระบุปลายทาง') as label, COUNT(*) as refer_count ` +
        `FROM referout r ` +
        `WHERE r.refer_date >= '${startDate}' AND r.refer_date <= '${endDate}' ` +
        `GROUP BY COALESCE(r.refer_hospname, r.refer_hospcode, 'ไม่ระบุปลายทาง') ` +
        `ORDER BY refer_count DESC ` +
        `LIMIT 10`,
      breakdownType: 'destination',
    },
    {
      sql:
        `SELECT COALESCE(refer_hospcode, 'ไม่ระบุปลายทาง') as label, COUNT(*) as refer_count ` +
        `FROM referout ` +
        `WHERE refer_date >= '${startDate}' AND refer_date <= '${endDate}' ` +
        `GROUP BY label ` +
        `ORDER BY refer_count DESC ` +
        `LIMIT 10`,
      breakdownType: 'destination',
    },
    {
      sql:
        `SELECT COALESCE(refer_type, 'ไม่ระบุสาเหตุ') as label, COUNT(*) as refer_count ` +
        `FROM referout ` +
        `WHERE refer_date >= '${startDate}' AND refer_date <= '${endDate}' ` +
        `GROUP BY label ` +
        `ORDER BY refer_count DESC ` +
        `LIMIT 10`,
      breakdownType: 'reason',
    },
    {
      sql:
        `SELECT COALESCE(pdx, 'ไม่ระบุ') as label, COUNT(*) as refer_count ` +
        `FROM referout ` +
        `WHERE refer_date >= '${startDate}' AND refer_date <= '${endDate}' ` +
        `GROUP BY label ` +
        `ORDER BY refer_count DESC ` +
        `LIMIT 10`,
      breakdownType: 'reason',
    },
  ]

  for (const candidate of sqlCandidates) {
    try {
      const response = await executeSqlViaApi(candidate.sql, config)
      const rows = parseQueryResponse(response, (row) => ({
        label: String(row['label'] ?? 'ไม่ระบุ'),
        referCount: Number(row['refer_count'] ?? 0),
        breakdownType: candidate.breakdownType,
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

export async function getOpdExamSlaWithin30Minutes(
  config: ConnectionConfig,
  dbType: DatabaseType,
  startDate: string,
  endDate: string,
): Promise<OpdExamSlaSummary> {
  const sql = dbType === 'postgresql'
    ? `SELECT
         COUNT(*) FILTER (WHERE wait_seconds <= 1800) AS within_target_count,
         COUNT(*) AS total_cases
       FROM (
         SELECT EXTRACT(EPOCH FROM (tt.begin_doctor - tt.end_screen)) AS wait_seconds
         FROM (
           SELECT ov.vn,
             (SELECT MIN(service_end_datetime)::TIME FROM ovst_service_time
              WHERE vn = ov.vn AND ovst_service_time_type_code = 'OPD-SCREEN') AS end_screen,
             (SELECT MIN(service_begin_datetime)::TIME FROM ovst_service_time
              WHERE vn = ov.vn AND ovst_service_time_type_code = 'OPD-DOCTOR') AS begin_doctor
           FROM ovst ov
           WHERE ov.vstdate BETWEEN '${startDate}' AND '${endDate}'
         ) tt
         WHERE tt.begin_doctor > tt.end_screen
       ) x`
    : `SELECT
         SUM(CASE WHEN wait_seconds <= 1800 THEN 1 ELSE 0 END) AS within_target_count,
         COUNT(*) AS total_cases
       FROM (
         SELECT TIME_TO_SEC(TIMEDIFF(TIME(tt.begin_doctor), TIME(tt.end_screen))) AS wait_seconds
         FROM (
           SELECT ov.vn,
             (SELECT MIN(TIME(service_end_datetime)) FROM ovst_service_time
              WHERE vn = ov.vn AND ovst_service_time_type_code = 'OPD-SCREEN') AS end_screen,
             (SELECT MIN(TIME(service_begin_datetime)) FROM ovst_service_time
              WHERE vn = ov.vn AND ovst_service_time_type_code = 'OPD-DOCTOR') AS begin_doctor
           FROM ovst ov
           WHERE ov.vstdate BETWEEN '${startDate}' AND '${endDate}'
         ) tt
         WHERE TIME(tt.begin_doctor) > TIME(tt.end_screen)
       ) x`

  const response = await executeSqlViaApi(sql, config)
  const rows = parseQueryResponse(response, (row) => ({
    withinTargetCount: Number(row['within_target_count'] ?? 0),
    totalCases: Number(row['total_cases'] ?? 0),
  }))

  const data = rows[0] ?? { withinTargetCount: 0, totalCases: 0 }
  const missedTargetCount = Math.max(data.totalCases - data.withinTargetCount, 0)
  const withinTargetPercent = data.totalCases > 0 ? (data.withinTargetCount / data.totalCases) * 100 : 0

  return {
    withinTargetCount: data.withinTargetCount,
    missedTargetCount,
    totalCases: data.totalCases,
    withinTargetPercent,
  }
}

export async function getOpdExamDispositionSummary(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<OpdExamDispositionSummary> {
  const sql =
    `SELECT ` +
    `SUM(CASE WHEN rf.vn IS NULL AND ip.vn IS NOT NULL THEN 1 ELSE 0 END) AS admit_count, ` +
    `SUM(CASE WHEN rf.vn IS NOT NULL THEN 1 ELSE 0 END) AS refer_count, ` +
    `SUM(CASE WHEN rf.vn IS NULL AND ip.vn IS NULL THEN 1 ELSE 0 END) AS home_count, ` +
    `COUNT(*) AS total_count ` +
    `FROM (` +
    `  SELECT DISTINCT ov.vn ` +
    `  FROM ovst ov ` +
    `  WHERE ov.vstdate >= '${startDate}' AND ov.vstdate <= '${endDate}'` +
    `) base ` +
    `LEFT JOIN (` +
    `  SELECT DISTINCT vn ` +
    `  FROM referout ` +
    `  WHERE refer_date >= '${startDate}' AND refer_date <= '${endDate}' AND COALESCE(vn, '') <> ''` +
    `) rf ON rf.vn = base.vn ` +
    `LEFT JOIN (` +
    `  SELECT DISTINCT vn ` +
    `  FROM ipt ` +
    `  WHERE COALESCE(vn, '') <> ''` +
    `) ip ON ip.vn = base.vn`

  const response = await executeSqlViaApi(sql, config)
  const rows = parseQueryResponse(response, (row) => ({
    admitCount: Number(row['admit_count'] ?? 0),
    referCount: Number(row['refer_count'] ?? 0),
    homeCount: Number(row['home_count'] ?? 0),
    totalCount: Number(row['total_count'] ?? 0),
  }))

  return rows[0] ?? { admitCount: 0, referCount: 0, homeCount: 0, totalCount: 0 }
}
