# Local setup

Run commands from the repository root. Use a development database and Clerk
application; local development can create, modify, and delete account data.

## Prerequisites

- Node 26 and the npm version recorded in the root `package.json`.
- .NET 10 SDK.
- Supabase project or local Supabase stack, and a Clerk development application.
- Docker and the Supabase CLI if running the database locally.
- tmux and tmuxinator only if using `npm run dev`.

Install dependencies with `npm ci` and `dotnet restore apps/api/TrendWeight.sln`.
Tests mock external services and do not need live service credentials; see
[testing](TESTING.md).

## Database

Use the versioned SQL in [supabase/migrations](../supabase/migrations). The files
under `apps/api/TrendWeight/supabase` are historical and must not be used to
initialize a project.

For a disposable local database, follow Supabase's [local development setup](https://supabase.com/docs/guides/local-development/overview).
`supabase start` starts the local stack. `supabase db reset` rebuilds the local
database and applies migrations; it deletes existing local data. Use the local
API URL and publishable/secret keys for the variables below.

For a hosted development project, apply the committed migrations through the
Supabase CLI migration workflow after verifying the target project. Do not point
new development environments at production or make ad hoc dashboard schema changes.

Tables are accessed through the backend's service role. The browser uses the publishable
key for Supabase Realtime progress messages; it does not read application tables
directly. Check Realtime configuration if measurements work but progress messages
are absent.

## Configuration

Copy `.env.example` to `.env` and replace the placeholders. The file is ignored by
Git. The root `.env` is not automatically loaded by both workspaces: export it in
each terminal used to launch a server.

```bash
set -a
source .env
set +a
```

This executes the file as shell input. Quote values containing shell metacharacters,
spaces, or semicolons. Only source files you control.

| Variables                                                            | Purpose                                                                                                    |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `VITE_CLERK_PUBLISHABLE_KEY`, `Clerk__Authority`, `Clerk__SecretKey` | Matching frontend/backend Clerk application                                                                |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`                        | Browser Realtime configuration                                                                             |
| `Supabase__Url`, `Supabase__ServiceKey`                              | Backend database and legacy-auth access to the same Supabase project                                       |
| `Jwt__SigningKey`                                                    | Random secret for signing provider OAuth state; at least 32 bytes of key text, shared across API instances |
| `Withings__ClientId`, `Withings__ClientSecret`                       | Required to connect a Withings account                                                                     |
| `Fitbit__ClientId`, `Fitbit__ClientSecret`                           | Required to connect Fitbit when enabled                                                                    |
| `Fitbit__Enabled`                                                    | Set `false` to disable Fitbit linking/sync while retaining history                                         |
| `PublicBaseUrl`                                                      | Frontend origin; defaults to `http://localhost:5173` only in Development                                   |
| `AllowedHosts`                                                       | Semicolon-separated actual API hostnames; local example: `'localhost;127.0.0.1'`                           |

`VITE_SUPABASE_ANON_KEY` keeps its historical name but accepts the new
`sb_publishable_...` key. `Supabase__ServiceKey` accepts an `sb_secret_...` key;
legacy `anon`/`service_role` API keys remain supported. Changing the browser key
requires rebuilding the frontend. Never put an `sb_secret_...` key in a browser variable.

The backend does not use `Supabase__AnonKey`, `Supabase__JwtSecret`, or
`LegacyDbConnectionString`; remove them from runtime configuration. Supabase's
JWT signing keys are managed by Supabase and do not replace `Jwt__SigningKey`.
See Supabase's [API-key migration guide](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys).

Generate your own OAuth-state signing secret, for example with `openssl rand -base64 32`,
and save it privately as `Jwt__SigningKey`. It is separate from Clerk's signing keys.
Do not put backend secrets in `VITE_*` variables: browser variables are public.

The backend also accepts its normal ASP.NET configuration sources. The optional
`apps/api/TrendWeight/appsettings.Development.json.example` demonstrates local
JSON overrides; avoid maintaining conflicting values in multiple places.

## Login and provider callbacks

Use the publishable key, secret key, and issuer URL from the same Clerk application.
Enable the social providers you intend to test. The application offers Google,
Microsoft, and Apple login; each needs matching Clerk/provider configuration.

Register callback URLs using the same origin as `PublicBaseUrl`:

- Withings: `http://localhost:5173/oauth/withings/callback`
- Fitbit: `http://localhost:5173/oauth/fitbit/callback`

Use a registered development hostname if the provider rejects localhost. Update
`PublicBaseUrl`, Clerk's allowed origins, and the provider's registered callback
consistently. Authorization and token exchange must use the same callback URL.
The backend Apple form callback, when used, forwards to `/auth/apple/callback`
on the configured public origin.

## Start and verify

Run `npm run -w apps/web dev` and `npm run -w apps/api dev` in separate configured
terminals. The frontend runs on port 5173 and proxies API requests to port 5199.
Open the frontend, sign in, and create a manual reading before testing provider
linking. `/api/health` is a liveness response, not a database connectivity check.

If provider linking reports a missing signing key, check `Jwt__SigningKey`. If a
callback points to the wrong origin, check `PublicBaseUrl`. If configuration edits
have no effect, restart the relevant server with the updated environment.
