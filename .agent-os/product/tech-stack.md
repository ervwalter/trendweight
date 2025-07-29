# Technical Stack

> Last Updated: 2025-01-24
> Version: 1.0.0

## Core Technologies

### Application Framework
- **Framework:** Vite React Frontend + ASP.NET Core Backend
- **Version:** React 19.1, ASP.NET Core 9.0
- **Language:** TypeScript (frontend), C# (backend)

### Database
- **Primary:** Supabase (PostgreSQL)
- **Version:** Latest stable
- **ORM:** Dapper (lightweight micro-ORM)

### Authentication
- **Provider:** Clerk
- **Token Type:** JWT
- **Frontend:** @clerk/clerk-react
- **Backend:** Custom ClerkAuthenticationHandler with JWT validation

### Backend Technologies
- **API Documentation:** Swashbuckle (Swagger/OpenAPI)
- **SQL Client:** Microsoft.Data.SqlClient (for Dapper)

## Frontend Stack

### JavaScript Framework
- **Framework:** React
- **Version:** 19.1.0
- **Build Tool:** Vite

### Import Strategy
- **Strategy:** Node.js modules
- **Package Manager:** npm
- **Node Version:** 18 LTS or higher

### CSS Framework
- **Framework:** TailwindCSS
- **Version:** 4.1.11
- **PostCSS:** Yes

### UI Components
- **Library:** Radix UI Themes + Custom Components
- **Version:** 3.2.1
- **Installation:** Via npm

### UI State Management
- **Server State:** TanStack Query (React Query)
- **Routing:** TanStack Router
- **Forms:** React Hook Form
- **Client State:** React hooks (useState, useContext)

### Data Visualization
- **Progress Indicators:** @bprogress/react
- **Charts:** Highcharts with highcharts-react-official

### Additional UI Libraries
- **Select Components:** react-select
- **Utility Classes:** tailwind-merge
- **Icons:** React Icons + Radix Icons
- **Date/Time:** @js-joda/core

## Assets & Media

### Fonts
- **Provider:** Fontsource (self-hosted)
- **Loading Strategy:** Self-hosted for performance
- **Primary Font:** Inter (variable)

## Infrastructure

### Application Deployment
- **Packaging:** Docker containers
- **Container Host:** Docker Hub or private registry

### Application Hosting
- **Platform:** Digial Ocean App Platform
- **Service:** Container-based deployment
- **Region:** East US

### Database Hosting
- **Provider:** Supabase
- **Service:** Managed PostgreSQL
- **Backups:** Automated by Supabase

## Development Tools

### Monorepo Management
- **Tool:** Turborepo
- **Package Manager:** npm workspaces

### Testing
- **Frontend:** Vitest with Testing Library
- **Backend:** xUnit
- **API Mocking:** MSW (Mock Service Worker)

### Code Quality
- **Linting:** ESLint (v9 flat config)
- **Formatting:** Prettier with Tailwind plugin
- **Git Hooks:** Husky with lint-staged
- **TypeScript:** Strict mode enabled

## Deployment

### CI/CD Pipeline
- **Platform:** GitHub Actions
- **Trigger:** Push to main branch, pull requests
- **Tests:** Run before deployment

### Code Repository
- **URL:** https://github.com/ervwalter/trendweight