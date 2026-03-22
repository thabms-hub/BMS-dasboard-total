# Tasks: BMS Session KPI Dashboard

**Input**: Design documents from `/specs/001-bms-kpi-dashboard/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Included per Constitution Principle II (TDD NON-NEGOTIABLE) and Principle III (Comprehensive Test Coverage). Tests written FIRST, must FAIL before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize Vite + React 19 + TypeScript project with all dependencies

- [x] T001 Initialize Vite 6 + React 19 + TypeScript project with `npm create vite@latest . -- --template react-ts` and configure `tsconfig.json` with strict mode
- [x] T002 Install runtime dependencies: `recharts`, `date-fns`, `react-router-dom` in package.json
- [x] T003 Install and configure Tailwind CSS v4 and initialize shadcn/ui with `npx shadcn@latest init` in project root
- [x] T004 Install dev dependencies: `vitest`, `@vitest/coverage-v8`, `@vitest/ui`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `msw` in package.json
- [x] T005 Configure Vitest in `vite.config.ts` with jsdom environment, coverage thresholds (80%), and test directory paths (`tests/unit`, `tests/component`, `tests/integration`, `tests/api`)
- [x] T006 [P] Add npm scripts to package.json: `test`, `test:unit`, `test:component`, `test:integration`, `test:api`, `test:coverage`, `test:watch`
- [x] T007 [P] Configure ESLint and Prettier with TypeScript strict rules in project root
- [x] T008 [P] Create test directory structure: `tests/unit/`, `tests/component/`, `tests/integration/`, `tests/api/` and test setup file `tests/setup.ts` with RTL and jest-dom imports
- [x] T009 [P] Add shadcn/ui base components: Card, Table, Button, Input, Badge, Tabs, Skeleton in `src/components/ui/`
- [x] T010 Verify setup: run `npm run build` and `npm test` to confirm zero errors

**Checkpoint**: Project compiles, tests run (empty), shadcn/ui components available

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types, services, hooks, and session infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundation

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T011 [P] Unit test for TypeScript interfaces validation in `tests/unit/types.test.ts` — verify all entity types from data-model.md (Session, UserInfo, ConnectionConfig, QueryResult, KpiSummary, etc.)
- [ ] T012 [P] Unit test for sessionStorage utilities in `tests/unit/sessionStorage.test.ts` — cookie CRUD, URL param extraction, URL cleaning
- [ ] T013 [P] Unit test for queryBuilder in `tests/unit/queryBuilder.test.ts` — MySQL vs PostgreSQL SQL generation for: currentDate, dateFormat, dateSubtract, ageCalc, hourExtract, random
- [ ] T014 [P] Unit test for bmsSession service in `tests/unit/bmsSession.test.ts` — retrieveBmsSession, executeSqlViaApi, extractConnectionConfig, database type detection
- [ ] T015 [P] API contract test for session retrieval in `tests/api/sessionApi.test.ts` — PasteJSON request shape, success response parsing, error response (MessageCode 500), using MSW handlers
- [ ] T016 [P] API contract test for SQL execution in `tests/api/sqlApi.test.ts` — /api/sql request shape, success response parsing, field type codes, error codes (400, 409, 500, 501), using MSW handlers
- [ ] T017 [P] API contract test for error handling in `tests/api/errorHandling.test.ts` — expired session detection, network failure, blacklisted table response, timeout handling, using MSW handlers

### Implementation for Foundation

- [x] T018 Define all TypeScript interfaces in `src/types/index.ts` — Session, UserInfo, SystemInfo, ConnectionConfig, BmsSessionResponse, QueryResult, KpiSummary, DepartmentWorkload, DoctorWorkload, VisitTrend, HourlyDistribution, DemographicBreakdown, PatientTypeDistribution, DatabaseType, SessionState, QueryState
- [x] T019 Implement sessionStorage utilities in `src/utils/sessionStorage.ts` — setSessionCookie (7-day expiry), getSessionCookie, removeSessionCookie, getSessionFromUrl, removeSessionFromUrl, handleUrlSession
- [x] T020 Implement dateUtils in `src/utils/dateUtils.ts` — formatDate, formatDateTime, getDateRangeLabel, getRelativeDate helpers using date-fns
- [x] T021 Implement queryBuilder service in `src/services/queryBuilder.ts` — DatabaseType-aware SQL generation: currentDate(), dateFormat(), dateSubtract(), ageCalc(), hourExtract(), random(), describeTable(), showTables() functions
- [x] T022 Implement bmsSession service in `src/services/bmsSession.ts` — retrieveBmsSession (calls PasteJSON API), executeSqlViaApi (calls /api/sql with Bearer token), extractConnectionConfig (extracts apiUrl, bearerToken, databaseType from session response), detectDatabaseType (parses VERSION() result)
- [ ] T023 Configure MSW handlers for development in `src/mocks/handlers.ts` — mock PasteJSON endpoint and /api/sql endpoint with sample data matching contracts/bms-session-api.md
- [x] T024 Implement useQuery hook in `src/hooks/useQuery.ts` — manages IDLE/LOADING/SUCCESS/ERROR states, execute(), reset(), auto-execute option, error handling with retry
- [x] T025 Implement useBmsSession hook in `src/hooks/useBmsSession.ts` — manages session state (DISCONNECTED/CONNECTING/CONNECTED/EXPIRED), connectSession(), disconnectSession(), refreshSession(), executeQuery() delegating to bmsSession service
- [x] T026 Implement BmsSessionContext provider in `src/contexts/BmsSessionContext.tsx` — wraps useBmsSession hook, provides useBmsSessionContext() consumer hook, handles URL session on mount
- [x] T027 Implement shared LoadingSpinner component in `src/components/layout/LoadingSpinner.tsx` — reusable loading indicator with optional message text
- [x] T028 Implement shared EmptyState component in `src/components/dashboard/EmptyState.tsx` — reusable empty state with icon, title, description, and optional action button
- [x] T029 Implement LoginForm component in `src/components/session/LoginForm.tsx` — session ID input field, connect button, loading state, error display
- [x] T030 Implement SessionExpired component in `src/components/session/SessionExpired.tsx` — expiry message with reconnect form
- [x] T031 Implement SessionValidator component in `src/components/session/SessionValidator.tsx` — orchestrates login flow: checks URL → cookie → shows LoginForm, handles CONNECTING/CONNECTED/EXPIRED states
- [ ] T032 [P] Component test for SessionValidator in `tests/component/SessionValidator.test.tsx` — renders login form when disconnected, shows loading during connection, shows expired state, shows children when connected
- [ ] T033 [P] Component test for EmptyState in `tests/component/EmptyState.test.tsx` — renders title, description, action button, custom icon
- [ ] T034 [P] Integration test for database detection in `tests/integration/databaseDetection.test.ts` — VERSION query → type detection → queryBuilder uses correct dialect, using MSW
- [x] T035 Implement App root in `src/App.tsx` — BmsSessionProvider wrapper, React Router with lazy-loaded routes (Overview, Trends, DepartmentAnalytics, Demographics), SessionValidator gate
- [x] T036 Implement main entry point in `src/main.tsx` — renders App into DOM root
- [ ] T037 Run all foundation tests to confirm passing: `npm run test:unit && npm run test:api`

**Checkpoint**: Foundation ready — session connection works end-to-end, query builder generates correct SQL for both database types, all tests pass. User story implementation can now begin.

---

## Phase 3: User Story 1 - Session Connection & Dashboard Overview (Priority: P1) 🎯 MVP

**Goal**: Connect via BMS session ID, detect database type, display KPI summary cards and department workload table

**Independent Test**: Open `http://localhost:5173/?bms-session-id=02FA45D1-91EF-4D6E-B341-ED1436343807` → session connects → KPI cards show data → department table populates

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T038 [P] [US1] Unit test for kpiService overview queries in `tests/unit/kpiService.test.ts` — getOpdVisitCount, getIpdPatientCount, getErVisitCount, getActiveDepartmentCount, getDepartmentWorkload; verify correct SQL generated for both MySQL and PostgreSQL
- [ ] T039 [P] [US1] Component test for KpiCard in `tests/component/KpiCard.test.tsx` — renders title, value, loading skeleton, error state, timestamp
- [ ] T040 [P] [US1] Component test for DepartmentTable in `tests/component/DepartmentTable.test.tsx` — renders rows sorted by visit count, empty state when no data, loading skeleton
- [ ] T041 [P] [US1] Integration test for session-to-dashboard flow in `tests/integration/sessionFlow.test.tsx` — URL param → PasteJSON → VERSION detection → KPI queries → cards render with data, using MSW

