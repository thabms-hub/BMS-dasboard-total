# Implementation Plan: BMS Session KPI Dashboard

**Branch**: `001-bms-kpi-dashboard` | **Date**: 2026-03-17 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-bms-kpi-dashboard/spec.md`

## Summary

Build a React/TypeScript single-page dashboard that uses BMS Session IDs to connect to HOSxP hospital databases and display KPI data. The system auto-detects database type (MySQL/PostgreSQL), abstracts SQL dialect differences via a query builder, and presents outpatient visits, inpatient counts, ER visits, department workload, visit trends, doctor performance, and patient demographics through interactive charts and tables. All data flows through the BMS Session `/api/sql` endpoint with Bearer token authentication.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) + React 19
**Primary Dependencies**: Vite 6, Recharts 3.x, shadcn/ui, Tailwind CSS v4, TanStack Table v8, date-fns
**Storage**: N/A (all data from BMS Session API; session cookie stored client-side)
**Testing**: Vitest 4.x, React Testing Library, MSW 2.x, jsdom, @vitest/coverage-v8
**Target Platform**: Modern browsers (Chrome, Edge, Firefox), desktop + tablet (min 768px)
**Project Type**: Single-page web application (client-side)
**Performance Goals**: Dashboard overview loads within 5 seconds, all queries complete within 10 seconds
**Constraints**: Read-only SQL access, max 20 tables per query, blacklisted tables, 30s session timeout / 60s query timeout
**Scale/Scope**: Single-user dashboard per session, 4 pages (Overview, Trends, Department, Demographics)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality First | ✅ PASS | TypeScript strict mode, Vite + ESLint, no hardcoded values (session-driven config) |
| II. TDD (NON-NEGOTIABLE) | ✅ PASS | Vitest + RTL + MSW stack selected; test-first workflow in task ordering |
| III. Comprehensive Test Coverage | ✅ PASS | 4 test directories: unit/, component/, integration/, api/; 80% coverage target |
| IV. Reusable Components | ✅ PASS | shadcn/ui primitives, shared KpiCard, reusable hooks (useQuery, useBmsSession) |
| V. Centralized Business Logic | ✅ PASS | services/bmsSession.ts + services/queryBuilder.ts; components render only |
| VI. Informative UX | ✅ PASS | Loading states per query, actionable errors, empty state guidance, session status header |
| VII. Performance & Reliability | ✅ PASS | Timeouts (30s/60s), LIMIT clauses, lazy-loaded routes, React.memo for chart components |
| VIII. Version Control | ✅ PASS | Commit after each task, feature branch (001-bms-kpi-dashboard) |
| IX. Skill-Driven Development | ✅ PASS | Plan created via /speckit.plan; TDD for implementation; review before merge |

## Project Structure

### Documentation (this feature)

```text
specs/001-bms-kpi-dashboard/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Technology decisions
├── data-model.md        # Entity definitions and state machines
├── quickstart.md        # Developer getting-started guide
├── contracts/
│   ├── bms-session-api.md  # BMS Session API contract
│   └── kpi-queries.md      # SQL query contracts per database type
├── checklists/
│   └── requirements.md     # Spec quality checklist
└── tasks.md             # Task list (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── ui/                     # shadcn/ui base components (Card, Table, Button, etc.)
│   ├── layout/
│   │   ├── AppHeader.tsx       # Session status, user info, navigation
│   │   ├── AppLayout.tsx       # Main layout wrapper with sidebar/tabs
│   │   └── LoadingSpinner.tsx  # Shared loading indicator
│   ├── dashboard/
│   │   ├── KpiCard.tsx         # Reusable KPI summary card
│   │   ├── KpiCardGrid.tsx     # 4-card grid layout
│   │   ├── DepartmentTable.tsx # Department workload data table
│   │   └── EmptyState.tsx      # Reusable empty state with guidance
│   ├── charts/
│   │   ├── VisitTrendChart.tsx  # Line/bar chart for daily trends
│   │   ├── HourlyChart.tsx      # Bar chart for hourly distribution
│   │   ├── DepartmentChart.tsx  # Horizontal bar chart for departments
│   │   ├── GenderChart.tsx      # Pie/donut for gender distribution
│   │   └── AgeGroupChart.tsx    # Bar chart for age groups
│   └── session/
│       ├── SessionValidator.tsx # Connection flow UI
│       ├── LoginForm.tsx        # Manual session ID input
│       └── SessionExpired.tsx   # Expiry notification with reconnect
├── pages/
│   ├── Overview.tsx             # US1: KPI overview dashboard
│   ├── Trends.tsx               # US2: Visit trends and time analysis
│   ├── DepartmentAnalytics.tsx  # US3: Department and doctor performance
│   └── Demographics.tsx         # US4: Demographics and insurance
├── services/
│   ├── bmsSession.ts            # retrieveBmsSession, executeSqlViaApi, extractConnectionConfig
│   ├── queryBuilder.ts          # Database-type-aware SQL generation
│   └── kpiService.ts            # KPI data fetching (uses bmsSession + queryBuilder)
├── hooks/
│   ├── useBmsSession.ts         # Session management hook
│   └── useQuery.ts              # SQL query lifecycle hook (loading/error/data)
├── contexts/
│   └── BmsSessionContext.tsx    # Global session state provider
├── utils/
│   ├── sessionStorage.ts        # Cookie CRUD, URL param extraction
│   └── dateUtils.ts             # Client-side date formatting helpers
├── types/
│   └── index.ts                 # All TypeScript interfaces (Session, QueryResult, KPIs, etc.)
├── App.tsx                      # Root: BmsSessionProvider + Router + SessionValidator
└── main.tsx                     # Vite entry point

tests/
├── unit/
│   ├── queryBuilder.test.ts     # SQL generation for MySQL vs PostgreSQL
│   ├── bmsSession.test.ts       # Session retrieval and config extraction
│   ├── kpiService.test.ts       # KPI data fetching logic
│   ├── sessionStorage.test.ts   # Cookie and URL handling
│   └── dateUtils.test.ts        # Date formatting utilities
├── component/
│   ├── KpiCard.test.tsx         # Card rendering, loading, error states
│   ├── DepartmentTable.test.tsx # Table rendering, sorting, empty state
│   ├── SessionValidator.test.tsx # Login flow, connection states
│   ├── VisitTrendChart.test.tsx # Chart rendering with data
│   └── EmptyState.test.tsx      # Empty state messaging
├── integration/
│   ├── sessionFlow.test.tsx     # URL → session → dashboard flow
│   ├── queryExecution.test.tsx  # Session → queryBuilder → API → UI
│   └── databaseDetection.test.ts # VERSION → type detection → query adaptation
└── api/
    ├── sessionApi.test.ts       # PasteJSON request/response contract
    ├── sqlApi.test.ts           # /api/sql request/response contract
    └── errorHandling.test.ts    # Error codes, expiry detection, blacklist handling
```

**Structure Decision**: Single-project (Option 1) — this is a client-side SPA with no backend. All data comes from the external BMS Session API. Source in `src/`, tests in `tests/` (mirrored structure).

## Complexity Tracking

> No violations. All choices align with constitution principles.
