# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-07-25-start-date-settings/spec.md

> Created: 2025-07-25
> Version: 1.0.0

## Technical Requirements

### Component Architecture

- **StartDateSettings Component**: Create a new component that encapsulates both the start date field and the earlier weight data toggle
- **Integration Points**: This component will be used in both `InitialSetup.tsx` and within the Goal Settings section of the Settings page
- **State Management**: Use React Hook Form for form state management, consistent with existing patterns
- **Data Flow**: Settings stored in user profile and applied during data processing

### UI/UX Specifications

- Start date field placement: After basic profile settings (name, units) in InitialSetup
- Earlier weight data control: Use ToggleButtonGroup (same as unit selection) with two options:
  - "Show" (default) - Display all historical data
  - "Hide" - Only show measurements from start date forward
- Control implementation: Use the same ToggleButtonGroup component pattern as the metric/imperial toggle
- Explanation text: "When 'Show' is selected, your start date is still used to calculate your total weight change and progress toward your goal."
- Visual feedback: Clear helper text below the toggle explaining the impact of each choice
- Responsive design: Maintain consistency with existing form layouts

### Data Filtering Implementation

- **Filter Location**: `convertToSourceMeasurements` function in `conversion.ts`
- **Filter Logic**: When "hide data" mode is enabled, filter out measurements with dates before the start date
- **Performance**: Filtering happens during initial data transformation, no additional passes needed
- **Edge Cases**: Handle missing start date (no filtering), future start dates (no data shown)

### Profile Data Structure Update

- Add new field `hideDataBeforeStart` to ProfileData interface
- Type: `boolean` (non-nullable, default: `false`)
- Backward compatibility: Absence of field defaults to `false` (show all data)

## Approach Options

**Option A: Separate Components**
- Pros: Maximum flexibility, easier to test individually
- Cons: More code duplication, harder to maintain consistency

**Option B: StartDateSettings Component** (Selected)
- Pros: DRY principle, consistent UI/behavior, easier maintenance, clear single responsibility
- Cons: Slightly more complex initial implementation

**Rationale:** Option B aligns with the codebase pattern of creating reusable components and reduces long-term maintenance burden. The component has a clear, focused purpose.

## External Dependencies

No new external dependencies required. The implementation uses existing libraries:
- React Hook Form (already in use)
- @js-joda/core (already in use for date handling)
- Existing UI components (ToggleButtonGroup, etc.)

## Implementation Details

### Component Structure

```
components/
├── settings/
│   ├── StartDateSettings.tsx (new - start date field and earlier data toggle)
│   ├── GoalSection.tsx (updated to include StartDateSettings)
│   └── Settings.tsx (no changes needed)
└── initial-setup/
    └── InitialSetup.tsx (updated to include StartDateSettings)
```

### Data Flow

1. User sets start date and display mode in UI
2. Form data includes `goalStart` and `startDateDisplayMode`
3. Profile update mutation saves to database
4. On data fetch, profile settings are passed to `computeMeasurements`
5. `convertToSourceMeasurements` applies filtering based on settings

### Type Updates

```typescript
interface ProfileData {
  // ... existing fields ...
  goalStart?: string;
  hideDataBeforeStart: boolean; // new field (non-nullable)
}
```

### UI Implementation Example

```typescript
// Using ToggleButtonGroup like the unit selection
<Controller
  name="hideDataBeforeStart"
  control={control}
  render={({ field }) => (
    <ToggleButtonGroup
      value={String(field.value ?? false)}
      onChange={(value) => field.onChange(value === "true")}
      aria-label="Earlier weight data"
      variant="subtle"
    >
      <ToggleButton value="false">Show</ToggleButton>
      <ToggleButton value="true">Hide</ToggleButton>
    </ToggleButtonGroup>
  )}
/>
```