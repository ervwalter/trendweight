# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

TrendWeight is a web application for tracking weight trends by integrating with smart scales from Withings and Fitbit. The application uses a modern architecture with a C# ASP.NET Core API backend and a Vite + React frontend.

### Project Name Convention
- The project name is **TrendWeight** (capital T, capital W, no space)
- Use this capitalization consistently in code, namespaces, and project names

## Architecture Overview

For detailed architecture documentation, see docs/ARCHITECTURE.md. This file focuses on AI-specific instructions and code generation patterns.

### Reference Implementation
If `trendweight-classic/` folder exists locally, it contains the legacy C# MVC application for reference when implementing features or comparing with the live site. This folder is not part of the repository.

## Essential Commands

### Monorepo Commands (from root)
```bash
npm run dev       # Start both API and frontend in dev mode (uses tmuxinator)
npm run dev:stop  # Stop the tmuxinator session
npm run build     # Build both API and frontend (with Turbo caching)
npm run test      # Run all tests (with Turbo caching)
npm run check     # Fast dev check - typecheck and lint only (NO format check)
npm run check:ci  # Full CI check - includes format check
npm run format    # Auto-format code in both API and frontend
npm run fix       # Format then check in one command
npm run clean     # Clean all build artifacts, dependencies, and Turbo cache
```

**Note**: We use Turborepo for intelligent caching. The second run of any command is near-instant if nothing changed.

### Development

#### Frontend (apps/web) - uses npm
```bash
cd apps/web
npm run dev       # Start development server on http://localhost:5173
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Run ESLint
npm run typecheck # Run TypeScript type checking
npm run test      # Run tests
npm run clean     # Clean build artifacts and generated files
```

#### Backend (apps/api)
```bash
cd apps/api
npm run dev       # Start API with hot reload (runs dotnet watch)
npm run build     # Build entire solution (dotnet build)
npm run test      # Run all tests (dotnet test)
npm run lint      # Build with warnings as errors (dotnet build --warnaserror)
npm run format    # Format code (dotnet format)
npm run clean     # Clean build artifacts (bin/ and obj/ folders)
```

### Development Server Management

The project uses tmuxinator for managing development servers. When you run `npm run dev`, it:
1. Starts the backend API server on port 5199
2. Starts the frontend Vite server on port 5173
3. Creates log files in the `logs/` directory

To view logs:
- `tail -f logs/backend.log` for backend logs
- `tail -f logs/frontend.log` for frontend logs

## UI Components and Styling

**IMPORTANT**: Always use the standard UI components from our component library:
- Use `Button` component instead of raw `<button>` tags
- Use `Heading` component instead of raw `<h1>`, `<h2>`, etc.
- Use `Select` component instead of raw `<select>` tags
- Use `Link` from TanStack Router for internal navigation

See docs/ARCHITECTURE.md for detailed UI component documentation.

## AI Code Generation Guidelines

### Code Organization
1. **Feature-based structure**: Group related functionality together
2. **Clear separation**: Keep UI components, business logic, and data access separate
3. **Consistent naming**: Use PascalCase for components, camelCase for functions

### CRITICAL: Route File Pattern (NO EXCEPTIONS)
**This is an ABSOLUTE REQUIREMENT for ALL route files in `apps/web/src/routes/`:**

Every route file MUST follow this exact minimal pattern without exception:

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "../components/Layout";
import { ComponentName } from "../components/feature-folder/ComponentName";
// Import any route-specific guards/loaders if needed

export const Route = createFileRoute("/route-path")({
  // Include loaders, guards, validateSearch ONLY if needed
  beforeLoad: requireAuth, // Only if route needs auth
  loader: async () => { /* route-specific data loading */ },
  component: RouteNamePage,
});

