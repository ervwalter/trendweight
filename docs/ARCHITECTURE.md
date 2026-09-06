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

### Trusted ingress — required before deploying the audit change

Forwarded headers are accepted only from framework loopback defaults or explicitly
configured proxies/networks. Set indexed environment variables using real ingress
addresses from your hosting configuration:

```text
ForwardedHeaders__KnownProxies__0=<actual proxy IP>
ForwardedHeaders__KnownNetworks__0=<actual proxy CIDR>
```

Use additional indices for additional entries. Do not literally use the placeholders
or trust all networks. IPv4 and IPv6 peers must match the actual connection address.
`AllowedHosts` independently constrains accepted hostnames, for example the actual
production domains separated by semicolons. At most two trusted hops are processed.
Restrict direct access to the origin and configure upstream header sanitization.

Existing external-proxy deployments must supply their trusted ingress IPs/CIDRs
before rollout. Otherwise forwarded HTTPS/host values are ignored, which can break
OAuth redirects or cause HTTPS redirect loops. Loopback development retains its
existing behavior. See Microsoft's [forwarded-header guidance](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/proxy-load-balancer?view=aspnetcore-10.0).
