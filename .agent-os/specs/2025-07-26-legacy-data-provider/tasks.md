# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-07-26-legacy-data-provider/spec.md

> Created: 2025-07-26
> Status: Ready for Implementation

## Tasks

- [x] 1. Add Legacy Provider Support to Backend
  - [x] 1.1 Write tests for legacy provider validation in ProvidersController
  - [x] 1.2 Update ProvidersController disconnect validation to allow "legacy"
  - [x] 1.3 Update MeasurementSyncService to skip "legacy" provider during sync
  - [x] 1.4 Ensure ProviderIntegrationService handles missing provider service for "legacy"
  - [x] 1.5 Verify all tests pass

- [x] 2. Implement Legacy Data Import in LegacyMigrationService
  - [x] 2.1 Write tests for ImportLegacyMeasurementsAsync method
  - [x] 2.2 Add ImportLegacyMeasurementsAsync to LegacyMigrationService
  - [x] 2.3 Update ProfileController.GetProfile to check for legacy data after loading profile
  - [x] 2.4 Update MigrateLegacyProfileAsync to import measurements for new users
  - [x] 2.5 Implement weight conversion using legacy profile's UseMetric setting
  - [x] 2.6 Verify all tests pass

- [x] 3. Add Legacy Provider Deletion Handling
  - [x] 3.1 Write tests for special legacy provider deletion behavior
  - [x] 3.2 Update ProvidersController.DisconnectProvider to handle legacy differently
  - [x] 3.3 For legacy: delete source_data but update provider_links token to {"deleted": true}
  - [x] 3.4 Update GetProviderLinks to filter out providers where token.deleted = true
  - [x] 3.5 Verify all tests pass

- [x] 4. Fix Legacy Import Detection Logic
  - [x] 4.1 Fix LegacyMigrationService to only import if link doesn't exist at all
  - [x] 4.2 Remove incorrect check for deleted flag in import logic
  - [x] 4.3 Update tests to verify import only happens when link is missing
  - [x] 4.4 Verify import is skipped when link exists (regardless of disabled state)
  - [x] 4.5 Verify all tests pass

- [x] 5. Implement LegacyService Provider
  - [x] 5.1 Write tests for LegacyService implementing IProviderService
  - [x] 5.2 Create LegacyService with proper interface implementation
  - [x] 5.3 Implement GetMeasurementsAsync to return data only when enabled
  - [x] 5.4 Implement HasActiveProviderLinkAsync to check disabled state
  - [x] 5.5 Implement RemoveProviderLinkAsync to set disabled flag (not delete)
  - [x] 5.6 Implement SyncMeasurementsAsync as no-op returning success
  - [x] 5.7 Register LegacyService in DI container
  - [x] 5.8 Verify all tests pass

- [x] 6. Refactor Backend to Use LegacyService
  - [x] 6.1 Update ProvidersController to remove special legacy handling
  - [x] 6.2 Update MeasurementSyncService to remove special legacy handling
  - [x] 6.3 Update deletion logic to keep source_data (soft delete only)
  - [x] 6.4 Update GetProviderLinks to use HasActiveProviderLinkAsync
  - [x] 6.5 Verify provider integration works through standard flow
  - [x] 6.6 Verify all tests pass

- [x] 7. Update Frontend Provider Display Components
  - [x] 7.1 Write tests for legacy provider display name mapping
  - [x] 7.2 Add "legacy" → "Legacy Data" mapping to provider display components
  - [x] 7.3 Add description text for legacy provider in settings
  - [x] 7.4 Show enable/disable toggle instead of delete button
  - [x] 7.5 Verify all tests pass

- [x] 8. Implement Legacy Provider Enable/Disable UI
  - [x] 8.1 Write tests for enable endpoint in ProvidersController
  - [x] 8.2 Add POST /api/providers/{provider}/enable endpoint (legacy only)
  - [x] 8.3 Write tests for useEnableProvider mutation hook
  - [x] 8.4 Create useEnableProvider mutation in mutations.ts
  - [x] 8.5 Wire up Enable/Disable button in ProviderList component
  - [x] 8.6 Verify all tests pass

- [x] 9. Add Legacy Provider to Download/Export
  - [x] 9.1 Write tests for legacy provider in download functionality
  - [x] 9.2 Add "legacy" to download provider options
  - [x] 9.3 Display as "Legacy Data" in download UI
  - [x] 9.4 Only show when HasActiveProviderLinkAsync returns true
  - [x] 9.5 Verify all tests pass

- [ ] 10. Integration Testing
  - [ ] 10.1 Test new user account creation with legacy email match
  - [ ] 10.2 Test existing migrated user getting legacy data on profile load
  - [ ] 10.3 Test legacy provider disable/enable functionality
  - [ ] 10.4 Test data visibility changes when toggling state
  - [ ] 10.5 Test download functionality respects enabled state
  - [ ] 10.6 Verify all integration scenarios work correctly