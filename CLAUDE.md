# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

TrendWeight is a web application for tracking weight trends by integrating with smart scales from Withings and Fitbit. The application uses a modern architecture with a C# ASP.NET Core API backend and a Vite + React frontend.

### Project Name Convention
- The project name is **TrendWeight** (capital T, capital W, no space)
- Use this capitalization consistently in code, namespaces, and project names

## Architecture

### Backend (C# API - `apps/api`)
- **ASP.NET Core 9.0** Web API
- **Supabase** for data storage (PostgreSQL with JSONB)
- **JWT authentication** supporting Supabase Auth
- **System.Text.Json** for JSON serialization
- **Feature-based folder structure** with service layer pattern
- **Separation of concerns** - Controllers handle HTTP, Services contain business logic

### Frontend (Vite React - `apps/web`)  
- **Vite** with React 19 and TypeScript
- **Tailwind CSS v4** for styling
- **Radix UI** for accessible UI components
- **TanStack Query** (React Query) for server state
- **TanStack Router** for type-safe routing
- **Supabase Auth** for authentication
- **Highcharts** for data visualization
- **@bprogress/react** for progress indicators
- **@js-joda/core** for date/time handling

### Reference Implementation
If `trendweight-classic/` folder exists locally, it contains the legacy C# MVC application for reference when implementing features or comparing with the live site. This folder is not part of the repository.

## Key Directory Structure

```
/apps/
  /api/                    # C# ASP.NET Core solution
    TrendWeight.sln        # Solution file
    /TrendWeight/          # Main API project
      /Features/           # Feature-based organization
        /Auth/             # Authentication infrastructure
        /Profile/          # User profile management (ProfileService)
        /ProviderLinks/    # Provider OAuth tokens
        /Providers/        # Withings, Fitbit integrations
        /Measurements/     # Measurement data management
        /Settings/         # User settings
      /Infrastructure/     # Cross-cutting concerns
        /Auth/             # JWT authentication handlers
        /DataAccess/       # Supabase data access layer
  /web/                    # Vite React frontend
    /src/
      /components/         # Shared UI components
      /features/           # Feature modules (currently unused)
      /lib/                # Core utilities and API client
      /routes/             # TanStack Router pages
      /types/              # TypeScript type definitions
```

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

## Environment Variables

### Frontend (.env.local)
```
VITE_API_URL=http://localhost:5199
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
```

### Backend (appsettings.Development.json)
```json
{
  "Supabase": {
    "Url": "https://[project-ref].supabase.co",
    "AnonKey": "[anon-key]",
    "ServiceKey": "[service-key]",
    "JwtSecret": "[jwt-secret]"
  },
  "Withings": {
    "ClientId": "[client-id]",
    "ClientSecret": "[client-secret]"
  },
  "Fitbit": {
    "ClientId": "[client-id]",
    "ClientSecret": "[client-secret]"
  }
}
```

**Note**: OAuth redirect URLs are constructed dynamically using `Request.Scheme` and `Request.Host` to support different deployment environments. Never hardcode URLs in configuration.

## Database Schema (Supabase)

### Tables
- **profiles**: User profiles with settings (UUID primary key)
  - `id` (uuid) - User's Supabase Auth UID
  - `profile_data` (jsonb) - User profile information
  - `settings_data` (jsonb) - User settings
  - `created_at`, `updated_at` (text) - ISO 8601 timestamps

- **provider_links**: OAuth tokens for provider integrations
  - `user_id` (uuid) - Foreign key to profiles
  - `provider` (text) - Provider name (withings, fitbit)
  - `link_data` (jsonb) - OAuth tokens and metadata
  - `created_at`, `updated_at` (text) - ISO 8601 timestamps

- **source_data**: Raw measurement data from providers
  - `user_id` (uuid) - Foreign key to profiles  
  - `provider` (text) - Data source provider
  - `source_data` (jsonb) - Raw measurement data with date/time strings
  - `last_sync_date` (text) - ISO 8601 timestamp
  - `resync_requested` (boolean) - Flag for pending resync operations
  - `created_at`, `updated_at` (text) - ISO 8601 timestamps

