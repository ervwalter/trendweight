# Clerk Authentication Migration - Deployment Checklist

This checklist covers the steps required to migrate TrendWeight from Supabase Auth to Clerk Auth in production.

## Pre-Deployment Preparation

### 1. Clerk Configuration
- [ ] Create production Clerk application
- [ ] Configure OAuth providers (Google, Microsoft, Apple)
- [ ] Set up custom session token with email claim
- [ ] Configure production redirect URLs
- [ ] Note down production API keys

### 2. Environment Variables
- [ ] Update production environment with:
  - [ ] `VITE_CLERK_PUBLISHABLE_KEY` (frontend)
  - [ ] `Clerk__Authority` (backend)
  - [ ] `Clerk__SecretKey` (backend)
- [ ] Keep existing Supabase database credentials

### 3. Database Preparation
- [ ] Verify `user_accounts` table exists in production
- [ ] Create backup of production database
- [ ] Prepare migration script for existing users (if needed)

## Deployment Steps

### Phase 1: Deploy Backend Changes
1. [ ] Deploy updated API with Clerk authentication handler
2. [ ] Verify API health check passes
3. [ ] Test JWT validation with Clerk test token

### Phase 2: Deploy Frontend Changes
1. [ ] Deploy updated frontend with Clerk SDK
2. [ ] Verify static assets are served correctly
3. [ ] Test loading of Clerk components

### Phase 3: Enable Authentication
1. [ ] Enable Clerk authentication in production
2. [ ] Test login flow with each provider:
   - [ ] Email authentication
   - [ ] Google OAuth
   - [ ] Microsoft OAuth
   - [ ] Apple OAuth

## Post-Deployment Verification

### 1. Authentication Testing
- [ ] New user registration creates mapping in `user_accounts`
- [ ] Existing users can log in with same provider
- [ ] Session persistence works correctly
- [ ] Sign out clears session properly

### 2. Data Access Testing
- [ ] Users can view their weight data
- [ ] Settings load correctly
- [ ] Provider connections work
- [ ] Data sync functions properly

### 3. Anonymous Access Testing
- [ ] Home page loads without auth
- [ ] About, FAQ, Privacy pages accessible
- [ ] Demo mode works
- [ ] Public profiles viewable

## Rollback Plan

If issues occur during deployment:

1. [ ] Revert frontend deployment to previous version
2. [ ] Revert API deployment to previous version
3. [ ] Restore from database backup if needed
4. [ ] Communicate status to users

## Monitoring

### During Migration
- [ ] Monitor error logs for authentication failures
- [ ] Watch for increased 401/403 errors
- [ ] Check Clerk dashboard for auth issues
- [ ] Monitor database for user mapping creation

### Post-Migration (First 24 Hours)
- [ ] Track successful login rate
- [ ] Monitor new user registrations
- [ ] Check for support tickets
- [ ] Verify no data access issues

## Communication Plan

### Before Migration
- [ ] Announce maintenance window
- [ ] Explain authentication provider change
- [ ] Reassure users data is preserved

### After Migration
- [ ] Confirm successful migration
- [ ] Provide support contact for issues
- [ ] Update documentation/FAQ if needed

## Success Criteria

Migration is considered successful when:
- [ ] All existing users can authenticate
- [ ] New users can register and access the app
- [ ] No data loss or corruption
- [ ] Authentication performance is acceptable
- [ ] Error rate returns to baseline

## Notes

- Keep Supabase Auth configuration for potential rollback
- Monitor closely for first 48 hours
- Have support team ready for user issues
- Document any unexpected issues for future reference