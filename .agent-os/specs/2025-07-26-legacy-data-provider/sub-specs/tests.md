# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-07-26-legacy-data-provider/spec.md

> Created: 2025-07-26
> Version: 3.0.0

## Test Coverage

### Unit Tests

**LegacyService (NEW)**
- Test implements IProviderService interface correctly
- Test GetAuthorizationUrl throws NotSupportedException
- Test ExchangeAuthorizationCodeAsync returns false
- Test GetMeasurementsAsync returns data when enabled
- Test GetMeasurementsAsync returns null when disabled
- Test SyncMeasurementsAsync always returns success (no-op)
- Test HasActiveProviderLinkAsync returns true when enabled
- Test HasActiveProviderLinkAsync returns false when disabled (token.disabled = true)
- Test RemoveProviderLinkAsync sets disabled flag (doesn't delete data)

**ProviderIntegrationService**
- Test LegacyService is discovered and registered automatically
- Test GetProviderService("legacy") returns LegacyService instance
- Test GetActiveProvidersAsync includes legacy when enabled
- Test GetActiveProvidersAsync excludes legacy when disabled
- Test SyncAllProvidersAsync handles legacy provider (no-op)

**ImportLegacyMeasurementsAsync**
- Test weight conversion from lb to kg (UseMetric = false in legacy profile)
- Test weight values unchanged when already in kg (UseMetric = true in legacy profile)
- Test that conversion uses legacy profile setting, not current profile setting
- Test timestamp extraction (date and time from Timestamp field)
- Test body fat conversion from ratio to percentage
- Test handling of null body fat values
- Test empty measurements handling

**Provider Display**
- Test "Legacy Data" appears in provider list when enabled
- Test provider hidden when disabled (HasActiveProviderLinkAsync returns false)
- Test provider shows as non-syncable
- Test provider disable sets token to {"disabled": true}
- Test provider enable removes disabled flag or sets {"disabled": false}
- Test source_data NEVER deleted (soft delete only)

### Integration Tests

**Legacy Database Queries**
- Test connection using existing legacy DB settings
- Test SourceMeasurements query for specific user
- Test handling of missing user in legacy DB
- Test query performance with large datasets (5000+ records)

**End-to-End Migration Flow**
- Test first-time load of migrated user without legacy data
- Test automatic import triggers and completes
- Test profile includes legacy measurements after import
- Test no duplicate imports on subsequent loads

### Mocking Requirements

- **Legacy SQL Server Database:** Use in-memory database or SQL Server LocalDB
- **Legacy User Data:** Create test data with various UseMetric preferences
- **SourceMeasurements Data:** Generate test measurements with:
  - Mixed UseMetric = true/false users
  - Various date ranges
  - Null and non-null body fat values
- **Deleted Providers:** Test data with token = {"deleted": true}

### Test Data Scenarios

1. **Pounds User:** UseMetric = false in legacy, verify conversion to kg
2. **Kilograms User:** UseMetric = true in legacy, verify no conversion
3. **Unit Mismatch:** Legacy UseMetric != current profile metric setting
4. **Deleted Provider:** token = {"deleted": true}, verify no re-import
5. **Mixed Body Fat:** Some null, some with values
6. **Date Ranges:**
   - Recent data (last year)
   - Historical data (5+ years)
   - Very old data (10+ years)

### Performance Tests

- Import of 2000 records completes within profile load timeout
- No noticeable delay for users without legacy data
- Single database query for all measurements (no N+1 issues)

### Error Handling Tests

- Legacy database connection failure (profile loads without legacy data)
- Invalid data in legacy DB (skip invalid records, import valid ones)
- Timeout during import (profile loads with partial data)

### Verification Tests

- Compare imported weights match expected kg values
- Verify dates/times extracted correctly from Timestamp field
- Confirm body fat percentages calculated correctly
- Ensure all valid measurements imported