# Technology stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS 4, TanStack Router/Query,
  Highcharts, Clerk, and js-joda.
- Backend: ASP.NET Core 10, Supabase PostgreSQL, Clerk JWT authentication, YARP
  for the analytics proxy, and Scalar/OpenAPI for the public API reference.
- Tests: Vitest/Testing Library/MSW, xUnit v3/Microsoft.Testing.Platform, and Node's
  test runner for repository scripts.
- Build: npm workspaces and Turborepo; one Docker image serves the API and SPA.

Use Node 26 (matching the container build) and the .NET 10 SDK. The root
`package.json` records the npm version. Exact dependency versions live in package
manifests and the lockfile rather than this document.

See [README](../../README.md) for setup, [AGENTS.md](../../AGENTS.md) for commands,
[architecture](../ARCHITECTURE.md) for data flow, and [testing](../TESTING.md).
