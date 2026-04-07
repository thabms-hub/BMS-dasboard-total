import type {
  ConnectionConfig,
  DatabaseType,
  OpdExamDoctorIcd10Item,
  OpdExamOperationSetSummary,
  OpdExamReferOutDiseaseItem,
  OpdExamTopDiagnosisItem,
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
