# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TrendWeight is a monorepo web application for tracking weight trends by integrating with smart scales from Withings and Fitbit. It consists of a React frontend and C# ASP.NET Core backend, deployed as Docker containers.

## Code Search

**Use ChunkHound MCP server for semantic code search:**
- `mcp__ChunkHound__search_semantic` - Natural language queries for finding relevant code
- `mcp__ChunkHound__search_regex` - Pattern-based searches with optional path filtering
- ChunkHound has indexed 412 files with 2,300 code chunks

## Architecture

### Monorepo Structure
- `apps/web/` - React 19 + TypeScript + Vite frontend with TanStack Router
- `apps/api/` - C# ASP.NET Core 9.0 Web API backend
- Uses Turborepo with npm workspaces for build orchestration

### Key Technologies
- **Frontend**: React 19, TypeScript, Vite, TailwindCSS v4, TanStack Router/Query, Clerk auth
- **Backend**: ASP.NET Core 9.0, C#, Supabase (PostgreSQL), JWT authentication
- **Deployment**: Docker containers, tmuxinator for development

### Database Schema (Supabase)
- `user_accounts` - Maps Clerk IDs to internal UUIDs
- `profiles` - User profiles and settings (JSONB)
- `provider_links` - OAuth tokens for integrations (JSONB)
- `source_data` - Raw measurement data (JSONB)

## Development Commands

### Essential Commands (run from repository root)
```bash
# Start both frontend and backend dev servers via tmuxinator
npm run dev

# Stop development servers
npm run dev:stop

# Build all workspaces
npm run build

# Run all tests
npm run test

# Type checking and linting across all workspaces
npm run check

# Format code
npm run format

# Install dependencies for all workspaces
npm install

# Clean all build artifacts and dependencies
npm run clean
```

### Frontend Specific (apps/web/)
```bash
# Development server (port 5173)
npm run -w apps/web dev

# Run tests with coverage
npm run -w apps/web test:coverage

# Generate TanStack Router routes (run before typecheck)
npm run -w apps/web generate-routes

# Type checking with route generation
npm run -w apps/web typecheck

# Lint with ESLint
npm run -w apps/web lint
```

### Backend Specific (apps/api/)
```bash
# Development server with hot reload (port 5199)
npm run -w apps/api dev

# Build the solution
npm run -w apps/api build

# Run tests
npm run -w apps/api test

# Format C# code
npm run -w apps/api format

# Lint (build with warnings as errors)
npm run -w apps/api lint
```

### Docker
```bash
# Build production Docker image
npm run docker:build

# Run container locally (port 8080)
npm run docker:run
```

## Code Organization

### Backend (Feature-Based)
```
apps/api/TrendWeight/
├── Features/           # Feature-based organization
│   ├── Auth/          # Authentication infrastructure
│   ├── Profile/       # User profile management
│   ├── Measurements/  # Weight data management
│   └── Providers/     # Withings/Fitbit integrations
└── Infrastructure/    # Cross-cutting concerns
    ├── Auth/         # JWT authentication handlers
    └── DataAccess/   # Supabase data access layer
```

### Frontend (File-Based Routing)
```
apps/web/src/
├── components/        # Shared UI components (PascalCase)
│   └── ui/           # shadcn/ui components
├── lib/              # Core utilities and API client
│   ├── auth/         # Authentication utilities
│   └── api/          # API client and hooks
├── routes/           # TanStack Router pages (auto-generated routing)
│   ├── __root.tsx    # Root layout
│   ├── dashboard.tsx # Main dashboard
│   └── oauth/        # OAuth callback handlers
└── types/            # TypeScript type definitions
```

## Naming Conventions

- **Project Name**: TrendWeight (capital T, capital W, no space)
- **Frontend**: PascalCase for components, camelCase for variables/functions
- **Backend**: PascalCase for public members, camelCase for private/parameters
- **Database**: snake_case for table and column names
- **Routes**: kebab-case for route files

## Testing

### Frontend (Vitest + React Testing Library)
- Test files: `*.test.ts(x)` colocated with components
- Setup: `src/test/setup.ts`
- Coverage: `npm run -w apps/web test:coverage`

### Backend (xUnit + FluentAssertions + Moq)
- Integration tests use `WebApplicationFactory<Program>`
- Run: `npm run -w apps/api test`

## Authentication & Security

- **Frontend**: Clerk React SDK with social logins (Google, Microsoft, Apple)
- **Backend**: JWT validation via Clerk JWKS endpoints
- **Database**: User mapping via `user_accounts` table
- **Route Protection**: `requireAuth` guards at route level

## Environment Setup

Required environment variables (see `.env.example`):
```
# Frontend (Vite)
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend (ASP.NET Core)
Clerk__Authority=https://your-instance.clerk.accounts.dev
Clerk__SecretKey=your_clerk_secret_key
Supabase__Url=https://your-project-ref.supabase.co
Supabase__AnonKey=your_supabase_anon_key
Supabase__ServiceKey=your_supabase_service_role_key
```

## Important Notes

- **Import Aliases**: Frontend uses `@/` alias for `src/` imports
- **Route Generation**: TanStack Router routes auto-generated from file structure
- **Hot Reload**: Backend uses `dotnet watch`, frontend uses Vite HMR
- **Code Quality**: Husky pre-commit hooks run formatting and linting
- **No PRs**: Changes are pushed directly to main branch by maintainer

## Deployment

- Production deploys as Docker container on port 8080
- Container serves both frontend static files and API endpoints
- Uses YARP reverse proxy to route requests between API and static content
- read the files in @docs/steering/ for guidance on the project