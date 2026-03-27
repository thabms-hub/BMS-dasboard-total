// =============================================================================
// BMS Session KPI Dashboard - KPI Data Fetching Service
// (T042 + T053 + T062 + T070)
// Centralized service for all KPI queries across Overview, Trends,
// Departments/Doctors, and Demographics user stories.
// =============================================================================

import type {
  ConnectionConfig,
  DatabaseType,
  DepartmentWorkload,
  DentistryCase,
  DentistryDoctorPerformance,
  DentistryInsuranceDistribution,
  DentistryServiceTypeCount,
  DentistryVisitTypeDistribution,
  DentistrySummary,
  DoctorWorkload,
  ErVisitDetail,
  HourlyDistribution,
  IpdVisitDetail,
  KpiSummary,
  OpdVisitDetail,
  OverviewStats,
  PatientTypeDistribution,
  RecentVisit,
  SqlApiResponse,
  VisitTrend,
} from '@/types';

import { queryBuilder } from '@/services/queryBuilder';
import { executeSqlViaApi } from '@/services/bmsSession';

// ---------------------------------------------------------------------------
// Response parsing helper
// ---------------------------------------------------------------------------

/**
 * Map raw {@link SqlApiResponse} rows into a typed array using the supplied
 * mapper function.
 *
 * Returns an empty array when the response contains no data rows.
 */
function parseQueryResponse<T>(
  response: SqlApiResponse,
  mapper: (row: Record<string, unknown>) => T,
): T[] {
  if (!response.data || !Array.isArray(response.data)) {
    return [];
  }
  return response.data.map(mapper);
}

// ---------------------------------------------------------------------------
// US1 - Overview KPIs
// ---------------------------------------------------------------------------

/**
 * Count of OPD visits for today.
 */
