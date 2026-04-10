// =============================================================================
// BMS Session KPI Dashboard - Type Definitions (T018)
// =============================================================================

// ---------------------------------------------------------------------------
// Enums / Union Types
// ---------------------------------------------------------------------------

/** Supported database backends */
export type DatabaseType = 'mysql' | 'postgresql';

/** WebSocket / polling connection lifecycle */
export type SessionState = 'disconnected' | 'connecting' | 'connected' | 'expired';

/** Async data-fetch lifecycle */
export type QueryState = 'idle' | 'loading' | 'success' | 'error';

// ---------------------------------------------------------------------------
// Core domain models
// ---------------------------------------------------------------------------

export interface SystemInfo {
  version: string;
  environment: string;
}

export interface UserInfo {
  name: string;
  position: string;
  positionId: number;
  hospitalCode: string;
  doctorCode: string;
  department: string;
  location: string;
  isHrAdmin: boolean;
  isDirector: boolean;
}

export interface ConnectionConfig {
  apiUrl: string;
  bearerToken: string;
  databaseType: DatabaseType;
  appIdentifier: string;
}

// ---------------------------------------------------------------------------
// Raw API response shapes
// ---------------------------------------------------------------------------

/** Shape returned by the BMS session endpoint (PasteJSON) */
export interface BmsSessionResponse {
  MessageCode: number;
  Message: string;
  RequestTime: string;
  result?: {
    system_info?: {
      version?: string;
      environment?: string;
    };
    user_info?: {
      name?: string;
      position?: string;
      position_id?: number;
      hospital_code?: string;
      doctor_code?: string;
      department?: string;
      location?: string;
      is_hr_admin?: boolean;
      is_director?: boolean;
      bms_url?: string;
      bms_session_port?: number;
      bms_session_code?: string;
      bms_database_name?: string;
      bms_database_type?: string;
    };
    key_value?: string;
    expired_second?: number;
  };
}

/** Shape returned by the SQL query API */
export interface SqlApiResponse {
  result: Record<string, unknown>;
  MessageCode: number;
  Message: string;
  RequestTime: string;
  data?: Record<string, unknown>[];
  field?: number[];
  field_name?: string[];
  record_count?: number;
}

/** Shape sent to the SQL query API */
export interface SqlApiRequest {
  sql: string;
  app: string;
  params?: Record<string, { value: string; value_type: string }>;
}

// ---------------------------------------------------------------------------
// Parsed / normalised models
// ---------------------------------------------------------------------------

/** Generic wrapper for parsed query results */
export interface QueryResult<T> {
  data: T[];
  fieldNames: string[];
  fieldTypes: number[];
  recordCount: number;
  messageCode: number;
  message: string;
  requestTime: string;
}

/** Authenticated session after successful handshake */
export interface Session {
  sessionId: string;
  apiUrl: string;
  bearerToken: string;
  databaseType: DatabaseType;
  databaseName: string;
  expirySeconds: number;
  connectedAt: Date;
  userInfo: UserInfo;
  systemInfo: SystemInfo;
}

// ---------------------------------------------------------------------------
// KPI / Dashboard data models
// ---------------------------------------------------------------------------

export interface KpiSummary {
  opdVisitCount: number;
  ipdPatientCount: number;
  erVisitCount: number;
  activeDepartmentCount: number;
  timestamp: Date;
}

export interface DepartmentWorkload {
  departmentCode: string;
  departmentName: string;
  visitCount: number;
}

export interface DoctorWorkload {
  doctorCode: string;
  doctorName: string;
  patientCount: number;
}

export interface VisitTrend {
  date: string;
  visitCount: number;
}

export interface HourlyDistribution {
  hour: number;
  visitCount: number;
}

export interface DemographicBreakdown {
  ageGroups: { group: string; count: number }[];
  genderDistribution: { gender: string; count: number }[];
  dataSource: 'patient' | 'ovst_patient_record';
}

export interface PatientTypeDistribution {
  pttypeCode: string;
  pttypeName: string;
  visitCount: number;
}

