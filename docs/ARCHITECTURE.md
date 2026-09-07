# TrendWeight architecture

## Code map

| Path                                  | Responsibility                                                          |
| ------------------------------------- | ----------------------------------------------------------------------- |
| `apps/web/src/routes`                 | TanStack routes, loaders, and authentication guards                     |
| `apps/web/src/components`             | Feature screens and shared UI components                                |
| `apps/web/src/lib`                    | API clients, query/cache ownership, chart/trend calculations, utilities |
| `apps/api/TrendWeight/Features`       | Controllers, services, and models grouped by feature                    |
| `apps/api/TrendWeight/Infrastructure` | Authentication, data access, middleware, configuration                  |
| `apps/api/TrendWeight.Tests`          | Backend unit tests and HTTP pipeline tests                              |
| `supabase/migrations`                 | Database schema and migrations                                          |
| `scripts`                             | Docker helpers and their tests                                          |

The frontend uses React, TanStack Router/Query, Highcharts, and Tailwind CSS.
The backend is ASP.NET Core. npm workspaces and Turborepo coordinate builds/checks;
exact dependency versions belong in package manifests and lockfiles.

## Applications and request boundaries

The React SPA uses Clerk for login and sends session tokens to the ASP.NET Core
API. Clerk JWT validation checks signature, issuer, lifetime and the `azp` origin
against `PublicBaseUrl` when present (defaulting to `http://localhost:5173` in
Development), independent of internal proxy addresses or request headers. `user_accounts` maps the external Clerk ID to an internal UUID.
Internal API endpoints use the Clerk authentication scheme. `/api/v1` explicitly
uses API-key authentication; those keys do not grant access to internal settings.
API-key hashes are stored in profile JSON and indexed by a database migration.
`GET /api/v1/settings` returns only display and behavioral preferences for the key
owner, without requiring sharing. Unlike measurement endpoints, its `goalWeight`
and `plannedWeightChangePerWeek` use display units (`useMetric`: kilograms if true,
pounds otherwise); negative weekly change means loss. Unset goals are omitted.
Settings are read-only through the public API and documented in the v1 OpenAPI schema.

Sharing endpoints allow anonymous access only when the profile's sharing switch
is enabled and the supplied sharing token resolves. Computed and raw shared data
must honor hidden-history settings. Provider error/status information stays out
of shared responses.

Rate limiting partitions authenticated requests per user (API keys on a stricter
tier, writes tighter than reads). Anonymous API requests, including rejected
credentials, are partitioned per client address taken from the configured
`RateLimiting:ClientAddressHeaders` (falling back to the peer address) and are
also capped by one shared ceiling, so the limiter stays effective even if a
client address header were spoofable. Non-API anonymous requests are not limited.

Each resolved browser account gets its own query client, router, and component
subtree. Route loaders use the client supplied by router context. This isolates
cached health data and local form/key state, including late requests after logout.

## Data and providers

`MeasurementOrchestrationService` loads a profile, synchronizes enabled sources,
then computes trend data. Provider services fetch Withings/Fitbit data; manual and
legacy sources join the same computation pipeline. Source weights are kilograms
and fat values are ratios. Dates and day-start offsets affect which daily reading
is selected; preserve those rules when adjusting filtering or conversion.

OAuth initiation issues signed state bound to the user and provider. Callback
exchanges must validate that state before persisting credentials. Never log OAuth
authorization URLs, codes, raw token responses, or secret values.

Provider failures preserve existing readings. A forced full sync replaces stored
data only after a complete successful fetch and clears its flag with the same
source-document write. Manual edits use whole-document read/modify/write; concurrent
writes still have a last-writer-wins limitation and require a separate storage
concurrency design if stronger guarantees are needed.

Account deletion removes legacy and application data before deleting the Clerk
login. Required failures are reported and mapping deletion is withheld. Cross-service
deletion is not transactional. Legacy Supabase Auth deletion remains best effort
because current users authenticate with Clerk and may lack a legacy Auth account.

## Database authority

The canonical schema is `supabase/migrations`; there is no other schema copy.

| Table             | Purpose and boundaries                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------- |
| `profiles`        | Internal UUID, email and profile JSON; API-key hash and sharing-token expression indexes |
| `provider_links`  | Provider OAuth token JSON, first-connected timestamp; composite user/provider primary key |
| `source_data`     | Raw measurement arrays, last sync and forced-full-sync flag                              |
| `user_accounts`   | Unique external-provider identity mapped to internal UUID                                |
| `legacy_profiles` | Legacy profile and measurement import data                                               |

Profile deletion cascades to provider links and source data. The committed schema
enables row-level security and revokes anon/authenticated privileges on tables,
sequences, and functions (including default privileges for future objects); the
backend uses the service role. Progress messages use Supabase Realtime broadcasts
on random progress-ID topics. These are advisory status messages, not an
authorization mechanism.

OAuth tokens are stored as readable JSON; there is no application-level token
encryption. Profile JSON uses the PascalCase property names serialized by
`ProfileData` (for example `ApiKeyHash` and `SharingToken`); do not change their
casing without a migration and compatible query changes.

Create schema changes with `supabase migration new <name>` and review the SQL.
Apply to remote projects only through the approved migration workflow; never edit
remote tables/policies through ad hoc SQL or the dashboard.

## HTTP and deployment boundaries

One container serves the API and Vite assets on port 8080. YARP proxies analytics
requests to Plausible. Whenever the built shell exists in `wwwroot` (always true in
the container image, in any environment), non-API GET/HEAD routes fall back to it;
unknown API routes return 404. In local development there is no `wwwroot` and the
Vite dev server hosts the SPA. The shell is uncached and hashed assets are immutable.

Callback destinations and OpenAPI server URLs come from `PublicBaseUrl`, not
request headers. Hosting ingress enforces HTTPS; the application accepts internal
HTTP and does not consume forwarded headers. `AllowedHosts` checks the actual
request host. The API-key limiter is partitioned by authenticated user, not client IP.

See [deployment](DEPLOYMENT.md) for required runtime configuration, image publication,
and release verification, and [AGENTS.md](../AGENTS.md) for coding conventions.
