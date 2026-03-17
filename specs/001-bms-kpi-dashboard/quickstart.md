# Quickstart: BMS Session KPI Dashboard

**Branch**: `001-bms-kpi-dashboard` | **Date**: 2026-03-17

## Prerequisites

- Node.js 20+ and npm
- A valid BMS session ID (test: `02FA45D1-91EF-4D6E-B341-ED1436343807`)

## Setup

```bash
# Clone and switch to feature branch
git clone https://github.com/manoi-bms/bms-session-id-demo-dashboard.git
cd bms-session-id-demo-dashboard
git checkout 001-bms-kpi-dashboard

# Install dependencies
npm install

# Start development server
npm run dev
```

## Test Connection

Open browser to: `http://localhost:5173/?bms-session-id=02FA45D1-91EF-4D6E-B341-ED1436343807`

Expected behavior:
1. Session connects (header shows "Ondemand User" / "server")
2. Database type detected as "PostgreSQL"
3. KPI cards load with aggregate data
4. Department workload table populates

## Run Tests

```bash
# All tests
npm test

# Specific test layer
npm run test:unit
npm run test:component
npm run test:integration
npm run test:api

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Build

```bash
npm run build     # Production build
npm run preview   # Preview production build locally
```

## Project Structure

```
src/
├── services/
│   ├── bmsSession.ts          # Session retrieval, SQL execution
│   └── queryBuilder.ts        # Database-type-aware SQL generation
├── hooks/
│   ├── useBmsSession.ts       # Session management hook
│   └── useQuery.ts            # SQL query lifecycle hook
├── contexts/
│   └── BmsSessionContext.tsx   # Global session state provider
├── utils/
│   └── sessionStorage.ts      # Cookie and URL parameter handling
├── components/
│   ├── ui/                    # shadcn/ui base components
│   ├── SessionValidator.tsx   # Session connection UI
│   ├── KpiCard.tsx            # Reusable KPI summary card
│   ├── DepartmentTable.tsx    # Department workload table
│   └── ...                    # Other dashboard components
├── pages/
│   ├── Overview.tsx           # KPI overview (US1)
│   ├── Trends.tsx             # Visit trends (US2)
│   ├── DepartmentAnalytics.tsx # Department/doctor (US3)
│   └── Demographics.tsx       # Demographics/insurance (US4)
├── types/
│   └── index.ts               # Shared TypeScript interfaces
├── App.tsx                    # Root with routing and provider
└── main.tsx                   # Entry point

tests/
├── unit/                      # Service and utility tests
├── component/                 # React component tests
├── integration/               # Cross-module flow tests
└── api/                       # BMS API contract tests
```

## Key Patterns

- **Business logic**: Always in `src/services/`, never in components
- **SQL queries**: Built via `queryBuilder.ts` which switches on `databaseType`
- **Session state**: Access via `useBmsSessionContext()` hook
- **Data fetching**: Use `useQuery()` hook for automatic loading/error states
- **Components**: Use shadcn/ui primitives, compose with Tailwind CSS