export async function getOpdVisitCount(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<number> {
  const sql = `SELECT COUNT(*) as total FROM ovst WHERE vstdate = ${queryBuilder.currentDate(dbType)}`;
  const response = await executeSqlViaApi(sql, config);
  const rows = parseQueryResponse(response, (row) => Number(row['total'] ?? 0));
  return rows[0] ?? 0;
}

/**
 * OPD visit breakdown for today: total, walk-in, appointment.
 * Also fetches yesterday's total for trend comparison.
 */
export async function getOpdVisitDetail(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<OpdVisitDetail> {
  const today = queryBuilder.currentDate(dbType);
  const yesterday = queryBuilder.dateSubtract(dbType, 1);

  const todaySql =
    `SELECT ` +
    `COUNT(DISTINCT ovst.vn) as count_vn, ` +
    `COUNT(DISTINCT CASE WHEN oa.visit_vn IS NULL THEN ovst.vn END) as walkin, ` +
    `COUNT(DISTINCT CASE WHEN oa.visit_vn IS NOT NULL THEN ovst.vn END) as oappoint ` +
    `FROM ovst ` +
    `INNER JOIN spclty s ON s.spclty = ovst.spclty ` +
    `LEFT JOIN oapp oa ON ovst.hn = oa.hn AND oa.depcode = ovst.main_dep AND ovst.vstdate = oa.nextdate ` +
    `WHERE ovst.vstdate = ${today}`;

  const yesterdaySql =
    `SELECT ` +
    `COUNT(DISTINCT ovst.vn) as count_vn ` +
    `FROM ovst ` +
    `INNER JOIN spclty s ON s.spclty = ovst.spclty ` +
    `WHERE ovst.vstdate = ${yesterday}`;

  const [todayResp, yesterdayResp] = await Promise.all([
    executeSqlViaApi(todaySql, config),
    executeSqlViaApi(yesterdaySql, config),
  ]);

  const todayRows = parseQueryResponse(todayResp, (row) => ({
    total: Number(row['count_vn'] ?? 0),
    walkin: Number(row['walkin'] ?? 0),
    appointment: Number(row['oappoint'] ?? 0),
  }));
  const yesterdayRows = parseQueryResponse(yesterdayResp, (row) =>
    Number(row['count_vn'] ?? 0),
  );

  const today_ = todayRows[0] ?? { total: 0, walkin: 0, appointment: 0 };
  const yesterdayTotal = yesterdayRows[0] ?? 0;

  const trendPercent =
    yesterdayTotal > 0
      ? Math.round(((today_.total - yesterdayTotal) / yesterdayTotal) * 100)
      : null;

  return {
    total: today_.total,
    walkin: today_.walkin,
    appointment: today_.appointment,
    yesterdayTotal,
    trendPercent,
    isPositive: (trendPercent ?? 0) >= 0,
  };
}

/**
 * Count of currently admitted IPD patients (not yet discharged).
 *
 * The query is identical for MySQL and PostgreSQL.
 */
export async function getIpdPatientCount(
  config: ConnectionConfig,
): Promise<number> {
  const sql = `SELECT COUNT(*) as total FROM ipt WHERE confirm_discharge = 'N'`;
  const response = await executeSqlViaApi(sql, config);
  const rows = parseQueryResponse(response, (row) => Number(row['total'] ?? 0));
  return rows[0] ?? 0;
}

/**
 * Count of admitted patients today.
 */
export async function getTodayAdmittedCount(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<number> {
  const sql = `SELECT COUNT(*) as total FROM ipt WHERE regdate = ${queryBuilder.currentDate(dbType)}`;
  const response = await executeSqlViaApi(sql, config);
  const rows = parseQueryResponse(response, (row) => Number(row['total'] ?? 0));
  return rows[0] ?? 0;
}

/**
 * Count of discharged patients today.
 */
export async function getTodayDischargedCount(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<number> {
  const sql = `SELECT COUNT(*) as total FROM ipt WHERE confirm_discharge = 'Y' AND dchdate = ${queryBuilder.currentDate(dbType)}`;
  const response = await executeSqlViaApi(sql, config);
  const rows = parseQueryResponse(response, (row) => Number(row['total'] ?? 0));
  return rows[0] ?? 0;
}

/**
 * Count of inpatients from yesterday for trend comparison.
 * Uses ward_admit_snapshot table or falls back to ipt table.
 */
export async function getYesterdayIpdPatientCount(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<number> {
  const yesterday = queryBuilder.dateSubtract(dbType, 1);

  // Try to get from ward_admit_snapshot first
  const sql = `SELECT COUNT(*) as total FROM ward_admit_snapshot WHERE snap_date = ${yesterday}`;
  try {
    const response = await executeSqlViaApi(sql, config);
    const rows = parseQueryResponse(response, (row) => Number(row['total'] ?? 0));
    return rows[0] ?? 0;
  } catch {
    // Fallback: estimate from ipt table (patients that were admitted before yesterday and not discharged)
    const fallbackSql =
      `SELECT COUNT(*) as total FROM ipt WHERE regdate < ${yesterday} AND confirm_discharge = 'N'`;
    const response = await executeSqlViaApi(fallbackSql, config);
    const rows = parseQueryResponse(response, (row) => Number(row['total'] ?? 0));
    return rows[0] ?? 0;
  }
}

/**
 * IPD visit breakdown for today: currently admitted, admitted today, discharged today.
 * Also fetches yesterday's total for trend comparison.
 */
export async function getIpdVisitDetail(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<IpdVisitDetail> {
  const [current, yesterdayTotal, todayAdmitted, todayDischarged] = await Promise.all([
    getIpdPatientCount(config),
    getYesterdayIpdPatientCount(config, dbType),
    getTodayAdmittedCount(config, dbType),
    getTodayDischargedCount(config, dbType),
  ]);

  const trendPercent =
    yesterdayTotal > 0
      ? Math.round(((current - yesterdayTotal) / yesterdayTotal) * 100)
      : null;

  return {
    current,
    yesterdayTotal,
    todayAdmitted,
    todayDischarged,
    trendPercent,
    isPositive: (trendPercent ?? 0) >= 0,
  };
}

/**
 * Inpatient count grouped by ward/ward name.
 *
 * Uses the `ward` table if present to resolve a descriptive ward name.
 */
export async function getIpdWardDistribution(
  config: ConnectionConfig,
): Promise<{ wardName: string; patientCount: number; bedCount: number; yesterdayPatientCount?: number; percentageChange?: number }[]> {
  // Get yesterday's total IPD patient count from ward_admit_snapshot
  const yesterday = queryBuilder.dateSubtract('mysql', 1);
  const yesterdayCountSql =
    `SELECT COALESCE(COUNT(*), 0) as yesterday_total FROM ward_admit_snapshot WHERE snap_date = ${yesterday}`;

  let yesterdayTotalCount = 0;
  try {
    const yesterdayResponse = await executeSqlViaApi(yesterdayCountSql, config);
    const yesterdayData = parseQueryResponse(yesterdayResponse, (row) => Number(row['yesterday_total'] ?? 0));
    yesterdayTotalCount = yesterdayData[0] ?? 0;
  } catch {
    // If ward_admit_snapshot query fails, continue without yesterday's data
    yesterdayTotalCount = 0;
  }

  // Some HOSxP installations might not include the `ward` table or may have
  // different column names. We attempt the richer join first, then fallback
  // to a safer query that only relies on the `ipt` table.
  const joinSql =
    `SELECT w.ward as wardcode, w.name as wardname, COUNT(DISTINCT ipt.an) as onward_count ` +
    `FROM ward w, ipt ` +
    `WHERE w.ward = ipt.ward AND ipt.confirm_discharge = 'N' ` +
    `GROUP BY w.ward, wardname ` +
    `ORDER BY onward_count DESC`;

  try {
    const response = await executeSqlViaApi(joinSql, config);
    const currentTotal = parseQueryResponse(response, (row) => Number(row['onward_count'] ?? 0))
      .reduce((sum, count) => sum + count, 0);

    const percentageChange = yesterdayTotalCount > 0
      ? ((currentTotal - yesterdayTotalCount) / yesterdayTotalCount) * 100
      : 0;

    return parseQueryResponse(response, (row) => ({
      wardName: String(row['wardname'] ?? 'ไม่ระบุ'),
      wardCode: String(row['wardcode'] ?? ''),
      patientCount: Number(row['onward_count'] ?? 0),
      bedCount: 0,
      yesterdayPatientCount: yesterdayTotalCount,
      percentageChange: percentageChange,
    }));
  } catch {
    // Fallback: keep the ward code, no bed count.
    const fallbackSql =
      `SELECT ward as wardcode, COALESCE(ward, 'ไม่ระบุ') as ward_name, COUNT(DISTINCT an) as patient_count ` +
      `FROM ipt ` +
      `WHERE confirm_discharge = 'N' ` +
      `GROUP BY ward ` +
      `ORDER BY patient_count DESC`;

    const response = await executeSqlViaApi(fallbackSql, config);
    const currentTotal = parseQueryResponse(response, (row) => Number(row['patient_count'] ?? 0))
      .reduce((sum, count) => sum + count, 0);

    const percentageChange = yesterdayTotalCount > 0
      ? ((currentTotal - yesterdayTotalCount) / yesterdayTotalCount) * 100
      : 0;

    return parseQueryResponse(response, (row) => ({
      wardName: String(row['ward_name'] ?? 'ไม่ระบุ'),
      wardCode: String(row['wardcode'] ?? ''),
      patientCount: Number(row['patient_count'] ?? 0),
      bedCount: 0,
      yesterdayPatientCount: yesterdayTotalCount,
      percentageChange: percentageChange,
    }));
  }
}

// ---------------------------------------------------------------------------
// Appointment stats for today
// ---------------------------------------------------------------------------

export interface AppointmentStats {
  totalAppointments: number;
  attended: number;
  notAttended: number;
  attendanceRate: number;
  lastWeekSameDayTotal: number;
  changePercent: number; // positive = increase, negative = decrease
}

/**
 * Today's appointment statistics: total, attended, not attended, and rate.
 */
export async function getAppointmentStats(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<AppointmentStats> {
  const today = queryBuilder.currentDate(dbType);
  const lastWeekSameDay = queryBuilder.dateSubtract(dbType, 7);

  const [totalResp, attendedResp, notAttendedResp, lastWeekResp] = await Promise.all([
    executeSqlViaApi(
      `SELECT count(distinct hn) as total FROM oapp WHERE (oapp_status_id IS NULL OR oapp_status_id < 4) AND nextdate = ${today}`,
      config,
    ),
    executeSqlViaApi(
      `SELECT count(distinct ovst.hn) as attended FROM oapp, ovst WHERE oapp.hn = ovst.hn AND ovst.vstdate = oapp.nextdate AND (oapp_status_id IS NULL OR oapp_status_id < 4) AND nextdate = ${today}`,
      config,
    ),
    executeSqlViaApi(
      `SELECT count(distinct oapp.hn) as not_attended FROM oapp LEFT JOIN ovst ON oapp.hn = ovst.hn AND ovst.vstdate = oapp.nextdate WHERE (oapp_status_id IS NULL OR oapp_status_id < 4) AND nextdate = ${today} AND ovst.hn IS NULL`,
      config,
    ),
    executeSqlViaApi(
      `SELECT count(distinct hn) as total FROM oapp WHERE nextdate = ${lastWeekSameDay}`,
      config,
    ),
  ]);

  const total = parseQueryResponse(totalResp, (row) => Number(row['total'] ?? 0))[0] ?? 0;
  const attended = parseQueryResponse(attendedResp, (row) => Number(row['attended'] ?? 0))[0] ?? 0;
  const notAttended = parseQueryResponse(notAttendedResp, (row) => Number(row['not_attended'] ?? 0))[0] ?? 0;
  const lastWeekSameDayTotal = parseQueryResponse(lastWeekResp, (row) => Number(row['total'] ?? 0))[0] ?? 0;
  const attendanceRate = total > 0 ? Math.round((attended / total) * 100) : 0;
  const changePercent = lastWeekSameDayTotal > 0
    ? Math.round(((total - lastWeekSameDayTotal) / lastWeekSameDayTotal) * 100)
    : 0;

  return { totalAppointments: total, attended, notAttended, attendanceRate, lastWeekSameDayTotal, changePercent };
}

/**
 * Count of ER visits for today.
 */
export async function getErVisitCount(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<number> {
  const sql = `SELECT COUNT(*) as total FROM er_regist WHERE vstdate = ${queryBuilder.currentDate(dbType)}`;
  const response = await executeSqlViaApi(sql, config);
  const rows = parseQueryResponse(response, (row) => Number(row['total'] ?? 0));
  return rows[0] ?? 0;
}

/**
 * Count of distinct departments with visits today.
 */
export async function getActiveDepartmentCount(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<number> {
  const sql =
    `SELECT COUNT(DISTINCT k.depcode) as total ` +
    `FROM ovst o LEFT JOIN kskdepartment k ON o.cur_dep = k.depcode ` +
    `WHERE o.vstdate = ${queryBuilder.currentDate(dbType)}`;
  const response = await executeSqlViaApi(sql, config);
  const rows = parseQueryResponse(response, (row) => Number(row['total'] ?? 0));
  return rows[0] ?? 0;
}

/**
 * Count of ER visits from yesterday for trend comparison.
 */
export async function getYesterdayErVisitCount(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<number> {
  const yesterday = queryBuilder.dateSubtract(dbType, 1);
  const sql = `SELECT COUNT(*) as total FROM er_regist WHERE vstdate = ${yesterday}`;
  const response = await executeSqlViaApi(sql, config);
  const rows = parseQueryResponse(response, (row) => Number(row['total'] ?? 0));
  return rows[0] ?? 0;
}

/**
 * ER patients breakdown by triage color for today.
 * Returns counts for each triage level (red, pink, yellow, green, white).
 */
export async function getErTriageBreakdown(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<{
  redCount: number
  pinkCount: number
  yellowCount: number
  greenCount: number
  whiteCount: number
}> {
  const sql =
    `SELECT ` +
    `COUNT(CASE WHEN et.export_code = '1' THEN rg.vn END) as red_count, ` +
    `COUNT(CASE WHEN et.export_code = '2' THEN rg.vn END) as pink_count, ` +
    `COUNT(CASE WHEN et.export_code = '3' THEN rg.vn END) as yellow_count, ` +
    `COUNT(CASE WHEN et.export_code = '4' THEN rg.vn END) as green_count, ` +
    `COUNT(CASE WHEN et.export_code = '5' OR et.export_code IS NULL THEN rg.vn END) as white_count ` +
    `FROM er_regist rg ` +
    `LEFT JOIN er_emergency_type et ON rg.er_emergency_type = et.er_emergency_type ` +
    `WHERE rg.vstdate = ${queryBuilder.currentDate(dbType)}`

  const response = await executeSqlViaApi(sql, config);
  const rows = parseQueryResponse(response, (row) => ({
    redCount: Number(row['red_count'] ?? 0),
    pinkCount: Number(row['pink_count'] ?? 0),
    yellowCount: Number(row['yellow_count'] ?? 0),
    greenCount: Number(row['green_count'] ?? 0),
    whiteCount: Number(row['white_count'] ?? 0),
  }));

  return rows[0] ?? {
    redCount: 0,
    pinkCount: 0,
    yellowCount: 0,
    greenCount: 0,
    whiteCount: 0,
  };
}

/**
 * ER visit detail combining today's count, yesterday's count, and triage breakdown.
 */
export async function getErVisitDetail(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<ErVisitDetail> {
  const [todayTotal, yesterdayTotal, triageBreakdown] = await Promise.all([
    getErVisitCount(config, dbType),
    getYesterdayErVisitCount(config, dbType),
    getErTriageBreakdown(config, dbType),
  ])

  const trendPercent =
    yesterdayTotal > 0
      ? Math.round(((todayTotal - yesterdayTotal) / yesterdayTotal) * 100)
      : null

  return {
    total: todayTotal,
    yesterdayTotal,
    trendPercent,
    isPositive: (trendPercent ?? 0) >= 0,
    ...triageBreakdown,
  }
}

/**
 * Per-department visit counts for today, ordered by volume descending.
 */
export async function getDepartmentWorkload(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<DepartmentWorkload[]> {
  const sql =
    `SELECT k.depcode as department_code, k.department as department_name, COUNT(*) as visit_count ` +
    `FROM ovst o LEFT JOIN kskdepartment k ON o.cur_dep = k.depcode ` +
    `WHERE o.vstdate = ${queryBuilder.currentDate(dbType)} ` +
    `GROUP BY k.depcode, k.department ` +
    `ORDER BY visit_count DESC`;
  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    departmentCode: String(row['department_code'] ?? ''),
    departmentName: String(row['department_name'] ?? ''),
    visitCount: Number(row['visit_count'] ?? 0),
  }));
}

/**
 * Aggregate overview KPI summary (all four counts fetched in parallel).
 */
export async function getKpiSummary(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<KpiSummary> {
  const [opdVisitCount, ipdPatientCount, erVisitCount, activeDepartmentCount] =
    await Promise.all([
      getOpdVisitCount(config, dbType),
      getIpdPatientCount(config),
      getErVisitCount(config, dbType),
      getActiveDepartmentCount(config, dbType),
    ]);

  return {
    opdVisitCount,
    ipdPatientCount,
    erVisitCount,
    activeDepartmentCount,
    timestamp: new Date(),
  };
}

// ---------------------------------------------------------------------------
// US2 - Trend KPIs
// ---------------------------------------------------------------------------

/**
 * Daily visit counts grouped by date within the given range.
 */
export async function getDailyVisitTrend(
  config: ConnectionConfig,
  dbType: DatabaseType,
  startDate: string,
  endDate: string,
): Promise<VisitTrend[]> {
  const dateExpr = queryBuilder.dateFormat(dbType, 'vstdate', '%Y-%m-%d');
  const sql =
    `SELECT ${dateExpr} as visit_date, COUNT(*) as visit_count ` +
    `FROM ovst ` +
    `WHERE vstdate >= '${startDate}' AND vstdate <= '${endDate}' ` +
    `GROUP BY ${dateExpr} ` +
    `ORDER BY visit_date ASC`;
  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    date: String(row['visit_date'] ?? ''),
    visitCount: Number(row['visit_count'] ?? 0),
  }));
}

/**
 * Hourly visit distribution for a single date.
 */
export async function getHourlyDistribution(
  config: ConnectionConfig,
  dbType: DatabaseType,
  date: string,
): Promise<HourlyDistribution[]> {
  const hourExpr = queryBuilder.hourExtract(dbType, 'vsttime');
  const sql =
    `SELECT ${hourExpr} as visit_hour, COUNT(*) as visit_count ` +
    `FROM ovst ` +
    `WHERE vstdate = '${date}' ` +
    `GROUP BY ${hourExpr} ` +
    `ORDER BY visit_hour ASC`;
  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    hour: Number(row['visit_hour'] ?? 0),
    visitCount: Number(row['visit_count'] ?? 0),
  }));
}

// ---------------------------------------------------------------------------
// US3 - Department / Doctor KPIs
// ---------------------------------------------------------------------------

/**
 * Department-level visit breakdown for a date range.
 */
export async function getDepartmentBreakdown(
  config: ConnectionConfig,
  _dbType: DatabaseType,
  startDate: string,
  endDate: string,
): Promise<DepartmentWorkload[]> {
  const sql =
    `SELECT k.depcode as department_code, k.department as department_name, COUNT(*) as visit_count ` +
    `FROM ovst o LEFT JOIN kskdepartment k ON o.cur_dep = k.depcode ` +
    `WHERE o.vstdate >= '${startDate}' AND o.vstdate <= '${endDate}' ` +
    `GROUP BY k.depcode, k.department ` +
    `ORDER BY visit_count DESC`;
  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    departmentCode: String(row['department_code'] ?? ''),
    departmentName: String(row['department_name'] ?? ''),
    visitCount: Number(row['visit_count'] ?? 0),
  }));
}

/**
 * Doctor workload (patient counts) for a date range, optionally filtered by
 * department. Results are capped at 50 rows.
 */
export async function getDoctorWorkload(
  config: ConnectionConfig,
  _dbType: DatabaseType,
  startDate: string,
  endDate: string,
  depcode?: string,
): Promise<DoctorWorkload[]> {
  const depFilter = depcode
    ? ` AND o.cur_dep = '${depcode}'`
    : '';
  const sql =
    `SELECT o.doctor as doctor_code, d.name as doctor_name, COUNT(*) as patient_count ` +
    `FROM ovst o LEFT JOIN doctor d ON o.doctor = d.code ` +
    `WHERE o.vstdate >= '${startDate}' AND o.vstdate <= '${endDate}'${depFilter} ` +
    `GROUP BY o.doctor, d.name ` +
    `ORDER BY patient_count DESC ` +
    `LIMIT 50`;
  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    doctorCode: String(row['doctor_code'] ?? ''),
    doctorName: String(row['doctor_name'] ?? ''),
    patientCount: Number(row['patient_count'] ?? 0),
  }));
}

