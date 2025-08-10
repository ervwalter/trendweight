# CLAUDE.md

AI-specific guidance for working with the TrendWeight codebase.

## Project Context
- TrendWeight tracks weight trends using smart scales (Withings/Fitbit)
- C# ASP.NET Core API backend + Vite React TypeScript frontend
- Clerk for auth (NOT Supabase Auth), Supabase for PostgreSQL only
- Project name: **TrendWeight** (capital T, capital W, no space)

## Code Search Strategy
### Use Semantic Search (mcp__code-context__search_code) for:
- Conceptual searches (finding code by what it does)
- Algorithm/calculation implementations
- Feature exploration across files
- Cross-cutting concerns (auth, error handling, validation)
- Initial investigation when location unknown

### Use Direct Tools (Read, Grep, Glob) for:
- Known file locations
- Literal string matches, variable names
- File patterns by extension/naming
- Configuration values, constants
- Quick verification of specific lines

### Search Performance:
- Semantic excels: business logic, UI components, features, tests
- Semantic struggles: infrastructure config, connection strings, cache settings
- Direct excels: exact matches, known patterns, config files, imports

## TypeScript/React Rules
- Use kebab-case for all frontend files (`user-profile.tsx`)
- Component names in files contents remain PascalCase (`UserProfile`)
- Enable strict mode, avoid `any` type
- Use functional components with hooks
- Cache Intl formatters at module level
- Use TanStack Query for all API calls
- Use `ExternalLink` component for external URLs
- Use standard UI components (Button, Heading, Select, etc) never raw HTML

## Tailwind CSS Rules
- Use semantic color variables from index.css (e.g., `bg-background`, `text-foreground`)
- Never use explicit colors (e.g., `bg-gray-500`, `text-blue-600`)
- Avoid `dark:` prefixes - CSS variables handle theme switching automatically
- Rare exceptions: only when CSS variables don't cover the specific need
- Check index.css for available semantic variables before adding styles
- Semantic colors automatically adapt to light/dark mode

## Route File Pattern (MANDATORY)
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
- Routes must be minimal (<30 lines)
- NO business logic, hooks, or UI in routes
- ALL logic in feature components under `apps/web/src/components/`
- Feature folders match route purpose

## C# Backend Rules
- Use feature folders for organization
- Inherit from `BaseAuthController` for auth endpoints
- Keep controllers thin, logic in services
- Use async/await for all I/O
- Use IOptions<T> for configuration
- Use JSONB for flexible data storage
- Use constants for magic numbers
- Store timestamps as ISO 8601 strings
- Store weights in kg

## Development Workflow
### Pre-commit checks (MANDATORY):
```bash
npm run check && npm run test
```
- Run from root directory only
- Never skip TypeScript compilation check

### Commit message guidelines:
- Never use "BREAKING CHANGE" in commit messages
- This is an application, not a library - there are no breaking changes
- Use conventional commit format without breaking change notation

### Command locations:
- Always run commands from repo root
- Turborepo handles optimization
- Never run commands in workspace subdirectories

## Testing Requirements
### Frontend:
- Use MSW for HTTP mocking (never mock fetch directly)
- Suppress console for expected errors: `vi.spyOn(console, "error").mockImplementation(() => {})`
- Test business logic, not framework integration

### Backend:
- Use xUnit for all tests
- Extract business logic to testable services
- Don't test framework integration directly

## Database Guidelines
- Modify schema in Supabase dashboard
- Update C# models with `Db` prefix
- Update schema documentation when changed
- All timestamps as ISO 8601 strings
- All weights in kilograms

## Spec-Workflow Rules (MANDATORY)
- **CRITICAL: ALWAYS call `spec-workflow-guide` BEFORE ANY spec work** - this is the first tool to call when:
  - User mentions working on a spec or task
  - User asks to execute/implement a task number
  - Returning to spec work after any break
  - After conversation compaction
- **ALWAYS load full spec context** (requirements, design, tasks) via `get-spec-context` before implementing
- **NEVER read/write spec files directly** - use spec-workflow tools exclusively:
  - `spec-workflow-guide` - Load workflow guide first (MANDATORY FIRST STEP)
  - `get-spec-context` - Load spec documents before work
  - `manage-tasks` - Update task status and get context
  - `create-spec-doc` - Create/update spec documents
- **NEVER assume spec details** from memory after conversation compaction

## Common Pitfalls to Avoid
- Never add CORS to API (Vite proxy handles it)
- Never expose exception details to users
- Avoid unnecessary type assertions
- Never create files unless absolutely necessary
- Never proactively create documentation files
- Always use `git mv` for renaming tracked files
- Always extract magic numbers to constants
- Always use standard UI components over raw HTML

## Lessons Learned
- Functions should sort input data before processing
- Route files were refactored to minimal pattern - maintain this

## File Update Policy
**Auto-update this file when learning:**
- AI-specific coding patterns
- User coding preferences affecting generation
- Technical discoveries impacting code generation
- Lessons that help future AI instances

**Do NOT add:**
- General architecture info (→ docs/ARCHITECTURE.md)
- Feature documentation (→ docs/ARCHITECTURE.md)
- Setup instructions (→ docs/README.md)

## CLAUDE.md Format Guidelines
- Keep directives as concise bullet points
- Avoid verbose explanations or human-readable prose
- Group related items under clear headings
- Use code examples only when pattern is complex
- Prefer directive lists over paragraph explanations
- Remove redundancy - state each rule once
