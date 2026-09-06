# Testing and verification

Run commands from the repository root. Install the locked npm dependencies with
`npm ci` and restore .NET packages with `dotnet restore apps/api/TrendWeight.sln`.

```bash
npm run check && npm run test
npm run check:ci
npm run -w apps/web test -- src/lib/core/dates.test.ts
npm run -w apps/web test:coverage
npm run -w apps/api test
dotnet test --project apps/api/TrendWeight.Tests --filter-class '*ProfileServiceTests'
npm run test:tooling
```

`npm test` runs Docker-script tests with Node, then builds and tests both workspaces
through Turborepo. Backend lint treats compiler/analyzer warnings as errors.
`check:ci` additionally verifies formatting. `npm run format` writes formatting
changes across both workspaces; inspect its diff before staging.

The backend uses xUnit v3 with Microsoft.Testing.Platform, configured in
`global.json`. Legacy VSTest `--filter` syntax is not the targeted-test interface.
On sandboxed macOS, .NET may fail or hang when named-pipe sockets or NuGet access
are denied. Run in an approved environment with those capabilities rather than
interpreting an infrastructure failure as a test result.

## Test the behavior that can fail

- Frontend: colocated Vitest/Testing Library tests, MSW for network boundaries.
  Exercise malformed input, empty histories, locale/units, storage failures,
  refetches while editing, and account transitions. Restore mocks after each test.
- Backend: service/controller unit tests plus real HTTP middleware tests in
  `Infrastructure/Startup/RequestPipelineTests.cs`. External identity/database
  services are mocked; middleware and authentication schemes are real.
- Scripts: the Node tests execute Docker helpers with a stub Docker binary and
  synthetic credentials. They neither build containers nor contact services.

A mock that ignores database predicates cannot prove row-level authorization.
A controller-only test cannot prove middleware scheme selection. A passing build
without public frontend configuration does not prove that the deployed app boots.
Real provider OAuth, production RLS/proxy configuration, container rollout and
account-deletion side effects require separately authorized integration validation.

Coverage percentages are diagnostic, not proof of correctness. Add meaningful
failure-path and boundary tests instead of implementation-mirroring assertions.
