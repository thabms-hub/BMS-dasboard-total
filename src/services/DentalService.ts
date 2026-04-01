// =============================================================================
// BMS Session KPI Dashboard - Dentistry Department Service
// Centralized service for all Dentistry (ทันตกรรม) queries.
// =============================================================================

import type {
  ConnectionConfig,
  DentalAppointmentStatus,
  DentalExpenseByPaymentType,
  DentalServicePlaceCount,
  DentistryCase,
  DentistryDoctorPerformance,
  DentistryInsuranceDistribution,
  DentistryServiceTypeCount,
  DentistryVisitTypeDistribution,
  DentistrySummary,
  SqlApiResponse,
} from '@/types';

import { executeSqlViaApi } from '@/services/bmsSession';

// ---------------------------------------------------------------------------
// Response parsing helper (local copy)
// ---------------------------------------------------------------------------

function parseQueryResponse<T>(
  response: SqlApiResponse,
  mapper: (row: Record<string, unknown>) => T,
): T[] {
  if (!response.data || !Array.isArray(response.data)) {
    return [];
  }
  return response.data.map((row) => mapper(row as Record<string, unknown>));
}

// ---------------------------------------------------------------------------
// Dentistry Department
// ---------------------------------------------------------------------------

/**
 * Get all dentistry cases with treatment and doctor information.
 * Filtered by date range (o.vstdate).
 */
export async function getDentistryCases(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<DentistryCase[]> {
  const sql =
    `SELECT
      d1.vn,
      d1.an,
      o.hn,
      o.vstdate,
      d2.code AS ttcode,
      COALESCE(d2.name, 'ไม่ระบุชื่อหัตถการ') AS tm_name,
      d3.name AS doctor_name,
      d4.name AS helper_name,
      CONCAT(p.pname, p.fname, ' ', p.lname) AS ptname,
      v.visit_type_name
    FROM dtmain d1
      LEFT OUTER JOIN ovst o ON o.vn = d1.vn
      LEFT OUTER JOIN dttm d2 ON d2.code = d1.tmcode
      LEFT OUTER JOIN visit_type v ON v.visit_type = o.visit_type
      LEFT OUTER JOIN doctor d3 ON d3.code = d1.doctor
      LEFT OUTER JOIN doctor d4 ON d4.code = d1.doctor_helper
      LEFT OUTER JOIN patient p ON p.hn = o.hn
    WHERE d1.vstdate >= '${startDate}' AND d1.vstdate <= '${endDate}'
    ORDER BY d1.vstdate, d1.vn `;

  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    hn: String(row['hn'] ?? ''),
    vn: String(row['vn'] ?? ''),
    vstdate: String(row['vstdate'] ?? ''),
    ttcode: String(row['ttcode'] ?? ''),
    an: String(row['an'] ?? ''),
    tmName: String(row['tm_name'] ?? ''),
    doctorName: String(row['doctor_name'] ?? 'ไม่ระบุ'),
    helperName: String(row['helper_name'] ?? ''),
    patientName: String(row['ptname'] ?? ''),
    visitTypeName: String(row['visit_type_name'] ?? ''),
    pttype: String(row['pttype'] ?? 'ไม่ระบุ'),
  }));
}

/**
 * Get dentistry cases grouped by visit type for chart visualization.
 * Filtered by date range (o.vstdate).
 */
export async function getDentistryByVisitType(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<DentistryVisitTypeDistribution[]> {
  const sql =
    `SELECT
      COALESCE(v.visit_type_name, 'ไม่ระบุ') AS visit_type_name,
      COUNT(distinct d1.vn) AS case_count
    FROM dtmain d1
      LEFT OUTER JOIN ovst o ON o.vn = d1.vn OR o.an = d1.vn
      LEFT OUTER JOIN visit_type v ON v.visit_type = o.visit_type
    WHERE d1.vstdate >= '${startDate}' AND d1.vstdate <= '${endDate}'
    GROUP BY v.visit_type_name
    ORDER BY case_count DESC`;

  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    visitTypeName: String(row['visit_type_name'] ?? 'ไม่ระบุ'),
    caseCount: Number(row['case_count'] ?? 0),
  }));
}

/**
 * Get dentistry cases grouped by insurance type (pttype).
 */
