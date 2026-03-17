# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BMS Session Demo Dashboard — a React/TypeScript web application that displays hospital statistics and patient data from HOSxP hospital management systems. The app uses BMS Session IDs for authentication and executes read-only SQL queries against hospital databases (MySQL, MariaDB, PostgreSQL).

## Key Documentation

- `docs/BMS-SESSION-FOR-DEV.md` — Complete BMS Session API specification (v2.0): session flow, `/api/sql` endpoint, field type codes, database compatibility, HOSxP table reference, example queries
- `.specify/memory/constitution.md` — Project constitution (v1.0.0): 9 mandatory development principles

## Architecture

### Session Flow

1. User arrives with `?bms-session-id=GUID` in URL (or from cookie/manual input)
2. App calls `https://hosxp.net/phapi/PasteJSON?Action=GET&code=SESSION_ID` to retrieve session data
3. Session response provides: `bms_url` (API endpoint), `bms_session_code` (JWT Bearer token), user info, database info
4. All queries go to `{bms_url}/api/sql` with Bearer token auth
5. Only SELECT, DESCRIBE, EXPLAIN, SHOW, WITH statements allowed (read-only)

### Planned Source Structure

```
src/
├── services/bmsSession.ts       # Core: retrieveBmsSession(), executeSqlViaApi(), extractConnectionConfig()
├── hooks/useBmsSession.ts       # useBmsSession() hook, useQuery() hook
├── contexts/BmsSessionContext.tsx  # BmsSessionProvider, useBmsSessionContext()
├── utils/sessionStorage.ts      # Cookie CRUD, URL param extraction
├── components/                  # Reusable UI components
├── pages/                       # Page-level components
└── types/                       # TypeScript interfaces

tests/
├── unit/          # Service and utility function tests
├── component/     # React component tests (React Testing Library)
├── integration/   # Cross-module flow tests
└── api/           # BMS Session API contract tests
```

### Key Architectural Rules

- **Business logic in services only** — components handle rendering and interaction, delegate everything else to `src/services/`
- **Session management centralized** in `bmsSession.ts`, exposed via context/hooks
- **SQL queries MUST use parameterized inputs** (`:param_name` syntax) to prevent injection
- **No hardcoded values** — API URLs, config, and query parameters must be dynamic (retrieved from session response)

## BMS Session API Quick Reference

**Session retrieval**: GET `https://hosxp.net/phapi/PasteJSON?Action=GET&code={sessionId}`

**SQL execution**: POST `{bms_url}/api/sql` with `Authorization: Bearer {bms_session_code}`
```json
{"sql": "SELECT COUNT(*) as total FROM patient", "app": "BMS.Dashboard.React"}
```

**Response shape**: `{ MessageCode, Message, data: [{...}], field: [int], field_name: [string], record_count }`

**Field type codes**: 1=Boolean, 2=Integer, 3=Float, 4=DateTime, 5=Time, 6=String, 7=Blob, 9=String

**Blacklisted tables**: opduser, opdconfig, sys_var, user_var, user_jwt (max 20 tables per query)

**PostgreSQL**: Use single quotes for string literals (double quotes = identifiers)

## Development Standards (Constitution v1.0.0)

- **TDD is non-negotiable**: write test → confirm fails → implement → confirm passes → refactor
- **Four test layers required**: unit (80% coverage min), component, integration, API contract
- **TypeScript strict mode** — no `any` without justification
- **Commit after every meaningful change** with descriptive prefix (feat/fix/test/refactor/docs)
- **Reuse over duplication** — extract shared logic into hooks, utils, shared components
- **Informative UX** — every operation needs loading state, actionable error messages, progress for multi-step flows, guidance for empty states
- **Performance** — API timeouts (30s session, 60s query), LIMIT clauses on SQL, lazy loading for non-critical routes

## Speckit Workflow

This project uses the speckit system for structured development:
- `/speckit.specify` — Create feature specifications
- `/speckit.plan` — Create implementation plans
- `/speckit.tasks` — Generate task lists from plans
- `/speckit.implement` — Execute implementation
- `/speckit.clarify` — Clarify ambiguous requirements
- `/speckit.analyze` — Cross-artifact consistency analysis

## Active Technologies
- TypeScript 5.x (strict mode) + React 19 + Vite 6, Recharts 3.x, shadcn/ui, Tailwind CSS v4, TanStack Table v8, date-fns (001-bms-kpi-dashboard)
- N/A (all data from BMS Session API; session cookie stored client-side) (001-bms-kpi-dashboard)

## Recent Changes
- 001-bms-kpi-dashboard: Added TypeScript 5.x (strict mode) + React 19 + Vite 6, Recharts 3.x, shadcn/ui, Tailwind CSS v4, TanStack Table v8, date-fns