### Implementation for User Story 1

- [x] T042 [US1] Implement kpiService in `src/services/kpiService.ts` — getOpdVisitCount(config, dbType), getIpdPatientCount(config), getErVisitCount(config, dbType), getActiveDepartmentCount(config, dbType), getDepartmentWorkload(config, dbType) using queryBuilder and bmsSession
- [x] T043 [US1] Implement KpiCard component in `src/components/dashboard/KpiCard.tsx` — reusable card with: title, value (large number), icon slot, loading Skeleton state, error state with retry, last-updated timestamp
- [x] T044 [US1] Implement KpiCardGrid component in `src/components/dashboard/KpiCardGrid.tsx` — responsive 4-column grid (4 cols desktop, 2 cols tablet) containing KpiCards for OPD, IPD, ER, departments
- [x] T045 [US1] Implement DepartmentTable component in `src/components/dashboard/DepartmentTable.tsx` — TanStack Table with columns: rank, department name, visit count; sorted by visit count desc; loading skeleton; EmptyState when no data
- [x] T046 [US1] Implement AppHeader component in `src/components/layout/AppHeader.tsx` — user name, position, hospital, department from session; session status badge (Connected/Expired); database type indicator; navigation tabs (Overview, Trends, Departments, Demographics); disconnect button
- [x] T047 [US1] Implement AppLayout component in `src/components/layout/AppLayout.tsx` — AppHeader + main content area with responsive padding, dark/light theme toggle
- [x] T048 [US1] Implement Overview page in `src/pages/Overview.tsx` — uses useBmsSessionContext + kpiService to fetch all overview KPIs; renders KpiCardGrid + DepartmentTable; manages loading/error states per query; auto-refreshes on session connect
- [ ] T049 [US1] Run all US1 tests: `npm test -- --run tests/unit/kpiService.test.ts tests/component/KpiCard.test.tsx tests/component/DepartmentTable.test.tsx tests/integration/sessionFlow.test.tsx`