/**
 * Daily visit trend for a specific department within a date range.
 */
export async function getDepartmentDailyTrend(
  config: ConnectionConfig,
  dbType: DatabaseType,
  depcode: string,
  startDate: string,
  endDate: string,
): Promise<VisitTrend[]> {
  const dateExpr = queryBuilder.dateFormat(dbType, 'o.vstdate', '%Y-%m-%d');
  const sql =
    `SELECT ${dateExpr} as visit_date, COUNT(*) as visit_count ` +
    `FROM ovst o ` +
    `WHERE o.vstdate >= '${startDate}' AND o.vstdate <= '${endDate}' ` +
    `AND o.cur_dep = '${depcode}' ` +
    `GROUP BY ${dateExpr} ` +
    `ORDER BY visit_date ASC`;
  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    date: String(row['visit_date'] ?? ''),
    visitCount: Number(row['visit_count'] ?? 0),
  }));
}

// ---------------------------------------------------------------------------
// US4 - Demographics KPIs
// ---------------------------------------------------------------------------

/**
 * Gender distribution for visits within a date range.
 *
 * Attempts the `patient` table first. If the result set is empty (e.g. the
 * table is not populated), falls back to `ovst_patient_record`.
 */
export async function getGenderDistribution(
  config: ConnectionConfig,
  _dbType: DatabaseType,
  startDate: string,
  endDate: string,
): Promise<{ gender: string; count: number; dataSource: 'patient' | 'ovst_patient_record' }[]> {
  // Try patient table first
  const patientCountSql =
    `SELECT COUNT(*) as total ` +
    `FROM ovst o INNER JOIN patient p ON o.hn = p.hn ` +
    `WHERE o.vstdate >= '${startDate}' AND o.vstdate <= '${endDate}'`;
  const countResponse = await executeSqlViaApi(patientCountSql, config);
  const totalRows = parseQueryResponse(countResponse, (row) => Number(row['total'] ?? 0));
  const patientCount = totalRows[0] ?? 0;

  if (patientCount > 0) {
    const sql =
      `SELECT p.sex as gender, COUNT(*) as count ` +
      `FROM ovst o INNER JOIN patient p ON o.hn = p.hn ` +
      `WHERE o.vstdate >= '${startDate}' AND o.vstdate <= '${endDate}' ` +
      `GROUP BY p.sex ` +
      `ORDER BY count DESC`;
    const response = await executeSqlViaApi(sql, config);
    return parseQueryResponse(response, (row) => ({
      gender: String(row['gender'] ?? ''),
      count: Number(row['count'] ?? 0),
      dataSource: 'patient' as const,
    }));
  }

  // Fallback to ovst_patient_record
  const fallbackSql =
    `SELECT opr.sex as gender, COUNT(*) as count ` +
    `FROM ovst o INNER JOIN ovst_patient_record opr ON o.vn = opr.vn ` +
    `WHERE o.vstdate >= '${startDate}' AND o.vstdate <= '${endDate}' ` +
    `GROUP BY opr.sex ` +
    `ORDER BY count DESC`;
  const fallbackResponse = await executeSqlViaApi(fallbackSql, config);
  return parseQueryResponse(fallbackResponse, (row) => ({
    gender: String(row['gender'] ?? ''),
    count: Number(row['count'] ?? 0),
    dataSource: 'ovst_patient_record' as const,
  }));
}