export async function getDentistryByInsurance(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<DentistryInsuranceDistribution[]> {
  const sql =
    `SELECT
      COALESCE(gp.pttype_price_group_name, 'ไม่ระบุ') AS insurance_type,
      COUNT(distinct d1.vn) AS case_count
    FROM dtmain d1
      LEFT OUTER JOIN ovst o ON o.vn = d1.vn OR o.an = d1.vn
      LEFT OUTER JOIN patient p ON p.hn = o.hn
      LEFT OUTER JOIN pttype pt ON o.pttype = pt.pttype
      LEFT OUTER JOIN pttype_price_group gp on gp.pttype_price_group_id = pt.pttype_price_group_id
    WHERE d1.vstdate >= '${startDate}' AND d1.vstdate <= '${endDate}'
    GROUP BY insurance_type
    ORDER BY case_count DESC`;

  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    insuranceType: String(row['insurance_type'] ?? 'ไม่ระบุ'),
    patientCount: Number(row['case_count'] ?? 0),
  }));
}

/**
 * Get dentistry performance summary grouped by doctor.
 */
export async function getDoctorPerformance(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<DentistryDoctorPerformance[]> {
  const sql =
    `SELECT 
      doctor.name AS doctor_name, 
      COUNT(DISTINCT dtmain.vn) AS c_vn, 
      COUNT(*) AS c_dtmain, 
      SUM(COALESCE(opitemrece.sum_price, 0)) AS sum_price 
    FROM dtmain  
    LEFT JOIN opitemrece ON opitemrece.hos_guid = dtmain.opi_guid
    LEFT JOIN doctor ON doctor.code = dtmain.doctor 
    WHERE upper(doctor.name) NOT LIKE '%BMS%' 
      AND dtmain.vstdate BETWEEN '${startDate}' AND '${endDate}'
    GROUP BY doctor_name 
    ORDER BY doctor_name`;

  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    doctorName: String(row['doctor_name'] ?? 'ไม่ระบุ'),
    c_vn: Number(row['c_vn'] ?? 0),
    c_dtmain: Number(row['c_dtmain'] ?? 0),
    sum_price: Number(row['sum_price'] ?? 0),
  }));
}

/**
 * Get dentistry service records by care type.
 * Uses DATE(entry_datetime) to filter by date portion only,
 * because the inputs are date strings (start/end date) without time.
 */
export async function getDentService(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<DentistryServiceTypeCount[]> {
  const sql =
    `SELECT
      dt.dental_care_type_name,
      COUNT(*) AS total_count
    FROM dental_care dc
    LEFT JOIN dental_care_type dt ON dt.dental_care_type_id = dc.dental_care_type_id
    WHERE DATE(dc.entry_datetime) BETWEEN '${startDate}' AND '${endDate}'
    GROUP BY dt.dental_care_type_name
    ORDER BY total_count DESC`;

  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    dentalCareTypeName: String(row['dental_care_type_name'] ?? 'ไม่ระบุ'),
    totalCount: Number(row['total_count'] ?? 0),
  }));
}

/**
 * Get dentistry summary metrics (visit count, IPD count) from SQL aggregation.
 */
