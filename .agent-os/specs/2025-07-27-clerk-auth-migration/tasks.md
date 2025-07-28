# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-07-27-clerk-auth-migration/spec.md

> Created: 2025-07-27
> Status: Ready for Implementation

## Tasks

- [x] 1. Frontend Anonymous UI Implementation
  - [x] 1.1 Install and configure Clerk React SDK
  - [x] 1.2 Update main.tsx to wrap app with ClerkProvider
  - [x] 1.3 Create new useAuth hook wrapping Clerk's hooks
  - [x] 1.4 Update Header component to use new auth state
  - [x] 1.5 Update Landing/Home page component for auth state
  - [x] 1.6 Update login route and create new Login component with Clerk SignIn
  - [x] 1.7 Remove auth callback routes (verify, apple callback)
  - [x] 1.8 Verify all anonymous UI flows work correctly

- [x] 2. Backend JWT Validation Support
  - [x] 2.1 Create user_accounts database table and update schema files
  - [x] 2.2 Create IUserAccountMappingService interface and implementation
  - [x] 2.3 Create IClerkTokenService interface and implementation
  - [x] 2.4 Create ClerkAuthenticationHandler
  - [x] 2.5 Update service registration to use Clerk authentication
  - [x] 2.6 Test JWT validation with Clerk tokens
  - [x] 2.7 Verify user mapping creation for new and existing users

- [x] 3. Frontend Authenticated Routes Update
  - [x] 3.1 Update API client to get tokens from Clerk
  - [x] 3.2 Update authGuard to use Clerk auth state
  - [x] 3.3 Test all protected routes with Clerk authentication
  - [x] 3.4 Verify data loading works with new auth flow

- [x] 4. Cleanup and Migration
  - [x] 4.1 Remove Supabase auth dependencies from frontend
  - [x] 4.2 Remove Apple.js script from index.html
  - [x] 4.3 Delete unused auth components and files
  - [x] 4.4 Update environment variables and configuration
  - [x] 4.5 Verify all tests pass with new auth system

- [x] 5. Documentation and Deployment Prep
  - [x] 5.1 Update README with Clerk setup instructions
  - [x] 5.2 Document required Clerk configuration settings
  - [x] 5.3 Create deployment checklist for production migration
  - [x] 5.4 Update ARCHITECTURE.md with new auth flow
  - [x] 5.5 Verify all integration tests pass
