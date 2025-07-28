# Architecture

## Overview

TrendWeight is a web application for tracking weight trends by integrating with smart scales from Withings and Fitbit. The application uses a modern architecture with a C# ASP.NET Core API backend and a Vite + React frontend.

### Project Name Convention
- The project name is **TrendWeight** (capital T, capital W, no space)
- Use this capitalization consistently in code, namespaces, and project names

## Backend Architecture

### Technology Stack

- **ASP.NET Core 9.0** Web API
- **Supabase** (PostgreSQL) for data storage
- **JWT-based authentication**
- **Feature-based architecture** with service layer pattern

### Service Layer Pattern

The backend uses a service layer pattern where controllers remain thin and delegate business logic to dedicated service classes. This promotes testability and separation of concerns.

### Measurement Sync Architecture

The measurement synchronization process is orchestrated by `MeasurementSyncService`, which:
- Manages cache expiration and determines when data needs refreshing
- Coordinates between provider services and the source data storage
- Handles both incremental syncs (last 90 days) and full resyncs
- Provides a clean separation between provider integrations and data storage

Key components:
- **MeasurementSyncService**: Orchestrates the sync process and manages refresh logic
- **Provider Services** (Withings/Fitbit): Fetch measurements from external APIs
- **SourceDataService**: Stores and retrieves measurement data from the database
- **ProviderIntegrationService**: Factory for getting provider service instances

Data refresh logic:
- Cache duration: 5 minutes in production, 10 seconds in development
- Regular refresh: Fetches measurements from 90 days before last sync
- Full resync: Clears all data then fetches entire history
- No provider dependencies on storage layer - clean separation of concerns

### Key Directory Structure

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

## Frontend Architecture

### Technology Stack

- **React 19** with TypeScript
- **Vite** for build tooling
- **TanStack Router** for routing
- **TanStack Query** for server state management
- **Tailwind CSS v4** for styling
- **Radix UI** for accessible components
- **Highcharts** for data visualization
- **@bprogress/react** for progress indicators
- **@js-joda/core** for date/time handling

## Timestamp Storage

The application stores weight measurements with local date and time strings rather than Unix timestamps:

### Storage Format

```typescript
interface RawMeasurement {
  date: string; // "2024-01-15" (YYYY-MM-DD)
  time: string; // "06:30:00" (HH:mm:ss)
  weight: number; // kg
  fatRatio?: number; // 0-1 ratio
}
```

### Provider Handling

- **Withings**: Provides UTC timestamps with timezone info. The backend converts these to local time before storage.
- **Fitbit**: Provides measurements already in the user's local timezone, stored as-is.

This approach:

- Preserves the user's local time context
- Avoids timezone conversion issues
- Simplifies display logic on the frontend
- Handles provider differences transparently

## Database Schema (Supabase)

### Tables

- **user_accounts**: Maps Clerk user IDs to internal GUIDs
  - `id` (uuid) - Internal user ID (primary key)
  - `clerk_id` (text) - Clerk user ID (unique)
  - `email` (text) - User's email address
  - `created_at`, `updated_at` (text) - ISO 8601 timestamps

- **profiles**: User profiles with settings (UUID primary key)
  - `id` (uuid) - Internal user ID (foreign key to user_accounts)
  - `profile_data` (jsonb) - User profile information
  - `settings_data` (jsonb) - User settings
  - `created_at`, `updated_at` (text) - ISO 8601 timestamps

- **provider_links**: OAuth tokens for provider integrations
  - `user_id` (uuid) - Foreign key to profiles
  - `provider` (text) - Provider name (withings, fitbit)
  - `link_data` (jsonb) - OAuth tokens and metadata
  - `created_at`, `updated_at` (text) - ISO 8601 timestamps

- **source_data**: Raw measurement data from providers
  - `uid` (uuid) - Foreign key to profiles  
  - `provider` (text) - Data source provider
  - `measurements` (jsonb) - Raw measurement data with date/time strings
  - `last_sync` (text) - ISO 8601 timestamp
  - `updated_at` (text) - ISO 8601 timestamp

### Important Notes
- All timestamps are stored as ISO 8601 text to avoid timezone issues
- All weights are stored in kg for consistency (client handles unit conversion)
- Measurement timestamps use separate date/time fields in local timezone

## Authentication Flow

### Frontend
- Uses Clerk for authentication with React SDK
- Custom `useAuth` hook wraps Clerk's authentication hooks
- Route-level protection using `beforeLoad: requireAuth` from `/lib/auth/authGuard.ts`
- TanStack Router integration for clean, declarative route protection
- Redirects to `/login` with `from` parameter to preserve destination
- Supports email OTP and social logins (Google, Microsoft, Apple)

### Backend
- Validates Clerk JWTs using JWKS endpoint
- `ClerkAuthenticationHandler` in Infrastructure/Auth
- User mapping between Clerk IDs and internal GUIDs via `user_accounts` table
- All API endpoints require authentication except:
  - `/api/health` - Health check endpoint
  - `/api/withings/callback` - OAuth callback handler
  - `/api/fitbit/callback` - OAuth callback handler
- Provider OAuth tokens stored encrypted in database

## Frontend Route Structure

### Public Routes
- `/` - Home page with marketing content
- `/login` - Authentication page with Clerk SignIn component
- `/about` - About page
- `/faq` - Frequently asked questions
- `/privacy` - Privacy policy
- `/tipjar` - Donation options
- `/build` - Build/deployment information
- `/demo` - Demo dashboard with sample data
- `/account-deleted` - Account deletion confirmation

