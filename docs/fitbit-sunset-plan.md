# Fitbit Sunset Plan: Manual Entry, External API, and Fitbit Kill-Switch

## Background

Google is shutting down the Fitbit Web API. Its replacement, the Google Health API, uses
restricted OAuth scopes that require an annual CASA Tier 2 security assessment
(~$500–$4,500/yr) for any verified app — not viable for a hobby project. TrendWeight will
therefore become **Withings-only as a live provider**, and we will:

1. **Phase 1 — Manual weight entry.** Users can log/edit/delete/manage manual weight and
   body-fat readings with a dedicated page and a dashboard quick-log dialog, so orphaned
   Fitbit users have an option.
2. **Phase 2 — External `/api/v1` API with per-user API keys.** Scriptable submit + read,
   so crafty users can run a personal Google Health OAuth client (personal use under 100
   users is review-exempt) and push data into the manual bucket, and read combined data.
3. **Phase 3 — `Fitbit:Enabled` config kill-switch.** All code to stop Fitbit API calls,
   gated behind a flag that defaults to ON, so the freeze is a future config change, not a
   code change. Existing Fitbit data is preserved and keeps charting as history.

Product decisions already made:

- Manual source is **always-on / implicit** — no "enable" step; the `manual` source appears
  in charts once at least one entry exists.
- **One manual entry per date.** The date is the key for all manual CRUD.
- API key: one per user, **read + write**, stored hashed in the profile JSONB.
- External API is a **new versioned surface** (`/api/v1`); internal endpoints stay
  untouched and free to evolve.
- Decent mobile UX is an explicit requirement for manual entry.

## Architecture facts the design relies on

- `source_data` rows are keyed `(uid, provider)` with a JSONB `measurements` array of
  `RawMeasurement { Date "yyyy-MM-dd", Time "HH:mm:ss", Weight (always kg), FatRatio (0–1, optional) }`.
  There is no per-reading id; for manual data the `Date` is the key. Manual readings are
  date-only as a product rule: the API does not accept a time, and the stored `Time` is a
  fixed `"23:59:59"` placeholder (end-of-day so the reading stays on the user's chosen
  calendar date for any `dayStartOffset` 0–23).
- Measurement retrieval only includes providers returned by
  `ProviderIntegrationService.GetActiveProvidersAsync`, which iterates the DI-registered
  `IProviderService` set and asks each `HasActiveProviderLinkAsync`. A `manual`
  source_data row is invisible until a `ManualService` is registered.
- If a provider name is "active" but unregistered, `MeasurementSyncService.RefreshProviderAsync`
  reports a bogus error status — hence a registered no-op service (LegacyService pattern).
- Merge/compute picks one reading per day in `MeasurementComputationService.GroupAndSelectFirstByDay`:
  a **manual reading wins the day** over any same-day scale readings; otherwise the earliest
  time-of-day reading wins (the pre-existing rule).
- `ProvidersController` provider-name allow-lists already reject `manual` with 400
  (desired: manual has its own endpoints).
- Frontend gate `ensureProviderLinks` (`apps/web/src/lib/loaders/utils.ts`) redirects
  `/dashboard` → `/link` unless a non-legacy link with `hasToken && !isDisabled` exists.
  Manual-only users need the synthetic link + predicate change described below.

---

## Phase 1 — Manual readings (storage, internal endpoints, full UX)

### Backend

New files in `apps/api/TrendWeight/Features/Measurements/Manual/`:
`ManualMeasurementsController.cs`, `IManualDataService.cs`, `ManualDataService.cs`,
`Models/` DTOs. Plus `apps/api/TrendWeight/Features/Providers/ManualService.cs`.

**`ManualService : IProviderService`** (modeled on `LegacyService`):

- `ProviderName => "manual"`.
- `HasActiveProviderLinkAsync` → true iff a `source_data` row for `(uid, "manual")` exists
  with ≥1 measurement. Backed by a new `ISourceDataService.HasMeasurementsAsync(userId, provider)`
  implemented against `SourceDataService`'s request-scoped cache (no extra DB round trip).
