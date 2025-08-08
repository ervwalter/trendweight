# Tasks: Legacy to Supabase Migration

## Prerequisites
- [ ] Verify legacy_profiles table exists in Supabase with expected schema
- [ ] Ensure all legacy data has been pre-migrated to legacy_profiles

## Implementation Tasks

- [x] 1. Create Supabase Data Models
- [x] 1.1 Create DbLegacyProfile model
  - File: `apps/api/TrendWeight/Infrastructure/DataAccess/Models/DbLegacyProfile.cs`
  - Inherit from BaseModel
  - Add Table attribute for "legacy_profiles"
  - Add properties matching Supabase schema exactly
  - Include List<RawMeasurement> for measurements field

- [x] 1.2 Update LegacyProfile model
  - File: `apps/api/TrendWeight/Features/Profile/Models/LegacyModels.cs`
  - Update properties to match new schema from DbLegacyProfile
  - Add Measurements property (List<RawMeasurement>)
  - Remove LegacyMeasurement class (no longer needed)
  - Update all consumers of LegacyProfile to handle new structure

- [x] 2. Update Service Interfaces
- [x] 2.1 Update ILegacyDbService interface
  - File: `apps/api/TrendWeight/Features/Profile/Services/ILegacyDbService.cs`
  - Delete GetMeasurementsByEmailAsync method entirely
  - Keep only FindProfileByEmailAsync returning updated LegacyProfile

- [x] 2.2 Update consumers of ILegacyDbService
  - Find and update all code using the interface
  - Remove calls to GetMeasurementsByEmailAsync
  - Update to use measurements from profile.Measurements
  - Adjust any error handling for the simpler flow

- [x] 3. Implement New Supabase Service
- [x] 3.1 Create new LegacyDbService implementation
  - File: `apps/api/TrendWeight/Features/Profile/Services/LegacyDbService.cs`
  - Inject ISupabaseService instead of IDbConnectionFactory
  - Implement FindProfileByEmailAsync using QueryAsync pattern
  - Map DbLegacyProfile to LegacyProfile
  - Remove GetMeasurementsByEmailAsync implementation

- [x] 3.2 Update LegacyMigrationService
  - File: `apps/api/TrendWeight/Features/Profile/Services/LegacyMigrationService.cs`
  - Remove separate measurements query code
  - Use measurements from profile.Measurements directly
  - Remove weight conversion (already in kg)
  - Simplify error handling for single data source
  - Update any logging to reflect new flow

- [x] 4. Account Deletion Enhancement
- [x] 4.1 Update ProfileService.DeleteAccountAsync
  - File: `apps/api/TrendWeight/Features/Profile/Services/ProfileService.cs`
  - Add Supabase delete for legacy_profiles table
  - Use existing pattern from other delete operations
  - Log deletion result

- [x] 5. Configuration Cleanup
- [x] 5.1 Remove MSSQL configuration
  - File: `apps/api/TrendWeight/appsettings.json` and related
  - Remove TrendWeightLegacy connection string
  - Update any environment-specific settings files
  - Document removal in deployment notes

- [x] 5.2 Update dependency injection
  - File: `apps/api/TrendWeight/Program.cs` or startup configuration
  - Remove IDbConnectionFactory registration for MSSQL
  - Ensure new LegacyDbService is properly registered
  - Verify ISupabaseService is available for injection

- [x] 5.3 Remove MSSQL dependencies
  - File: `apps/api/TrendWeight/TrendWeight.csproj`
  - Remove Dapper package if not used elsewhere
  - Remove System.Data.SqlClient or Microsoft.Data.SqlClient
  - Run dotnet restore to verify

- [x] 6. Testing & Validation
- [x] 6.1 Test legacy migration flow
  - Test with user that has legacy data
  - Verify measurements are correctly imported
  - Confirm no weight conversion occurs
  - Check provider link creation

- [x] 6.2 Test account deletion
  - Create test account with legacy data
  - Delete account
  - Verify legacy_profiles record is removed
  - Check all related data is cleaned up

- [x] 6.3 Test error scenarios
  - Test migration with non-existent legacy profile
  - Test with malformed measurements data
  - Verify appropriate error messages

## Notes
- Update all downstream consumers when changing data structures
- Delete unused methods and classes completely
- Measurements are already in correct format (kg, JSON)
- Focus on infrastructure simplification