# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-07-25-start-date-settings/spec.md

> Created: 2025-07-25
> Version: 1.0.0

## Schema Changes

### profiles Table - JSONB Profile Column Update

The `profile` JSONB column in the `profiles` table needs to support the new `startDateDisplayMode` field.

#### Updated JSONB Structure

```json
{
  "firstName": "string",
  "goalStart": "YYYY-MM-DD",
  "goalWeight": number,
  "plannedPoundsPerWeek": number,
  "dayStartOffset": number,
  "useMetric": boolean,
  "showCalories": boolean,
  "sharingToken": "string",
  "sharingEnabled": boolean,
  "isMigrated": boolean,
  "isNewlyMigrated": boolean,
  "hideDataBeforeStart": boolean  // NEW FIELD
}
```

## Migration Strategy

No database migration is required since we're adding a field to an existing JSONB column. The application will handle the default value logic:

- When `hideDataBeforeStart` is missing: Default to `false` in the application layer
- New users will have the field explicitly set to `false` during onboarding
- Existing users will get `false` as the default value when the profile is loaded

## Rationale

Using the existing JSONB structure provides:
- Flexibility for future profile fields
- No schema migration needed
- Backward compatibility with existing data
- Consistent with current data storage patterns

## Data Integrity

- The field is optional and defaults to `false` (show all data)
- Boolean type enforced at the application layer
- No database constraints needed due to JSONB flexibility