# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-07-27-clerk-auth-migration/spec.md

> Created: 2025-07-27
> Status: Ready for Implementation

## Tasks

- [ ] 1. Frontend Anonymous UI Implementation
  - [ ] 1.1 Install and configure Clerk React SDK
  - [ ] 1.2 Update main.tsx to wrap app with ClerkProvider
  - [ ] 1.3 Create new useAuth hook wrapping Clerk's hooks
  - [ ] 1.4 Update Header component to use new auth state
  - [ ] 1.5 Update Landing/Home page component for auth state
  - [ ] 1.6 Update login route and create new Login component with Clerk SignIn
  - [ ] 1.7 Remove auth callback routes (verify, apple callback)
  - [ ] 1.8 Verify all anonymous UI flows work correctly

- [ ] 2. Backend JWT Validation Support
  - [ ] 2.1 Create user_accounts database table and update schema files
  - [ ] 2.2 Create IUserAccountMappingService interface and implementation
  - [ ] 2.3 Create IClerkTokenService interface and implementation
  - [ ] 2.4 Create ClerkAuthenticationHandler
  - [ ] 2.5 Update service registration to use Clerk authentication
  - [ ] 2.6 Test JWT validation with Clerk tokens
  - [ ] 2.7 Verify user mapping creation for new and existing users

- [ ] 3. Frontend Authenticated Routes Update
  - [ ] 3.1 Update API client to get tokens from Clerk
  - [ ] 3.2 Update authGuard to use Clerk auth state
  - [ ] 3.3 Test all protected routes with Clerk authentication
  - [ ] 3.4 Verify data loading works with new auth flow

- [ ] 4. Cleanup and Migration
  - [ ] 4.1 Remove Supabase auth dependencies from frontend
  - [ ] 4.2 Remove Apple.js script from index.html
  - [ ] 4.3 Delete unused auth components and files
  - [ ] 4.4 Create migration script for existing users
  - [ ] 4.5 Update environment variables and configuration
  - [ ] 4.6 Verify all tests pass with new auth system

- [ ] 5. Documentation and Deployment Prep
  - [ ] 5.1 Update README with Clerk setup instructions
  - [ ] 5.2 Document required Clerk configuration settings
  - [ ] 5.3 Create deployment checklist for production migration
  - [ ] 5.4 Update ARCHITECTURE.md with new auth flow
  - [ ] 5.5 Verify all integration tests pass