**Checkpoint**: MVP complete — user can connect with session ID, see 4 KPI cards and department workload table. All US1 tests pass.

---

## Phase 4: User Story 2 - Visit Trends & Time Analysis (Priority: P2)

**Goal**: Display daily visit trend chart for configurable date range and hourly distribution drill-down

**Independent Test**: Navigate to Trends tab → see 30-day visit trend chart → select date range → chart updates → click a day → see hourly breakdown

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T050 [P] [US2] Unit test for kpiService trend queries in `tests/unit/kpiService.trends.test.ts` — getDailyVisitTrend(config, dbType, startDate, endDate), getHourlyDistribution(config, dbType, date); verify correct SQL for both database types
- [ ] T051 [P] [US2] Component test for VisitTrendChart in `tests/component/VisitTrendChart.test.tsx` — renders line/bar chart with data, shows skeleton while loading, shows empty state for no data, handles date range selection
- [ ] T052 [P] [US2] Component test for HourlyChart in `tests/component/HourlyChart.test.tsx` — renders 24-hour bar chart, shows empty state, handles click interaction

### Implementation for User Story 2

- [x] T053 [US2] Add trend query methods to kpiService in `src/services/kpiService.ts` — getDailyVisitTrend(config, dbType, startDate, endDate), getHourlyDistribution(config, dbType, date) using queryBuilder for date functions
- [ ] T054 [US2] Implement VisitTrendChart component in `src/components/charts/VisitTrendChart.tsx` — Recharts BarChart/LineChart with ResponsiveContainer, date on X-axis, visit count on Y-axis, tooltip with date and count, onClick handler for date drill-down
- [ ] T055 [US2] Implement HourlyChart component in `src/components/charts/HourlyChart.tsx` — Recharts BarChart showing 24 hours (0-23) on X-axis, visit count on Y-axis, tooltip with hour and count
- [x] T056 [US2] Implement DateRangePicker component in `src/components/dashboard/DateRangePicker.tsx` — start date and end date inputs, preset buttons (7 days, 30 days, 90 days), apply button, loading state during query
- [ ] T057 [US2] Implement Trends page in `src/pages/Trends.tsx` — DateRangePicker + VisitTrendChart + HourlyChart drill-down panel; manages date state; fetches trend data on range change; shows hourly detail when date clicked
- [ ] T058 [US2] Run all US2 tests: `npm test -- --run tests/unit/kpiService.trends.test.ts tests/component/VisitTrendChart.test.tsx tests/component/HourlyChart.test.tsx`

**Checkpoint**: Trends view works independently — shows daily visit chart, date range selector, hourly drill-down. All US2 tests pass.

---

## Phase 5: User Story 3 - Department & Doctor Performance (Priority: P3)

**Goal**: Display department analytics with drill-down and doctor workload rankings

**Independent Test**: Navigate to Departments tab → see ranked department list → click department → see doctor workload and department trend → see doctor ranking table

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T059 [P] [US3] Unit test for kpiService department/doctor queries in `tests/unit/kpiService.dept.test.ts` — getDepartmentBreakdown(config, dbType, startDate, endDate), getDoctorWorkload(config, dbType, startDate, endDate, depcode?), getDepartmentDailyTrend(config, dbType, depcode, startDate, endDate)
- [ ] T060 [P] [US3] Component test for DepartmentChart in `tests/component/DepartmentChart.test.tsx` — renders horizontal bar chart, handles click for drill-down, shows empty state
- [ ] T061 [P] [US3] Component test for DoctorTable (reuse DepartmentTable pattern) in `tests/component/DoctorTable.test.tsx` — renders doctor name and patient count, sorted desc, empty state

