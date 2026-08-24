# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TrendWeight is a monorepo web application for tracking weight trends by integrating with smart scales from Withings and Fitbit. React frontend (`apps/web/`), C# ASP.NET Core backend (`apps/api/`), deployed as a single Docker container. Turborepo with npm workspaces; the standard commands (`npm run dev|build|test|check|format`, plus `-w` variants per workspace) live in the root and workspace `package.json` files.

- **Project name**: TrendWeight (capital T, capital W, no space)
- read the files in @docs/steering/ for guidance on the project

## Database (Supabase)

Tables: `user_accounts` (Clerk ID → internal UUID), `profiles` (settings, JSONB), `provider_links` (OAuth tokens, JSONB), `source_data` (raw measurements, JSONB).

### Migrations
- `supabase/` (config.toml + migrations) is the source of truth for schema and is committed to the repo
- Schema changes MUST go through migration files: `supabase migration new <name>`, then `supabase db push`
- NEVER apply SQL directly to the remote database (via Supabase MCP or otherwise) — the remote migration history table will drift from `supabase/migrations/` and break branching and `supabase db pull`
- If history drifts anyway: `supabase migration list --linked` to compare, `supabase migration repair` to fix bookkeeping (it never touches schema or data)

## Claude Code Notes

- `dotnet` commands (restore/build/test) hang or stall inside the Claude Code sandbox — always run them with `dangerouslyDisableSandbox: true`
- CI lints the backend with `dotnet build --warnaserror`, which fails on warnings (e.g. nullable ones like CS8604) that a plain local build won't surface — verify C# changes with `npm run -w apps/api lint` (or `dotnet build --warnaserror`) before committing

## Commit Messages

- Conventional commits drive release-please versioning and release notes
- `feat:` is reserved for significant new user-facing functionality — it bumps the minor version and headlines the release notes. UI tweaks, styling, copy edits, and corrections (e.g. making a header use the right font) are `fix:`, `style:`, or `chore:`, not `feat:`

## Development Notes

- `npm run dev` starts both dev servers via tmuxinator (`npm run dev:stop` to stop); frontend on port 5173, backend on 5199, production container on 8080
- Run `npm run -w apps/web generate-routes` before typechecking — TanStack Router routes are generated from the file structure
- Environment variables: see `.env.example`
- **No PRs**: changes are pushed directly to the main branch by the maintainer

## Deployment

- A single Docker container serves both the frontend static files and the API, with a YARP reverse proxy routing between them
