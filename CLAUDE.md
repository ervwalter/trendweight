# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

TrendWeight is a web application for tracking weight trends by integrating with smart scales from Withings and Fitbit. The application uses a modern architecture with a C# ASP.NET Core API backend and a Vite + React frontend.

### Project Name Convention
- The project name is **TrendWeight** (capital T, capital W, no space)
- Use this capitalization consistently in code, namespaces, and project names

## Architecture Overview

For detailed architecture documentation, see ARCHITECTURE.md. This file focuses on AI-specific instructions and code generation patterns.

### Reference Implementation
If `trendweight-classic/` folder exists locally, it contains the legacy C# MVC application for reference when implementing features or comparing with the live site. This folder is not part of the repository.

## Essential Commands

### Monorepo Commands (from root)
```bash
npm run dev       # Start both API and frontend in dev mode (uses tmuxinator)
npm run dev:stop  # Stop the tmuxinator session
npm run build     # Build both API and frontend
npm run test      # Run all tests (currently just API)
npm run check     # Run TypeScript and lint checks on frontend
npm run format    # Auto-format code in both API and frontend
npm run clean     # Clean all build artifacts and dependencies
```

### Development

#### Frontend (apps/web) - uses npm
```bash
cd apps/web
npm run dev       # Start development server on http://localhost:5173
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Run ESLint
npm run check     # Run typecheck and lint
```

#### Backend (apps/api)
```bash
cd apps/api
dotnet build      # Build entire solution
dotnet test       # Run all tests (when tests are added)

cd apps/api/TrendWeight
dotnet run        # Start API on http://localhost:5199
dotnet watch      # Run with hot reload
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

See ARCHITECTURE.md for detailed UI component documentation.

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
- Use conventional commit format: `type: description`
- Types: feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert
- Never use emojis (no ✨, 🐛, 📝, etc.)
- Keep first line under 72 characters
- Use present tense, imperative mood
- Examples:
  - `feat: add user authentication system`
  - `fix: resolve memory leak in rendering process`
  - `refactor: extract common validation logic into helpers`

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
- General architectural information (belongs in ARCHITECTURE.md)
- Feature documentation (belongs in ARCHITECTURE.md)
- Setup instructions (belongs in README.md)

Keep this file focused on AI code generation guidance only.

## Development Workflow

### Always Run Comprehensive Checks
- When checking for code issues, always run 'npm run format && npm run check' from the top level folder of the repo
- Do not attempt to be tactical and run subtasks in lower level folders
- **When you need to check if the repo is in a clean state before doing a commit, do 'npm run format && npm run check && npm run test' as a single Bash command from the top of the repo**

## Testing Guidelines

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
```