/**
 * Age group distribution for visits within a date range.
 *
 * Groups: Infant (<1), Child (<13), Teenager (<20), Young Adult (<40),
 * Middle Age (<60), Senior (>=60).
 *
 * Uses {@link queryBuilder.ageCalc} to handle MySQL vs PostgreSQL age
 * calculation differences.
 */
export async function getAgeGroupDistribution(
  config: ConnectionConfig,
  dbType: DatabaseType,
  startDate: string,
  endDate: string,
): Promise<{ group: string; count: number }[]> {
  const age = queryBuilder.ageCalc(dbType, 'p.birthday');
  const sql =
    `SELECT ` +
    `CASE ` +
    `  WHEN ${age} < 1 THEN 'Infant' ` +
    `  WHEN ${age} < 13 THEN 'Child' ` +
    `  WHEN ${age} < 20 THEN 'Teenager' ` +
    `  WHEN ${age} < 40 THEN 'Young Adult' ` +
    `  WHEN ${age} < 60 THEN 'Middle Age' ` +
    `  ELSE 'Senior' ` +
    `END as age_group, ` +
    `COUNT(*) as count ` +
    `FROM ovst o INNER JOIN patient p ON o.hn = p.hn ` +
    `WHERE o.vstdate >= '${startDate}' AND o.vstdate <= '${endDate}' ` +
    `AND p.birthday IS NOT NULL ` +
    `GROUP BY age_group ` +
    `ORDER BY count DESC`;
  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    group: String(row['age_group'] ?? ''),
    count: Number(row['count'] ?? 0),
  }));
}