export interface IpdWardDistribution {
  wardName: string;
  wardCode?: string;
  patientCount: number;
  bedCount: number;
  yesterdayPatientCount?: number;
  percentageChange?: number;
}

/** Recent visit record for the overview dashboard */
export interface RecentVisit {
  vn: string
  hn: string
  vstdate: string
  vsttime: string
  departmentName: string
  doctorName: string
}

/** OPD visit breakdown for today vs yesterday */
export interface OpdVisitDetail {
  total: number
  walkin: number
  appointment: number
  yesterdayTotal: number
  /** Percent change vs yesterday, null when yesterday = 0 */
  trendPercent: number | null
  isPositive: boolean
}

/** IPD visit breakdown for today vs yesterday */
export interface IpdVisitDetail {
  current: number
  yesterdayTotal: number
  todayAdmitted: number
  todayDischarged: number
  /** Percent change vs yesterday, null when yesterday = 0 */
  trendPercent: number | null
  isPositive: boolean
}

/** ER visit breakdown by triage color for today vs yesterday */
export interface ErVisitDetail {
  total: number
  yesterdayTotal: number
  /** Percent change vs yesterday, null when yesterday = 0 */
  trendPercent: number | null
  isPositive: boolean
  redCount: number
  pinkCount: number
  yellowCount: number
  greenCount: number
  whiteCount: number
}

/** Overview statistics beyond the 4 main KPIs */
export interface OverviewStats {
  totalRegisteredPatients: number
  totalVisitsThisMonth: number
  totalVisitsLastMonth: number
  avgDailyVisitsThisMonth: number
  totalDoctors: number
  totalDepartments: number
}

/** Dentistry case detail record */
export interface DentistryCase {
  hn: string
  vn: string
  vstdate: string
  ttcode: string
  an: string
  tmName: string
  doctorName: string
  helperName: string
  patientName: string
  visitTypeName: string
  pttype?: string
}

/** Dentistry case grouped by visit type for chart */
export interface DentistryVisitTypeDistribution {
  visitTypeName: string
  caseCount: number
}

/** Dentistry cases grouped by insurance type for pie chart */
export interface DentistryInsuranceDistribution {
  insuranceType: string
  patientCount: number
}

export interface DentistryServiceTypeCount {
  dentalCareTypeName: string
  totalCount: number
}

export interface DentistryTopProcedureItem {
  code: string
  procedureName: string
  count: number
}

export interface DentistryCasesPage {
  cases: DentistryCase[]
  totalCount: number
}

/** Dentistry department summary */
export interface DentistryDoctorPerformance {
  doctorName: string
  c_vn: number
  c_dtmain: number
  sum_price: number
}

export interface DentistrySummary {
  totalCases: number
  totalVisits: number
  totalIPDCases: number
  yesterdayVisits: number
  yesterdayIPDCases: number
  casesByVisitType: DentistryVisitTypeDistribution[]
  casesByInsurance: DentistryInsuranceDistribution[]
  cases: DentistryCase[]
  doctorPerformance: DentistryDoctorPerformance[]
}

/** Dental appointment count grouped by appointment status */
export interface DentalAppointmentStatus {
  statusName: string
  count: number
}

/** Dental expense grouped by payment type */
export interface DentalExpenseByPaymentType {
  paymentType: string
  totalAmount: number
}

/** Dental care count split by service place (in-facility vs out-of-facility) */
export interface DentalServicePlaceCount {
  inService: number
  outService: number
}

export interface OpdExamTopDiagnosisItem {
  icd10: string
  diagnosisName: string
  patientCount: number
}

export interface OpdExamDoctorIcd10Item {
  doctorCode: string
  doctorName: string
  patientCount: number
  uniqueIcd10Count: number
}

export interface OpdExamReferOutDiseaseItem {
  icd10: string
  diagnosisName: string
  referCount: number
}

export interface OpdExamOperationSetSummary {
  operationOrderCount: number
}

export interface OpdExamDoctorCertTypeItem {
  doctorCertTypeName: string
  certCount: number
}

export interface OpdExamDeformedCertSummary {
  deformedCertCount: number
}

