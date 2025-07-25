# Development Best Practices

> Version: 1.0.0
> Last Updated: 2025-01-25
> Scope: TrendWeight project-specific standards

## Context

This file extends the global best practices from @~/.agent-os/standards/best-practices.md with TrendWeight-specific development guidelines. These practices ensure code quality and consistency across the project.

For essential commands and operational procedures, see @.agent-os/product/development-guide.md.

## Pre-Commit Requirements

### Mandatory Checks
Before EVERY commit, run from the root directory:
```bash
npm run format && npm run check:ci && npm run test
```

This single command ensures:
- Code is properly formatted (Prettier)
- TypeScript compiles without errors
- ESLint rules pass
- All tests pass

**Never skip this step!** The project uses Turborepo for optimization, so always run commands from the root.

## Development Workflow

### TypeScript Error Prevention
- Run `npm run check` after EVERY code change, not just tests
- Tests passing doesn't guarantee TypeScript compilation success
- Always verify both type checking and tests

### Turborepo Usage
- Always run commands from the repository root
- Don't run individual workspace commands directly
- Turborepo handles caching and optimization automatically

## Code Quality Standards

### Route File Pattern
All route files in `apps/web/src/routes/` must follow a strict minimal pattern:
- Route files contain ONLY route definition and a single page component
- NO business logic, hooks, or data fetching in routes
- ALL logic must be extracted to feature components
- Route files should never exceed 30 lines

### Component Standards
- Always use standard UI components (Button, Heading, Select, etc.)
- Never use raw HTML elements when standard components exist
- Use `ExternalLink` component for all external URLs
- Cache Intl formatters at module level for performance

### Service Layer Pattern
- Controllers must be thin - only handle HTTP concerns
- All business logic belongs in services
- Use dependency injection for all services
- Apply IOptions<T> pattern for configuration

## Testing Practices

### Frontend Testing
- Always use MSW for HTTP mocking
- Never manually mock fetch
- Suppress console output for tests that expect errors:
  ```typescript
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  // ... test code ...
  consoleErrorSpy.mockRestore();
  ```

### Backend Testing
- Focus on testing business logic in services
- Don't test framework integration directly
- Use xUnit for all backend tests

## Database Conventions

### Schema Management
- All schema changes must update `apps/api/TrendWeight/supabase/schema.sql`
- Update documentation in `apps/api/TrendWeight/supabase/SCHEMA.md`
- Never make schema changes without updating these files

### Data Storage
- All timestamps stored as ISO 8601 strings
- All weights stored in kilograms
- Use JSONB for flexible provider-specific data

## Performance Guidelines

### Frontend Performance
- Cache Intl formatters at module level
- Use React.memo where appropriate
- Implement proper Suspense boundaries
- Use TanStack Query for all API calls

### Backend Performance
- Use async/await for all I/O operations
- Cache duration constants should be named
- Implement proper connection pooling
- Use Dapper for lightweight data access

## Security Practices

### Authentication
- Never store secrets in code
- Use environment variables for all secrets
- Follow OAuth best practices
- Implement proper token validation

### Error Handling
- Never expose exception details to users
- Always use correlation IDs
- Log errors with appropriate context
- Show user-friendly error messages

## Commit Message Guidelines

### Format
Use conventional commit format: `type: description` or `type(scope): description`

### Types
feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert

### Scopes
Use scopes when changes are specific to particular features or areas:
- Frontend: `auth`, `dashboard`, `settings`, `profile`, `charts`, `navigation`
- Backend: `withings-sync`, `fitbit-sync`, `weight-service`, `user-service`, `oauth`
- Infrastructure: `docker`, `ci`, `deps`, `config`
- Components: `button`, `modal`, `form`, `layout`

### Rules
- **NO EMOJIS** in commit messages
- Keep first line under 72 characters
- Use present tense, imperative mood
- Examples:
  - `feat: add user authentication system`
  - `feat(auth): add Apple sign-in provider`
  - `fix(dashboard): correct weight trend calculation`

## UI Component Standards

### Required Components
Always use standard UI components from our component library:
- Use `Button` component instead of raw `<button>` tags
- Use `Heading` component instead of raw `<h1>`, `<h2>`, etc.
- Use `Select` component instead of raw `<select>` tags
- Use `Link` from TanStack Router for internal navigation
- Use `ExternalLink` component for all external URLs

See docs/ARCHITECTURE.md for detailed UI component documentation.

## Deployment Checklist

Before deploying to production:
1. All tests pass
2. TypeScript compilation succeeds
3. No ESLint errors
4. Database migrations tested
5. Environment variables verified
6. Error handling tested