/**
 * Patient type (pttype) distribution for visits within a date range.
 */
export async function getPatientTypeDistribution(
  config: ConnectionConfig,
  _dbType: DatabaseType,
  startDate: string,
  endDate: string,
): Promise<PatientTypeDistribution[]> {
  const sql =
    `SELECT o.pttype as pttype_code, pt.name as pttype_name, COUNT(*) as visit_count ` +
    `FROM ovst o LEFT JOIN pttype pt ON o.pttype = pt.pttype ` +
    `WHERE o.vstdate >= '${startDate}' AND o.vstdate <= '${endDate}' ` +
    `GROUP BY o.pttype, pt.name ` +
    `ORDER BY visit_count DESC`;
  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    pttypeCode: String(row['pttype_code'] ?? ''),
    pttypeName: String(row['pttype_name'] ?? ''),
    visitCount: Number(row['visit_count'] ?? 0),
  }));
}

// ---------------------------------------------------------------------------
// Overview - Extended Stats & Recent Activity
// ---------------------------------------------------------------------------

/**
 * Get recent visits (last 10) with department and doctor names.
 */
export async function getRecentVisits(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<RecentVisit[]> {
  const sql =
    `SELECT o.vn, o.hn, ` +
    `${queryBuilder.dateFormat(dbType, 'o.vstdate', '%Y-%m-%d')} as vstdate, ` +
    `${queryBuilder.castToText(dbType, 'o.vsttime')} as vsttime, ` +
    `COALESCE(k.department, 'Unknown') as department_name, ` +
    `COALESCE(d.name, 'Unknown') as doctor_name ` +
    `FROM ovst o ` +
    `LEFT JOIN kskdepartment k ON o.cur_dep = k.depcode ` +
    `LEFT JOIN doctor d ON o.doctor = d.code ` +
    `ORDER BY o.vstdate DESC, o.vsttime DESC ` +
    `LIMIT 10`;
  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    vn: String(row['vn'] ?? ''),
    hn: String(row['hn'] ?? ''),
    vstdate: String(row['vstdate'] ?? ''),
    vsttime: String(row['vsttime'] ?? ''),
    departmentName: String(row['department_name'] ?? 'Unknown'),
    doctorName: String(row['doctor_name'] ?? 'Unknown'),
  }));
}

/**
 * Get overview statistics for the dashboard.
 */
export async function getOverviewStats(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<OverviewStats> {
  // Use simpler approach - run individual queries
  const queries = [
    // Total registered patients (from ovst_patient_record distinct hn)
    `SELECT COUNT(DISTINCT hn) as total FROM ovst_patient_record`,
    // Total visits this month
    `SELECT COUNT(*) as total FROM ovst WHERE ${queryBuilder.dateFormat(dbType, 'vstdate', '%Y-%m')} = ${queryBuilder.dateFormat(dbType, queryBuilder.currentDate(dbType), '%Y-%m')}`,
    // Total visits last month - use a date range approach
    `SELECT COUNT(*) as total FROM ovst WHERE vstdate >= ${queryBuilder.dateSubtract(dbType, 60)} AND vstdate < ${queryBuilder.dateSubtract(dbType, 30)}`,
    // Total active doctors
    `SELECT COUNT(*) as total FROM doctor WHERE active = 'Y' OR active IS NULL`,
    // Total departments
    `SELECT COUNT(*) as total FROM kskdepartment`,
  ];

  const results = await Promise.all(
    queries.map(sql => executeSqlViaApi(sql, config).then(r => {
      const rows = parseQueryResponse(r, (row) => Number(row['total'] ?? 0));
      return rows[0] ?? 0;
    }).catch(() => 0))
  );

  const totalVisitsThisMonth = results[1];
  const daysInMonth = new Date().getDate();

  return {
    totalRegisteredPatients: results[0],
    totalVisitsThisMonth: results[1],
    totalVisitsLastMonth: results[2],
    avgDailyVisitsThisMonth: daysInMonth > 0 ? Math.round(totalVisitsThisMonth / daysInMonth) : 0,
    totalDoctors: results[3],
    totalDepartments: results[4],
  };
}

/**
 * Get visit counts for the last 7 days as a mini trend.
 */
export async function getWeeklyMiniTrend(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<VisitTrend[]> {
  const sql =
    `SELECT ${queryBuilder.dateFormat(dbType, 'vstdate', '%Y-%m-%d')} as visit_date, COUNT(*) as visit_count ` +
    `FROM ovst ` +
    `WHERE vstdate >= ${queryBuilder.dateSubtract(dbType, 7)} ` +
    `AND vstdate <= ${queryBuilder.currentDate(dbType)} ` +
    `GROUP BY ${queryBuilder.dateFormat(dbType, 'vstdate', '%Y-%m-%d')} ` +
    `ORDER BY visit_date`;
  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    date: String(row['visit_date'] ?? ''),
    visitCount: Number(row['visit_count'] ?? 0),
  }));
}

/**
 * Get top 10 doctors by patient count for the current month.
 */
export async function getTopDoctorsThisMonth(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<DoctorWorkload[]> {
  const sql =
    `SELECT o.doctor as doctor_code, d.name as doctor_name, COUNT(*) as patient_count ` +
    `FROM ovst o ` +
    `LEFT JOIN doctor d ON o.doctor = d.code ` +
    `WHERE ${queryBuilder.dateFormat(dbType, 'o.vstdate', '%Y-%m')} = ${queryBuilder.dateFormat(dbType, queryBuilder.currentDate(dbType), '%Y-%m')} ` +
    `GROUP BY o.doctor, d.name ` +
    `ORDER BY patient_count DESC ` +
    `LIMIT 10`;
  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    doctorCode: String(row['doctor_code'] ?? ''),
    doctorName: String(row['doctor_name'] ?? 'Unknown'),
    patientCount: Number(row['patient_count'] ?? 0),
  }));
}

// ---------------------------------------------------------------------------
// Today's OPD visits by clinic/specialty
// ---------------------------------------------------------------------------

export interface ClinicVisitCount {
  clinicName: string;
  visitCount: number;
}

/**
 * Count of distinct OPD visits today, grouped by specialty (clinic),
 * ordered descending by visit count.
 */
export async function getTodayVisitsByClinic(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<ClinicVisitCount[]> {
  const today = queryBuilder.currentDate(dbType);
  const sql =
    `SELECT sp.name as spclty_name, count(distinct o.vn) as visit_count ` +
    `FROM ovst o, spclty sp ` +
    `WHERE o.spclty = sp.spclty ` +
    `AND o.vstdate = ${today} ` +
    `GROUP BY spclty_name ` +
    `ORDER BY visit_count DESC`;
  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    clinicName: String(row['spclty_name'] ?? 'ไม่ระบุ'),
    visitCount: Number(row['visit_count'] ?? 0),
  }));
}

