# Development Conventions

This document outlines the coding standards and conventions for the TrendWeight project.

## Project Naming

### Project Identity

- **Project Name**: TrendWeight (capital T, capital W, no space)
- Use consistently in namespaces, project names, and code

### File Naming Conventions

- **Frontend Routes**: kebab-case (`user-profile.tsx`)
- **Frontend Components**: PascalCase in content (`UserProfile`)
- **Backend Files**: PascalCase (`MeasurementService.cs`)
- **Database**: snake_case for tables and columns

## Frontend Conventions

### TypeScript/React Standards

- Enable strict mode, avoid `any` type
- Use functional components with hooks
- Cache Intl formatters at module level
- Use TanStack Query for all API calls
- Use `ExternalLink` component for external URLs
- Use standard UI components (Button, Heading, Select, etc) never raw HTML

### Route File Pattern (MANDATORY)

Routes must follow this exact pattern and be minimal (<30 lines):

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "../components/Layout";
import { ComponentName } from "../components/feature-folder/ComponentName";

export const Route = createFileRoute("/route-path")({
  beforeLoad: requireAuth, // Only if needed
  loader: async () => { }, // Only if needed
  component: RouteNamePage,
});

function RouteNamePage() {
  const { param } = Route.useParams(); // Only if route has params
  return (
    <Layout title="Page Title">
      <ComponentName param={param} />
    </Layout>
  );
}
```

**Route Requirements:**

- NO business logic, hooks, or UI in routes
- ALL logic in feature components under `apps/web/src/components/`
- Feature folders match route purpose

### Tailwind CSS Standards

- **Use semantic color variables** from index.css (e.g., `bg-background`, `text-foreground`)
- **Never use explicit colors** (e.g., `bg-gray-500`, `text-blue-600`)
- **Avoid `dark:` prefixes** - CSS variables handle theme switching automatically
- **Check index.css** for available semantic variables before adding styles
- Semantic colors automatically adapt to light/dark mode

## Backend Conventions

### C# Coding Standards

- Use feature folders for organization
- Inherit from `BaseAuthController` for auth endpoints
- Keep controllers thin, logic in services
- Use async/await for all I/O operations
- Use IOptions<T> for configuration
- Use constants for magic numbers
- Extract business logic to testable services

### Data Storage Standards

- **Timestamps**: Store as ISO 8601 strings
- **Weights**: Store in kilograms
- **Flexible Data**: Use JSONB for flexible data storage
- **Database Models**: Use `Db` prefix for C# models

## Development Workflow

### Pre-commit Requirements (MANDATORY)

Always run from repository root:

```bash
npm run check && npm run test
```

- Never skip TypeScript compilation check
- Never run commands in workspace subdirectories
- Turborepo handles optimization

### Commit Message Guidelines

Follow conventional commit format with these TrendWeight-specific rules:

#### Basic Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Types
- `feat:` - New features (SemVer minor)
- `fix:` - Bug fixes (SemVer patch)
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code changes that neither fix bugs nor add features
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks, dependency updates

#### Multi-Topic Commits
When a single commit spans multiple major unrelated areas, use footers to document each major topic:

```
feat: implement backend computation with UI improvements

Add server-side weight trend calculations and fix several frontend issues.

feat(api): add MeasurementComputationService for server-side trend calculations
  - Implement exponentially smoothed moving average (alpha=0.1)
  - Add ComputedMeasurement and SourceMeasurement models
  - Update MeasurementsResponse to use computedMeasurements array
  - Support optional includeSource parameter for raw data access

refactor(web): improve progress tracking system
  - Centralize toast management in SyncProgressProvider to prevent duplicates
  - Simplify useSyncProgress API by hiding internal functions
  - Remove redundant useSyncProgressId hook
  - Fix React hooks rule violations with proper useWithProgress wrapper

fix(web): download page skeleton width now matches actual table dimensions

docs: restructure documentation with steering documents and commit guidelines
```

Only use footers for major topics - group related changes together rather than creating a footer for every small change. Footers can be multi-line to provide details.

#### Rules
- **Never use "BREAKING CHANGE"** - this is an application, not a library
- **Use footers for multi-topic commits** rather than multiple commits when changes are related
- **Keep descriptions under 72 characters** for the main subject line
- **Use imperative mood** ("add feature" not "added feature")
- **Reference issues in footers** when applicable

### Command Execution

- **Always run commands from repo root**
- Turborepo handles optimization across workspaces
- Never run commands in workspace subdirectories

## Testing Standards

### Frontend Testing

- Use MSW for HTTP mocking (never mock fetch directly)
- Suppress console for expected errors: `vi.spyOn(console, "error").mockImplementation(() => {})`
- Test business logic, not framework integration

### Backend Testing

- Use xUnit for all tests
- Extract business logic to testable services
- Don't test framework integration directly
