# Spec Requirements Document

> Spec: Clerk Auth Migration
> Created: 2025-07-27
> Status: Planning

## Overview

Replace Supabase Auth with Clerk Auth while maintaining Supabase for database operations, implementing a user ID mapping system to preserve existing data integrity.

## User Stories

### Existing User Authentication

As an existing TrendWeight user, I want to continue signing in with my current authentication method (email/Google/Microsoft/Apple), so that I can access my historical weight data without disruption.

The user will sign in through Clerk's UI components, which will map their Clerk user ID to their existing internal GUID, ensuring seamless access to all their data.

### New User Registration

As a new user, I want to sign in using any supported authentication method, so that I can start tracking my weight trends immediately.

New users will authenticate through Clerk, receive a new internal GUID, and have their account properly mapped in the database for future access.

## Spec Scope

1. **Clerk Authentication Integration** - Replace Supabase Auth with Clerk's React components and backend validation
2. **User ID Mapping System** - Create database table to map Clerk user IDs to internal GUIDs
3. **Frontend Auth Migration** - Replace all Supabase auth components with Clerk equivalents
4. **Backend JWT Validation** - Implement Clerk JWT validation in ASP.NET Core
5. **Database Schema Updates** - Add user mapping table while preserving existing data structure

## Out of Scope

- User sign-up functionality (TrendWeight doesn't support new registrations)
- User profile management UI (keeping existing custom UI)
- Migration of authentication history or sessions
- Changes to existing business logic or features

## Expected Deliverable

1. Users can sign in using Clerk's SignIn component with all existing auth methods
2. Backend validates Clerk JWTs and correctly identifies users via mapping table
3. All existing user data remains accessible through GUID-based queries

## Spec Documentation

- Tasks: @.agent-os/specs/2025-07-27-clerk-auth-migration/tasks.md
- Technical Specification: @.agent-os/specs/2025-07-27-clerk-auth-migration/sub-specs/technical-spec.md
- API Specification: @.agent-os/specs/2025-07-27-clerk-auth-migration/sub-specs/api-spec.md
- Database Schema: @.agent-os/specs/2025-07-27-clerk-auth-migration/sub-specs/database-schema.md
- Tests Specification: @.agent-os/specs/2025-07-27-clerk-auth-migration/sub-specs/tests.md