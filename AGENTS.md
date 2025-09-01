# Repository Guidelines

## Project Structure & Module Organization
- Monorepo managed by Turbo. Key paths:
  - `apps/web`: React + TypeScript + Vite (assets in `public/`, source in `src/`).
  - `apps/api`: ASP.NET Core Web API (`TrendWeight/`), tests in `apps/api/TrendWeight.Tests/`.
  - `scripts/`: Docker helpers. `.github/`: CI workflows. `.env.example` for config.

## Steering Docs (Authoritative)
- Always review and reference `docs/steering/{conventions,tech,product,structure}.md` before proposing changes.

## Build, Test, and Development Commands
- Root (runs across workspaces):
  - `npm install`: Install all dependencies.
  - `npm run dev`: Start frontend and backend via tmuxinator.
  - `npm run build`: Build web and API.
  - `npm run check`: Typecheck + lint. `npm test`: Run all tests.
  - Preferred validation (run from repo root): `npm run check && npm run test`.
  - `npm run docker:build` / `npm run docker:run`: Local Docker image + run.
- Per workspace examples: Web `npm run -w apps/web dev`, `npm run -w apps/web test:coverage`; API `npm run -w apps/api dev`, `npm run -w apps/api test`.

## Coding Style & Naming Conventions
- EditorConfig: 2‑space indent TS/JS, 4‑space C#.
- Web: Prettier + ESLint (see `apps/web/eslint.config.js`), Tailwind 4 with semantic tokens only; always use `@/` alias; components in `PascalCase`; tests `*.test.ts(x)` colocated.
- API: `dotnet format` via lint‑staged; `PascalCase` for types/methods, `camelCase` for locals/params; feature‑oriented folders.

## Testing Guidelines
- Web: Vitest + Testing Library (`src/test/setup.ts`). Run `npm test` (root) or `npm run -w apps/web test`.
- API: xUnit + FluentAssertions + Moq; integration via `WebApplicationFactory<Program>`. Run `npm test` or `dotnet test`.
- Add tests for new endpoints, hooks, and components; keep fast and deterministic.

## Commit & Review Guidelines
- Do not open PRs. PRs are created and merged manually by the maintainer.
- Use Conventional Commits: `feat:`, `fix:`, `perf:`, `refactor:`, `deps:`, `chore:` (scopes allowed). Examples: `feat(api): add /api/health`, `refactor(web): replace relative imports with @/`.
- Propose changes via issues referencing relevant sections in `docs/steering/*`; include screenshots for UI changes.
- Before pushing, validate from repo root: `npm run check && npm run test`.
- Never commit secrets. Add new env keys to `.env.example` and document usage.

## Security & Config Tips
- Configure Clerk and Supabase via `.env` (see README). Keep `AllowedHosts` strict in production. Rate limiting is enabled per user on API.