function RouteNamePage() {
  // Extract route params ONLY if needed
  const { param } = Route.useParams(); // Only if route has params
  
  return (
    <Layout title="Page Title" suspenseFallback={<CustomFallback />}>
      <ComponentName param={param} />
    </Layout>
  );
}
```

**MANDATORY RULES:**
1. **Route files must be MINIMAL** - Only route definition and a single page component
2. **NO business logic in routes** - All logic goes in feature components
3. **NO hooks in routes** (except useParams for route params)
4. **NO data fetching in routes** (except in the loader function)
5. **NO UI markup beyond Layout wrapper** - All UI goes in feature components
6. **Always use Layout component** with title prop
7. **Extract ALL content to feature folders** under `apps/web/src/components/`
8. **Feature folder naming** must match the route purpose (e.g., /settings → components/settings/)

**Examples of VIOLATIONS (NEVER DO THIS):**
- Using useState, useEffect, or other hooks in route files
- Putting forms, buttons, or any UI elements directly in routes
- Making API calls outside of the loader function
- Having more than 30 lines in a route file
- Creating multiple components in a route file

If you see any route file that doesn't follow this pattern, it MUST be refactored immediately.

### When Generating TypeScript/React Code
- Enable strict mode
- Define interfaces for all data structures
- Avoid `any` type - use `unknown` when type is truly unknown
- Leverage type inference where possible
- Use functional components with hooks
- Create custom hooks for reusable logic
- Implement proper error boundaries
- Use Suspense for async operations
- Cache Intl formatters at module level for performance
- Use TanStack Query for all API calls
- Use `ExternalLink` component for all external URLs (includes icon and proper attributes)

### When Generating C# Code
- Use feature folders for organization
- Apply dependency injection for all services
- Use async/await for all I/O operations
- Leverage JSONB for flexible data storage
- Follow the existing service layer pattern
- Use IOptions<T> pattern for configuration
- Keep controllers thin - all logic in services
- Use constants for magic numbers (cache durations, etc.)

## AI-Specific Instructions for Common Tasks

### Adding a New Route
**CRITICAL**: You MUST follow the minimal route pattern described above. NO EXCEPTIONS.

1. Create minimal route file in `apps/web/src/routes/` following the EXACT pattern
2. Create corresponding feature folder in `apps/web/src/components/`
3. Extract ALL logic, UI, and hooks to the feature component
4. TanStack Router will auto-generate route tree
5. Add navigation link if needed
6. Route file should NEVER exceed 30 lines

### Adding a New API Endpoint
1. Create controller in appropriate Features folder
2. Inherit from `BaseAuthController` for authenticated endpoints
3. Use consistent response format
4. Follow existing service layer pattern

### Updating Database Schema
1. Modify schema in Supabase dashboard
2. Update corresponding C# models with `Db` prefix
3. Update TypeScript interfaces if needed
4. Remember all timestamps are stored as ISO 8601 strings

### Commit Message Guidelines
**CRITICAL RULE: NO EMOJIS IN COMMIT MESSAGES**
- Use conventional commit format: `type: description` or `type(scope): description`
- Types: feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert
- **Scopes**: Use scopes when changes are specific to particular features or areas. These are just examples - use whatever scope best describes the area of change:
  - Frontend examples: `auth`, `dashboard`, `settings`, `profile`, `charts`, `navigation`
  - Backend examples: `withings-sync`, `fitbit-sync`, `weight-service`, `user-service`, `oauth`
  - Infrastructure examples: `docker`, `ci`, `deps`, `config`
  - Component examples: `button`, `modal`, `form`, `layout`
- Never use emojis (no ✨, 🐛, 📝, etc.)
- Keep first line under 72 characters
- Use present tense, imperative mood
- Examples without scope (general/cross-cutting changes):
  - `feat: add user authentication system`
  - `fix: resolve memory leak in rendering process`
  - `refactor: extract common validation logic into helpers`
- Examples with scope (feature-specific changes):
  - `feat(auth): add Apple sign-in provider`
  - `fix(dashboard): correct weight trend calculation`
  - `style(settings): improve form layout on mobile`
  - `refactor(withings-sync): consolidate webhook handling`
  - `test(weight-service): add interpolation edge cases`
  - `perf(charts): optimize data point rendering`
  - `fix(oauth): handle token refresh errors gracefully`

## Important AI Code Generation Notes

1. **Never store secrets in code** - Always use environment variables
2. **Always handle errors gracefully** - Show user-friendly messages with correlation IDs
3. **Test on mobile** - The app must be fully responsive
4. **Keep accessibility in mind** - Use semantic HTML and ARIA labels
5. **Use standard UI components** - Never use raw HTML elements when standard components exist
6. **Follow existing patterns** - Match the codebase style and conventions
7. **Service Layer Pattern** - Controllers must be thin, all logic in services
8. **Database considerations** - All timestamps stored as ISO 8601 strings, all weights in kg
9. **No CORS configuration** - Never add CORS to the API (Vite proxy handles it)
10. **Performance** - Cache Intl formatters at module level, use React.memo where appropriate

## Database Schema Management

### Supabase Schema
The complete database schema is documented in the repository:
- **Schema SQL**: `apps/api/TrendWeight/supabase/schema.sql` - Complete SQL script to recreate all tables, indexes, and RLS policies
- **Schema Documentation**: `apps/api/TrendWeight/supabase/SCHEMA.md` - Detailed documentation of table structures and data formats

To set up a new Supabase instance:
1. Create a new Supabase project
2. Run the `schema.sql` file in the SQL editor
3. Configure the API with the project credentials

**Note**: All tables use RLS policies that deny direct access. Data access is only allowed through the API using the service role key.

**IMPORTANT**: If you make any schema changes in Supabase (new tables, columns, indexes, etc.), you MUST:
1. Use the MCP Supabase tools to query the updated schema
2. Update `apps/api/TrendWeight/supabase/schema.sql` with the changes
3. Update `apps/api/TrendWeight/supabase/SCHEMA.md` documentation accordingly
4. Never make schema changes without updating these files

## Recent Lessons Learned (from Code Review)

1. **Raw HTML Usage** - Several components were using raw HTML elements. Always check for and use our standard UI components.
2. **Type Assertions** - Avoid type assertions like `as HeadersInit`. Use proper types instead.
3. **Complex Files** - Break down files over 200 lines into smaller, focused modules.
4. **Magic Numbers** - Always extract to named constants (cache durations, buffer times, etc.)
5. **Service Registration** - Don't register services multiple times. Once is enough.
6. **Error Messages** - Never expose exception details to users. Use correlation IDs instead.
7. **Performance** - Module-level caching of formatters significantly improves performance.
8. **UriBuilder Default Ports** - When using UriBuilder for HTTPS URLs, the default port 443 is included. Remove it to avoid URLs like `https://example.com:443/path`. Tests caught this bug!
9. **Defensive Input Handling** - Functions should handle unsorted input gracefully. The interpolation functions now sort input data before processing to ensure correct results regardless of input order.
10. **Route File Pattern MANDATORY** - All route files were refactored to follow a minimal pattern. Route files must ONLY contain route definition and a single page component that renders Layout with a feature component. ALL business logic, hooks, and UI must be extracted to feature components. This pattern is now MANDATORY for all routes without exception.

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

