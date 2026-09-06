# TrendWeight architecture

## Applications and request boundaries

The React SPA uses Clerk for login and sends session tokens to the ASP.NET Core
API. Clerk JWT validation checks signature, issuer, lifetime and the `azp` origin
when present. `user_accounts` maps the external Clerk ID to an internal UUID.
Internal API endpoints use the Clerk authentication scheme. `/api/v1` explicitly
uses API-key authentication; those keys do not grant access to internal settings.
API-key hashes are stored in profile JSON and indexed by a database migration.

Sharing endpoints allow anonymous access only when the profile's sharing switch
is enabled and the supplied sharing token resolves. Computed and raw shared data
must honor hidden-history settings. Provider error/status information stays out
of shared responses.

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

The canonical schema is `supabase/migrations`, not the older files under
`apps/api/TrendWeight/supabase`. Tables hold user mappings, profiles, OAuth provider
links, raw source documents, and legacy migration data. Profile deletion cascades
to provider links and source data. The committed schema enables row-level security
and denies anon/authenticated table access; the backend uses the service role.
Progress messages use Supabase Realtime broadcasts on random progress-ID topics.
These are advisory status messages, not an authorization mechanism.

Create schema changes with `supabase migration new <name>` and review the SQL.
Apply to remote projects only through the approved migration workflow; never edit
remote tables/policies through ad hoc SQL or the dashboard. Live configuration was
not verified by the repository audit.

## Serving and deployment

One container serves the published ASP.NET Core API and Vite assets on port 8080.
YARP proxies analytics endpoints; it does not serve the production SPA. Unknown
API paths return 404, while non-API GET/HEAD routes fall back to the SPA shell.
The shell is not cached; hashed assets have long immutable cache lifetimes.
The public API reference is `/api-docs/v1`; the internal document is development-only.

Frontend `VITE_*` values are embedded at build time. They must contain only public
configuration. Backend secrets are supplied as runtime environment variables and
must never be Docker build arguments. Local Docker helpers load a trusted `.env`
file when present and accept already-exported environment variables.

CI runs formatting/type/lint/build/tests before the container publication job.
Only main/tag runs publish images. A Git push starts CI; it does not by itself
prove production rollout or health. No deployment was performed for the audit fixes.

### Public origin and HTTPS — required before deployment

Set the backend runtime environment variable `PublicBaseUrl` to the public origin:

| Environment         | Value                             |
| ------------------- | --------------------------------- |
| Production          | `https://trendweight.com`         |
| Staging             | `https://staging.trendweight.com` |
| Development default | `http://localhost:5173`           |

Withings/Fitbit authorization and token exchanges, the Apple callback redirect,
and OpenAPI server URLs use this origin. Incoming Host and forwarded headers cannot
change those destinations. Origins cannot contain credentials, a path beyond `/`,
a query, or a fragment. Startup fails if the setting is missing outside Development,
or if the value is invalid. HTTP origins are permitted only in Development; explicit
ports are preserved. Set an override for a different local frontend port.

The app does not consume forwarded headers or perform HTTP-to-HTTPS redirection.
The hosting ingress must enforce public HTTPS; verify its redirect/rejection behavior
before rollout. Internal HTTP, including readiness probes, remains usable without
redirect loops. Do not expose this HTTP listener directly on the public Internet.
This follows Microsoft's [reverse-proxy HTTPS guidance](https://learn.microsoft.com/en-us/aspnet/core/security/enforcing-ssl?view=aspnetcore-10.0).

`AllowedHosts` still independently validates the actual Host header. Keep the
legitimate application/probe hostnames allowed for your deployment. No proxy IP
allowlist is needed; `ForwardedHeaders__KnownProxies__N` and
`ForwardedHeaders__KnownNetworks__N` are obsolete and no longer consumed. Do not set
`ASPNETCORE_FORWARDEDHEADERS_ENABLED`, which can enable framework forwarding outside
this application's pipeline. Client IP attribution is not established by the public
origin setting; the API-key limiter remains partitioned by authenticated identity.

In DigitalOcean App Platform, set `PublicBaseUrl` under each web service's runtime
environment variables before deploying the new image. Check the registered provider
callback URLs against the selected origin. Validate staging first: health checks,
HTTP-to-HTTPS handling at ingress, login, provider linking, Apple callback forwarding,
and the API docs. Only then promote the tested image to production.

For a local Docker container serving the UI on port 8080, explicitly export
`ASPNETCORE_ENVIRONMENT=Development` and `PublicBaseUrl=http://localhost:8080`
before `npm run docker:run`. The script forwards these runtime settings. Do not
use Development mode on a publicly hosted deployment.
