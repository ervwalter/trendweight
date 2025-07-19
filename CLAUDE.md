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

**IMPORTANT**: Always use the standard UI components from our component library. See ARCHITECTURE.md for detailed UI component documentation including Button, Heading, Select, and other standard components.

## AI Code Generation Guidelines

### Code Organization
1. **Feature-based structure**: Group related functionality together
2. **Clear separation**: Keep UI components, business logic, and data access separate
3. **Consistent naming**: Use PascalCase for components, camelCase for functions

### When Generating TypeScript/React Code
- Enable strict mode
- Define interfaces for all data structures
- Avoid `any` type - use `unknown` when type is truly unknown
- Leverage type inference where possible
- Use functional components with hooks
- Create custom hooks for reusable logic
- Implement proper error boundaries
- Use Suspense for async operations

### When Generating C# Code
- Use feature folders for organization
- Apply dependency injection for all services
- Use async/await for all I/O operations
- Leverage JSONB for flexible data storage
- Follow the existing service layer pattern

## AI-Specific Instructions for Common Tasks

### Adding a New Route
1. Create route file in `apps/web/src/routes/`
2. TanStack Router will auto-generate route tree
3. Add navigation link if needed
4. Always use standard UI components (Button, Heading, etc.)

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
2. **Always handle errors gracefully** - Show user-friendly messages
3. **Test on mobile** - The app must be fully responsive
4. **Keep accessibility in mind** - Use semantic HTML and ARIA labels
5. **Use standard UI components** - Never use raw HTML elements when standard components exist
6. **Follow existing patterns** - Match the codebase style and conventions
7. **Service Layer Pattern** - Controllers should be thin, delegating business logic to services
8. **Database considerations** - All timestamps stored as ISO 8601 strings, all weights in kg

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

### IMPORTANT: Keep CLAUDE.md Updated
**You MUST automatically update this CLAUDE.md file whenever you learn something new that is likely important for future sessions.** This includes:
- Project-specific patterns, conventions, or architecture decisions
- User's personal coding preferences or approaches
- Important technical discoveries (e.g., library quirks, API behaviors)
- Lessons learned from debugging or problem-solving
- Clarifications about business logic or domain concepts
- Any other information that would help future Claude instances work more effectively on this codebase

Add these updates in the appropriate section or create a new section if needed. This ensures knowledge is preserved across sessions.

## Development Workflow

### Always Run Comprehensive Checks
- When checking for code issues, always run 'npm run format && npm run check' from the top level folder of the repo
- Do not attempt to be tactical and run subtasks in lower level folders