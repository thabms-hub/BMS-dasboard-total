# Feature Specification: BMS Session KPI Dashboard

**Feature Branch**: `001-bms-kpi-dashboard`
**Created**: 2026-03-17
**Status**: Draft
**Input**: User description: "Create robust dashboard system that showcases bms-session-id usage to retrieve KPI data from HOSxP database, with dual database support (MySQL/PostgreSQL)"

## Clarifications

### Session 2026-04-08

- Q: Do different user roles (nurse, doctor, administrator) see different data or have different access permissions? → A: All roles see identical aggregate dashboard — no role-based filtering
- Q: Must the dashboard comply with any healthcare data privacy regulations? → A: HIPAA — requires audit trails, access controls, and encryption in transit
- Q: Should query results be cached client-side to reduce redundant API calls? → A: Cache with short TTL (1–5 minutes) — stale-while-revalidate pattern
- Q: What is the maximum configurable date range for trend/analytics queries? → A: 90 days
- Q: Should the dashboard auto-refresh KPI data periodically without user action? → A: No auto-refresh — user refreshes manually via a refresh button

## Assumptions

- Dashboard targets hospital staff (nurses, doctors, administrators) who access KPIs through a BMS session link — all roles see identical aggregate views with no role-based filtering or conditional rendering
- KPIs focus on aggregated, non-sensitive statistics (counts, trends, distributions) — no personally identifiable data displayed
- The BMS Session API specification in `docs/BMS-SESSION-FOR-DEV.md` is the authoritative source for session flow and API contracts
- Dashboard is a single-page application accessed via `?bms-session-id=GUID` URL parameter
- Date/time functions differ between MySQL (`CURDATE()`, `DATE_FORMAT()`, `TIMESTAMPDIFF()`, `RAND()`) and PostgreSQL (`CURRENT_DATE`, `TO_CHAR()`, `EXTRACT()/AGE()`, `RANDOM()`); the system MUST abstract these
- All core tables share identical table names, column names, and data types across both MySQL and PostgreSQL: `patient`, `ovst`, `ipt`, `kskdepartment`, `doctor`, `opdscreen`, `ward`, `pttype`, `er_regist`
- Patient demographics use the `patient` table (join on `hn`) on both database types — same schema, same columns
- The `patient` table is NOT blacklisted and is accessible via the BMS API `/api/sql` endpoint. Only `opduser`, `opdconfig`, `sys_var`, `user_var`, `user_jwt` are blacklisted
- Additionally, `ovst_patient_record` contains denormalized patient fields per visit (same columns as `patient` plus `vn`) and can serve as a fallback or alternative data source for demographic queries when the `patient` table is empty
- Testing session ID: `02FA45D1-91EF-4D6E-B341-ED1436343807` (connects to PostgreSQL database `bmshosxp`)
- Test database has sparse data: `patient` table is empty on both databases, `ovst` has 1,882 rows (PostgreSQL only), reference tables (`doctor`: 607, `kskdepartment`: 76, `pttype`: 82) are populated

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Session Connection & Dashboard Overview (Priority: P1)

A hospital staff member clicks a link containing a BMS session ID. The system automatically connects, detects the database type, and displays a dashboard overview with today's key KPIs: total outpatient visits, current inpatient count, emergency visits, and department workload — all loading within seconds with clear progress feedback.

**Why this priority**: Without session connection and a working overview, no other dashboard feature can function. This is the foundation and the MVP that demonstrates the BMS session integration end-to-end.

**Independent Test**: Can be fully tested by opening the app with `?bms-session-id=02FA45D1-91EF-4D6E-B341-ED1436343807`, observing session connection feedback, database type detection, and verifying KPI cards display real aggregate data from the HOSxP database.

**Acceptance Scenarios**:

1. **Given** a user visits the app URL with a valid `?bms-session-id=GUID` parameter, **When** the page loads, **Then** the system retrieves the session from HOSxP PasteJSON API, stores the session in a cookie (7-day expiry), removes the session ID from the URL, detects the database type (MySQL or PostgreSQL), and displays the user's name, hospital, and department in a header bar
2. **Given** the session is established and database type detected, **When** the overview dashboard loads, **Then** the system displays KPI summary cards showing: today's OPD visit count, current IPD patient count, today's ER visit count, and total departments with activity — each card shows a loading state while fetching and displays the result with the data timestamp
3. **Given** the session is established, **When** the overview loads, **Then** a department workload table shows each department's visit count for today, sorted by volume descending, with department name and count columns
4. **Given** a user visits with an expired or invalid session ID, **When** the session retrieval returns MessageCode 500 or an error, **Then** the system displays a clear error message explaining the session has expired and provides an input field to enter a new session ID manually
5. **Given** a user visits the app without any session ID and no cookie exists, **When** the page loads, **Then** the system shows a connection form where the user can manually enter a BMS session ID, with a connect button and clear instructions

---

### User Story 2 - Visit Trends & Time Analysis (Priority: P2)

A hospital administrator wants to see visit volume trends over time to identify patterns. The dashboard shows daily visit counts for a configurable date range, hourly distribution for a selected day, and comparison between time periods.

**Why this priority**: Trend analysis turns raw visit counts into actionable insights. Once the overview works (P1), time-based trends are the most valuable next layer for hospital management decision-making.

**Independent Test**: Can be tested by navigating to the trends section after connecting a session, selecting different date ranges, and verifying charts render with data from the `ovst` table grouped by date and time.

**Acceptance Scenarios**:

1. **Given** a connected session, **When** the user navigates to the trends view, **Then** a line/bar chart displays daily OPD visit counts for the last 30 days by default, with each data point showing the date and count
2. **Given** the trends view is displayed, **When** the user selects a custom date range using a date picker, **Then** the chart updates to show visit data for the selected range (maximum 90 days) with a loading indicator during the query; if the selected range exceeds 90 days, the date picker constrains the end date automatically
3. **Given** the trends view, **When** the user clicks on a specific date in the chart, **Then** a detail panel shows the hourly distribution of visits for that day (visits per hour as a bar chart)
4. **Given** the trends view, **When** data is loading, **Then** the chart area shows a skeleton/loading animation, and when data arrives, it transitions smoothly to the rendered chart

---

### User Story 3 - Department & Doctor Performance (Priority: P3)

A hospital manager wants to understand department utilization and doctor workload. The dashboard shows department-level visit breakdowns and doctor-level patient counts for a selected date range, helping identify bottlenecks and resource allocation needs.

**Why this priority**: Department and doctor analytics provide operational insights that depend on the same foundational session and query infrastructure (P1), and complement the trends view (P2) with a different analytical dimension.

**Independent Test**: Can be tested by navigating to the department/doctor analytics section, verifying department visit counts match `ovst` joined with `kskdepartment`, and doctor workload matches `ovst` joined with `doctor`.

**Acceptance Scenarios**:

1. **Given** a connected session, **When** the user navigates to the department analytics view, **Then** a ranked list/chart shows all departments with their visit counts for the selected date range, sorted by volume descending
2. **Given** the department view, **When** the user selects a specific department, **Then** a detail panel shows: doctor workload within that department and daily visit trend for that department
3. **Given** a connected session, **When** the user views the doctor workload section, **Then** a table shows doctors ranked by patient count for the selected date range, with columns for doctor name and patient count
4. **Given** any analytics view, **When** no data exists for the selected filters, **Then** an empty state message appears with guidance (e.g., "No visits found for this date range. Try expanding the date range.")

---

### User Story 4 - Patient Demographics & Insurance Distribution (Priority: P4)

A hospital planner wants to see patient demographic breakdowns (age groups, gender) and insurance/patient type distribution to understand the patient population being served.