### Implementation for User Story 3

- [x] T062 [US3] Add department/doctor query methods to kpiService in `src/services/kpiService.ts` — getDepartmentBreakdown, getDoctorWorkload (with optional depcode filter), getDepartmentDailyTrend
- [ ] T063 [US3] Implement DepartmentChart component in `src/components/charts/DepartmentChart.tsx` — Recharts horizontal BarChart with department name on Y-axis, visit count on X-axis, onClick handler for department drill-down, responsive
- [ ] T064 [US3] Implement DoctorTable component in `src/components/dashboard/DoctorTable.tsx` — TanStack Table with columns: rank, doctor name, patient count; sorted desc; loading skeleton; EmptyState when no data
- [ ] T065 [US3] Implement DepartmentAnalytics page in `src/pages/DepartmentAnalytics.tsx` — DateRangePicker (reuse from US2) + DepartmentChart + drill-down panel (DoctorTable + VisitTrendChart filtered by depcode); manages selected department state; EmptyState for no data
- [ ] T066 [US3] Run all US3 tests: `npm test -- --run tests/unit/kpiService.dept.test.ts tests/component/DepartmentChart.test.tsx tests/component/DoctorTable.test.tsx`

**Checkpoint**: Department analytics works independently — department ranking, doctor workload, drill-down. All US3 tests pass.

---

## Phase 6: User Story 4 - Patient Demographics & Insurance Distribution (Priority: P4)

**Goal**: Display patient demographics (age groups, gender) and insurance/patient type distribution with fallback to ovst_patient_record

**Independent Test**: Navigate to Demographics tab → see gender pie chart and age group bar chart → see patient type distribution → verify data source notice when using fallback

### Tests for User Story 4

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T067 [P] [US4] Unit test for kpiService demographics queries in `tests/unit/kpiService.demo.test.ts` — getGenderDistribution(config, dbType, startDate, endDate), getAgeGroupDistribution(config, dbType, startDate, endDate), getPatientTypeDistribution(config, dbType, startDate, endDate); verify fallback logic when patient table is empty; verify correct age calc SQL per database type
- [ ] T068 [P] [US4] Component test for GenderChart in `tests/component/GenderChart.test.tsx` — renders pie/donut chart with male/female segments, shows empty state, displays data source notice
- [ ] T069 [P] [US4] Component test for AgeGroupChart in `tests/component/AgeGroupChart.test.tsx` — renders bar chart with 6 age groups, shows empty state

### Implementation for User Story 4

- [x] T070 [US4] Add demographics query methods to kpiService in `src/services/kpiService.ts` — getGenderDistribution (primary from patient, fallback to ovst_patient_record), getAgeGroupDistribution (uses queryBuilder.ageCalc for MySQL vs PostgreSQL), getPatientTypeDistribution (joins ovst + pttype); each method returns dataSource field indicating which table was used
- [ ] T071 [US4] Implement GenderChart component in `src/components/charts/GenderChart.tsx` — Recharts PieChart/donut with male/female segments, legend, tooltip with percentage, data source notice badge when using fallback
- [ ] T072 [US4] Implement AgeGroupChart component in `src/components/charts/AgeGroupChart.tsx` — Recharts BarChart with 6 age groups (Infant, Child, Teenager, Young Adult, Middle Age, Senior) on X-axis, count on Y-axis, responsive
- [ ] T073 [US4] Implement PatientTypeChart component in `src/components/charts/PatientTypeChart.tsx` — Recharts horizontal BarChart showing patient type names and visit counts, sorted desc, responsive
- [ ] T074 [US4] Implement Demographics page in `src/pages/Demographics.tsx` — DateRangePicker (reuse) + GenderChart + AgeGroupChart + PatientTypeChart; manages date state; shows data source notice; EmptyState per chart
- [ ] T075 [US4] Run all US4 tests: `npm test -- --run tests/unit/kpiService.demo.test.ts tests/component/GenderChart.test.tsx tests/component/AgeGroupChart.test.tsx`

**Checkpoint**: Demographics view works independently — gender, age group, and patient type charts render with correct data. Fallback to ovst_patient_record works. All US4 tests pass.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Integration testing, performance optimization, and final validation

