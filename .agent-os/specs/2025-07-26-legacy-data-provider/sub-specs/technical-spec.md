# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-07-26-legacy-data-provider/spec.md

> Created: 2025-07-26
> Version: 2.0.0

## Technical Requirements

- Add "legacy" as a new provider type (alongside "withings" and "fitbit")
- Import data synchronously during profile operations
- Convert weights to kg based on UseMetric field (false = pounds, true = kg)
- Extract local date/time from legacy Timestamp field (not Date field)
- Create provider link for legacy data when imported
- Detect existing legacy users missing the provider link and import on first load
- Support deletion with permanent deletion warning
- Include in download/export functionality

## Implementation Approach

The legacy data import will be integrated directly into the existing profile migration process:

1. **Provider Type**: Add `ProviderType.LegacyData` to the enum
2. **Synchronous Import**: Extend `MigrateLegacyProfileAsync` to import weight data after migrating provider links
3. **Detection Logic**: Check for missing legacy provider link when loading profiles with `IsMigrated = true`
4. **Data Storage**: Store all measurements in a single JSON document in `source_data` table

## Technical Implementation Details

### Provider Link Behavior in Settings
- **Display**: Shows as "Legacy Data" with connection date
- **Description**: "Historical weight data imported from classic TrendWeight"
- **Sync Button**: Disabled/hidden (non-syncable)
- **Delete Button**: Enabled with special behavior:
  - Shows warning: "This will permanently delete your historical data from classic TrendWeight. This cannot be undone."
  - Requires user to type "DELETE" to confirm
  - Only available in /settings, not in /link flow

### Deletion Handling
- Delete source_data row (removes the measurements)
- Keep provider_links row but update token to: `{"deleted": true}`
- This prevents re-import on next profile load
- UI checks token.deleted to hide provider from settings/download

### Download/Export Support
- Include "legacy" as a provider option ONLY if:
  - Provider link exists AND
  - token.deleted is not true
- Display as "Legacy Data" in the UI
- Export format matches other providers

### Provider Type Addition
- Add "legacy" as a provider string (no enum - uses strings like "withings" and "fitbit")
- Display name: "Legacy Data" in UI (handle in display name mapping)
- Non-syncable provider (no refresh functionality)
- Deletable with special warning about permanent deletion

### Migration Process Integration
1. In `MigrateLegacyProfileAsync`, after migrating real provider links:
   - Create a provider link for legacy data
   - Query legacy SourceMeasurements table
   - Convert measurements to kg if stored in lb
   - Extract local date/time from Timestamp field
   - Create source_data entry with all measurements

### Legacy User Detection
- When loading a profile with `IsMigrated = true`
- Check if provider link exists for provider = "legacy"
- If missing OR if token.deleted != true, trigger migration
- If token.deleted = true, skip import (user previously deleted)
- This handles users who migrated before this feature

### Data Conversion Details
- **Weight Units**: ALWAYS use UseMetric from legacy TrendWeightProfiles table
  - If `UseMetric = false` (pounds), multiply by 0.453592 to convert to kg
  - If `UseMetric = true` (kg), use as-is
  - Important: Use legacy profile setting, NOT current profile setting (user may have changed units)
- **Timestamp Handling**: Use Timestamp field (already in local time)
  - Extract date and time components directly
  - Do NOT use Date field (has offset adjustments)
- **Body Fat**: Convert FatRatio to percentage (multiply by 100)
- **Data Structure**: Match existing source_data JSON format

### Performance Considerations
- Load all measurements in a single query
- No batching needed (single JSON document)
- Typical user has 1000-2000 measurements (manageable in memory)
- Use existing database connection and settings

## Configuration

Reuse existing legacy database configuration:
- Connection string already in AppOptions.LegacyDbConnectionString
- User matching logic already implemented in LegacyDbService
- No new configuration needed

## Display Name Handling

Add "legacy" to existing provider display name mappings:
- Frontend: Update components that map provider names (e.g., ProviderSyncError, NoDataCard)
- Backend: Return "legacy" as provider string, let frontend handle display
- Filter out legacy provider if token.deleted = true in provider lists

## External Dependencies

None - all required dependencies are already in the project:
- Microsoft.Data.SqlClient (for legacy DB connection)
- Existing Dapper setup
- Existing Supabase client