- `SyncMeasurementsAsync` → no-op success with null measurements.
- OAuth methods → `NotSupportedException` / `false`.
- DI: `AddScoped<ManualService>()` + `AddScoped<IProviderService>(sp => sp.GetRequiredService<ManualService>())`
  in `ServiceCollectionExtensions`.

**`MeasurementSyncService`**: replace the two literal `provider != "legacy"` progress-reporter
exclusions with a shared `NonSyncingProviders = { "legacy", "manual" }` set (prevents bogus
"manual" sync-progress toasts).

**Endpoints** (`[Route("api/measurements/manual")]`, extends `BaseAuthController`):

| Verb   | Route                            | Behavior |
|--------|----------------------------------|----------|
| GET    | `/api/measurements/manual`        | List all, sorted desc by date. No paging (low cardinality). |
| PUT    | `/api/measurements/manual/{date}` | Idempotent upsert — create or fully replace the entry for that date. 200 + resulting reading. |
| DELETE | `/api/measurements/manual/{date}` | Delete the entry for that date. 404 if missing. |
| DELETE | `/api/measurements/manual`        | Delete all manual readings (clear array, keep row). |

PUT body: `{ weight, fatRatio? }` — date comes from the URL; readings are date-only (no
time). **Wire contract is canonical kg and 0–1 fat ratio**; the client converts display
units before submit. The same date-keyed upsert shape carries into the public v1 API in
Phase 2. The backend stores `Time = "23:59:59"` to satisfy `RawMeasurement`.

Validation (400 with field messages): date exact `yyyy-MM-dd`, `1900-01-01 ≤ date ≤ today+1`
(timezone slack); weight `> 0 && < 700` kg, ≤3 decimals; fatRatio if present `> 0 && < 1`
(reject ≥1 loudly — percent-vs-ratio is the likely client bug).

**`ManualDataService`** (single funnel for mutations): read via
`ISourceDataService.GetSourceDataAsync(userId, ["manual"])` → upsert/remove by `Date` →
re-sort desc → `UpdateSourceDataAsync` with `LastUpdate = UtcNow` (keeps the row "fresh" so
dashboard loads skip even the no-op refresh).

*Concurrency:* read-modify-write on the whole JSONB array is last-writer-wins. Acceptable
for Phase 1 (one user editing their own data). **Before Phase 2** (scripted concurrent
writers), add an atomic JSONB upsert RPC (Supabase migration) and route writes through it.

**Synthetic provider link:** `ProvidersController.GetProviderLinks` appends
`{ provider: "manual", hasToken: true, isDisabled: false, updateReason: null }` when manual
data exists. Because `hasToken` is true, the existing frontend `/link` gate
(`ensureProviderLinks`) and the download page gate both pass for manual-only users with no
frontend predicate changes. Mutations invalidate the provider-links query so the synthetic
link appears/disappears as readings are added/removed.

### Frontend

- New shadcn `Dialog` primitive (`apps/web/src/components/ui/dialog.tsx` + `@radix-ui/react-dialog`).
- Route **`/log`** (`apps/web/src/routes/log.tsx`): `requireAuth` + `ensureProfile`, deliberately
  NO `ensureProviderLinks`. Page (`components/log/log.tsx`, titled "Manual Readings"):
  list-first — heading + "Add Reading" button that opens the dialog; no always-visible form.
- `manual-reading-form.tsx` — shared RHF add/edit form (no zod). Weight + optional body-fat %
  with `inputMode="decimal"`, native `type="date"` input (no time field — readings are
  date-only); unit-aware labels from `useMetric`; client converts lb→kg and %→ratio on submit.
- One entry per date: the form consumes `useManualReadings()` in all modes; when the chosen
  date already has an entry it shows "Replaces today's entry: …" and the submit label becomes
  "Replace". Editing to a different date = PUT new date + DELETE old date.
- `manual-readings-list.tsx` — responsive flex rows (no table), edit/delete icon buttons,
  ConfirmDialog on delete, client-side pagination (50/page), empty state.
