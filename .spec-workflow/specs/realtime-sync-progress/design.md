# Design Document

## Overview
Implement live sync progress reporting via Supabase Realtime while keeping the existing blocking refresh behavior. The frontend generates a progressId and passes it as a prop from the dashboard route to both the existing skeleton (dashboard-placeholder.tsx) and the dashboard. The API accepts an optional progressId query parameter and uses it only when a refresh actually occurs. The UI overlays a progress panel on top of the chart skeleton and updates in real-time via Supabase Realtime.

## Key changes vs. earlier revision
- Use the existing dashboard placeholder; no new skeleton component file.
- Add explicit UX details for the progress overlay (shadcn Progress, messages, multi-provider rows, accessibility, styling, and lifecycle).
- Allow queries.ts data() to accept an optional options object that may include progressId, preserving backward compatibility.

## Architecture

- Frontend flow
  1) In the dashboard route, generate `progressId = crypto.randomUUID()` via `useMemo`.
  2) Pass `progressId` to both the existing `DashboardPlaceholder` and the `Dashboard` components as props.
  3) The placeholder starts the Realtime subscription immediately.
  4) The Dashboard’s query path appends `?progressId={id}` by passing `{ progressId }` to `queries.data()` (new optional options param).
  5) On terminal status, the subscriber invalidates the data query to refetch.
- Backend flow
  1) Controller extracts Clerk external id and internal uid; binds optional `progressId` from the query string.
  2) If refresh is not needed: proceed as today; `progressId` is ignored and no progress row is created.
  3) If refresh is needed and `progressId` is present: create/update a progress row and inject a reporter into the sync pipeline.
  4) Provider services emit progress per chunk/page; reporter updates the Postgres row under RLS.

```mermaid
graph TD
  ROUTE[Dashboard Route] -->|progressId| SKEL[DashboardPlaceholder]
  ROUTE -->|progressId| DASH[Dashboard]
  DASH --> HOOK[queries.data({ progressId })]
  HOOK -->|GET /api/data?progressId=...| API[MeasurementsController]
  API --> CTX[CurrentRequestContext]
  API --> SYNC[MeasurementSyncService]
  SYNC --> FIT[FitbitService]
  SYNC --> WIT[WithingsService]
  FIT --> PROG[(sync_progress)]
  WIT --> PROG
  SKEL -->|Realtime subscribe to id| PROG
  PROG --> SKEL
  SKEL -->|terminal -> invalidate| DASH
```

## UX details: Progress overlay
- Placement
  - Overlay sits on top of the chart skeleton container; absolutely positioned so it does not reflow the layout.
  - Suggested Tailwind classes: `absolute inset-x-0 bottom-4 mx-4` anchored inside the chart skeleton wrapper.
- Container styling
  - `bg-background/80 backdrop-blur rounded shadow ring-1 ring-border p-3 space-y-2`
  - Respects semantic color variables; adapts to light/dark automatically.
- Components
  - shadcn `Progress` for the overall determinate value when available; omit the value for indeterminate.
  - Message text under the bar: small, `text-foreground`, `aria-live="polite"` for accessible updates.
  - Multi-provider rows beneath the main bar: compact, `text-muted-foreground text-xs`, one row per provider (Fitbit/Withings) with a succinct status, e.g.,
    - Fitbit: `2/8 chunks` (32-day windows)
    - Withings: `page 3…` or `merging…`
- States
  - Running: show Progress (determinate when `percent` known; otherwise indeterminate), live message, and provider rows.
  - Succeeded: no special overlay animation; the skeleton (and overlay) unmounts when the API returns.
  - Failed: no special overlay handling; the dashboard’s normal error UI handles failures after the request resolves.
- Accessibility
  - `aria-live="polite"` for message updates; ensure color is not the sole error indicator (include icon/text).
  - Keyboard focus remains on page content; overlay is non-interactive and does not trap focus.

## Data model for UI (providers jsonb)
Array of provider progress objects stored in `sync_progress.providers`:
- `provider`: `"fitbit" | "withings"`
- `stage`: `"init" | "fetching" | "merging" | "done" | "error"`
- `current`: number | null (chunks/pages completed)
- `total`: number | null (estimated total when known)
- `percent`: number | null (0..100 when known)
- `message`: string | null (short provider-specific note)

Overall fields on the row:
- `status`: `"running" | "succeeded" | "failed"`
- `percent`: 0..100 when determinable, else null
- `message`: short overall status (e.g., waiting on rate limit)

## Frontend components and APIs
- `apps/web/src/components/dashboard/dashboard-placeholder.tsx`
  - Accepts optional `progressId?: string`.
  - On mount when `progressId` exists: subscribe via `useRealtimeProgress(progressId)`.
  - Renders the current skeleton; adds the overlay described above when subscription has state.
  - On terminal: allow natural unmount as the API returns and suspense resolves; subscriber still invalidates queries to refetch.
- `apps/web/src/components/dashboard/dashboard.tsx`
  - Accepts optional `progressId?: string`.
  - Mount a light subscriber to handle cases where the skeleton is bypassed (warm cache); same terminal handling.
- `apps/web/src/lib/realtime/use-realtime-progress.ts`
  - Encapsulates Supabase Postgres Changes subscription to `public.sync_progress` for a specific `id`.
  - Exposes `{ status, percent, message, providers }` and terminal detection.
- `apps/web/src/lib/api/queries.ts`
  - `data(opts?: { sharingCode?: string; progressId?: string })` (new options param).
  - Appends `?progressId=...` when provided; maintains backward compat with legacy overload.

## Backend integration
- Typed request context
  - `ICurrentRequestContext { Guid Uid; string ExternalId; Guid? ProgressId }`
  - Scoped; populated in controller; injected where needed.
- Progress reporter
  - Create row on start; update providers and overall percent/message; complete/fail terminal updates; compute overall percent as average of provider percents when available.
- Provider emissions
  - Fitbit: update after each 32-day chunk; include `current`, `total`, and `percent` when estimable; message includes chunk range.
  - Withings: update after each page; `current` increments; `total` when estimable; message reflects `more`/offset; include merging stages.
  - Rate limits: set overall message with ETA when known.

## Error handling and fallbacks
- If Realtime is down: UI can continue to show the static skeleton; optional polling endpoint may be added later (not in this iteration).
- If `progressId` provided but no refresh occurs: overlay simply does not appear (no row created).
- On provider/auth error: row set to failed; dashboard shows its normal error UI; data still refetches to reflect last-known data.

## Testing strategy (high level)
- Backend: request context population, reporter writes, provider emissions, RLS constraints with Clerk JWTs.
- Frontend: placeholder overlay renders and updates; multi-provider rows; overlay not present after API resolves; queries.ts options param behavior; subscriber-driven refetch.