// ---------------------------------------------------------------------------
// Trend Summary & Extended Trend KPIs
// ---------------------------------------------------------------------------

/**
 * Trend summary statistics for a date range.
 */
export interface TrendSummary {
  totalVisits: number
  avgDailyVisits: number
  peakDay: { date: string; count: number } | null
  lowestDay: { date: string; count: number } | null
  totalDays: number
  daysWithVisits: number
}

export function computeTrendSummary(trends: VisitTrend[]): TrendSummary {
  if (trends.length === 0) {
    return { totalVisits: 0, avgDailyVisits: 0, peakDay: null, lowestDay: null, totalDays: 0, daysWithVisits: 0 }
  }
  const totalVisits = trends.reduce((sum, t) => sum + t.visitCount, 0)
  const daysWithVisits = trends.filter(t => t.visitCount > 0).length
  const sorted = [...trends].sort((a, b) => b.visitCount - a.visitCount)
  return {
    totalVisits,
    avgDailyVisits: Math.round(totalVisits / trends.length),
    peakDay: sorted[0] ? { date: sorted[0].date, count: sorted[0].visitCount } : null,
    lowestDay: sorted[sorted.length - 1] ? { date: sorted[sorted.length - 1].date, count: sorted[sorted.length - 1].visitCount } : null,
    totalDays: trends.length,
    daysWithVisits,
  }
}

/**
 * Monthly visit summary for the last 6 months.
 */
export async function getMonthlyVisitSummary(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<{ month: string; visitCount: number }[]> {
  const monthExpr = queryBuilder.dateFormat(dbType, 'vstdate', '%Y-%m');
  const sql =
    `SELECT ${monthExpr} as visit_month, COUNT(*) as visit_count ` +
    `FROM ovst ` +
    `WHERE vstdate >= ${queryBuilder.dateSubtract(dbType, 180)} ` +
    `GROUP BY ${monthExpr} ` +
    `ORDER BY visit_month ASC`;
  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    month: String(row['visit_month'] ?? ''),
    visitCount: Number(row['visit_count'] ?? 0),
  }));
}

/**
 * Visit counts by day of week for a date range.
 */
export async function getVisitsByDayOfWeek(
  config: ConnectionConfig,
  dbType: DatabaseType,
  startDate: string,
  endDate: string,
): Promise<{ dayOfWeek: number; dayName: string; visitCount: number }[]> {
  // Use day of week extraction - MySQL DAYOFWEEK (1=Sun..7=Sat), PostgreSQL EXTRACT(DOW) (0=Sun..6=Sat)
  const dowExpr = dbType === 'mysql'
    ? 'DAYOFWEEK(vstdate)'
    : "EXTRACT(DOW FROM vstdate)::int";
  const sql =
    `SELECT ${dowExpr} as day_of_week, COUNT(*) as visit_count ` +
    `FROM ovst ` +
    `WHERE vstdate >= '${startDate}' AND vstdate <= '${endDate}' ` +
    `GROUP BY ${dowExpr} ` +
    `ORDER BY day_of_week ASC`;
  const response = await executeSqlViaApi(sql, config);

  const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

  return parseQueryResponse(response, (row) => {
    let dow = Number(row['day_of_week'] ?? 0);
    // MySQL: 1=Sun..7=Sat -> normalize to 0=Sun..6=Sat
    if (dbType === 'mysql') dow = dow - 1;
    return {
      dayOfWeek: dow,
      dayName: dayNames[dow] ?? `วัน ${dow}`,
      visitCount: Number(row['visit_count'] ?? 0),
    };
  });
}

/**
 * Top 5 departments by visit count for a date range.
 */
export async function getTopDepartmentsForRange(
  config: ConnectionConfig,
  _dbType: DatabaseType,
  startDate: string,
  endDate: string,
): Promise<DepartmentWorkload[]> {
  const sql =
    `SELECT k.depcode as department_code, k.department as department_name, COUNT(*) as visit_count ` +
    `FROM ovst o LEFT JOIN kskdepartment k ON o.cur_dep = k.depcode ` +
    `WHERE o.vstdate >= '${startDate}' AND o.vstdate <= '${endDate}' ` +
    `GROUP BY k.depcode, k.department ` +
    `ORDER BY visit_count DESC ` +
    `LIMIT 5`;
  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    departmentCode: String(row['department_code'] ?? ''),
    departmentName: String(row['department_name'] ?? ''),
    visitCount: Number(row['visit_count'] ?? 0),
  }));
}

// ---------------------------------------------------------------------------
// Diagnosis, Medication Cost & Death Statistics (Trends page)
// ---------------------------------------------------------------------------

/**
 * Top 10 diagnoses by visit count for a date range.
 * Joins ovstdiag with icd101 for Thai diagnosis names.
 */
export async function getTopDiagnoses(
  config: ConnectionConfig,
  _dbType: DatabaseType,
  startDate: string,
  endDate: string,
): Promise<{ icd10: string; diagnosisName: string; visitCount: number }[]> {
  const sql =
    `SELECT od.icd10, COALESCE(i.tname, i.name, od.icd10) as diagnosis_name, COUNT(*) as visit_count ` +
    `FROM ovstdiag od ` +
    `LEFT JOIN icd101 i ON od.icd10 = i.code ` +
    `WHERE od.vstdate >= '${startDate}' AND od.vstdate <= '${endDate}' ` +
    `GROUP BY od.icd10, i.tname, i.name ` +
    `ORDER BY visit_count DESC ` +
    `LIMIT 10`;
  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    icd10: String(row['icd10'] ?? ''),
    diagnosisName: String(row['diagnosis_name'] ?? ''),
    visitCount: Number(row['visit_count'] ?? 0),
  }));
}

/**
 * Top 10 medications by total cost for a date range.
 * Joins opitemrece with drugitems for drug names.
 */
export async function getTopMedications(
  config: ConnectionConfig,
  _dbType: DatabaseType,
  startDate: string,
  endDate: string,
): Promise<{ drugName: string; totalQty: number; totalCost: number }[]> {
  const sql =
    `SELECT COALESCE(d.name, 'ไม่ระบุ') as drug_name, ` +
    `SUM(op.qty) as total_qty, ` +
    `SUM(op.qty * op.unitprice) as total_cost ` +
    `FROM opitemrece op ` +
    `LEFT JOIN drugitems d ON op.icode = d.icode ` +
    `WHERE op.vstdate >= '${startDate}' AND op.vstdate <= '${endDate}' ` +
    `GROUP BY d.name ` +
    `ORDER BY total_cost DESC ` +
    `LIMIT 10`;
  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    drugName: String(row['drug_name'] ?? 'ไม่ระบุ'),
    totalQty: Number(row['total_qty'] ?? 0),
    totalCost: Number(row['total_cost'] ?? 0),
  }));
}