- Dashboard quick-add (`quick-log-button.tsx`): a compact **split button** after the chart
  toggles (gated on `isMe`) and on the no-data path. The primary segment opens
  `manual-reading-dialog.tsx` in add mode; the attached chevron opens a dropdown with
  "Manage manual readings" → `/log`. The dialog footer carries the same link as a
  secondary path.
- API layer: `queryKeys.manualReadings()`, `useManualReadings()`, `useSaveManualReading`
  (PUT), `useDeleteManualReading`, `useDeleteAllManualReadings` — mutations invalidate
  `manualReadings`, `allData()`, and `providerLinks()` so dashboard/download/gates refresh.
- Discovery: deliberately NO top-level nav item. `/log` is reached from three places:
  the dashboard split-button menu item ("Edit your weight log"), the `/link` page — where
  "Log It Yourself" is a first-class card alongside the Withings/Fitbit provider cards —
  and a "Weight Log" row with an Edit button in the settings connections list
  (`provider-list.tsx` settings variant). The mark everywhere is the Phosphor
  "note-pencil" duotone glyph, inlined as `components/common/note-pencil-icon.tsx`
  (post-it `--color-manual-tile` token + black glyph + `fill-primary` shading in the big
  spots, plain currentColor in menus).
- **User-facing vocabulary (use in Phase 2 docs/UI too):** the feature is the
  **"Weight Log"**; a single item is an **"entry"**; the verbs are **"log"** and
  **"edit"**. Never say "manual readings" or "manage" in UI copy — "manual" is reserved
  for code identifiers (the `manual` provider key, internal endpoint paths), which are
  unchanged.
- `manual` provider-string fallout: `provider-display.ts` metadata ("Manual" /
  "Manual Entries"); `no-data-card.tsx` + `provider-sync-error.tsx` hardcoded
  withings/fitbit ternaries → `getProviderDisplayName` (manual/legacy excluded);
  sync-progress provider type widened to `string`. The download page and `/link` gate work
  unchanged thanks to the synthetic link's `hasToken: true`.

---

## Phase 2 — External `/api/v1` + per-user API keys

**Key storage** (in `ProfileData` JSONB): `ApiKeyHash` (SHA-256 hex — the key has 128 bits
of entropy, so a fast hash is fine and enables indexed equality lookup), `ApiKeyPrefix`
(first 8 chars for display), `ApiKeyCreatedAt`. Key format: `twk_` + 25-char base36 of 128
random bits, reusing the `GenerateShareToken`/`ToBase36` machinery in `ProfileService`
(extract to a shared helper). Supabase migration: expression index on
`(profile->>'ApiKeyHash')`. Lookup mirrors `GetBySharingTokenAsync`.

**Management** (Clerk-authed, internal): `Features/ApiKeys/ApiKeysController` at
`api/profile/api-key` — `POST` generate/rotate (plaintext returned once), `GET` metadata
(`exists`, `prefix`, `createdAt`), `DELETE` revoke. Settings UI section modeled on
`sharing-section.tsx` (readonly input + copy button + ConfirmDialog for rotate/revoke).

**Authentication**: `Infrastructure/Auth/ApiKeyAuthenticationHandler.cs`, scheme `"ApiKey"`,
registered alongside Clerk. Handles only `twk_`-prefixed `Authorization: Bearer` tokens (or
`X-Api-Key`), `NoResult()` otherwise. On match emits `ClaimTypes.NameIdentifier = uid` plus
`("auth_method", "api_key")`. `/api/v1` controllers use
`[Authorize(AuthenticationSchemes = "ApiKey")]` via a `BaseApiV1Controller`; internal
endpoints keep Clerk-only.

**Surface** (`Features/ApiV1/`, own DTOs — never reference internal response classes):