**Why this priority**: Demographics and insurance data provide strategic planning value. The `patient` table is identical on both database types, so the same queries work on both — but this story is prioritized after P1-P3 because it adds a distinct analytical dimension that builds on the core infrastructure.

**Independent Test**: Can be tested by verifying demographic charts render correctly on both MySQL and PostgreSQL database types, showing age group distribution, gender split, and patient type (insurance) breakdown. When `patient` table is empty, system falls back to `ovst_patient_record`.

**Acceptance Scenarios**:

1. **Given** a connected session, **When** the demographics view loads, **Then** age group and gender distribution are calculated from the `patient` table joined with `ovst` on `hn` (same query on both MySQL and PostgreSQL)
2. **Given** a connected session where the `patient` table is empty, **When** the demographics view loads, **Then** the system falls back to `ovst_patient_record` (joined with `ovst` on `vn`) to derive demographic data, and displays a notice that data comes from visit records
3. **Given** the demographics view, **When** data loads, **Then** a pie/donut chart shows gender distribution and a bar chart shows age group distribution (Infant, Child, Teenager, Young Adult, Middle Age, Senior)
4. **Given** the demographics view, **When** the insurance section loads, **Then** a chart shows visit counts grouped by patient type (`pttype`) with type names from the `pttype` reference table

---

### Edge Cases

- What happens when the BMS API endpoint is unreachable (network failure)? System MUST show a user-friendly error with retry option, not a raw network error
- What happens when a query returns an extremely large dataset? System MUST use LIMIT clauses and pagination to prevent browser memory issues
- What happens when the session expires mid-use? System MUST detect MessageCode 500 / HTTP 501 responses and prompt the user to reconnect
- What happens when the database has zero records for a date range? System MUST show an informative empty state, not a blank or broken chart
- What happens when the database type cannot be determined from `SELECT VERSION()`? System MUST fall back to MySQL syntax as default and log the detection failure
- What happens when a SQL query hits a blacklisted table? System MUST handle the 400/403 error gracefully and not crash
- What happens when the user resizes the browser or uses mobile? Charts and layout MUST be responsive

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept a BMS session ID via URL parameter (`?bms-session-id=GUID`), cookie, or manual input and establish a connection to the HOSxP API
- **FR-002**: System MUST detect the database type (MySQL/MariaDB vs PostgreSQL) by executing `SELECT VERSION()` after session connection and store the result for query adaptation
- **FR-003**: System MUST provide a database-type-aware query layer that generates correct SQL syntax for both MySQL and PostgreSQL, abstracting differences in date functions (`CURDATE()` vs `CURRENT_DATE`, `DATE_FORMAT()` vs `TO_CHAR()`, `TIMESTAMPDIFF()` vs `EXTRACT()/AGE()`, `RAND()` vs `RANDOM()`), string quoting, and table structure queries (`DESCRIBE` vs `information_schema`)
- **FR-004**: System MUST display today's KPI summary cards: OPD visit count (from `ovst`), IPD patient count (from `ipt` where `dchdate IS NULL`), ER visit count (from `er_regist`), and active department count (from `ovst` joined with `kskdepartment`)
- **FR-005**: System MUST display a department workload table showing department names and visit counts for today, sorted by volume descending
- **FR-006**: System MUST display visit trend charts for configurable date ranges with daily granularity; maximum selectable range is 90 days, enforced by the date picker UI
- **FR-007**: System MUST display hourly visit distribution for a selected day
- **FR-008**: System MUST display department analytics with drill-down capability
- **FR-009**: System MUST display doctor workload rankings by patient count
- **FR-010**: System MUST display patient demographic distribution (age groups, gender) from the `patient` table (join on `hn`) — identical schema on both MySQL and PostgreSQL. When the `patient` table is empty, the system MUST fall back to `ovst_patient_record` (join on `vn`) which contains the same demographic columns denormalized per visit
- **FR-011**: System MUST display patient type (insurance) distribution by joining `ovst.pttype` with `pttype.name`
- **FR-012**: System MUST show the connected user's identity (name, position, department, hospital) and session status in a persistent header
- **FR-013**: System MUST handle session expiry by detecting error responses and prompting re-authentication with a new session ID
- **FR-014**: System MUST use parameterized query inputs where supported and LIMIT clauses to prevent excessive data transfer
- **FR-015**: System MUST provide loading states for every data-fetching operation and informative error messages for failures
- **FR-016** *(Refresh)*: System MUST NOT auto-refresh data. Each dashboard view MUST include a manual refresh button that clears the cache for that view and re-fetches all queries, showing loading states during the operation
- **FR-017** *(Caching)*: System MUST cache SQL query results in memory (React state / TanStack Query) with a 3-minute TTL using a stale-while-revalidate pattern. Cached data MUST NOT be written to localStorage or IndexedDB (per FR-019). Cache is cleared on session expiry or page reload
- **FR-018** *(HIPAA)*: System MUST log every SQL query execution with timestamp, session user identity, and query type to a client-side audit log (sessionStorage), transmitted to no external service — ensuring traceability of data access
- **FR-019** *(HIPAA)*: System MUST enforce HTTPS-only operation; all API calls to `bms_url` MUST use TLS. The app MUST warn and block if the `bms_url` returned by session is non-HTTPS
- **FR-020** *(HIPAA)*: System MUST NOT cache raw query result data in localStorage or cookies beyond the session lifetime. Only session metadata (session ID, user info) may persist in cookies (7-day expiry per FR-001)
- **FR-021** *(HIPAA)*: System MUST display only aggregate statistics — no individual patient identifiers (name, HN, IC number, address) may appear in any chart, table, or tooltip