### Important Notes
- All timestamps are stored as `text` in ISO 8601 format to avoid timezone issues
- Use `DateTime.UtcNow.ToString("o")` when storing
- Parse with `DateTime.Parse(timestamp, null, DateTimeStyles.RoundtripKind).ToUniversalTime()`
- **All weights are stored in kg** in the database for consistency
  - Client-side conversion handles imperial/metric display based on user preference
  - This enables instant unit switching without data resync
- **Measurement timestamps are stored as local date/time strings**:
  - Separate `date` (yyyy-MM-dd) and `time` (HH:mm:ss) fields
  - Withings: Converts UTC timestamps to local time using provider timezone
  - Fitbit: Stores date/time as-is (already in local timezone)

## Frontend Route Structure

### Public Routes
- `/` - Home page with marketing content
- `/login` - Authentication page with email and social login options
- `/check-email` - Email verification prompt
- `/auth/verify` - Email link verification handler
- `/about` - About page
- `/faq` - Frequently asked questions
- `/privacy` - Privacy policy
- `/tipjar` - Donation options
- `/build` - Build/deployment information
- `/demo` - Demo dashboard with sample data

### Protected Routes (require authentication)
- `/dashboard` - Main dashboard showing measurement data and charts
- `/settings` - User settings management
- `/link` - Provider account linking interface

### OAuth Callback Routes
- `/oauth/withings/callback` - Withings OAuth callback handler
- `/oauth/fitbit/callback` - Fitbit OAuth callback handler

## Authentication

### Frontend
- Uses Supabase Auth with React Context
- Route-level protection using `beforeLoad: requireAuth` from `/lib/auth/authGuard.ts`
- TanStack Router integration for clean, declarative route protection
- Redirects to `/login` with `from` parameter to preserve destination
- Supports email links and social logins (Google, Microsoft, Apple)

### Backend
- Validates Supabase JWTs using JWT secret
- `SupabaseAuthenticationHandler` in Infrastructure/Auth
- All API endpoints require authentication except:
  - `/api/health` - Health check endpoint
  - `/api/withings/callback` - OAuth callback handler

## State Management

- **Server State**: TanStack Query with custom hooks
  - `useProfile()` - User profile data
  - `useSettings()` - User settings
  - `useMeasurements()` - Weight measurements
- **Local State**: React hooks and Context API
- **Persisted State**: Custom `usePersistedState` hook for user preferences

## Progress Indicators

