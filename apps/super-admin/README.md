# VortexCubes Asset Network V4.0 — Super Admin Command Center

Frontend-only Next.js build of the Super Admin panel described in the BRD and SOW.
No backend exists yet — every screen runs on a mock service layer that mirrors the
shape a real Fastify/PostgreSQL/PostGIS/Redis backend is expected to return.

## Stack

- Next.js 14 (App Router) + React 18 + TypeScript
- Tailwind CSS (custom design tokens in `tailwind.config.ts`)
- Recharts for all charts
- Zustand for auth session, sidebar/UI state, and toasts
- lucide-react for icons

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000` — it redirects to `/admin/login`. Any email/password
signs you in (mock auth, stored in `localStorage`).

```bash
npm run build   # production build
npm run lint    # ESLint
```

## Folder structure

```
app/
  admin/
    login/                     Public login page
    dashboard/                 Overview: stat cards, charts, activity feed
    users/, users/[id]/        User management (list + detail)
    brokers/, brokers/[id]/    Broker management (list + detail)
    agencies/, agencies/[id]/  Agency management (list + detail)
    properties/
      residential/ commercial/ land/ furniture/   Category list pages
      [id]/                                        Shared property detail page
    visits/                    Visit scheduling & geolocation check-in status
    revenue/
      page.tsx                 Overview across all 4 monetization streams
      subscriptions/ commission/ micro-transactions/ transactions/
    urgent-requirements/       Displays backend-flagged urgency signals only
    reports/                   Modular report categories
    monitoring/                System health (API, PostGIS, Redis)
    settings/                  Profile, security, notifications, roles placeholder
    layout.tsx                 Auth-guarded shell (sidebar + navbar)
  layout.tsx, page.tsx, globals.css

components/
  layout/     Sidebar, Navbar, PageHeader, Breadcrumbs
  ui/         StatCard, DataTable, SearchBar, FilterDropdown, StatusBadge,
              Pagination, Modal, ConfirmationDialog, States (loading/empty/
              error/unauthorized), ChartCard, ToastContainer
  properties/ Shared PropertyTable used by all 4 property category pages

lib/
  api/client.ts       Centralized fetch wrapper (auth header, error handling) —
                       not yet called by services; ready for when APIs exist
  api/endpoints.ts     Centralized, typed endpoint path map (proposed contracts)
  utils/               cn(), currency/date formatters

services/               One module per domain. UI calls ONLY these functions.
  dashboardService.ts, userService.ts, brokerService.ts, agencyService.ts,
  propertyService.ts, visitService.ts, revenueService.ts,
  urgentRequirementService.ts, reportService.ts, monitoringService.ts
  mock/                 Deterministic mock data generators + pagination helper

store/                  Zustand stores: authStore, uiStore, toastStore
hooks/                  useAuthGuard, useDebounce
types/                  Shared TypeScript interfaces per domain
```

## Mock data → real API migration path

Every service function currently does:

```ts
getUsers: (filters, pagination) => simulateNetwork(() => { ...mock logic... })
```

To connect the real backend, change the body to:

```ts
getUsers: (filters, pagination) => apiClient.get(apiEndpoints.admin.users.list, ...)
```

No component, page, or hook needs to change — they only ever import from
`services/*`, never from `services/mock/*` or `lib/api/*` directly.

## Proposed API contracts

Centralized in `lib/api/endpoints.ts`. These are **frontend-proposed contracts,
not confirmed backend URLs** — the BRD/SOW do not finalize exact routes. Kept in
one file so they're trivial to change later. See section 29 of the build brief
for the full list; summarized:

```
POST   /api/admin/auth/login
GET    /api/admin/dashboard
GET    /api/admin/users                      GET /api/admin/users/:id
PATCH  /api/admin/users/:id/status           DELETE /api/admin/users/:id
GET    /api/admin/brokers                    GET /api/admin/brokers/:id
PATCH  /api/admin/brokers/:id/approve        PATCH /api/admin/brokers/:id/reject
GET    /api/admin/agencies                   GET /api/admin/agencies/:id
PATCH  /api/admin/agencies/:id/approve       PATCH /api/admin/agencies/:id/reject
GET    /api/admin/properties                 GET /api/admin/properties/:id
PATCH  /api/admin/properties/:id/status
GET    /api/admin/visits
GET    /api/admin/revenue/{subscriptions,commission,micro-transactions,transactions}
GET    /api/admin/urgent-requirements
GET    /api/admin/reports/*
GET    /api/admin/monitoring
```

## Environment variables

See `.env.example`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_DATA_MODE=mock
```

## Assumptions made (not defined in BRD/SOW)

- Exact broker payout split, payout timing, and full commission calculation
  rules — the Commission screen surfaces the fields but does not compute or
  invent these; it renders whatever the backend sends.
- Detailed RBAC/role-permission rules — Settings → Roles & Permissions is a
  placeholder ready for future endpoints.
- Exact backend API URLs — treated as proposed frontend contracts only.
- The urgency **detection algorithm** (Redis search-velocity tracking) is
  backend-only; the frontend exclusively displays resulting flags.
- Visual design system (colors, spacing, typography) — no Figma was provided,
  so a professional enterprise-admin palette was designed from scratch.

## Notes

- `node_modules` is intentionally excluded from this archive — run `npm install`
  first.
- All data on screen is generated by `services/mock/*` with a seeded random
  generator, so numbers are stable across reloads but are not real.
