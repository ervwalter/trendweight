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

- [ ] 2. Implement Legacy Data Import in LegacyMigrationService
  - [ ] 2.1 Write tests for ImportLegacyMeasurementsAsync method
  - [ ] 2.2 Add ImportLegacyMeasurementsAsync to LegacyMigrationService
  - [ ] 2.3 Update ProfileController.GetProfile to check for legacy data after loading profile
  - [ ] 2.4 Update MigrateLegacyProfileAsync to import measurements for new users
  - [ ] 2.5 Implement weight conversion using legacy profile's UseMetric setting
  - [ ] 2.6 Verify all tests pass

- [ ] 3. Add Legacy Provider Deletion Handling
  - [ ] 3.1 Write tests for special legacy provider deletion behavior
  - [ ] 3.2 Update ProvidersController.DisconnectProvider to handle legacy differently
  - [ ] 3.3 For legacy: delete source_data but update provider_links token to {"deleted": true}
  - [ ] 3.4 Update GetProviderLinks to filter out providers where token.deleted = true
  - [ ] 3.5 Verify all tests pass

- [ ] 4. Update Frontend Provider Display Components
  - [ ] 4.1 Write tests for legacy provider display name mapping
  - [ ] 4.2 Add "legacy" → "Legacy Data" mapping to provider display components
  - [ ] 4.3 Add description text for legacy provider in settings
  - [ ] 4.4 Hide legacy provider when token.deleted = true
  - [ ] 4.5 Verify all tests pass

- [ ] 5. Implement Legacy Provider Deletion UI
  - [ ] 5.1 Write tests for enhanced deletion warning dialog
  - [ ] 5.2 Create special deletion confirmation for legacy provider
  - [ ] 5.3 Require user to type "DELETE" to confirm
  - [ ] 5.4 Only show enhanced deletion in settings (not link flow)
  - [ ] 5.5 Verify all tests pass

- [ ] 6. Add Legacy Provider to Download/Export
  - [ ] 6.1 Write tests for legacy provider in download functionality
  - [ ] 6.2 Add "legacy" to download provider options
  - [ ] 6.3 Display as "Legacy Data" in download UI
  - [ ] 6.4 Hide from download if token.deleted = true
  - [ ] 6.5 Verify all tests pass

- [ ] 7. Integration Testing
  - [ ] 7.1 Test new user account creation with legacy email match
  - [ ] 7.2 Test existing migrated user getting legacy data on profile load
  - [ ] 7.3 Test legacy provider deletion and prevention of re-import
  - [ ] 7.4 Test download functionality with legacy data
  - [ ] 7.5 Verify all integration scenarios work correctly