The app uses @bprogress/react for progress indication:
- Route changes trigger progress bar
- Background API calls show progress via `BackgroundQueryProgress`
- Consistent styling with light blue color (#eef5ff)

## Date/Time Handling

- **Frontend**: Uses `@js-joda/core` for date operations
- **Backend**: Stores all measurements as local date/time strings
- DayStartOffset must be respected for grouping measurements

## API Patterns

### Endpoints
- All API endpoints are under `/api/`
- Feature-based organization (e.g., `/api/settings`, `/api/measurements`)
- Consistent JSON response format

### Error Handling
- Global error handling middleware
- Consistent error response format
- Proper HTTP status codes

## UI Components and Styling

### Component Library
- Radix UI for accessible, unstyled components (switches, toggles, dialogs, etc.)
- **react-select for all dropdown/select components** - Our standard dropdown control
  - Use the custom `Select` component at `/components/ui/Select.tsx`
  - Styled with Tailwind classes via `classNames` prop
  - Always use this instead of native HTML select elements
- Custom styled with Tailwind CSS v4
- Consistent use of CSS variables for theming

### Standard UI Components
**IMPORTANT**: Always use the standard UI components instead of raw HTML elements:

#### Button Component (`/components/ui/Button.tsx`)
- **Never use raw `<button>` elements** - Always use the `Button` component
- Available variants: `primary`, `secondary`, `ghost`, `success`, `destructive`, `warning`
- Available sizes: `sm`, `md`, `lg`, `xl`
- Supports `asChild` prop for use with Link components
- Example usage:
  ```tsx
  import { Button } from "../components/ui/Button";
  
  // Standard button
  <Button variant="primary" size="md">Click me</Button>
  
  // Button as a Link
  <Button asChild variant="secondary">
    <Link to="/settings">Go to Settings</Link>
  </Button>
  
  // With custom classes (uses tailwind-merge for proper overrides)
  <Button variant="secondary" className="w-full justify-start">
    Sign in with Google
  </Button>
  ```

#### Heading Component (`/components/ui/Heading.tsx`)
- **Never use raw heading tags** (`<h1>`, `<h2>`, etc.) - Always use the `Heading` component
- Ensures consistent typography and spacing across the application
- Supports levels 1-4 and custom className overrides
- Example usage:
  ```tsx
  import { Heading } from "../components/ui/Heading";
  
  <Heading level={1}>Page Title</Heading>
  <Heading level={2} className="text-gray-600">Section Header</Heading>
  ```

### Form Management
- react-hook-form for form state management
- Use Controller wrapper for custom components to enable dirty state tracking
- Navigation guard warns users about unsaved changes

### Tailwind Configuration
- Uses Tailwind CSS v4 with CSS-based configuration
- Brand colors defined as CSS variables
- Container widths: sm:640px, md:768px, lg:1024px, xl:1280px

### Typography
- Inter font for UI elements
- Zilla Slab for headings
- Consistent text sizing and line heights

## Development Guidelines

### Code Organization
1. **Feature-based structure**: Group related functionality together
2. **Clear separation**: Keep UI components, business logic, and data access separate
3. **Consistent naming**: Use PascalCase for components, camelCase for functions

### TypeScript Best Practices
- Enable strict mode
- Define interfaces for all data structures
- Avoid `any` type - use `unknown` when type is truly unknown
- Leverage type inference where possible

### React Best Practices
- Functional components with hooks
- Custom hooks for reusable logic
- Proper error boundaries
- Suspense for async operations

### C# Best Practices
- Feature folders for organization
- Dependency injection for all services
- Async/await for all I/O operations
- JSONB for flexible data storage

## Testing

### Frontend
- No test suite currently implemented
- When adding tests, use Vitest with React Testing Library

### Backend  
- Solution structure prepared for xUnit tests
- Add tests in a separate TrendWeight.Tests project

## Deployment

### Build Process
1. Frontend builds to `apps/web/dist/`
2. Backend publishes to standard .NET output
3. Environment-specific configuration via environment variables

### Build Information
The `/build` route displays build metadata injected during the Docker build process:
- Build time, git commit SHA, branch name, and version number
- Passed as Docker build arguments and exposed as VITE_ environment variables
- GitHub Actions provides these values automatically
- Local builds use git commands to populate the same information

## Containerization and CI/CD

### Docker Setup
The project includes a multi-stage Dockerfile for production deployment:

#### Build Stages
1. **Frontend Build** (node:20-alpine)
   - Installs frontend dependencies and builds Vite app
   - Accepts build args for Supabase configuration
   - Outputs static files to dist/

2. **Backend Build** (mcr.microsoft.com/dotnet/sdk:9.0)
   - Restores and builds the .NET solution
   - Publishes release build to /app/publish

3. **Runtime** (mcr.microsoft.com/dotnet/aspnet:9.0-alpine)
   - Minimal Alpine-based runtime image
   - Serves both API and static frontend files
   - Includes health check endpoint
   - Exposes port 8080

#### Docker Commands
```bash
# Build image with environment variables from .env
npm run docker:build

# Run container locally
npm run docker:run

# Manual build with specific args
docker build \
  --build-arg VITE_SUPABASE_URL=<url> \
  --build-arg VITE_SUPABASE_ANON_KEY=<key> \
  -t trendweight:local .
```

### GitHub Actions CI/CD

The `.github/workflows/ci.yml` workflow runs on all branches and provides:

#### Frontend Checks
- Node.js 20 setup with npm caching
- TypeScript type checking
- ESLint validation

#### Backend Checks  
- .NET 9.0 SDK setup
- Dependency restoration
- Release build compilation
- Test execution (when tests are added)

#### Docker Build & Registry
- Builds Docker image after all checks pass
- Uses Docker Buildx for advanced caching
- Pushes to both registries on main branch:
  - GitHub Container Registry (ghcr.io)
  - DigitalOcean Container Registry (registry.digitalocean.com)
- Image tagging strategy (same tags for both registries):
  - `latest` for main branch
  - Branch name for feature branches
  - PR number for pull requests
  - SHA prefix for commit tracking
- Build args injected from GitHub secrets for Supabase config
- DigitalOcean registry enables auto-deploy on their App Platform

#### Required GitHub Secrets
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `DIGITALOCEAN_ACCESS_TOKEN` - DigitalOcean API token with registry write access
- `DIGITALOCEAN_REGISTRY_NAME` - Your DigitalOcean registry name (e.g., "your-registry-name")

### Production Deployment

The containerized application:
- Serves the API on port 8080
- Hosts the frontend from wwwroot/
- Includes health check at `/api/health`
- Expects runtime environment variables for backend config
- Frontend configuration is baked in at build time

## Common Tasks

### Adding a New Route
1. Create route file in `apps/web/src/routes/`
2. TanStack Router will auto-generate route tree
3. Add navigation link if needed

### Adding a New API Endpoint
1. Create controller in appropriate Features folder
2. Inherit from `BaseAuthController` for authenticated endpoints
3. Use consistent response format

### Updating Database Schema
1. Modify schema in Supabase dashboard
2. Update corresponding C# models with `Db` prefix
3. Update TypeScript interfaces if needed

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

## Troubleshooting

### Port Conflicts
- Frontend: Default port 5173
- Backend: Default port 5199
- Check `logs/` directory for startup errors

### Authentication Issues
- Verify Supabase JWT secret matches in backend config
- Check CORS settings for local development
- Ensure frontend uses correct API URL

### Database Issues
- All timestamps must be stored as ISO 8601 strings
- JSONB queries use PostgreSQL syntax
- Check Supabase logs for query errors

## Important Notes

1. **Never store secrets in code** - Use environment variables
2. **Always handle errors gracefully** - Show user-friendly messages
3. **Test on mobile** - The app must be fully responsive
4. **Keep accessibility in mind** - Use semantic HTML and ARIA labels
5. **Provider disconnection** - When a user disconnects a provider, both the provider link AND the associated source data are deleted to ensure clean state
6. **Fitbit API limitations**:
   - Weight data requests cannot start before 2009-01-01
   - Maximum date range per request is 32 days (not 31 or 33)
   - Body-weight endpoint may return extrapolated data, not actual measurements
   - Always use initial sync date of 2009-01-01 for Fitbit
8. **Service Layer Pattern** - Controllers should be thin, delegating business logic to services
9. **Profile Creation** - ProfileService handles complex update/create logic, never defaults nullable fields to 0
10. **Provider Token Fields** - Withings and Fitbit sometimes return userid fields that vary in type, we don't use these fields
11. **Timezone Field Removed** - User timezone was removed from the profile as it wasn't being used. Only Withings API timezone is used for timestamp conversion.

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

## Settings Page Help Text

All settings on the /settings page have concise help text:
- **First Name**: "Used for greetings on the dashboard"
- **Weight Units**: "Choose your preferred unit of measurement"
- **Start Date**: "The baseline date for measuring progress toward your goal"
- **Goal Weight**: "The weight you are working toward achieving"
- **My Plan**: "Your planned rate of weight change. This helps track if you're ahead or behind schedule."
- **Day Start**: Already has comprehensive multi-paragraph explanation
- **Show calorie calculations**: "Display estimated calorie surplus/deficit based on your weight changes"

Settings sections use `mt-6` spacing between groups for visual separation.

### IMPORTANT: Keep CLAUDE.md Updated
**You MUST automatically update this CLAUDE.md file whenever you learn something new that is likely important for future sessions.** This includes:
- Project-specific patterns, conventions, or architecture decisions
- User's personal coding preferences or approaches
- Important technical discoveries (e.g., library quirks, API behaviors)
- Lessons learned from debugging or problem-solving
- Clarifications about business logic or domain concepts
- Any other information that would help future Claude instances work more effectively on this codebase

Add these updates in the appropriate section or create a new section if needed. This ensures knowledge is preserved across sessions.