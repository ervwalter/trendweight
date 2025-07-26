# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-07-25-start-date-settings/spec.md

> Created: 2025-07-25
> Version: 1.0.0

## Test Coverage

### Unit Tests

**ProfileData Model (C#)**
- Verify HideDataBeforeStart property serializes/deserializes correctly
- Test default value behavior when field is missing from JSONB (should default to false)
- Verify field is non-nullable in the model
- Validate boolean type enforcement

**StartDateSettings Component**
- Renders start date input field
- Renders ToggleButtonGroup for earlier weight data with "Show"/"Hide" options
- ToggleButtonGroup behaves consistently with unit selection toggle
- Calls onChange handlers with correct values
- Shows appropriate helper text for each mode
- Handles missing/undefined values gracefully

**Data Filtering (conversion.ts)**
- When hideDataBeforeStart is false: All measurements are included
- When hideDataBeforeStart is true: Measurements before start date are filtered out
- When start date is missing: No filtering occurs regardless of hideDataBeforeStart value
- When start date is in the future: Appropriate behavior (no data shown)
- Edge case: Measurements on the exact start date are included

### Integration Tests

**Initial Setup Flow**
- User can complete setup with start date and display mode
- Values are saved correctly to the profile
- Navigation to dashboard works after setting values

**Settings Page**
- Existing goal settings continue to work
- New display mode setting updates profile correctly
- Changes to display mode immediately affect data display

**Data Loading Flow**
- Profile with hideDataBeforeStart=false displays all historical data
- Profile with hideDataBeforeStart=true only shows data from start date forward
- Switching the toggle updates the display without page refresh

### Feature Tests

**End-to-End Onboarding**
- New user signs up
- Completes initial setup including start date
- Selects display mode preference
- Dashboard shows data according to selected mode

**Settings Update Flow**
- User navigates to settings
- Changes start date display mode
- Returns to dashboard
- Verifies data visibility matches new setting

### Mocking Requirements

**API Responses**
- Mock profile responses with various hideDataBeforeStart values (true, false)
- Mock measurement data with dates before and after start date
- Test profile responses where the field is missing from the database (should return false)

**Date/Time**
- Mock current date for consistent test results
- Test with various start dates (past, today, future)

## Test Data Scenarios

1. **No Start Date**: User has never set a start date
2. **Past Start Date**: Start date is 30 days ago with data before and after
3. **Recent Start Date**: Start date is yesterday with mostly future data
4. **Future Start Date**: Start date is tomorrow (edge case)
5. **Mode Switching**: Data set that clearly shows filtering differences

## Accessibility Testing

- Start date input is keyboard accessible
- Display mode toggle can be operated via keyboard
- Screen readers announce the purpose of each setting
- Form validation messages are announced

## Performance Testing

- Filtering large data sets (1000+ measurements) remains performant
- No noticeable lag when switching display modes
- Initial data load time is not significantly impacted