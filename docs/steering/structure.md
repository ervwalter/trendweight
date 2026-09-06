# Project structure

| Path                                  | Purpose                                                                          |
| ------------------------------------- | -------------------------------------------------------------------------------- |
| `apps/web/src/components`             | Feature components and shared UI primitives                                      |
| `apps/web/src/routes`                 | Thin TanStack route definitions; generated route tree is ignored                 |
| `apps/web/src/lib`                    | API/auth, account-specific caches, dashboard math/charting, utilities            |
| `apps/api/TrendWeight/Features`       | Measurements/manual log, providers, profile, sharing, API keys/v1, sync progress |
| `apps/api/TrendWeight/Infrastructure` | Auth, configuration, data access, middleware, service registration               |
| `apps/api/TrendWeight.Tests`          | Unit and HTTP integration tests                                                  |
| `supabase/migrations`                 | Canonical versioned database schema                                              |
| `apps/api/TrendWeight/supabase`       | Historical schema notes; not the migration source of truth                       |
| `scripts`                             | Local Docker helpers and their tests                                             |
| `.github/workflows`                   | Checks, container publication, release and contributor automation                |
| `docs`                                | Architecture, verification, operational notes                                    |

Frontend filenames use kebab-case; exported components use PascalCase. Backend
filenames/types use PascalCase. Database table/column names use snake_case.

See [architecture](../ARCHITECTURE.md) and [conventions](conventions.md).