async function getDentistrySummaryMetrics(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<{ totalCases: number; totalVisits: number; totalIPDCases: number }> {
  const sql =
    `SELECT
      COUNT(*) AS total_cases,
      COUNT(DISTINCT CASE WHEN d1.an IS NULL OR d1.an = '' THEN d1.vn END) AS total_visits,
      COUNT(CASE WHEN d1.an IS NOT NULL AND d1.an != '' THEN 1 END) AS total_ipd_cases
    FROM dtmain d1
      LEFT OUTER JOIN ovst o ON o.vn = d1.vn
    WHERE d1.vstdate >= '${startDate}' AND d1.vstdate <= '${endDate}'`;

  const response = await executeSqlViaApi(sql, config);
  const rows = parseQueryResponse(response, (row) => ({
    totalCases: Number(row['total_cases'] ?? 0),
    totalVisits: Number(row['total_visits'] ?? 0),
    totalIPDCases: Number(row['total_ipd_cases'] ?? 0),
  }));

  return rows.length > 0
    ? rows[0]
    : { totalCases: 0, totalVisits: 0, totalIPDCases: 0 };
}

/**
 * Get dentistry department summary for a date range.
 */
export async function getDentistrySummary(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<DentistrySummary> {
  const [cases, visitTypeDistribution, insuranceDistribution, metrics, doctorPerformance] = await Promise.all([
    getDentistryCases(config, startDate, endDate),
    getDentistryByVisitType(config, startDate, endDate),
    getDentistryByInsurance(config, startDate, endDate),
    getDentistrySummaryMetrics(config, startDate, endDate),
    getDoctorPerformance(config, startDate, endDate),
  ]);

  return {
    totalCases: metrics.totalCases,
    totalVisits: metrics.totalVisits,
    totalIPDCases: metrics.totalIPDCases,
    casesByVisitType: visitTypeDistribution,
    casesByInsurance: insuranceDistribution,
    cases,
    doctorPerformance,
  };
}

/**
 * Get dental appointment counts grouped by oapp_status for a date range.
 * Joins oapp with oapp_status to get a human-readable status name.
 * Status codes: 0/NULL=ยังไม่มา, 1=มาตามนัด, 2=ยกเลิก, 3=เลื่อนนัด, 4=ไม่มาตามนัด
 */
export async function getDentalAppointmentStatus(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<DentalAppointmentStatus[]> {
  const sql =
    `SELECT
      CASE
        WHEN oa.oapp_status_id IS NULL OR oa.oapp_status_id = 0 THEN 'ยังไม่มา'
        WHEN oa.oapp_status_id = 1 THEN 'รอให้ถึงวันนัด'
        WHEN oa.oapp_status_id = 2 THEN 'มารับบริการแล้ว'
        WHEN oa.oapp_status_id = 3 THEN 'ไม่มาตามนัด'
        WHEN oa.oapp_status_id >= 4 THEN 'ยกเลิก'
        ELSE 'ไม่ระบุ'
      END AS status_name,
      COUNT(DISTINCT oa.vn) AS count
    FROM oapp oa
    WHERE oa.nextdate >= '${startDate}' AND oa.nextdate <= '${endDate}'
      AND oa.depcode IN (
        SELECT depcode FROM kskdepartment WHERE department LIKE '%ทันต%'
      )
    GROUP BY status_name
    ORDER BY count DESC`;

  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    statusName: String(row['status_name'] ?? 'ไม่ระบุ'),
    count: Number(row['count'] ?? 0),
  }));
}

/**
 * Get dental care counts split by service place:
 * in-facility (dental_care_service_place_type_id != '2' or NULL)
 * and out-of-facility (dental_care_service_place_type_id = '2').
 */
export async function getDentalOutServiceCount(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<DentalServicePlaceCount> {
  const sql =
    `SELECT
      SUM(CASE WHEN dc.dental_care_service_place_type_id = '2' THEN 1 ELSE 0 END) AS out_service_count,
      SUM(CASE WHEN COALESCE(dc.dental_care_service_place_type_id, '1') != '2' THEN 1 ELSE 0 END) AS in_service_count
    FROM dental_care dc
    WHERE DATE(dc.entry_datetime) BETWEEN '${startDate}' AND '${endDate}'`;

  const response = await executeSqlViaApi(sql, config);
  const rows = parseQueryResponse(response, (row) => ({
    inService: Number(row['in_service_count'] ?? 0),
    outService: Number(row['out_service_count'] ?? 0),
  }));
  return rows[0] ?? { inService: 0, outService: 0 };
}

/**
 * Get dental expenses grouped by payment type.
 * Payment type is based on opitemrece.paidst.
 * Date filtering is based on opitemrece.vstdate.
 */
export async function getDentalExpenseByPaymentType(
  config: ConnectionConfig,
  startDate: string,
  endDate: string,
): Promise<DentalExpenseByPaymentType[]> {
  const sql =
    `SELECT
      COALESCE(pa.name, 'ไม่ระบุ') AS payment_type,
      SUM(COALESCE(op.sum_price, 0)) AS total_amount
    FROM (
      SELECT DISTINCT d1.vn
      FROM dtmain d1
      WHERE d1.vstdate >= '${startDate}' AND d1.vstdate <= '${endDate}'
    ) d
    LEFT JOIN ovst o ON o.vn = d.vn
    LEFT JOIN opitemrece op ON op.vn = o.vn
    LEFT JOIN paidst pa ON pa.paidst = op.paidst
    GROUP BY payment_type
    HAVING SUM(COALESCE(op.sum_price, 0)) > 0
    ORDER BY total_amount DESC`;

  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    paymentType: String(row['payment_type'] ?? 'ไม่ระบุ'),
    totalAmount: Number(row['total_amount'] ?? 0),
  }));
}
