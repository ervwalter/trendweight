# Deployment

The [Dockerfile](../Dockerfile) builds the frontend, copies its assets into the
published ASP.NET application, and runs it as a non-root user on HTTP port 8080.
The hosting ingress must provide HTTPS. `/api/health` checks that the application
is responding; it does not test Supabase or provider connectivity.

## Build-time and runtime configuration

The image needs three public build variables:

- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

`VITE_SUPABASE_ANON_KEY` accepts an `sb_publishable_...` key despite its historical
name. Use an `sb_secret_...` key for backend runtime `Supabase__ServiceKey`.
Legacy API keys also remain supported.

These become part of the browser bundle. Changing them requires rebuilding the
image; runtime environment variables cannot replace them. Never pass backend
secrets as build arguments.

Supply the backend variables listed in [setup](SETUP.md#configuration) at runtime,
including provider credentials and `Jwt__SigningKey` when using scale linking.
API instances in one environment must share the OAuth-state signing key.

`PublicBaseUrl` is required outside Development:

| Environment | Value                             |
| ----------- | --------------------------------- |
| Production  | `https://trendweight.com`         |
| Staging     | `https://staging.trendweight.com` |

Use an HTTPS origin without credentials, path, query, or fragment. Startup fails
if the value is missing or invalid. Authorization and token exchange callback URLs
and OpenAPI URLs all use this setting.

Outside Development, startup also fails when `Clerk__Authority`, `Clerk__SecretKey`,
`Supabase__Url`, or `Supabase__ServiceKey` is missing or still holds a placeholder
from `appsettings.json` (values containing `your-` or `paste-`). The error names
the offending keys, never their values.

`AllowedHosts` is a semicolon-separated list of actual hostnames accepted by the
API. Include the legitimate domain; `/api/health` is exempt from the check, so
the Docker health check does not need `localhost` listed. Do not include schemes
or paths.

The application does not process forwarded headers or redirect internal HTTP.
Ingress must redirect or reject public HTTP while allowing private HTTP to port 8080. Do not expose that listener directly to the Internet. Do not enable
`ASPNETCORE_FORWARDEDHEADERS_ENABLED`; no proxy-IP allowlist is needed.

Anonymous API traffic (shared dashboards, rejected credentials) is rate limited per
client address and capped by one shared ceiling. Behind an ingress the peer
address is the ingress itself, so `RateLimiting__ClientAddressHeaders` names the
headers, in preference order, that carry the real client address. The Production
default is `do-connecting-ip;cf-connecting-ip`: App Platform sets
`do-connecting-ip` to the connecting client and its Cloudflare front sets
`cf-connecting-ip`, while `x-forwarded-for` there holds the ingress address and is
not used. Only list headers the ingress overwrites on every request; the shared
ceiling still bounds total anonymous work if a listed header is ever spoofable.
Set the value to an empty string when the API is reached directly.

## DigitalOcean App Platform

Configure each web service's runtime variables in **Settings → component →
Environment Variables**, and set its public HTTP port to 8080. Register provider
callback URLs using that environment's `PublicBaseUrl`:

- `/oauth/withings/callback`
- `/oauth/fitbit/callback`

Keep the frontend build's Clerk/Supabase projects consistent with the backend
runtime configuration. Inspect the service's image tag and Autodeploy setting
before publishing a new image; an update to a followed tag can start deployment.

[CI](../.github/workflows/ci.yml) requires checks before building/publishing the
container. It publishes to GHCR and DigitalOcean Container Registry on main/tag
runs. The DigitalOcean tags are `latest` for main and `latest-release` for version
tags. PR runs build without publishing. A successful workflow is not proof that
App Platform has deployed the new image.

## Local container

The Docker helpers load a trusted repository-root `.env` when present, and also
accept exported variables. After configuring the public build variables and backend
credentials:

```bash
npm run docker:build
ASPNETCORE_ENVIRONMENT=Development PublicBaseUrl=http://localhost:8080 npm run docker:run
```

The image is tagged `trendweight:local`. Open `http://localhost:8080`; the
container serves the SPA shell and deep links in Development just as it does in
Production, because the fallback depends on the built shell being present, not on
the environment. Values in `.env` override existing shell values, so remove
conflicting overrides first. Development mode permits an HTTP public origin; do
not use it for a public deployment.

## Verify a release

1. Run `npm run check:ci` and `npm test` before publishing. Review migrations
   separately; publishing an image does not apply them.
2. Deploy to staging with its runtime configuration and confirm the actual image
   digest in the hosting dashboard.
3. Check the health endpoint and public HTTP-to-HTTPS behavior. Sign in, load the
   dashboard, add a test reading, and verify provider linking when enabled. Check
   `/api-docs/v1` uses the expected public origin and sharing respects its settings.
4. Promote the tested version to production, then repeat health and login checks.
   Keep the previous image digest and configuration available for rollback.

Create database changes under `supabase/migrations` and apply them through the
migration workflow to the verified target project. Schema changes require their
own rollout and rollback consideration; rolling back an image does not undo them.

## Release automation

The release workflow runs `.github/scripts/release-please.mjs` using the exact
`release-please` version in the root package manifest and lockfile. It uses the
existing `.github/release-config.json` and `.github/release-manifest.json`.
`always-update: true` keeps an existing release PR current with `main` even when
additional dependency or hidden maintenance commits leave its notes unchanged.
Version calculation still sees every commit; only the notes renderer changes.
Routine `deps:` commits become one “Updated dependencies.” entry per release.
Breaking dependency changes retain their individual descriptions and migration
notes. Other sections follow the existing configuration. The same generated notes
feed the changelog, release PR, and eventual GitHub release.

The wrapper uses upstream's changelog registration API rather than a fork.
Its renderer imports an upstream implementation path, so version upgrades must
pass `node --test .github/scripts/release-please.test.mjs`. Renovate proposes library
updates monthly without automerging them. Review urgent security updates sooner.
The tests also run under `npm test` and before the release workflow writes to GitHub.
Track upstream [template configuration support](https://github.com/googleapis/release-please/pull/2706);
once released in the standard action, reassess replacing this wrapper.

For a read-only preview, set `GITHUB_REPOSITORY=ervwalter/trendweight` and provide
`RELEASE_PLEASE_TOKEN` through your environment, then run
`node .github/scripts/release-please.mjs --dry-run`. This reads the configuration and history
from GitHub's `main`, so unpushed configuration changes are not included. Do not
paste tokens into commands or logs. Normal execution publishes merged release PRs
and then reloads repository state before creating/updating the next release PR.