| Verb   | Route                                | Behavior |
|--------|--------------------------------------|----------|
| GET    | `/api/v1/measurements?since=&includeSource=` | Computed (and optionally raw per-source) data for the key's user. Extract the orchestration shared with `MeasurementsController` into a service first. |
| GET    | `/api/v1/measurements/manual`         | List manual readings. |
| PUT    | `/api/v1/measurements/manual/{date}`  | Same date-keyed idempotent upsert as internal — safe for scripted retries. |
| POST   | `/api/v1/measurements/manual`         | Batch upsert: array of `{date, weight, fatRatio?}`. |
| DELETE | `/api/v1/measurements/manual/{date}`  | Delete one. |

All weights kg, fat as 0–1 ratio — documented in the DTOs.

**Rate limiting (also fixes a latent bug):** today the limiter is a no-op —
`app.UseRateLimiter()` runs before `UseAuthentication()` in `Program.cs`, and it partitions
on the `sub` claim which `ClerkAuthenticationHandler` strips. Move it after auth, partition
on `ClaimTypes.NameIdentifier`, and tier API-key principals (via the `auth_method` claim)
stricter than interactive users (e.g. 60/min, tighter on writes).

**Prerequisite:** the atomic JSONB upsert RPC noted in Phase 1 concurrency.

---

## Phase 3 — `Fitbit:Enabled` kill-switch

- Add `Enabled` (default `true`) to `FitbitConfig`. `Fitbit:Enabled=false` via config/env
  flips it with no code change.
- Make `ProviderServiceBase.SyncMeasurementsAsync` virtual; override in `FitbitService` to
  short-circuit when disabled, returning a new `ProviderSyncError.Disabled` result with a
  user-facing message. This is the single network chokepoint
  (`MeasurementSyncService.RefreshProviderAsync` is the only caller); a disabled result
  skips storage while **preserving existing fitbit source_data** — history keeps charting.
- `FitbitLinkController` returns 503 with an explanatory error on link/token-exchange when
  disabled (blocks new connections).
- Dashboard keys a banner ("Fitbit has shut down; your history is preserved — log weights
  manually or connect Withings") off `providerStatus.fitbit.error === "disabled"` in the
  existing `MeasurementsResponse.ProviderStatus` flow.
- Provider links stay listed in settings so users can see/disconnect them.

---

## Status

- [x] Phase 1 — manual readings (storage, internal endpoints, UX)
- [ ] Phase 2 — `/api/v1` + API keys (incl. atomic upsert RPC + rate-limiter fix)
- [ ] Phase 3 — `Fitbit:Enabled` kill-switch

### Phase 1 — completed 2026-06-09 (branch `feature/google-health-api`)

Landed in two commits:

- `8bcf8880` — initial implementation: `ManualService` provider (implicitly active when
  ≥1 reading exists), `api/measurements/manual` endpoints, synthetic `manual` provider
  link, `/log` page, dashboard quick-log dialog, provider-string fallout, full test
  coverage. Also fixed a `.gitignore` gotcha: the Visual Studio `[Ll]og/` pattern was
  silently ignoring `apps/web/src/components/log/` (negation entry added).
- `bc8a1518` — UX revisions from review:
  - Readings became **date-only**: no time in the API (`{ weight, fatRatio? }`) or UI;
    backend stores `Time = "23:59:59"`.
  - **Manual wins the day**: `GroupAndSelectFirstByDay` prefers `Source == "manual"` over
    same-day scale readings (applies to fat selection too); download view hides the
    placeholder time for manual rows.
  - `/log` became list-first ("Manual Readings" heading + Add Reading dialog) instead of
    an always-visible form card.
  - Dashboard quick-log became a compact split button placed after the chart toggles
    (was a full-width button above them on mobile); top-level "Log Weight" nav item
    removed.
  - Manual entry promoted to a first-class card on `/link` and a "Manual Entries" row in
    settings connections.

Verified: 373 API tests + 904 web tests passing, `npm run check` and `npm run build`
clean (one pre-existing benign react-hooks/incompatible-library warning on RHF `watch`).
Interactive end-to-end (Clerk login required) is owner-verified via the dev servers, not
automated.

Notable for Phase 2: the v1 manual endpoints should mirror the date-only body
`{ weight, fatRatio? }`; the atomic JSONB upsert RPC and rate-limiter ordering fix remain
prerequisites before exposing scripted writes.
