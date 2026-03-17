# Research: BMS Session KPI Dashboard

**Branch**: `001-bms-kpi-dashboard` | **Date**: 2026-03-17

## Technology Decisions

### 1. Framework: React 19 + TypeScript + Vite

**Decision**: Vite 6 + React 19 + TypeScript (strict mode)

**Rationale**: Vite provides native ESM dev server with instant HMR, fast builds via Rollup, and is the standard for greenfield React projects in 2026. React 19 is the current stable release with improved performance and server component foundations. TypeScript strict mode is mandated by the constitution.

**Alternatives considered**:
- Next.js: Over-engineered for a client-side dashboard that talks to an external API. No SSR benefit since all data comes from BMS Session API at runtime.
- Create React App: Deprecated, no longer maintained.

### 2. Charting: Recharts

**Decision**: `recharts` (v3.x)

**Rationale**: Declarative React component API (`<BarChart>`, `<LineChart>`, `<PieChart>`), built-in `<ResponsiveContainer>` for responsive charts, ~45KB gzipped, strong TypeScript support in v3. Renders cleanly with empty data arrays (easy loading/skeleton states). Largest React-specific charting community (~3M+ weekly npm downloads).

**Alternatives considered**:
- Tremor: Built on Recharts + Tailwind but adds ~50KB overhead and locks into its design system. Can be added later if needed since it wraps Recharts.
- Nivo: Beautiful but heavier — each chart type is a separate package with D3 dependencies. Better for data visualization showcases than operational dashboards.
- Chart.js: Canvas-based, harder to style and integrate with React's component model.

### 3. UI Framework: shadcn/ui + Tailwind CSS

**Decision**: shadcn/ui components + Tailwind CSS v4

**Rationale**: Zero library runtime — components are copied as local source files, shipping only what's used. Built-in Card components for KPI cards, DataTable built on TanStack Table v8 for department/doctor tables, chart components built on Recharts. Dark/light theme via CSS variables. Official Vite template. Maximum customization for hospital branding.

**Alternatives considered**:
- Mantine: Batteries-included (120+ components) but adds library dependency. Good alternative if team prefers less assembly.
- MUI: Most powerful data grid but heaviest bundle (100-200KB gzipped). Overkill for standard data tables.

### 4. Testing: Vitest + React Testing Library + MSW

**Decision**: Vitest 4.x as test runner, React Testing Library for components, MSW 2.x for API mocking

**Rationale**:
- **Vitest**: Native Vite integration (shares `vite.config.ts`), TypeScript out of the box via esbuild, 10-20x faster watch mode than Jest, native ESM support, Jest-compatible API.
- **React Testing Library**: Industry standard for user-centric component testing. Tests behavior, not implementation.
- **MSW**: Network-level HTTP interception, same handlers for tests and dev. Perfect for BMS Session API contract tests.
- **jsdom**: DOM environment for component rendering. Most complete browser API emulation.

**Packages**:
```
vitest @vitest/coverage-v8 @vitest/ui jsdom
@testing-library/react @testing-library/jest-dom @testing-library/user-event
msw
```

### 5. State Management: React Context + Custom Hooks

**Decision**: No external state library. Use React Context for session state, custom hooks for query lifecycle.

**Rationale**: The BMS Session spec already defines `BmsSessionContext` and `useBmsSession()` / `useQuery()` hooks. Session state is the only global state; all other state is local to components or derived from queries. Adding Redux/Zustand would violate the simplicity principle.

### 6. Date Handling: date-fns

**Decision**: `date-fns` for client-side date formatting and manipulation

**Rationale**: Tree-shakable (import only functions used), pure functions (no mutations), strong TypeScript support. Only needed for display formatting — actual date filtering is done in SQL queries server-side.

**Alternative**: dayjs — similar size but date-fns has better tree-shaking.

## Database Compatibility Research

### Table Structure Verification (via MCP tools)

All core tables confirmed **identical** across MySQL and PostgreSQL:

| Table | MySQL | PostgreSQL | Key Columns |
|-------|-------|------------|-------------|
| `patient` | ✅ exists (0 rows) | ✅ exists (0 rows) | hn, pname, fname, lname, sex, birthday, bloodgrp, pttype |
| `ovst` | ✅ exists (0 rows) | ✅ exists (1,882 rows) | vn, hn, vstdate, vsttime, doctor, cur_dep, main_dep, pttype |
| `ipt` | ✅ exists | ✅ exists (115 rows) | an, hn, regdate, dchdate, ward, pttype, admdoctor |
| `er_regist` | ✅ exists | ✅ exists (224 rows) | vn, vstdate, er_emergency_type, er_doctor |
| `kskdepartment` | ✅ exists | ✅ exists (76 rows) | depcode, department, spclty |
| `doctor` | ✅ exists | ✅ exists (607 rows) | code, name, shortname |
| `opdscreen` | ✅ exists | ✅ exists | vn, bps, bpd, pulse, temperature, bw, height, bmi, rr, o2sat |
| `pttype` | ✅ exists | ✅ exists (82 rows) | pttype, name, nhso_code |
| `ward` | ✅ exists | ✅ exists | ward, name, bedcount |
| `ovst_patient_record` | ✅ exists | ✅ exists (4,056 rows) | vn, hn + all patient columns |

### SQL Function Mapping

| Function | MySQL/MariaDB | PostgreSQL |
|----------|--------------|------------|
| Current date | `CURDATE()` | `CURRENT_DATE` |
| Date format | `DATE_FORMAT(d, '%Y-%m')` | `TO_CHAR(d, 'YYYY-MM')` |
| Date subtract | `DATE_SUB(CURDATE(), INTERVAL 30 DAY)` | `CURRENT_DATE - INTERVAL '30 days'` |
| Age calc | `TIMESTAMPDIFF(YEAR, birthday, CURDATE())` | `EXTRACT(YEAR FROM AGE(birthday))` |
| Hour extract | `HOUR(vsttime)` | `EXTRACT(HOUR FROM vsttime)` |
| Random | `RAND()` | `RANDOM()` |
| String concat | `CONCAT(a, b)` | `CONCAT(a, b)` (same) |
| Table describe | `DESCRIBE table` | `SELECT ... FROM information_schema.columns` |
| Show tables | `SHOW TABLES` | `SELECT tablename FROM pg_tables WHERE schemaname='public'` |

### Fallback Strategy for Empty `patient` Table

When `SELECT COUNT(*) FROM patient` returns 0:
- Use `ovst_patient_record` (join on `vn` with `ovst`) for demographic KPIs
- `ovst_patient_record` has identical demographic columns: sex, birthday, bloodgrp, nationality, pttype
- Display a notice to users that demographics are derived from visit records