/**
 * Medication cost summary for a date range.
 */
export async function getMedicationCostSummary(
  config: ConnectionConfig,
  _dbType: DatabaseType,
  startDate: string,
  endDate: string,
): Promise<{ totalItems: number; totalCost: number; uniqueDrugs: number }> {
  const sql =
    `SELECT COUNT(*) as total_items, ` +
    `COALESCE(SUM(qty * unitprice), 0) as total_cost, ` +
    `COUNT(DISTINCT icode) as unique_drugs ` +
    `FROM opitemrece ` +
    `WHERE vstdate >= '${startDate}' AND vstdate <= '${endDate}'`;
  const response = await executeSqlViaApi(sql, config);
  const rows = parseQueryResponse(response, (row) => ({
    totalItems: Number(row['total_items'] ?? 0),
    totalCost: Number(row['total_cost'] ?? 0),
    uniqueDrugs: Number(row['unique_drugs'] ?? 0),
  }));
  return rows[0] ?? { totalItems: 0, totalCost: 0, uniqueDrugs: 0 };
}

/**
 * Death statistics summary.
 */
export async function getDeathSummary(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<{ totalDeaths: number; thisYearDeaths: number; thisMonthDeaths: number }> {
  void dbType; // parameter reserved for future db-aware date formatting
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const yearStart = `${currentYear}-01-01`;
  const monthStart = `${currentYear}-${currentMonth}-01`;

  const sql =
    `SELECT ` +
    `COUNT(*) as total_deaths, ` +
    `SUM(CASE WHEN death_date >= '${yearStart}' THEN 1 ELSE 0 END) as this_year, ` +
    `SUM(CASE WHEN death_date >= '${monthStart}' THEN 1 ELSE 0 END) as this_month ` +
    `FROM death`;
  const response = await executeSqlViaApi(sql, config);
  const rows = parseQueryResponse(response, (row) => ({
    totalDeaths: Number(row['total_deaths'] ?? 0),
    thisYearDeaths: Number(row['this_year'] ?? 0),
    thisMonthDeaths: Number(row['this_month'] ?? 0),
  }));
  return rows[0] ?? { totalDeaths: 0, thisYearDeaths: 0, thisMonthDeaths: 0 };
}

/**
 * Visit count grouped by specialty (spclty) for the current month.
 * Counts all visits from ovst (OPD + IPD). Returns all departments ordered by count desc.
 */
export async function getOpdDepartmentThisMonth(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<{ departmentName: string; visitCount: number }[]> {
  const monthExpr = queryBuilder.dateFormat(dbType, 'ovst.vstdate', '%Y-%m');
  const currentMonthExpr = queryBuilder.dateFormat(dbType, queryBuilder.currentDate(dbType), '%Y-%m');
  const sql =
    `SELECT s.name as spclty_name, COUNT(DISTINCT ovst.vn) as count_vn ` +
    `FROM ovst ` +
    `INNER JOIN spclty s ON s.spclty = ovst.spclty ` +
    `WHERE ${monthExpr} = ${currentMonthExpr} ` +
    `GROUP BY s.name ` +
    `ORDER BY count_vn DESC`;
  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    departmentName: String(row['spclty_name'] ?? ''),
    visitCount: Number(row['count_vn'] ?? 0),
  }));
}

/**
 * Total diagnosis count and unique ICD10 codes for a date range.
 */
