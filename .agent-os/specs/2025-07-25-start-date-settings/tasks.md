# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-07-25-start-date-settings/spec.md

> Created: 2025-07-25
> Status: Ready for Implementation

## Tasks

- [x] 1. Update Backend Models and API
  - [x] 1.1 Write tests for ProfileData model with hideDataBeforeStart field
  - [x] 1.2 Add hideDataBeforeStart property to ProfileData.cs
  - [x] 1.3 Update ProfileService to handle default value when field is missing from JSONB
  - [x] 1.4 Verify all profile-related tests pass

- [x] 2. Update Frontend Types and Interfaces
  - [x] 2.1 Write tests for ProfileData interface updates
  - [x] 2.2 Add hideDataBeforeStart to ProfileData interface in interfaces.ts
  - [x] 2.3 Update any TypeScript types that reference ProfileData
  - [x] 2.4 Verify TypeScript compilation succeeds

- [x] 3. Create StartDateSettings Component
  - [x] 3.1 Write tests for StartDateSettings component
  - [x] 3.2 Create StartDateSettings.tsx with start date input and toggle
  - [x] 3.3 Implement ToggleButtonGroup for Show/Hide earlier data
  - [x] 3.4 Add appropriate helper text and styling
  - [x] 3.5 Verify component renders correctly and handles all edge cases

- [x] 4. Integrate StartDateSettings into Settings Page
  - [x] 4.1 Write tests for GoalSection integration
  - [x] 4.2 Import and use StartDateSettings in GoalSection.tsx
  - [x] 4.3 Remove duplicate start date field from GoalSection
  - [x] 4.4 Verify settings page saves all fields correctly

- [x] 5. Integrate StartDateSettings into Initial Setup
  - [x] 5.1 Write tests for InitialSetup integration
  - [x] 5.2 Import and use StartDateSettings in InitialSetup.tsx
  - [x] 5.3 Ensure proper form field registration and validation
  - [x] 5.4 Test complete onboarding flow with new fields

- [x] 6. Implement Client-Side Data Filtering
  - [x] 6.1 Write comprehensive tests for data filtering logic
  - [x] 6.2 Update convertToSourceMeasurements to filter based on hideDataBeforeStart
  - [x] 6.3 Handle edge cases (missing start date, future dates)
  - [x] 6.4 Verify filtering works correctly with various data sets

- [x] 7. End-to-End Testing and Verification
  - [x] 7.1 Test new user onboarding with start date settings
  - [x] 7.2 Test existing user updating their settings
  - [x] 7.3 Test data export respects the hide setting
  - [x] 7.4 Run all tests and ensure 100% pass rate