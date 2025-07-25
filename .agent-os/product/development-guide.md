# Development Guide

> Version: 1.0.0
> Last Updated: 2025-01-25
> Purpose: Essential commands and operational procedures

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

### Frontend Commands (apps/web)
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

### Backend Commands (apps/api)
```bash
cd apps/api
npm run dev       # Start API with hot reload (runs dotnet watch)
npm run build     # Build entire solution (dotnet build)
npm run test      # Run all tests (dotnet test)
npm run lint      # Build with warnings as errors (dotnet build --warnaserror)
npm run format    # Format code (dotnet format)
npm run clean     # Clean build artifacts (bin/ and obj/ folders)
```

## Development Server Management

The project uses tmuxinator for managing development servers. When you run `npm run dev`, it:
1. Starts the backend API server on port 5199
2. Starts the frontend Vite server on port 5173
3. Creates log files in the `logs/` directory

To view logs:
- `tail -f logs/backend.log` for backend logs
- `tail -f logs/frontend.log` for frontend logs

## Database Schema Management

### Supabase Schema
The complete database schema is documented in the repository:
- **Schema SQL**: `apps/api/TrendWeight/supabase/schema.sql` - Complete SQL script to recreate all tables, indexes, and RLS policies
- **Schema Documentation**: `apps/api/TrendWeight/supabase/SCHEMA.md` - Detailed documentation of table structures and data formats

### Setting Up a New Supabase Instance
1. Create a new Supabase project
2. Run the `schema.sql` file in the SQL editor
3. Configure the API with the project credentials

**Note**: All tables use RLS policies that deny direct access. Data access is only allowed through the API using the service role key.

### Schema Change Process
If you make any schema changes in Supabase (new tables, columns, indexes, etc.), you MUST:
1. Use the MCP Supabase tools to query the updated schema
2. Update `apps/api/TrendWeight/supabase/schema.sql` with the changes
3. Update `apps/api/TrendWeight/supabase/SCHEMA.md` documentation accordingly
4. Never make schema changes without updating these files

## Environment Setup

### Required Tools
- Node.js 18 LTS or higher
- .NET 9.0 SDK
- npm (comes with Node.js)
- Git

### Initial Setup
1. Clone the repository
2. Run `npm install` from the root
3. Copy `.env.example` to `.env` and configure
4. Run `npm run dev` to start development

### Environment Variables
See `.env.example` for required environment variables. Never commit `.env` files.

## Troubleshooting

### Common Issues

#### Port Already in Use
If you get a "port already in use" error:
1. Check if development servers are already running
2. Use `npm run dev:stop` to stop tmuxinator session
3. Manually check for processes on ports 5173 and 5199

#### TypeScript Errors
- Always run `npm run check` from the root
- Don't run TypeScript commands in individual workspaces
- Turborepo handles the optimization

#### Test Failures
- Run `npm run test` from the root for all tests
- Check test output for specific failures
- Ensure database migrations are up to date