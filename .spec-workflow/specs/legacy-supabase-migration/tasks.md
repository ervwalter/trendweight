# Tasks: Legacy to Supabase Migration

## Prerequisites
- [ ] Verify legacy_profiles table exists in Supabase with expected schema
- [ ] Ensure all legacy data has been pre-migrated to legacy_profiles

## Phase 1: Create Supabase Data Models

### Task 1.1: Create DbLegacyProfile model
**File:** `apps/api/TrendWeight/Infrastructure/DataAccess/Models/DbLegacyProfile.cs`
**Action:** Create new file
**Details:**
- Inherit from BaseModel
- Add Table attribute for "legacy_profiles"
- Add properties matching Supabase schema exactly
- Include List<RawMeasurement> for measurements field

### Task 1.2: Update LegacyProfile model
**File:** `apps/api/TrendWeight/Features/Profile/Models/LegacyModels.cs`
**Action:** Update existing class
**Details:**
- Update properties to match new schema from DbLegacyProfile
- Add Measurements property (List<RawMeasurement>)
- Remove LegacyMeasurement class (no longer needed)
- Update all consumers of LegacyProfile to handle new structure

## Phase 2: Update Service Interfaces

### Task 2.1: Update ILegacyDbService interface
**File:** `apps/api/TrendWeight/Features/Profile/Services/ILegacyDbService.cs`
**Action:** Modify interface
**Details:**
- Delete GetLegacyMeasurementsAsync method entirely
- Keep only GetLegacyProfileAsync returning updated LegacyProfile

### Task 2.2: Update consumers of ILegacyDbService
**Action:** Find and update all code using the interface
**Details:**
- Remove calls to GetLegacyMeasurementsAsync
- Update to use measurements from profile.Measurements
- Adjust any error handling for the simpler flow

## Phase 3: Implement New Supabase Service

### Task 3.1: Create new LegacyDbService implementation
**File:** `apps/api/TrendWeight/Features/Profile/Services/LegacyDbService.cs`
**Action:** Replace entire implementation
**Details:**
- Inject ISupabaseService instead of IDbConnectionFactory
- Implement GetLegacyProfileAsync using QueryAsync pattern
- Map DbLegacyProfile to LegacyProfile
- Remove GetLegacyMeasurementsAsync implementation

### Task 3.2: Update LegacyMigrationService
**File:** `apps/api/TrendWeight/Features/Profile/Services/LegacyMigrationService.cs`
**Action:** Modify migration logic
**Details:**
- Remove separate measurements query code
- Use measurements from profile.Measurements directly
- Remove weight conversion (already in kg)
- Simplify error handling for single data source
- Update any logging to reflect new flow

## Phase 4: Account Deletion Enhancement

### Task 4.1: Update ProfileService.DeleteAccountAsync
**File:** `apps/api/TrendWeight/Features/Profile/Services/ProfileService.cs`
**Action:** Add legacy_profiles deletion
**Details:**
- Add Supabase delete for legacy_profiles table
- Use existing pattern from other delete operations
- Log deletion result

## Phase 5: Configuration Cleanup

### Task 5.1: Remove MSSQL configuration
**File:** `apps/api/TrendWeight/appsettings.json` and related
**Action:** Remove configuration
**Details:**
- Remove TrendWeightLegacy connection string
- Update any environment-specific settings files
- Document removal in deployment notes

### Task 5.2: Update dependency injection
**File:** `apps/api/TrendWeight/Program.cs` or startup configuration
**Action:** Remove MSSQL registration
**Details:**
- Remove IDbConnectionFactory registration for MSSQL
- Ensure new LegacyDbService is properly registered
- Verify ISupabaseService is available for injection

### Task 5.3: Remove MSSQL dependencies
**File:** `apps/api/TrendWeight/TrendWeight.csproj`
**Action:** Remove packages
**Details:**
- Remove Dapper package if not used elsewhere
- Remove System.Data.SqlClient or Microsoft.Data.SqlClient
- Run dotnet restore to verify

## Phase 6: Testing & Validation

### Task 6.1: Test legacy migration flow
**Action:** Manual testing
**Details:**
- Test with user that has legacy data
- Verify measurements are correctly imported
- Confirm no weight conversion occurs
- Check provider link creation

### Task 6.2: Test account deletion
**Action:** Manual testing
**Details:**
- Create test account with legacy data
- Delete account
- Verify legacy_profiles record is removed
- Check all related data is cleaned up

### Task 6.3: Test error scenarios
**Action:** Manual testing
**Details:**
- Test migration with non-existent legacy profile
- Test with malformed measurements data
- Verify appropriate error messages

## Phase 7: Deployment

### Task 7.1: Update deployment documentation
**Action:** Documentation
**Details:**
- Remove MSSQL connection requirements
- Update environment variable documentation
- Note that legacy migrations now use Supabase

### Task 7.2: Deploy to staging
**Action:** Deployment
**Details:**
- Deploy changes to staging environment
- Test with production-like data
- Verify no MSSQL connectivity issues

### Task 7.3: Production deployment
**Action:** Deployment
**Details:**
- Deploy during low-traffic period
- Monitor for any migration errors
- Verify MSSQL can be fully decommissioned

## Notes
- Update all downstream consumers when changing data structures
- Delete unused methods and classes completely
- Measurements are already in correct format (kg, JSON)
- Focus on infrastructure simplification