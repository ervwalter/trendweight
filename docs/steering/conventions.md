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

### Import Conventions

- **Always use `@/` alias** for imports from the src root directory
- **Never use `../` relative imports** that navigate up the directory tree
- **Only use `./` imports** for files in the same directory or immediate subdirectories
- **Examples:**
  - ✅ `import { Component } from "@/components/ui/button"`
  - ✅ `import { utils } from "@/lib/utils"`
  - ✅ `import { LocalComponent } from "./local-component"`
  - ✅ `import { SubComponent } from "./subfolder/sub-component"`
  - ❌ `import { Component } from "../components/ui/button"`
  - ❌ `import { utils } from "../../lib/utils"`

### Route File Pattern (MANDATORY)

Routes must follow this exact pattern and be minimal (<30 lines):

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { ComponentName } from "@/components/feature-folder/ComponentName";

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

#### Single vs Multi-Topic Commits

**Single Topic Commits (Preferred)**
Most commits should focus on one specific change:

```
fix: settings form not marking dirty when weight unit changes

Add shouldDirty: true to setValue calls in handleUnitChange to ensure
the Save Settings button is enabled when unit preference changes.
```

**Multi-Topic Commits (Use Sparingly)**
Only when you have multiple genuinely UNRELATED changes that must go together, use footers:

```
feat: add user authentication system

Implement core authentication with JWT tokens and user registration.

fix(api): resolve memory leak in background sync process
  - Dispose HttpClient instances properly
  - Cancel long-running tasks on shutdown

docs: update deployment guide with new environment variables
```

**Critical Rules:**
- **Main message describes ONE specific change**, not a summary of multiple changes
- **Only use footers for additional UNRELATED changes** that deserve separate changelog entries  
- **Never create a footer that restates the main message** - this creates duplicate changelog entries
- **If all changes are related, group them under the main message without footers**

**Bad Example (creates duplicate changelog entries):**
```
fix: improve form behavior

Fix multiple form-related issues.

fix(forms): settings form not marking dirty when weight unit changes
```

**Good Example:**
```
fix: settings form not marking dirty when weight unit changes

Add shouldDirty: true to setValue calls in handleUnitChange to ensure
the Save Settings button is enabled when unit preference changes.
```

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
