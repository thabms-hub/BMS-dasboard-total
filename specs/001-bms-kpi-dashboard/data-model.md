# Data Model: BMS Session KPI Dashboard

**Branch**: `001-bms-kpi-dashboard` | **Date**: 2026-03-17

## Entities

### Session

Represents an active BMS session connection.

| Field | Type | Description |
|-------|------|-------------|
| sessionId | string (GUID) | BMS session identifier |
| apiUrl | string (URL) | BMS API endpoint from `user_info.bms_url` |
| bearerToken | string (GUID) | JWT from `user_info.bms_session_code` |
| databaseType | 'mysql' \| 'postgresql' | Detected via `SELECT VERSION()` |
| databaseName | string | From `user_info.bms_database_name` |
| expirySeconds | number | Session TTL from `expired_second` |
| connectedAt | Date | Timestamp of successful connection |
| userInfo | UserInfo | User identity and permissions |
| systemInfo | SystemInfo | System version and environment |

### UserInfo

User identity from the session response.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Full username |
| position | string | Job position title |
| positionId | number | Position standard ID |
| hospitalCode | string | Hospital identification code |
| doctorCode | string | Doctor code (if applicable) |
| department | string | Department name |
| location | string | Hospital name |
| isHrAdmin | boolean | HR administrator flag |
| isDirector | boolean | Hospital director flag |

### SystemInfo

System metadata from session response.

| Field | Type | Description |
|-------|------|-------------|
| version | string | Application version (e.g., "1.0.0.0") |
| environment | string | 'production' or 'development' |

### ConnectionConfig

Derived configuration for API calls.

| Field | Type | Description |
|-------|------|-------------|
| apiUrl | string | Base URL for `/api/sql` calls |
| bearerToken | string | Authorization header value |
| databaseType | 'mysql' \| 'postgresql' | For SQL dialect selection |
| appIdentifier | string | Fixed: "BMS.Dashboard.React" |

### QueryResult

Standard response from BMS `/api/sql` endpoint.

| Field | Type | Description |
|-------|------|-------------|
| data | Record<string, unknown>[] | Array of result rows |
| fieldNames | string[] | Column names |
| fieldTypes | number[] | Field type codes (1=bool, 2=int, 3=float, 4=datetime, 5=time, 6=string, 7=blob, 9=string) |
| recordCount | number | Number of records returned |
| messageCode | number | 200=success, 400=bad request, 409=syntax error, 500=server error |
| message | string | Status message or error description |
| requestTime | string | ISO 8601 timestamp |

### KpiSummary

Dashboard overview KPI data.

| Field | Type | Description |
|-------|------|-------------|
| opdVisitCount | number | Today's outpatient visit count from `ovst` |
| ipdPatientCount | number | Current inpatient count from `ipt` (dchdate IS NULL) |
| erVisitCount | number | Today's ER visit count from `er_regist` |
| activeDepartmentCount | number | Departments with visits today |
| timestamp | Date | When data was fetched |

### DepartmentWorkload

Department-level visit statistics.

| Field | Type | Description |
|-------|------|-------------|
| departmentCode | string | From `kskdepartment.depcode` |
| departmentName | string | From `kskdepartment.department` |
| visitCount | number | Number of visits in date range |

### DoctorWorkload

Doctor-level patient statistics.

| Field | Type | Description |
|-------|------|-------------|
| doctorCode | string | From `doctor.code` |
| doctorName | string | From `doctor.name` |
| patientCount | number | Number of patients seen in date range |

### VisitTrend

Daily visit count for trend charts.

| Field | Type | Description |
|-------|------|-------------|
| date | string (YYYY-MM-DD) | Visit date |
| visitCount | number | Number of visits on that date |

### HourlyDistribution

Hourly visit distribution for a single day.

| Field | Type | Description |
|-------|------|-------------|
| hour | number (0-23) | Hour of day |
| visitCount | number | Number of visits in that hour |

### DemographicBreakdown

Patient demographic statistics.

| Field | Type | Description |
|-------|------|-------------|
| ageGroups | { group: string, count: number }[] | Infant/Child/Teenager/Young Adult/Middle Age/Senior |
| genderDistribution | { gender: string, count: number }[] | Male/Female |
| dataSource | 'patient' \| 'ovst_patient_record' | Which table provided the data |

### PatientTypeDistribution

Insurance/patient type statistics.

| Field | Type | Description |
|-------|------|-------------|
| pttypeCode | string | From `pttype.pttype` |
| pttypeName | string | From `pttype.name` |
| visitCount | number | Number of visits with this patient type |

## Relationships

```
Session 1──1 UserInfo
Session 1──1 SystemInfo
Session 1──1 ConnectionConfig

ConnectionConfig ──uses──> QueryResult (via /api/sql)

KpiSummary ──aggregates──> ovst, ipt, er_regist
DepartmentWorkload ──joins──> ovst + kskdepartment
DoctorWorkload ──joins──> ovst + doctor
VisitTrend ──groups──> ovst by vstdate
HourlyDistribution ──groups──> ovst by HOUR(vsttime)
DemographicBreakdown ──joins──> patient + ovst (or ovst_patient_record)
PatientTypeDistribution ──joins──> ovst + pttype
```

## State Transitions

### Session State

```
DISCONNECTED → CONNECTING → CONNECTED → EXPIRED
     ↑              ↓           ↓          ↓
     └──────────────┴───────────┴──────────┘
                  (reconnect)
```

- **DISCONNECTED**: No session ID available, show login form
- **CONNECTING**: Session ID provided, calling PasteJSON API + VERSION detection
- **CONNECTED**: Session valid, API ready, database type known
- **EXPIRED**: API returned MessageCode 500 or HTTP 501, prompt re-auth

### Query State (per query)

```
IDLE → LOADING → SUCCESS
                → ERROR → IDLE (retry)
```
