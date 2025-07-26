# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-07-26-legacy-data-provider/spec.md

> Created: 2025-07-26
> Version: 3.0.0

## No New Endpoints Required

The legacy data provider feature uses existing API endpoints. All functionality works through the standard IProviderService implementation.

## Existing Endpoints - No Special Handling Needed

### GET /api/profile

**Changes:** When loading a profile with `IsMigrated = true`:
- Checks for legacy data provider link
- If missing, triggers synchronous data import
- Returns profile with legacy data included

**Legacy Data Import Process:**
1. Detect missing legacy provider link
2. Query legacy database for user's measurements
3. Convert units if needed (lb to kg)
4. Create provider link and source_data entry
5. Return updated profile

### GET /api/providers/links

**No Changes Required:** Works automatically through standard provider handling
- LegacyService registered as a provider
- Shows "legacy" provider when present
- LegacyService.HasActiveProviderLinkAsync() handles disabled state

### DELETE /api/providers/{provider}

**No Special Handling Required:** Works through IProviderService
- Routes to LegacyService.RemoveProviderLinkAsync()
- Legacy service handles soft delete internally
- No controller modifications needed

### POST /api/providers/sync

**No Special Handling Required:** Works through ProviderIntegrationService
- LegacyService.SyncMeasurementsAsync() returns success (no-op)
- No errors or special cases

### GET /api/data

**No Special Handling Required:** Works through standard provider flow
- ProviderIntegrationService includes legacy when active
- LegacyService.GetMeasurementsAsync() returns data when enabled
- Respects disabled state automatically

## Service Implementation

### LegacyService (NEW)

**Implements:** IProviderService

**Key Methods:**
- `HasActiveProviderLinkAsync()` - Returns true only if link exists AND not disabled
- `GetMeasurementsAsync()` - Returns data only when enabled
- `RemoveProviderLinkAsync()` - Sets disabled flag instead of deleting
- `SyncMeasurementsAsync()` - No-op, returns success

### ProfileController

**Modified Methods:**
- `GetProfile()` - After successfully loading profile, checks if user has IsMigrated flag but no legacy provider link (link doesn't exist at all)

### LegacyMigrationService

**Modified Methods:**
- `MigrateLegacyProfileAsync()` - Extended to import weight measurements

**New Methods:**
- `ImportLegacyMeasurementsAsync(userId, legacyUserId)` - Handles the actual data import
- `ConvertLegacyWeight(weight, useMetric)` - Converts lb to kg if needed
- `HasLegacyDataProvider(userId)` - Checks if legacy provider link exists

## Data Flow

### Profile Load Flow
1. User requests profile via GET /api/profile
2. After loading existing profile, check if IsMigrated = true
3. If legacy provider link missing (doesn't exist), import data synchronously
4. If legacy provider link exists (enabled or disabled), skip import
5. Return complete profile with all data

### Provider Operations Flow
1. All provider operations go through standard IProviderService interface
2. ProviderIntegrationService handles discovery and routing
3. LegacyService handles legacy-specific behavior internally
4. No special cases in controllers or other services

### Enable/Disable Flow
1. User toggles legacy data in settings
2. Frontend calls DELETE /api/providers/legacy
3. LegacyService.RemoveProviderLinkAsync() sets disabled flag
4. Data hidden but preserved for re-enabling

No new error codes or response formats - uses existing patterns.