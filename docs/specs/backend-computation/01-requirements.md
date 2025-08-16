# Backend Measurement Computation - Requirements Specification

## Overview

Move measurement computation logic from frontend to backend to improve performance, consistency, and maintainability. The backend will handle merging raw source data from multiple providers and computing trend weights/fat percentages, while the frontend continues to handle visualization-specific computations.

## User Stories

### US-1: Dashboard Performance
**As a** user viewing my dashboard  
**I want** measurement computations to be processed on the backend  
**So that** my dashboard loads faster and consumes less browser resources

### US-2: Consistent Calculations
**As a** user accessing TrendWeight from different devices  
**I want** my trend calculations to be identical across all platforms  
**So that** I see consistent data regardless of where I access it

### US-3: Data Download Compatibility
**As a** user downloading my scale data  
**I want** to continue accessing raw measurements from individual providers  
**So that** I can export unprocessed data for other purposes

### US-4: Sharing Feature Continuity
**As a** user sharing my dashboard  
**I want** shared dashboards to display computed measurements  
**So that** others see the same trends I see

## Functional Requirements

### FR-1: Backend Computation Service
- **MUST** merge raw source data from multiple providers (Withings, Fitbit)
- **MUST** perform weight interpolation for missing days
- **MUST** perform fat percentage interpolation for missing days
- **MUST** calculate trend weights using 0.1 smoothing factor
- **MUST** calculate trend fat percentages
- **MUST** preserve interpolation flags for each measurement type
- **SHOULD** exclude computed values that can be calculated on frontend (fat/lean mass, source info)

### FR-2: API Response Redesign
- **MUST** modify `/api/data` endpoint to return computed measurements by default
- **MUST** add optional query parameter `?includeSource=true` to include source data from providers
- **MUST** preserve existing provider status information
- **SHOULD** simplify default response structure by excluding source data unless requested

### FR-3: Frontend Responsibility Separation
- **MUST** continue processing Highcharts data points on frontend
- **MUST** continue calculating slopes and deltas on frontend
- **MUST** continue handling time range filtering on frontend
- **MUST** continue handling metric/imperial unit conversion on frontend
- **SHOULD** consume computed measurements from backend instead of local computation

### FR-5: Unit Handling
- **MUST** perform all backend computations in metric units (kg)
- **MUST** return computed measurements in metric units regardless of user preference
- **MUST** allow frontend to handle conversion to imperial units for display
- **SHOULD** simplify backend logic by eliminating unit conversion concerns

### FR-4: Download Feature Update
- **MUST** update download functionality to use `?includeSource=true` query parameter
- **MUST** support both computed and source data views in download interface
- **MUST** preserve existing CSV export functionality

## Non-Functional Requirements

### NFR-1: Performance
- **MUST** complete backend computation within 2 seconds for typical dataset
- **SHOULD** improve overall dashboard load time by at least 20%
- **SHOULD** reduce frontend memory usage for large datasets

### NFR-2: Accuracy
- **MUST** produce identical computation results to existing frontend logic (when comparing in metric units)
- **MUST** maintain precision for weight measurements to 3 decimal places (kg) for accurate unit conversion
- **MUST** maintain precision for fat percentages to 4 decimal places (as 0-1 ratio)
- **SHOULD** eliminate unit conversion inconsistencies by keeping backend in metric

### NFR-3: Functional Preservation
- **MUST NOT** break existing dashboard functionality (but may change data flow)
- **MUST NOT** break existing download functionality (but will update to use `includeSource` parameter)
- **MUST NOT** break existing sharing functionality

## Edge Cases and Error Scenarios

### EC-1: Missing Data
- **WHEN** user has no weight measurements  
- **THEN** return empty computed measurements array
- **AND** preserve empty source data arrays when `includeSource=true`

### EC-2: Single Provider Data
- **WHEN** user has data from only one provider  
- **THEN** compute trends using single provider data
- **AND** preserve source attribution in computed measurements

### EC-3: Sparse Data Sets
- **WHEN** user has measurements with large gaps (>30 days)  
- **THEN** interpolate appropriately without creating excessive interpolated points
- **AND** flag interpolated measurements clearly

### EC-4: Fat Data Without Weight Data
- **WHEN** user has fat measurements on days without weight measurements  
- **THEN** create interpolated weight values for trend calculations
- **AND** flag both weight and fat as appropriately interpolated

## Success Metrics

1. **Performance**: Dashboard initial load time reduced by ≥20%
2. **Accuracy**: 100% identical trend calculations compared to frontend implementation
3. **Functionality**: Zero regressions in dashboard, download, and sharing features
4. **Reliability**: Backend computation success rate ≥99.9%

## Constraints

1. **Data Storage**: Continue using existing JSONB schema for source data
2. **Authentication**: Maintain existing Clerk-based user authentication
3. **Browser Support**: Maintain support for same browser versions as current implementation

## Out of Scope

- Modifying chart visualization logic
- Changing time range filtering logic
- Modifying delta/slope calculation logic
- Changing download CSV format
- Modifying sharing token functionality
- Performance optimizations for provider data fetching