### Protected Routes (require authentication)
- `/dashboard` - Main dashboard showing measurement data and charts
- `/settings` - User settings management
- `/link` - Provider account linking interface

### OAuth Callback Routes
- `/oauth/withings/callback` - Withings OAuth callback handler
- `/oauth/fitbit/callback` - Fitbit OAuth callback handler

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
- No CORS configuration needed (Vite proxy handles in development)

### Error Handling
- Global error handling middleware with correlation IDs
- Consistent error response format
- Proper HTTP status codes
- Validation errors (400) show details, server errors (500) show generic message
- All errors logged with correlation ID for debugging

### Configuration
- Uses IOptions pattern throughout for type-safe configuration
- All configuration consolidated in `AppOptions` class
- Environment-specific settings via appsettings.{Environment}.json

## Development Guidelines

### Backend

- Feature folders for organization
- Dependency injection for all services
- Async/await for all I/O operations
- Nullable fields should remain null when not provided (never default to 0)

### Frontend

- Functional components with hooks
- Custom hooks for reusable logic
- Error boundaries for graceful error handling
- Route-level authentication guards
- Proper error boundaries
- Suspense for async operations

### C# Best Practices
- Feature folders for organization
- Dependency injection for all services
- Async/await for all I/O operations
- JSONB for flexible data storage

### Code Organization
1. **Feature-based structure**: Group related functionality together
2. **Clear separation**: Keep UI components, business logic, and data access separate
3. **Consistent naming**: Use PascalCase for components, camelCase for functions

### TypeScript Best Practices
- Enable strict mode
- Define interfaces for all data structures
- Avoid `any` type - use `unknown` when type is truly unknown
- Leverage type inference where possible

### UI Component Standards

#### Component Library
- Radix UI for accessible, unstyled components (switches, toggles, dialogs, etc.)
- **react-select for all dropdown/select components** - Our standard dropdown control
  - Use the custom `Select` component at `/components/ui/Select.tsx`
  - Styled with Tailwind classes via `classNames` prop
  - Always use this instead of native HTML select elements
- Custom styled with Tailwind CSS v4
- Consistent use of CSS variables for theming

#### Standard UI Components
**IMPORTANT**: Always use the standard UI components instead of raw HTML elements:

##### Standard Components
- **Button Component** - Use instead of raw `<button>` elements
  - Multiple variants and sizes available
  - Supports `asChild` prop for use with Links
- **Heading Component** - Use instead of raw heading tags (`<h1>`, `<h2>`, etc.)
  - Ensures consistent typography across the application
- **Select Component** - Our standard dropdown control using react-select
  - Always use instead of native HTML select elements

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

## Provider Integration Notes

### Fitbit Limitations

- Weight data requests cannot start before 2009-01-01
- Maximum date range per request is 32 days (not 31 or 33)
- Body-weight endpoint may return extrapolated data, not actual measurements
- Always use initial sync date of 2009-01-01 for Fitbit

### Token Management

- Tokens automatically refresh when expired
- Provider userid fields vary in type and are not used
- Failed auth triggers reconnection flow

### Important Provider Notes
- **Provider disconnection** - When a user disconnects a provider, both the provider link AND the associated source data are deleted to ensure clean state
- **Provider Token Fields** - Withings and Fitbit sometimes return userid fields that vary in type, we don't use these fields
- **Timezone Field Removed** - User timezone was removed from the profile as it wasn't being used. Only Withings API timezone is used for timestamp conversion

## Environment Variables

### Frontend (.env.local)
```
VITE_API_URL=http://localhost:5199
VITE_CLERK_PUBLISHABLE_KEY=[clerk-publishable-key]
```

### Backend (appsettings.Development.json)
```json
{
  "Clerk": {
    "Authority": "https://[clerk-domain].clerk.accounts.dev",
    "SecretKey": "sk_test_[clerk-secret-key]"
  },
  "Supabase": {
    "Url": "https://[project-ref].supabase.co",
    "ServiceKey": "[service-key]"
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
1. **Frontend Build** (node:22-alpine)
   - Installs frontend dependencies and builds Vite app
   - Accepts build args for Clerk configuration
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
  --build-arg VITE_CLERK_PUBLISHABLE_KEY=<key> \
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
- Build args injected from GitHub secrets for Clerk config
- DigitalOcean registry enables auto-deploy on their App Platform

#### Required GitHub Secrets
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
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

## Troubleshooting

### Port Conflicts
- Frontend: Default port 5173
- Backend: Default port 5199
- Check `logs/` directory for startup errors

### Authentication Issues
- Verify Clerk secret key and authority URL in backend config
- Ensure email claim is configured in Clerk session token settings
- Frontend API calls are proxied through Vite in development
- JWT tokens have 5-minute clock skew tolerance
- Check user_accounts table for proper ID mapping
- Rate limiting may reject excessive requests (>100/minute)

### Database Issues
- Check Supabase logs for query errors
- JSONB queries use PostgreSQL syntax

## Important Notes

1. **Never store secrets in code** - Use environment variables
2. **Always handle errors gracefully** - Show user-friendly messages with correlation IDs
3. **Test on mobile** - The app must be fully responsive
4. **Keep accessibility in mind** - Use semantic HTML and ARIA labels
5. **Security** - Docker containers run as non-root user
6. **Rate Limiting** - 100 requests/minute per user globally applied
7. **No CORS** - Not needed due to Vite proxy in development and same-origin in production

