# Project Structure

## Monorepo Organization

```
/
├── apps/                    # Application workspaces
│   ├── api/                 # C# ASP.NET Core backend
│   └── web/                 # React frontend
├── docs/                    # Documentation
├── scripts/                 # Build and deployment scripts
├── logs/                    # Development logs
└── context_portal/          # Legacy migration tools
```

## Backend Structure (`apps/api/`)

```
apps/api/
├── TrendWeight.sln          # Solution file
└── TrendWeight/             # Main API project
    ├── Features/            # Feature-based organization
    │   ├── Auth/            # Authentication infrastructure
    │   ├── Profile/         # User profile management
    │   ├── ProviderLinks/   # OAuth token management
    │   ├── Providers/       # Withings/Fitbit integrations
    │   ├── Measurements/    # Weight data management
    │   └── Settings/        # User settings
    ├── Infrastructure/      # Cross-cutting concerns
    │   ├── Auth/            # JWT authentication handlers
    │   └── DataAccess/      # Supabase data access layer
    └── TrendWeight.csproj   # Project file
```

## Frontend Structure (`apps/web/`)

```
apps/web/
├── src/
│   ├── components/          # Shared UI components
│   │   └── ui/              # shadcn/ui components
│   ├── lib/                 # Core utilities and API client
│   │   ├── auth/            # Authentication utilities
│   │   ├── dashboard/       # Dashboard-specific logic
│   │   └── api/             # API client and hooks
│   ├── routes/              # TanStack Router pages
│   │   ├── __root.tsx       # Root layout
│   │   ├── index.tsx        # Home page
│   │   ├── dashboard.tsx    # Main dashboard
│   │   ├── settings.tsx     # User settings
│   │   └── oauth/           # OAuth callback handlers
│   ├── types/               # TypeScript type definitions
│   └── main.tsx             # Application entry point
├── public/                  # Static assets
└── package.json             # Frontend dependencies
```

## Key Architectural Patterns

### Backend: Feature-Based Organization

- Each feature has its own folder under `Features/`
- Controllers, services, and models grouped by feature
- Service layer pattern with dependency injection
- Thin controllers that delegate to services

### Frontend: File-Based Routing

- Routes automatically generated from `src/routes/` structure
- Each route file exports a Route configuration
- Nested layouts supported through file hierarchy
- Authentication guards applied at route level

### Database Schema (Supabase)

- `user_accounts` - Maps Clerk IDs to internal UUIDs
- `profiles` - User profiles and settings (JSONB)
- `provider_links` - OAuth tokens for integrations (JSONB)
- `source_data` - Raw measurement data (JSONB)

## Naming Conventions

### Project Name

- **TrendWeight** (capital T, capital W, no space)
- Use consistently in namespaces, project names, and code

### File Naming

- **Frontend**: PascalCase for components (`UserProfile.tsx`)
- **Backend**: PascalCase for C# files (`MeasurementService.cs`)
- **Routes**: kebab-case for route files (`user-settings.tsx`)

### Code Conventions

- **C#**: PascalCase for public members, camelCase for private
- **TypeScript**: camelCase for variables/functions, PascalCase for types/components
- **Database**: snake_case for table and column names

## Data Flow Patterns

### Authentication Flow

1. Frontend uses Clerk for authentication
2. JWT tokens validated by backend via JWKS
3. User mapping via `user_accounts` table
4. Route-level protection with `requireAuth` guard

### Measurement Sync Flow

1. `MeasurementSyncService` orchestrates sync process
2. Provider services fetch data from external APIs
3. `SourceDataService` handles database storage
4. Real-time progress updates via Supabase Realtime

### State Management

- **Server State**: TanStack Query with custom hooks
- **Local State**: React hooks and Context API
- **Persisted State**: Custom `usePersistedState` hook

## Important Directories

### Configuration

- `.env` files for environment variables
- `appsettings.json` for backend configuration
- `turbo.json` for build orchestration

### Development Tools

- `.vscode/` - VS Code settings
- `.husky/` - Git hooks for code quality
- `scripts/` - Build and deployment scripts

### Documentation

- `docs/ARCHITECTURE.md` - Detailed architecture guide
- `docs/TESTING.md` - Testing guidelines
- `README.md` - Getting started guide