### IMPORTANT: Keep CLAUDE.md Updated
**You MUST automatically update this CLAUDE.md file whenever you learn something new that is likely important for future sessions.** This includes:
- AI-specific coding patterns or generation rules
- User's personal coding preferences that affect AI generation
- Important technical discoveries that impact how AI should generate code
- Lessons learned that would help future AI instances

Do NOT add:
- General architectural information (belongs in docs/ARCHITECTURE.md)
- Feature documentation (belongs in docs/ARCHITECTURE.md)
- Setup instructions (belongs in docs/README.md)

Keep this file focused on AI code generation guidance only.

## Development Workflow

### Always Run Comprehensive Checks
- When checking for code issues during development, run 'npm run check' from the top level folder of the repo (fast)
- Do not attempt to be tactical and run subtasks in lower level folders - Turborepo handles optimization
- **When you need to check if the repo is in a clean state before doing a commit, do 'npm run format && npm run check:ci && npm run test' as a single Bash command from the top of the repo**

### CRITICAL: TypeScript Error Prevention
**You MUST run 'npm run check' after EVERY code change, not just tests!** Running only tests will miss:
- TypeScript compilation errors
- Type mismatches
- Missing imports
- ESLint violations

**Workflow for code changes:**
1. Make your changes
2. Run `npm run check` to catch TypeScript/lint errors
3. Run `npm test` to verify functionality
4. Never assume tests passing means the code is correct - TypeScript might still have errors!

## Testing Guidelines

### Console Suppression in Tests
When writing tests that intentionally trigger errors or warnings, suppress console output to keep test output clean:

```typescript
// Suppress expected console.error for this test
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

// ... test code that triggers errors ...

consoleErrorSpy.mockRestore();
```

Use the same pattern for `console.warn` when testing code that logs warnings. Apply this pattern only to specific tests that expect errors/warnings, not globally.

### Frontend Testing with MSW
**CRITICAL**: Always use MSW (Mock Service Worker) for HTTP mocking in frontend tests:
- NEVER manually mock fetch: `global.fetch = vi.fn()` ❌
- ALWAYS use MSW handlers: `server.use(http.get(...))` ✅
- See `.claude/frontend-testing/TESTING.md` for detailed MSW usage patterns
- MSW is already configured in the test setup

### Authentication Handler Testing
**Important**: When testing authentication components, focus on testing the business logic we own rather than the framework integration:
- Do NOT test ASP.NET Core authentication handlers directly (tight framework coupling)
- Instead, extract business logic into testable services (e.g., token validation, claims mapping)
- Test the extracted services thoroughly
- Trust that the framework integration works as documented

Example: For Supabase authentication, we created `ISupabaseTokenService` to test JWT validation and claims mapping logic separately from the authentication handler.

## Agent OS Documentation

### Product Context
- **Mission & Vision:** @.agent-os/product/mission.md
- **Technical Architecture:** @.agent-os/product/tech-stack.md
- **Development Roadmap:** @.agent-os/product/roadmap.md
- **Decision History:** @.agent-os/product/decisions.md

### Development Standards
- **Code Style:** @~/.agent-os/standards/code-style.md
- **Best Practices:** @~/.agent-os/standards/best-practices.md

### Project Management
- **Active Specs:** @.agent-os/specs/
- **Spec Planning:** Use `@~/.agent-os/instructions/create-spec.md`
- **Tasks Execution:** Use `@~/.agent-os/instructions/execute-tasks.md`

## Workflow Instructions

When asked to work on this codebase:

1. **First**, check @.agent-os/product/roadmap.md for current priorities
2. **Then**, follow the appropriate instruction file:
   - For new features: @.agent-os/instructions/create-spec.md
   - For tasks execution: @.agent-os/instructions/execute-tasks.md
3. **Always**, adhere to the standards in the files listed above

## Important Notes

- Product-specific files in `.agent-os/product/` override any global standards
- User's specific instructions override (or amend) instructions found in `.agent-os/specs/...`
- Always adhere to established patterns, code style, and best practices documented above.
```