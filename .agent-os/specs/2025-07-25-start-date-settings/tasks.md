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

- [ ] 2. Update Frontend Types and Interfaces
  - [ ] 2.1 Write tests for ProfileData interface updates
  - [ ] 2.2 Add hideDataBeforeStart to ProfileData interface in interfaces.ts
  - [ ] 2.3 Update any TypeScript types that reference ProfileData
  - [ ] 2.4 Verify TypeScript compilation succeeds

- [ ] 3. Create StartDateSettings Component
  - [ ] 3.1 Write tests for StartDateSettings component
  - [ ] 3.2 Create StartDateSettings.tsx with start date input and toggle
  - [ ] 3.3 Implement ToggleButtonGroup for Show/Hide earlier data
  - [ ] 3.4 Add appropriate helper text and styling
  - [ ] 3.5 Verify component renders correctly and handles all edge cases

- [ ] 4. Integrate StartDateSettings into Settings Page
  - [ ] 4.1 Write tests for GoalSection integration
  - [ ] 4.2 Import and use StartDateSettings in GoalSection.tsx
  - [ ] 4.3 Remove duplicate start date field from GoalSection
  - [ ] 4.4 Verify settings page saves all fields correctly

- [ ] 5. Integrate StartDateSettings into Initial Setup
  - [ ] 5.1 Write tests for InitialSetup integration
  - [ ] 5.2 Import and use StartDateSettings in InitialSetup.tsx
  - [ ] 5.3 Ensure proper form field registration and validation
  - [ ] 5.4 Test complete onboarding flow with new fields

- [ ] 6. Implement Client-Side Data Filtering
  - [ ] 6.1 Write comprehensive tests for data filtering logic
  - [ ] 6.2 Update convertToSourceMeasurements to filter based on hideDataBeforeStart
  - [ ] 6.3 Handle edge cases (missing start date, future dates)
  - [ ] 6.4 Verify filtering works correctly with various data sets

- [ ] 7. End-to-End Testing and Verification
  - [ ] 7.1 Test new user onboarding with start date settings
  - [ ] 7.2 Test existing user updating their settings
  - [ ] 7.3 Verify data visibility changes immediately when toggling
  - [ ] 7.4 Test data export respects the hide setting
  - [ ] 7.5 Run all tests and ensure 100% pass rate