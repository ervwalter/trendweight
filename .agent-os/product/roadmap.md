# Product Roadmap

> Last Updated: 2025-01-25
> Version: 1.1.0
> Status: Active Development

## Phase 0: Already Completed

The following features have been implemented:

- [x] Core weight trend calculation with exponentially weighted moving averages
- [x] Withings smart scale integration with OAuth
- [x] Fitbit smart scale integration with OAuth
- [x] User authentication with Supabase Auth (email, Google, Microsoft, Apple)
- [x] Responsive dashboard with weight trend charts
- [x] Public profile sharing with custom URLs
- [x] Goal setting and progress tracking
- [x] Metric and imperial unit support
- [x] Data export functionality
- [x] FAQ and help documentation
- [x] Privacy policy compliance
- [x] Demo mode with sample data
- [x] Basic legacy user migration support
- [x] PWA manifest for mobile installation
- [x] Comprehensive test coverage

## Phase 1: Onboarding & Data Management (2 weeks)

**Goal:** Improve first-time user experience and data visibility control
**Success Criteria:** 80% of new users successfully configure their start date during onboarding

### Must-Have Features

- [ ] Improved onboarding UI - Ask about Start Date right up front `S`
- [ ] Hide data before start date - New setting to filter old measurements `S`
- [ ] Better loading indicators - Replace skeleton with progress for long syncs `M`

### Should-Have Features

- [ ] Sync status details - Show which provider is syncing and progress `S`

### Dependencies

- None - can begin immediately

## Phase 2: Enhanced Legacy Support (1 month)

**Goal:** Complete migration support for users from classic TrendWeight
**Success Criteria:** 90% of legacy users successfully migrated with historical data

### Must-Have Features

- [ ] Legacy data provider - Import historical measurements from old SQL Server `M`

### Dependencies

- Access to legacy SQL Server database

## Phase 3: Admin Tools & Observability (1 month)

**Goal:** Improve operational visibility and debugging capabilities
**Success Criteria:** 90% reduction in time to diagnose user issues

### Must-Have Features

- [ ] User roles system - Flag admin users for special functionality `M`
- [ ] Admin stats dashboard - Active users, connections by provider, etc. `M`
- [ ] Backend error logging - OpenTelemetry-based logging system `L`
- [ ] Client error logging - Privacy-respecting browser error tracking `M`

### Should-Have Features

- [ ] Admin user search - Find users by email/username `S`
- [ ] Admin sync debugging - View detailed sync logs for users `M`

### Dependencies

- OpenTelemetry service selection (e.g., Honeycomb, DataDog)
- Privacy policy update for error logging

## Phase 4: IFTTT Integration (2 months)

**Goal:** Enable third-party integrations through IFTTT
**Success Criteria:** Successful weight data import from 5+ different IFTTT sources

### Must-Have Features

- [ ] OAuth 2.0 server implementation - TrendWeight as OAuth provider for IFTTT `L`
- [ ] IFTTT provider implementation - New provider type for weight readings `L`
- [ ] API endpoints for IFTTT - Weight data submission endpoints `M`
- [ ] IFTTT channel configuration - Setup and documentation `M`

### Should-Have Features

- [ ] Rate limiting for IFTTT API - Prevent abuse `S`
- [ ] Webhook notifications - Alert users of new IFTTT data `S`

### Dependencies

- IFTTT partnership approval
- OAuth server security review
