# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-07-26-legacy-data-provider/spec.md

> Created: 2025-07-26
> Version: 3.0.0

## Technical Requirements

- Implement IProviderService interface for legacy provider
- Import data synchronously during profile operations
- Convert weights to kg based on UseMetric field (false = pounds, true = kg)
- Extract local date/time from legacy Timestamp field (not Date field)
- Create provider link for legacy data when imported
- Detect existing legacy users missing the provider link and import on first load
- Support soft deletion (disable/enable functionality)
- Include in download/export functionality when enabled

## Implementation Approach

The legacy provider will follow the standard provider architecture by implementing IProviderService:

1. **Provider Service**: Create `LegacyService : IProviderService` with custom behavior
2. **Synchronous Import**: Extend `MigrateLegacyProfileAsync` to import weight data after migrating provider links
3. **Detection Logic**: Check for missing legacy provider link when loading profiles with `IsMigrated = true`
4. **Data Storage**: Store all measurements in a single JSON document in `source_data` table

## Technical Implementation Details

### LegacyService Implementation

```csharp
public class LegacyService : IProviderService
{
    public string ProviderName => "legacy";
    
    // OAuth methods - not applicable for legacy
    public string GetAuthorizationUrl(string state, string callbackUrl) 
        => throw new NotSupportedException("Legacy provider does not support OAuth");
        
    public Task<bool> ExchangeAuthorizationCodeAsync(string code, string callbackUrl, Guid userId)
        => Task.FromResult(false);
    
    // GetMeasurementsAsync - returns data if enabled
    // SyncMeasurementsAsync - no-op, always returns success
    // HasActiveProviderLinkAsync - returns true only if link exists AND not disabled
    // RemoveProviderLinkAsync - sets disabled flag instead of deleting
}
```

### Provider Link Behavior in Settings
- **Display**: Shows as "Legacy Data" with connection date
- **Description**: "Historical weight data imported from classic TrendWeight"
- **Sync Button**: Hidden (handled by IProviderService implementation)
- **Enable/Disable Toggle**: 
  - When enabled: Shows data in charts and exports
  - When disabled: Hides data but preserves it
  - Clear status indication (e.g., "Enabled" / "Disabled")

### Soft Deletion Handling
- Keep both provider_links and source_data rows
- Update token to: `{"disabled": true}` when disabled
- Update token to: `{"disabled": false}` or remove the flag when enabled
- HasActiveProviderLinkAsync returns false when disabled
- GetMeasurementsAsync returns null when disabled

### Download/Export Support
- Include "legacy" as a provider option when:
  - Provider link exists AND
  - HasActiveProviderLinkAsync returns true (not disabled)
- Display as "Legacy Data" in the UI
- Export format matches other providers

### Provider Registration
- Register LegacyService in DI container with other providers
- ProviderIntegrationService will automatically discover it
- No special handling needed in controllers or services

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
- If missing (link doesn't exist), trigger migration
- If exists (regardless of disabled state), skip import
- This ensures data is only imported once per user
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
- Frontend: Update components that map provider names
- Backend: Return "legacy" as provider string, let frontend handle display
- Respect disabled state when displaying in lists

## External Dependencies

None - all required dependencies are already in the project:
- Microsoft.Data.SqlClient (for legacy DB connection)
- Existing Dapper setup
- Existing Supabase client