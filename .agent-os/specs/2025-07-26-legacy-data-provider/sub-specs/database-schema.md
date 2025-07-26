# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-07-26-legacy-data-provider/spec.md

> Created: 2025-07-26
> Version: 3.0.0

## No Schema Changes Required

The legacy data provider feature uses existing database tables without modifications.

## Existing Tables Used

### provider_links
Stores the connection to legacy data (same as other providers):
- `uid`: References the user
- `provider`: Set to "legacy" (string)
- `token`: JSONB object for storing state
  - `{}` or `null`: Provider is enabled
  - `{"disabled": true}`: Provider is disabled (data hidden)
- `update_reason`: Set to "legacy_import"
- `updated_at`: Timestamp when legacy data was imported

Note: When user disables legacy data, both provider_links and source_data rows are KEPT. The token field is updated to track enabled/disabled state.

### source_data
Stores all legacy measurements in a single JSON document:
- `uid`: References the user
- `provider`: Set to "legacy" (string)
- `measurements`: JSONB array of all measurements
- `last_sync`: Timestamp when data was imported
- `updated_at`: Timestamp when data was imported

Note: Source data is NEVER deleted, only the provider link state changes

## Data Format

The `measurements` field in source_data follows the same format as other providers:
```json
[
  {
    "date": "2023-12-25",
    "time": "08:30:00",
    "weight": 75.5,
    "body_fat": null
  },
  {
    "date": "2023-12-24",
    "time": "07:45:00",
    "weight": 75.8,
    "body_fat": 22.5
  }
]
```

## Legacy Database Mapping

From legacy SourceMeasurements table:
- `Timestamp` (datetime) → Extract date and time in local timezone
- `Weight` (decimal) → Convert to kg if UseMetric = false in legacy TrendWeightProfiles
  - IMPORTANT: Always use the legacy profile's UseMetric setting, not current profile
- `FatRatio` (decimal) → Convert to percentage (multiply by 100) if not null
- Ignore `Date` field (has timezone adjustments)
- Ignore `GroupId` (Withings-specific)
- `UserId` (GUID) → Match to new system user

## Provider String Values

The system uses string values for providers:
- "withings" - Withings devices
- "fitbit" - Fitbit devices  
- "legacy" - Legacy TrendWeight data (new)

No enum is used - providers are identified by these string values throughout the system.