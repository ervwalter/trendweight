# Spec Requirements Document

> Spec: Legacy Data Provider
> Created: 2025-07-26
> Status: Planning

## Overview

Implement a legacy data provider that automatically and invisibly imports historical weight measurements from the classic TrendWeight SQL Server database during the profile migration process. The legacy provider will implement the standard IProviderService interface to maintain architectural consistency.

## User Stories

### New User Legacy Migration

As a new user who had an account on classic TrendWeight, I want my profile and historical data automatically migrated when I create an account with the same email address.

When creating a new account, if the email matches a legacy account, the system:
1. Migrates the user's profile settings (via existing MigrateLegacyProfileAsync)
2. Creates a "Legacy Data" provider link
3. Imports all historical weight measurements
The user sees their complete weight history from day one.

### Existing User Legacy Data Import

As an existing user who was previously migrated (before this feature), I want my historical data imported automatically when I next load my profile.

When loading a profile with IsMigrated = true but no legacy provider link:
1. System detects the missing legacy data
2. Creates a "Legacy Data" provider link
3. Imports all historical measurements
4. Returns the complete profile with legacy data included

### Legacy Data Management

As a user with legacy data, I want to be able to disable/enable my historical data visibility without permanently losing it.

When managing legacy data in settings:
1. Can disable legacy data (hides from charts/exports)
2. Can re-enable previously disabled data
3. Clear indication of current status (enabled/disabled)

## Spec Scope

1. **Legacy Provider Service** - Implement IProviderService for legacy provider with custom behavior
2. **Synchronous Data Import** - Import measurements during profile operations
3. **Unit Conversion** - Convert weights to kg based on legacy profile's UseMetric field
4. **Timestamp Handling** - Extract local date/time from legacy Timestamp field
5. **Provider Link Management** - Non-syncable provider with disable/enable functionality
6. **Soft Deletion** - Mark as disabled but preserve data for potential re-enabling
7. **Download Support** - Include legacy data in export (only if enabled)
8. **Settings Display** - Show enable/disable toggle with description

## Out of Scope

- User notifications or UI for import progress
- OAuth flow for legacy provider (not applicable)
- New API endpoints (uses existing provider endpoints)
- New database tables (uses existing provider_links and source_data)
- Actual sync functionality (returns success no-op)

## Expected Deliverable

1. New legacy users get profile and data migrated automatically on account creation
2. Existing migrated users get data imported on next profile load (unless previously disabled)
3. "Legacy Data" provider appears in settings with enable/disable toggle
4. Legacy data available in download/export functionality (only if enabled)
5. Disabled legacy data can be re-enabled at any time

## Spec Documentation

- Tasks: @.agent-os/specs/2025-07-26-legacy-data-provider/tasks.md
- Technical Specification: @.agent-os/specs/2025-07-26-legacy-data-provider/sub-specs/technical-spec.md
- API Specification: @.agent-os/specs/2025-07-26-legacy-data-provider/sub-specs/api-spec.md
- Database Schema: @.agent-os/specs/2025-07-26-legacy-data-provider/sub-specs/database-schema.md
- Tests Specification: @.agent-os/specs/2025-07-26-legacy-data-provider/sub-specs/tests.md