export interface OpdExamTopKpiSummary {
  totalPatientsCurrent: number
  totalPatientsPrevious: number
  avgWaitMinutesCurrent: number
  avgWaitMinutesPrevious: number
  referredCurrent: number
  referredPrevious: number
}

export interface OpdExamWeekdayHourItem {
  weekdayIndex: number
  hourOfDay: number
  patientCount: number
}

export interface OpdExamReferralSummary {
  totalReferrals: number
  uniquePatients: number
}

export interface OpdExamReferralBreakdownItem {
  label: string
  referCount: number
  breakdownType: 'destination' | 'reason'
}

export interface OpdExamSlaSummary {
  withinTargetCount: number
  missedTargetCount: number
  totalCases: number
  withinTargetPercent: number
}

export interface OpdExamDispositionSummary {
  admitCount: number
  referCount: number
  homeCount: number
  totalCount: number
}

export interface OpdExamWaitTimeItem {
  spcltyName: string
  waitDoctorAvg: string   // เฉลี่ยเวลารอหลัง screen ถึงเริ่มพบแพทย์ (HH:MM:SS)
  waitDoctorMax: string   // สูงสุด
  waitDoctorMin: string   // ต่ำสุด
  doctorTimeAvg: string   // เฉลี่ยเวลาพบแพทย์ (HH:MM:SS)
  doctorTimeMax: string   // สูงสุด
  doctorTimeMin: string   // ต่ำสุด
}

export interface ErDashboardKpis {
  todayCount: number
  yesterdayCount: number
  monthCount: number
  activeTreatmentCount: number
}

export interface ErTriageDistributionItem {
  triageLevel: string
  patientCount: number
}

export interface ErLeaveStatusItem {
  leaveStatus: string
  patientCount: number
}

export interface ErLevel1SurvivalStats {
  level1Total: number
  survivedCount: number
  deathCount: number
  survivalRate: number
}

export interface ErTriagePeriodRow {
  erPeriod: string
  level1Label?: string
  level2Label?: string
  level3Label?: string
  level4Label?: string
  level5Label?: string
  level1: number
  level2: number
  level3: number
  level4: number
  level5: number
}

export interface ErTriageWaitTimeItem {
  triageLevel: string
  avgWaitMinutes: number
}

export interface ErTopCauseItem {
  causeName: string
  caseCount: number
}

export interface ErDispositionItem {
  disposition: string
  caseCount: number
}

export interface ErMonthlyTrendItem {
  month: string
  patientCount: number
}

export interface ErAccidentTypeItem {
  accidentTypeName: string
  patientCount: number
}

export interface ErTopProcedureItem {
  operCode: string
  operName: string
  caseCount: number
}

export interface ErProcedureVsVnStats {
  dayLabel: string
  procedureCount: number
  vnCount: number
  treatmentAmount: number
}

export interface ErWaitTimeStats {
  avgWaitBeforeDoctorMinutes: number
  avgDoctorExamMinutes: number
  caseCount: number
}

export interface ErOutlierCase {
  hn: string
  vn: string
  waitMinutes: number
  triageLevel: string
  doctorName: string
}

export interface ErCaseWithWaitTime {
  hn: string
  vn: string
  oqueue: string
  enterErTime: string
  doctorTxTime: string
  finishTime: string
  waitBeforeDoctorMinutes: number
  doctorExamMinutes: number
  triageLevel: string
}

export interface ErDoctorPatientLoadItem {
  doctorCode: string
  doctorName: string
  patientCount: number
}

export interface AppointmentKpis {
  totalToday: number
  attendedToday: number
  noShowToday: number
  cancelledToday: number
  noShowRate: number
  labPreOrderToday: number
  xrayPreOrderToday: number
}

export interface AppointmentDepartmentOption {
  departmentCode: string
  departmentName: string
}

export interface AppointmentClinicRateItem {
  clinicCode: string
  clinicName: string
  totalAppointments: number
  attendedAppointments: number
  noShowAppointments: number
  attendanceRate: number
}

export interface AppointmentMonthlyTrendItem {
  month: string
  totalAppointments: number
  cancelledAppointments: number
  noShowAppointments: number
}

