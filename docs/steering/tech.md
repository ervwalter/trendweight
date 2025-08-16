# Technology Stack

## Build System

- **Monorepo**: Turborepo with npm workspaces
- **Package Manager**: npm@11.5.2
- **Build Tool**: Turbo for orchestrating builds across workspaces

## Frontend Stack

- **Framework**: React 19 with TypeScript 5.9
- **Build Tool**: Vite 7.1
- **Routing**: TanStack Router with file-based routing
- **State Management**: TanStack Query for server state
- **Styling**: Tailwind CSS v4 with shadcn/ui components
- **Charts**: Highcharts with react wrapper
- **Authentication**: Clerk React SDK
- **Date/Time**: @js-joda/core for date operations
- **Forms**: react-hook-form
- **Testing**: Vitest with React Testing Library

## Backend Stack

- **Framework**: ASP.NET Core 9.0 Web API
- **Language**: C# with nullable reference types enabled
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT with Clerk integration
- **Architecture**: Feature-based organization with service layer pattern

## Database & Infrastructure

- **Database**: Supabase (PostgreSQL) with JSONB for flexible data
- **Authentication Provider**: Clerk with social logins (Google, Microsoft, Apple)
- **Deployment**: Docker containers
- **CI/CD**: GitHub Actions with multi-registry deployment

## Common Commands

### Development

```bash
# Start development servers (uses tmuxinator)
npm run dev

# Stop development servers
npm run dev:stop

# Build all workspaces
npm run build

# Run tests across all workspaces
npm run test

# Type checking and linting
npm run check

# Format code
npm run format

# Clean all build artifacts
npm run clean
```

### Docker

```bash
# Build Docker image
npm run docker:build

# Run container locally
npm run docker:run
```

### Frontend Specific (in apps/web/)

```bash
# Generate TanStack Router routes
npm run generate-routes

# Run tests with coverage
npm run test:coverage

# Preview production build
npm run preview
```

### Backend Specific (in apps/api/)

```bash
# Run the API in development
dotnet run

# Build the solution
dotnet build

# Run tests (when added)
dotnet test
```

## Key Dependencies

### Frontend

- `@clerk/clerk-react` - Authentication
- `@tanstack/react-router` - File-based routing
- `@tanstack/react-query` - Server state management
- `highcharts-react-official` - Data visualization
- `tailwindcss` - Styling framework
- `@radix-ui/*` - Accessible UI primitives

### Backend

- `Supabase` - Database client
- `Microsoft.AspNetCore.Authentication.JwtBearer` - JWT authentication
- `Yarp.ReverseProxy` - Reverse proxy for serving frontend

## Development Environment

- **Node.js**: v18+ required
- **.NET**: 9.0 SDK required
- **Ports**: Frontend (5173), Backend (5199)
- **Logs**: Available in `logs/` directory
