# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-07-26-legacy-data-provider/spec.md

> Created: 2025-07-26
> Version: 2.0.0

## No New Endpoints Required

The legacy data provider feature uses existing API endpoints. All functionality is integrated into the existing profile and data retrieval flows.

## Existing Endpoints Affected

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

**Changes:** Returns "legacy" provider in the list when present
- Provider string: "legacy"
- Shows connection date (when data was imported)
- Filters out providers where token.deleted = true

### DELETE /api/providers/{provider}

**Changes:** Special handling when provider = "legacy"
- Currently validates provider must be "withings" or "fitbit" - needs update
- For legacy: skip ProviderIntegrationService (no IProviderService impl)
- Deletes source_data row
- Updates provider_links token to `{"deleted": true}`
- Frontend shows enhanced warning requiring "DELETE" confirmation

## Service Implementation

### ProvidersController

**Modified Methods:**
- `DisconnectProvider()` - Add special handling for "legacy" provider
- `GetProviderLinks()` - Filter out providers where token.deleted = true

### ProfileController

**Modified Methods:**
- `GetProfile()` - After successfully loading profile, checks if user has IsMigrated flag but no legacy provider link

### MeasurementSyncService

**Modified Methods:**
- `GetMeasurementsForUserAsync()` - Skip sync attempts for "legacy" provider

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
3. If legacy provider link missing or deleted, import data synchronously
4. Return complete profile with all data

### Provider List Flow
1. User requests providers via GET /api/providers/links
2. Filter out any providers where token.deleted = true
3. Return filtered list

### Deletion Flow
1. User requests DELETE /api/providers/legacy
2. Frontend shows special warning for legacy provider
3. Backend deletes source_data but keeps provider_links with token.deleted = true

No new error codes or response formats - uses existing patterns.