export interface AppointmentCancelReasonItem {
  reason: string
  cancelledCount: number
}

export interface AppointmentTopDoctorItem {
  doctorCode: string
  doctorName: string
  doctorLicenseNo: string
  totalAppointments: number
}

export interface AppointmentWalkInComparison {
  bookedCount: number
  walkInCount: number
  bookedRate: number
  walkInRate: number
}

export interface AppointmentTopClinicItem {
  clinicCode: string
  clinicName: string
  totalAppointments: number
  attendedAppointments: number
  noShowAppointments: number
  noShowRate: number
}

// ---------------------------------------------------------------------------
// Lab Dashboard data models
// ---------------------------------------------------------------------------

export interface LabOrderSummary {
  totalOrders: number
  receivedOrders: number
  reportedOrders: number
  outlabCount: number
}

export interface LabOrderByPriority {
  date: string
  priorityName: string
  orderCount: number
}

export interface LabItemTop {
  labItemsCode: string
  labItemsName: string
  orderCount: number
}

export interface LabGroupTop {
  groupName: string
  orderCount: number
}

export interface LabOrderByLocation {
  date: string
  locationName: string
  orderCount: number
}

export interface LabOrderByDepartment {
  date: string
  deptName: string
  orderCount: number
}

export interface LabOrderVsPatient {
  totalOrders: number
  uniquePatients: number
}

export interface LabOrderVsPatientByType {
  patientType: 'IPD' | 'OPD'
  patientCount: number
  orderCount: number
}

export interface LabRejectedRadarItem {
  reason: string
  rejectedCount: number
}

// =============================================================================
// X-Ray Dashboard Types
// =============================================================================

export interface XraySummary {
  totalOrders: number
  acceptedOrders: number
  examinedOrders: number
  confirmedReadOrders: number
}

export interface XrayItemTop {
  xrayItemsCode: string
  xrayItemsName: string
  orderCount: number
}

export interface XrayByDept {
  date: string
  deptName: string
  orderCount: number
}

export interface XrayByWard {
  date: string
  wardName: string
  orderCount: number
}

export interface XrayDoctorRead {
  doctorName: string
  readCount: number
}

export interface XrayOpdOrder {
  date: string
  orderCount: number
  patientCount: number
}

export interface XrayBySex {
  sexLabel: string
  patientCount: number
}

export interface XrayByUrgency {
  urgencyLabel: string
  orderCount: number
}

export interface XrayMonthlyOrder {
  monthKey: string
  orderCount: number
}

// =============================================================================
// OR Dashboard Types
// =============================================================================

export interface OrSummary {
  pendingSetCount: number
  totalPatients: number
  totalSurgeries: number
  totalAmount: number
}

export interface OrTopOperationItem {
  operationName: string
  surgeryCount: number
}

export interface OrUrgencyItem {
  urgencyName: string
  surgeryCount: number
}

export interface OrOperationTypeItem {
  operationTypeName: string
  surgeryCount: number
}

export interface OrStatusItem {
  statusName: string
  surgeryCount: number
}

export interface OrRoomUsageByShiftItem {
  roomName: string
  shiftName: string
  usageCount: number
}

export interface OrAnesthesiaTypeItem {
  anesName: string
  caseCount: number
}

export interface OrOperationDurationItem {
  operationName: string
  avgDurationMinutes: number
  caseCount: number
}

// =============================================================================
// Pharmacy OPD Dashboard Types
// =============================================================================

export interface PharmacyOpdSummary {
  totalPatients: number
  totalAmount: number
  totalDrugItemCount: number
  prescriptionCount: number
  checkedCount: number
  preparedCount: number
  dispensedCount: number
}

export interface PharmacyTopUsageItem {
  itemCode: string
  itemName: string
  itemCount: number
  totalQty: number
  totalAmount: number
}

export interface PharmacyPatientCompare {
  hnCount: number
  vnCount: number
  drugCount: number
}

export interface PharmacyPaymentByType {
  paymentType: string
  totalAmount: number
}

export interface PharmacyTopDoctorItem {
  doctorName: string
  visitCount: number
  itemCount: number
  totalAmount: number
}