### Key Entities

- **Session**: Represents the BMS session connection — includes session ID, API endpoint URL, bearer token, database type, user info, expiry time
- **Visit (OPD)**: An outpatient visit record from `ovst` — key attributes: visit number (vn), hospital number (hn), visit date, visit time, department, doctor, patient type
- **Admission (IPD)**: An inpatient admission from `ipt` — key attributes: admission number (an), hospital number (hn), admission date, discharge date, ward, discharge type
- **Emergency Visit**: An ER registration from `er_regist` — key attributes: visit number (vn), visit date, emergency type, ER doctor
- **Department**: A hospital department/clinic from `kskdepartment` — key attributes: department code, department name
- **Doctor**: A physician from `doctor` — key attributes: doctor code, name
- **Patient Type**: Insurance/payment category from `pttype` — key attributes: type code, type name
- **Patient Demographics**: Age, gender, and blood type data — sourced from `patient` table (identical on both MySQL and PostgreSQL). Fallback: `ovst_patient_record` (denormalized per visit, same columns) when `patient` is empty

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can connect via BMS session ID and see the dashboard overview within 5 seconds of page load
- **SC-002**: All KPI summary cards display accurate, current-day aggregate data matching direct database query results
- **SC-003**: Dashboard works correctly on both MySQL/MariaDB and PostgreSQL HOSxP databases without user intervention — database type is detected automatically
- **SC-004**: Every data-loading operation displays a visible loading indicator, and errors display actionable messages with retry options
- **SC-005**: Charts and tables render responsively across desktop and tablet screen sizes (minimum 768px width)
- **SC-006**: Session expiry is detected and communicated to the user within one failed query, with a clear path to reconnect
- **SC-007**: 100% of KPI queries complete within 10 seconds on typical HOSxP databases
- **SC-008**: All four test layers pass: unit tests for query builders and services, component tests for UI elements, integration tests for session-to-dashboard flow, and API contract tests for BMS Session API responses
- **SC-009** *(HIPAA)*: Every SQL query execution generates an audit log entry containing timestamp, user identity, and query type — verified by unit tests on the audit logging service
- **SC-010** *(HIPAA)*: Application blocks and warns when `bms_url` is non-HTTPS, verified by a unit test that mocks an HTTP endpoint response