export async function getDiagnosisSummary(
  config: ConnectionConfig,
  _dbType: DatabaseType,
  startDate: string,
  endDate: string,
): Promise<{ totalDiagnoses: number; uniqueCodes: number }> {
  const sql =
    `SELECT COUNT(*) as total_diagnoses, COUNT(DISTINCT icd10) as unique_codes ` +
    `FROM ovstdiag ` +
    `WHERE vstdate >= '${startDate}' AND vstdate <= '${endDate}'`;
  const response = await executeSqlViaApi(sql, config);
  const rows = parseQueryResponse(response, (row) => ({
    totalDiagnoses: Number(row['total_diagnoses'] ?? 0),
    uniqueCodes: Number(row['unique_codes'] ?? 0),
  }));
  return rows[0] ?? { totalDiagnoses: 0, uniqueCodes: 0 };
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
      CONCAT(d2.name, ' ', d1.ttcode) AS tm_name,
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
    WHERE upper(doctor.name NOT LIKE '%BMS%' 
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

// ---------------------------------------------------------------------------
// Refer-in / Refer-out stats for today
// ---------------------------------------------------------------------------

export interface ReferStats {
  referIn: number;
  referOut: number;
}

export async function getReferStats(
  config: ConnectionConfig,
): Promise<ReferStats> {
  const [inResp, outResp] = await Promise.all([
    executeSqlViaApi(
      `SELECT count(distinct hn) as total FROM referin WHERE refer_date = current_date`,
      config,
    ),
    executeSqlViaApi(
      `SELECT count(distinct hn) as total FROM referout WHERE refer_date = current_date`,
      config,
    ),
  ]);
  const referIn = parseQueryResponse(inResp, (row) => Number(row['total'] ?? 0))[0] ?? 0;
  const referOut = parseQueryResponse(outResp, (row) => Number(row['total'] ?? 0))[0] ?? 0;
  return { referIn, referOut };
}

// ---------------------------------------------------------------------------
// Revenue stats for today (total, self-pay, receivable)
// ---------------------------------------------------------------------------

export interface RevenueStats {
  totalAmount: number;
  selfPayAmount: number;
  receivableAmount: number;
}

export async function getRevenueStats(
  config: ConnectionConfig,
): Promise<RevenueStats> {
  const [totalResp, selfPayResp, receivableResp] = await Promise.all([
    executeSqlViaApi(
      `SELECT sum(coalesce(sum_price,0)) as total FROM opitemrece WHERE vstdate = current_date AND vn <> ''`,
      config,
    ),
    executeSqlViaApi(
      `SELECT sum(coalesce(sum_price,0)) as total FROM opitemrece WHERE vstdate = current_date AND vn <> '' AND paidst IN('01','03')`,
      config,
    ),
    executeSqlViaApi(
      `SELECT sum(coalesce(sum_price,0)) as total FROM opitemrece WHERE vstdate = current_date AND vn <> '' AND paidst NOT IN('01','03')`,
      config,
    ),
  ]);
  const totalAmount = parseQueryResponse(totalResp, (row) => Number(row['total'] ?? 0))[0] ?? 0;
  const selfPayAmount = parseQueryResponse(selfPayResp, (row) => Number(row['total'] ?? 0))[0] ?? 0;
  const receivableAmount = parseQueryResponse(receivableResp, (row) => Number(row['total'] ?? 0))[0] ?? 0;
  return { totalAmount, selfPayAmount, receivableAmount };
}

// ---------------------------------------------------------------------------
// Bed availability stats (today)
// ---------------------------------------------------------------------------

export interface BedStats {
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  systemBeds: number;
}

export async function getBedStats(config: ConnectionConfig): Promise<BedStats> {
  const [totalResp, occupiedResp, systemBedsResp] = await Promise.all([
    executeSqlViaApi(
      `SELECT sum(coalesce(bedcount,0)) as total FROM ward WHERE ward_active='Y'`,
      config,
    ),
    executeSqlViaApi(
      `SELECT count(distinct i.an) as total ` +
      `FROM ipt i, ward w ` +
      `WHERE i.ward = w.ward ` +
      `AND i.confirm_discharge = 'N' ` +
      `AND w.ward_active = 'Y' ` +
      `AND lower(w.name) NOT LIKE '%home%ward%'`,
      config,
    ),
    executeSqlViaApi(
      `SELECT count(distinct b.bedno) as total ` +
      `FROM roomno r, bedno b, bed_status_type bt, ward w ` +
      `WHERE r.roomno = b.roomno ` +
      `AND b.bed_status_type_id = bt.bed_status_type_id ` +
      `AND bt.is_available = 'Y' ` +
      `AND w.ward_active = 'Y' ` +
      `AND r.name NOT LIKE '%เสริม%' ` +
      `AND r.name NOT LIKE '%แทรก%' ` +
      `AND r.name NOT LIKE '%ยกเลิก%' ` +
      `AND r.name NOT LIKE '%รอรับ%' ` +
      `AND b.bed_status_type_id = 1 ` +
      `AND lower(w.name) NOT LIKE '%home%ward%'`,
      config,
    ),
  ]);
  const totalBeds = parseQueryResponse(totalResp, (row) => Number(row['total'] ?? 0))[0] ?? 0;
  const occupiedBeds = parseQueryResponse(occupiedResp, (row) => Number(row['total'] ?? 0))[0] ?? 0;
  const systemBeds = parseQueryResponse(systemBedsResp, (row) => Number(row['total'] ?? 0))[0] ?? 0;
  return { totalBeds, occupiedBeds, availableBeds: Math.max(0, systemBeds - occupiedBeds), systemBeds };
}

// ---------------------------------------------------------------------------
// Bed occupancy rate for current month
// ---------------------------------------------------------------------------

export interface BedOccupancyStats {
  occupancyRate: number;
  admitDays: number;
  totalBeds: number;
  daysInPeriod: number;
}

export async function getBedOccupancyStats(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<BedOccupancyStats> {
  const firstDay = queryBuilder.firstDayOfMonth(dbType);
  const today = queryBuilder.currentDate(dbType);

  const [admitDaysResp, totalBedsResp] = await Promise.all([
    executeSqlViaApi(
      `SELECT count(*) as total FROM ward_admit_snapshot WHERE snap_date >= ${firstDay} AND snap_date <= ${today}`,
      config,
    ),
    executeSqlViaApi(
      `SELECT sum(coalesce(bedcount,0)) as total FROM ward WHERE ward_active='Y'`,
      config,
    ),
  ]);

  const admitDays = parseQueryResponse(admitDaysResp, (row) => Number(row['total'] ?? 0))[0] ?? 0;
  const totalBeds = parseQueryResponse(totalBedsResp, (row) => Number(row['total'] ?? 0))[0] ?? 0;

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInPeriod = Math.floor((now.getTime() - firstOfMonth.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const denominator = daysInPeriod * totalBeds;
  const occupancyRate = denominator > 0
    ? Math.round((admitDays * 1000) / denominator) / 10
    : 0;

  return { occupancyRate, admitDays, totalBeds, daysInPeriod };
}

// ---------------------------------------------------------------------------
// AdjRW sum for current month
// ---------------------------------------------------------------------------

export interface AdjRwStats {
  adjRwTotal: number;
}

export async function getAdjRwThisMonth(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<AdjRwStats> {
  const firstDay = queryBuilder.firstDayOfMonth(dbType);
  const today = queryBuilder.currentDate(dbType);

  const response = await executeSqlViaApi(
    `SELECT sum(coalesce(adjrw,0)) as total FROM ipt WHERE dchdate >= ${firstDay} AND dchdate <= ${today}`,
    config,
  );
  const adjRwTotal = parseQueryResponse(response, (row) => Number(row['total'] ?? 0))[0] ?? 0;
  return { adjRwTotal };
}

// ---------------------------------------------------------------------------
// Pttype price group distribution for today
// ---------------------------------------------------------------------------

export interface PttypeGroupItem {
  groupName: string;
  visitCount: number;
  percent: number;
}

export async function getPttypeDistribution(
  config: ConnectionConfig,
): Promise<PttypeGroupItem[]> {
  const sql =
    `SELECT pttype_price_group_name, count(distinct vn) as visit_count ` +
    `FROM pttype_price_group p1, pttype p2, ovst ` +
    `WHERE p1.pttype_price_group_id = p2.pttype_price_group_id ` +
    `AND p2.pttype = ovst.pttype ` +
    `AND vstdate = current_date ` +
    `GROUP BY pttype_price_group_name ` +
    `ORDER BY visit_count DESC`;

  const response = await executeSqlViaApi(sql, config);
  const rows = parseQueryResponse(response, (row) => ({
    groupName: String(row['pttype_price_group_name'] ?? ''),
    visitCount: Number(row['visit_count'] ?? 0),
  }));

  const total = rows.reduce((sum, r) => sum + r.visitCount, 0);
  return rows.map((r) => ({
    ...r,
    percent: total > 0 ? Math.round((r.visitCount / total) * 100) : 0,
  }));
}

// ---------------------------------------------------------------------------
// IPD discharges this month grouped by pttype price group
// ---------------------------------------------------------------------------

export async function getThisMonthIPDDischarges(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<PttypeGroupItem[]> {
  const firstDay = queryBuilder.firstDayOfMonth(dbType);
  const today = queryBuilder.currentDate(dbType);
  const sql =
    `SELECT pttype_price_group_name, count(distinct an) as discharge_count ` +
    `FROM pttype_price_group p1, pttype p2, ipt ` +
    `WHERE p1.pttype_price_group_id = p2.pttype_price_group_id ` +
    `AND p2.pttype = ipt.pttype ` +
    `AND dchdate >= ${firstDay} AND dchdate <= ${today} ` +
    `GROUP BY pttype_price_group_name ` +
    `ORDER BY discharge_count DESC`;

  const response = await executeSqlViaApi(sql, config);
  const rows = parseQueryResponse(response, (row) => ({
    groupName: String(row['pttype_price_group_name'] ?? ''),
    visitCount: Number(row['discharge_count'] ?? 0),
  }));

  const total = rows.reduce((sum, r) => sum + r.visitCount, 0);
  return rows.map((r) => ({
    ...r,
    percent: total > 0 ? Math.round((r.visitCount / total) * 100) : 0,
  }));
}