- [ ] T076 [P] Integration test for full query execution flow in `tests/integration/queryExecution.test.tsx` — session connect → queryBuilder generates SQL → executeSqlViaApi → response parsed → UI renders, using MSW
- [ ] T077 [P] Integration test for session flow in `tests/integration/sessionFlow.test.tsx` — add tests for: cookie persistence, URL cleaning, session expiry detection, reconnect flow
- [ ] T078 Add lazy loading for route pages in `src/App.tsx` — React.lazy() for Trends, DepartmentAnalytics, Demographics pages with Suspense fallback
- [ ] T079 Add responsive breakpoints validation — verify all pages render correctly at 768px, 1024px, 1440px widths in component tests
- [ ] T080 Run full test suite with coverage: `npm run test:coverage` — verify 80%+ coverage for all new code
- [ ] T081 Run production build and validate: `npm run build` — no TypeScript errors, no warnings, bundle size check
- [ ] T082 Run quickstart.md validation — follow quickstart.md steps from scratch to verify setup instructions are accurate

---

## Phase 8: Docker Deployment & Local Testing

**Purpose**: Ensure the app can be built and run in the existing Docker setup (docker-compose + nginx) so stakeholders can test without installing dependencies locally.

- [ ] T083 Verify `Dockerfile` builds successfully and produces a working static bundle in `/dist`
- [ ] T084 Verify `docker-compose.yaml` starts the app on port 3080 and returns HTTP 200 on `/` within healthcheck timeout
- [ ] T085 Add or update documentation in `README.md` and `specs/001-bms-kpi-dashboard/quickstart.md` for docker-based dev/test workflow (build, run, stop)
- [ ] T086 Add a simple smoke test script (e.g. `scripts/smoke-test-docker.sh` or `npm run smoke:dock` placeholder) to validate the container is responding (optional)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 (Phase 3): No dependencies on other stories — this is the MVP
  - US2 (Phase 4): Independent of US1 but reuses no US1-specific components
  - US3 (Phase 5): Reuses DateRangePicker from US2 — can start after T056 complete
  - US4 (Phase 6): Reuses DateRangePicker from US2 — can start after T056 complete
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 — No dependencies on other stories
- **User Story 2 (P2)**: Can start after Phase 2 — Creates DateRangePicker reused by US3 and US4
- **User Story 3 (P3)**: Can start after Phase 2 — Reuses DateRangePicker from US2
- **User Story 4 (P4)**: Can start after Phase 2 — Reuses DateRangePicker from US2

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Service methods before UI components
- Components before page composition
- Story complete before moving to next priority

### Parallel Opportunities

- T006, T007, T008, T009 can run in parallel (Phase 1)
- T011-T017 can ALL run in parallel (Phase 2 tests)
- T032, T033, T034 can run in parallel (Phase 2 component/integration tests)
- T038-T041 can ALL run in parallel (US1 tests)
- T050-T052 can ALL run in parallel (US2 tests)
- T059-T061 can ALL run in parallel (US3 tests)
- T067-T069 can ALL run in parallel (US4 tests)
- T076, T077 can run in parallel (Phase 7)

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests in parallel:
Task: "Unit test for kpiService overview queries in tests/unit/kpiService.test.ts"
Task: "Component test for KpiCard in tests/component/KpiCard.test.tsx"
Task: "Component test for DepartmentTable in tests/component/DepartmentTable.test.tsx"
Task: "Integration test for session flow in tests/integration/sessionFlow.test.tsx"

# After tests written, implement sequentially:
Task: "Implement kpiService in src/services/kpiService.ts"
Task: "Implement KpiCard in src/components/dashboard/KpiCard.tsx"
Task: "Implement KpiCardGrid in src/components/dashboard/KpiCardGrid.tsx"
Task: "Implement DepartmentTable in src/components/dashboard/DepartmentTable.tsx"
Task: "Implement AppHeader in src/components/layout/AppHeader.tsx"
Task: "Implement Overview page in src/pages/Overview.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test US1 independently with real BMS session ID
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Polish phase → Final validation → Production ready

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (P1 — MVP)
   - Developer B: User Story 2 (P2 — creates DateRangePicker for US3/US4)
3. After US2 DateRangePicker ready:
   - Developer A: User Story 3 (P3)
   - Developer B: User Story 4 (P4)
4. Polish phase together

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests FAIL before implementing (TDD — Constitution Principle II)
- Commit after each task or logical group (Constitution Principle VIII)
- Stop at any checkpoint to validate story independently
- All SQL queries referenced in tasks are documented in `contracts/kpi-queries.md`
- MSW handlers in `src/mocks/handlers.ts` serve both dev and test environments
