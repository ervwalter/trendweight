# Testing

Run commands from the repository root after `npm ci` and
`dotnet restore apps/api/TrendWeight.sln`. The suites mock external services and
must not use live account credentials.

## Required checks

```bash
npm run check && npm run test
npm run check:ci
```

`check` runs TypeScript and lint checks; backend lint builds with warnings as
errors. `test` runs the Docker helper and release automation tests, then builds and tests both workspaces.
`check:ci` also verifies formatting. `npm run format` writes formatting changes;
review the diff before committing.

## Focused tests

| Task                  | Command                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------- |
| Frontend suite        | `npm run -w apps/web test`                                                               |
| One frontend file     | `npm run -w apps/web test -- src/lib/core/dates.test.ts`                                 |
| Frontend coverage     | `npm run -w apps/web test:coverage`                                                      |
| Backend suite         | `npm run -w apps/api test`                                                               |
| One backend class     | `dotnet test --project apps/api/TrendWeight.Tests --filter-class '*ProfileServiceTests'` |
| Docker helper scripts | `npm run test:tooling`                                                                   |

The backend uses xUnit v3 with Microsoft.Testing.Platform (`global.json`), not
legacy VSTest `--filter` syntax. Frontend coverage HTML is written under
`apps/web/coverage`; it reflects the configured measured files, not the entire
repository.

## Where to add a regression

- Frontend tests are colocated `*.test.ts(x)` files using Vitest, Testing Library,
  and MSW. Cover user-visible behavior, including malformed input, empty data,
  account transitions, and editing during refetches.
- Backend tests mirror feature/service folders under `apps/api/TrendWeight.Tests`.
  Use `Infrastructure/Startup/RequestPipelineTests.cs` for middleware ordering,
  authentication scheme selection, redirects, and HTTP response behavior. These
  tests run real middleware with external identity/database services mocked.
- `scripts/docker-scripts.test.mjs` runs the Docker helpers with a stub executable
  and synthetic configuration. It does not build or run containers.

Tests do not establish live provider connectivity, production database policy,
or successful deployment. Use the [deployment checks](DEPLOYMENT.md#verify-a-release)
for those boundaries.

On sandboxed macOS, .NET can fail when named-pipe sockets or NuGet access are
blocked. Use an execution environment permitting those operations; an infrastructure
failure is not a passing or failing application test.

- `.github/scripts/release-please.test.mjs` verifies dependency summaries, version bumps,
  preserved release notes, and read-only preview behavior using the pinned library
  with synthetic commits and no network access.
