# Implementation Plan

## Task Overview
Implement progress-only sync reporting with a frontend-provided progressId, type-safe backend request context, Supabase Realtime updates, and minimal UI wiring in the dashboard.

## Tasks

- [x] 1. Database: sync_progress table + RLS
  - File: Supabase dashboard migration (document in apps/api/TrendWeight/supabase/schema.sql)
  - Create table public.sync_progress with columns:
    - id uuid primary key (provided by frontend)
    - uid uuid not null
    - external_id text not null (Clerk sub)
    - provider text not null default 'all' check in ('fitbit','withings','all')
    - status text not null check in ('running','succeeded','failed')
    - providers jsonb null (array of provider progress objects; see shape below)
    - percent int null (0..100)
    - message text null
    - started_at text default to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    - updated_at text default to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  - Providers JSON shape (UI relies on this):
    - [
      {
        "provider": "fitbit" | "withings",
        "stage": "init" | "fetching" | "merging" | "done" | "error",
        "current": number | null,       // e.g., chunks/pages completed
        "total": number | null,         // e.g., chunks/pages total if known
        "percent": number | null,       // 0..100 if known
        "message": string | null        // short status for this provider
      }
    ]
  - Constraints/Indexes:
    - CHECK (percent BETWEEN 0 AND 100) WHEN percent IS NOT NULL
    - Indexes: (external_id), (uid), (status)
  - Trigger: BEFORE UPDATE to set updated_at on change
  - RLS: enable; SELECT for authenticated where external_id = (auth.jwt() ->> 'sub'); deny anon; service_role full access
  - Purpose: Persist per-user progress rows and enable Realtime
  - _Leverage: apps/api/TrendWeight/supabase/schema.sql_
  - _Requirements: R3, R5

- [ ] 2. Backend: typed request context (ICurrentRequestContext)
  - Files: 
    - apps/api/TrendWeight/Features/Common/ICurrentRequestContext.cs
    - apps/api/TrendWeight/Features/Common/CurrentRequestContext.cs
    - apps/api/TrendWeight/Features/Common/RequestContextExtensions.cs
  - Add Scoped registration in AddTrendWeightServices
  - Populate in MeasurementsController from claims + query (progressId)
  - Purpose: Provide type-safe uid, externalId, progressId to services
  - _Leverage: existing DI setup in Program.cs_
  - _Requirements: R2, R5

- [ ] 3. Backend: SyncProgressService and reporter
  - Files:
    - apps/api/TrendWeight/Features/SyncProgress/ISyncProgressReporter.cs
    - apps/api/TrendWeight/Features/SyncProgress/NoOpProgressReporter.cs
    - apps/api/TrendWeight/Features/SyncProgress/SyncProgressService.cs
    - apps/api/TrendWeight/Features/SyncProgress/Models/SyncProgressRow.cs
  - Register SyncProgressService as Scoped
  - Methods:
    - CreateProgressRow(progressId)
    - UpdateProviderProgress(provider, { stage, current, total, percent, message })
    - UpdateOverallProgress({ percent?, message? })
    - CompleteProgress({ message? })
    - FailProgress({ message })
    - CleanupOldProgress()
  - Behavior:
    - When multiple providers update, compute overall percent as the average of available provider percents (integers), falling back to explicit overall.percent if supplied
    - Clamp percent to 0..100
  - Purpose: Centralize DB writes for progress and provide no-op reporter when no progressId
  - _Leverage: existing Supabase data access patterns_
  - _Requirements: R2, R3, R4, R5

- [ ] 4. Backend: wire progress into MeasurementSyncService and providers
  - Modify MeasurementSyncService to accept optional ISyncProgressReporter and emit Start/Complete/Fail around refresh
  - FitbitService: emit after each 32-day chunk (current/total, percent, message)
  - WithingsService: emit after each page (current/total if known, percent if derivable, message)
  - Rate limit: set overall message with backoff info when throttled
  - Purpose: Produce meaningful per-provider progress
  - _Leverage: existing chunk/page loops_
  - _Requirements: R3, R4

- [ ] 5. Frontend: prop-based progressId + Realtime hook + update existing skeleton UI
  - Files:
    - apps/web/src/lib/realtime/client.ts
    - apps/web/src/lib/realtime/use-realtime-progress.ts
    - apps/web/src/lib/api/queries.ts (augment data query)
  - Route dashboard.tsx: useMemo(() => crypto.randomUUID(), []); pass as prop to both the existing DashboardPlaceholder and Dashboard components
  - Update apps/web/src/components/dashboard/dashboard-placeholder.tsx:
    - When a progressId prop is provided, subscribe via use-realtime-progress
    - Overlay design: render a small overlay on top of the chart skeleton container (absolute, inset-x-0 bottom-4, mx-4)
      - Container styles: bg-background/80, backdrop-blur, rounded, shadow, ring-1 ring-border, p-3, space-y-2
      - Use shadcn Progress component for the overall percent (value={overall.percent})
      - Message: small, text-foreground; aria-live="polite"; updates as messages change
      - Multi-provider: beneath the main bar, render compact rows for each provider with its name and status (e.g., "Fitbit: 2/8 chunks", "Withings: page 3…"); keep typography subtle (text-muted-foreground, text-xs)
      - Success: no special handling here; the skeleton (and overlay) unmounts when the API returns
      - Failure: no special overlay handling; existing dashboard error display handles errors after the request resolves
    - Maintain existing skeleton visuals; overlay should not reflow layout
  - dashboard.tsx: accept optional progressId prop; mount a light subscriber to cover cache-hit
  - queries.ts: change data signature to accept optional options object: data: (opts?: { sharingCode?: string; progressId?: string })
    - Update queryFn to append ?progressId=... when provided
    - Preserve existing call sites by supporting the legacy overload (sharingCode?: string)
  - Tailwind & UI rules:
    - Use semantic color variables (bg-background, text-foreground, ring-border, text-muted-foreground)
    - Use standard UI components; avoid raw HTML for interactive elements
  - Purpose: Use the existing placeholder—no new component files—while enabling realtime progress with clear, accessible UI
  - _Leverage: existing Layout + DashboardPlaceholder + hooks_
  - _Requirements: R3, R6

- [ ] 6. Frontend tests
  - Hook test: use-realtime-progress handles mocked events and calls onComplete
  - Component test: dashboard-placeholder mounts subscription and displays overlay with shadcn Progress + messages when progressId is provided; overlay is not rendered after the API resolves
  - Multi-provider test: renders two provider rows with differing statuses and updates when new events arrive
  - queries.ts test: data(opts) appends progressId correctly and remains backward compatible
  - Purpose: Ensure UX is wired and resilient
  - _Leverage: vitest + MSW_
  - _Requirements: R6

- [ ] 7. Docs & env
  - Update docs/ARCHITECTURE.md with short progress flow note and the providers jsonb shape
  - Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY documented/available
  - Purpose: Make setup clear for Realtime integration
  - _Leverage: existing docs structure_
  - _Requirements: R3, R6

- [ ] 8. Quality gates & smoke
  - Run npm run check && npm run test from repo root
  - Build API (TrendWeight.sln) and run minimal smoke (GET /api/health; /api/data with progressId)
  - Purpose: Keep the mainline green and verify end-to-end path
  - _Leverage: existing build/test configs_
  - _Requirements: Non-functional
