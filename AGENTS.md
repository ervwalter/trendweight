# AGENTS.md - Coding Agent Guidelines

## Essential Commands (run from root only)
```bash
# Development
npm run dev                     # Start both frontend/backend via tmuxinator
npm run -w apps/web dev         # Frontend only (port 5173)
npm run -w apps/api dev         # Backend only (port 5199)

# Testing
npm test                        # All tests
npm run -w apps/web test        # Frontend tests only
npm run -w apps/api test        # Backend tests only
vitest run path/to/file.test.ts # Single frontend test
dotnet test --filter "TestName" # Single backend test

# Quality checks (MANDATORY before commits)
npm run check && npm run test   # TypeScript + lint + all tests
npm run check                   # TypeScript + lint only
npm run format                  # Format all code
```

## Code Style & Conventions
- **Frontend**: 2-space indent, kebab-case files, PascalCase components, `@/` imports (never `../`)
- **Backend**: 4-space indent, PascalCase public members, camelCase locals/params
- **Routes**: Minimal (<30 lines), NO logic/hooks, delegate to components
- **Tailwind**: Use semantic variables (`bg-background`) never explicit colors (`bg-gray-500`)
- **Types**: Strict TypeScript, avoid `any`, functional components with hooks
- **Tests**: Vitest (frontend) + xUnit (backend), MSW for HTTP mocking, colocated `*.test.ts(x)`
- **Commits**: Conventional format (`feat:`, `fix:`, `refactor:`), never "BREAKING CHANGE"
- **Naming**: TrendWeight (capital T+W), snake_case database, kebab-case routes, PascalCase components