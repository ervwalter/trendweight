# Backend Measurement Computation - Task Breakdown

## Phase 1: Backend Core Models (2-3 hours)

### Task 1.1: Create ComputedMeasurement Model
- **Location**: `apps/api/TrendWeight/Features/Measurements/Models/ComputedMeasurement.cs`
- **Description**: Create model matching frontend Measurement interface with string date
- **Dependencies**: None
- **Acceptance Criteria**:
  - Model includes essential fields from frontend Measurement interface
  - Excludes computed fields that can be calculated on frontend (fat/lean mass, source)
  - Uses string for date field (YYYY-MM-DD format)
  - Uses decimal for all numeric values with appropriate precision
  - Properly documented with XML comments
  - Matches existing model patterns in codebase

### Task 1.2: Update MeasurementsResponse Model
- **Location**: `apps/api/TrendWeight/Features/Measurements/Models/MeasurementsResponse.cs`
- **Description**: Add ComputedMeasurements property and make SourceData optional
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - `ComputedMeasurements` property added (required)
  - Rename `Data` property to `SourceData` and make optional
  - Update XML documentation
  - Maintain backwards compatible constructor if needed

## Phase 2: Backend Computation Service (8-10 hours)

### Task 2.1: Create MeasurementComputationService Interface
- **Location**: `apps/api/TrendWeight/Features/Measurements/IMeasurementComputationService.cs`
- **Description**: Define interface for main computation service
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - Single method: `ComputeMeasurements(List<SourceData>, ProfileData)`
  - Returns `List<ComputedMeasurement>`
  - Properly documented with XML comments
  - Follows existing service interface patterns

### Task 2.2: Port Conversion Logic (ConvertToSourceMeasurements)
- **Location**: `apps/api/TrendWeight/Features/Measurements/MeasurementComputationService.cs`
- **Description**: Port logic from `conversion.ts` but without unit conversion
- **Source**: `apps/web/src/lib/dashboard/computations/conversion.ts`
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - Handles dayStartOffset correctly for timezone adjustment
  - Filters data based on goalStart/hideDataBeforeStart
  - Processes multiple provider sources
  - Returns List<RawMeasurement> (uses existing model)
  - **NO unit conversion** - always works in kg
  - Preserves all date/time logic from TypeScript version

### Task 2.3: Port Grouping Logic
- **Description**: Implement `GroupAndSelectFirstByDay` and `FilterAndGroupFatMeasurements`
- **Source**: `apps/web/src/lib/dashboard/computations/grouping.ts`
- **Dependencies**: Task 2.2
- **Acceptance Criteria**:
  - Groups measurements by day correctly
  - Selects first measurement of each day (earliest timestamp)
  - Handles both weight and fat measurement grouping
  - Matches TypeScript behavior exactly
  - Returns List<RawMeasurement>

### Task 2.4: Port Interpolation Logic
- **Description**: Implement `InterpolateWeightMeasurements` and `InterpolateFatMeasurements`
- **Source**: `apps/web/src/lib/dashboard/computations/interpolation.ts`
- **Dependencies**: Task 2.3
- **Acceptance Criteria**:
  - Linear interpolation for missing days between measurements
  - Proper interpolation flags set on created measurements
  - Handles edge cases (single measurements, large gaps)
  - Creates "interpolated" source entries correctly
  - Maintains sorting by date after interpolation

### Task 2.5: Port Trend Calculation Logic
- **Description**: Implement `ComputeWeightTrends` and `ComputeFatTrends`
- **Source**: `apps/web/src/lib/dashboard/computations/trend-calculations.ts`
- **Dependencies**: Task 2.4
- **Acceptance Criteria**:
  - Uses 0.1 smoothing factor for exponential moving average
  - Properly calculates fat mass and lean mass from weight and fat ratio
  - Handles missing fat data correctly
  - Merges additional measurements from fat-only days
  - Returns List<ComputedMeasurement> with all trend calculations
  - Maintains measurement order by date

### Task 2.6: Implement Main ComputeMeasurements Method
- **Description**: Orchestrate all computation steps in correct order
- **Source**: `apps/web/src/lib/dashboard/computations/measurements.ts`
- **Dependencies**: Tasks 2.2-2.5
- **Acceptance Criteria**:
  - Follows exact same flow as frontend `computeMeasurements` function
  - Calls private methods in correct sequence
  - Returns properly formatted ComputedMeasurement objects
  - Handles empty/invalid input gracefully (returns empty list)
  - Includes comprehensive error handling and logging

### Task 2.7: Register Service in DI Container
- **Location**: `apps/api/TrendWeight/Program.cs`
- **Dependencies**: Task 2.6
- **Acceptance Criteria**:
  - Service registered as scoped dependency
  - Interface properly mapped to implementation
  - Follows existing DI registration patterns

## Phase 3: Backend API Integration (2-3 hours)

### Task 3.1: Update MeasurementsController
- **Location**: `apps/api/TrendWeight/Features/Measurements/MeasurementsController.cs`
- **Description**: Integrate computation service and add includeSource parameter
- **Dependencies**: Task 2.7
- **Acceptance Criteria**:
  - Both `GetMeasurements` and `GetMeasurementsBySharingCode` methods updated
  - `includeSource` query parameter added (bool, defaults to false)
  - Computed measurements always included in response
  - Source data only included when `includeSource=true`
  - Inject `IMeasurementComputationService` in constructor
  - Handle computation errors gracefully with appropriate logging

## Phase 4: Frontend API Integration (4-5 hours)

### Task 4.1: Update API Types
- **Location**: `apps/web/src/lib/api/types.ts`
- **Description**: Update MeasurementsResponse interface
- **Dependencies**: Task 3.1
- **Acceptance Criteria**:
  - `computedMeasurements` field added to MeasurementsResponse
  - `data` field renamed to `sourceData` and made optional
  - Internal `ApiComputedMeasurement` interface created (not exported)
  - Interface matches backend ComputedMeasurement model exactly

### Task 4.2: Update API Queries
- **Location**: `apps/web/src/lib/api/queries.ts`
- **Description**: Update queries to handle new response structure and includeSource parameter
- **Dependencies**: Task 4.1
- **Acceptance Criteria**:
  - Query key includes `includeSource` parameter in cache key
  - Query function converts string dates to LocalDate internally
  - Returns measurements in kg (no unit conversion in query)
  - Download-specific query includes `includeSource=true`
  - Handles both authenticated and sharing code endpoints
  - Updates return type to match new structure

### Task 4.3: Update Dashboard Hooks
- **Location**: `apps/web/src/lib/dashboard/hooks.ts`
- **Description**: Use computed measurements from API and handle unit conversion
- **Dependencies**: Task 4.2
- **Acceptance Criteria**:
  - Remove call to `computeMeasurements` function
  - Use `measurements` directly from API query (in kg)
  - Add unit conversion logic based on profile.useMetric
  - Convert all weight-related fields (actualWeight, trendWeight, masses)
  - Use converted measurements for dataPoints, stats calculations
  - Preserve all existing hook behavior and return structure

### Task 4.4: Update Download Functionality
- **Location**: `apps/web/src/lib/download/use-scale-readings-data.ts`
- **Description**: Use includeSource parameter for raw provider data
- **Dependencies**: Task 4.3
- **Acceptance Criteria**:
  - Use separate query with `includeSource=true` for provider-specific views
  - Computed view uses computed measurements from API
  - Handle unit conversion for both computed and source data views
  - Preserve all existing download functionality and CSV export
  - Update ViewType handling to work with new data structure

## Phase 5: Testing and Validation (4-5 hours)

### Task 5.1: Create Backend Unit Tests
- **Location**: `apps/api/TrendWeight.Tests/Features/Measurements/`
- **Description**: Create comprehensive tests for computation service
- **Dependencies**: Task 2.6
- **Acceptance Criteria**:
  - Test each private method with known inputs/outputs from frontend tests
  - Test edge cases (empty data, single measurements, large gaps)
  - Verify mathematical accuracy against frontend implementation
  - Test profile-based filtering and day start offset
  - Test fat calculation edge cases
  - Achieve >90% code coverage on computation service

### Task 5.2: Create API Integration Tests
- **Location**: `apps/api/TrendWeight.Tests/Features/Measurements/`
- **Description**: Test controller endpoints with computation integration
- **Dependencies**: Task 3.1
- **Acceptance Criteria**:
  - Test both endpoints with and without `includeSource` parameter
  - Verify response structure matches expected format
  - Test sharing code functionality still works
  - Test error handling for computation failures
  - Test empty data scenarios

### Task 5.3: Update Frontend Tests
- **Location**: `apps/web/src/lib/dashboard/computations/*.test.ts`
- **Description**: Update or remove tests that are now handled on backend
- **Dependencies**: Task 4.3
- **Acceptance Criteria**:
  - Remove computation-related tests (measurements.test.ts, trend-calculations.test.ts, etc.)
  - Update dashboard hook tests to use mock API responses
  - Ensure download tests still pass with new data structure
  - Update any tests that relied on computeMeasurements function
  - Verify unit conversion tests still work in hooks

### Task 5.4: End-to-End Validation
- **Description**: Manual testing of complete flow
- **Dependencies**: All previous tasks
- **Acceptance Criteria**:
  - Dashboard loads with identical data to before (visual comparison)
  - Download functionality works for both computed and source views
  - Sharing functionality preserved (test with actual sharing codes)
  - Performance improvement measurable (compare load times)
  - Both metric and imperial users see correct units
  - Fat percentage calculations work correctly

## Phase 6: Cleanup (1-2 hours)

### Task 6.1: Remove Unused Frontend Code
- **Location**: `apps/web/src/lib/dashboard/computations/`
- **Description**: Remove computation files no longer needed
- **Dependencies**: Task 5.4
- **Acceptance Criteria**:
  - Remove `measurements.ts`, `trend-calculations.ts`, `interpolation.ts`, `grouping.ts`, `conversion.ts`
  - Keep `data-points.ts`, `stats.ts` (still used for frontend calculations)
  - Update imports in remaining files
  - Remove any unused type definitions
  - Update barrel exports if any

### Task 6.2: Update Documentation
- **Location**: Various documentation files
- **Description**: Update architecture documentation to reflect changes
- **Dependencies**: Task 6.1
- **Acceptance Criteria**:
  - Update data flow diagrams in architecture docs
  - Document new API parameters in API documentation
  - Update setup/development instructions if needed
  - Add notes about unit handling in developer docs

## Risk Mitigation

### High Risk Items

#### Mathematical Accuracy
- **Risk**: C# calculations don't match TypeScript exactly
- **Mitigation**: Port tests with exact same input/output data
- **Mitigation**: Use decimal for all calculations to avoid floating point issues
- **Mitigation**: Side-by-side validation during development

#### Date/Time Handling
- **Risk**: C# vs JavaScript date handling differences affect dayStartOffset
- **Mitigation**: Use existing date parsing patterns from codebase
- **Mitigation**: Thorough testing of dayStartOffset logic with various timezones
- **Mitigation**: Test with actual user data that has timezone edge cases

#### Performance Impact
- **Risk**: Backend computation slower than frontend
- **Mitigation**: Profile computation performance early in development
- **Mitigation**: Use efficient LINQ operations and avoid unnecessary allocations
- **Mitigation**: Consider async processing for large datasets if needed

### Medium Risk Items

#### Frontend Integration
- **Risk**: Breaking existing dashboard functionality during transition
- **Mitigation**: Use feature flags for gradual rollout
- **Mitigation**: Comprehensive integration testing before full deployment
- **Mitigation**: Keep frontend computation code until fully validated

#### Unit Conversion
- **Risk**: Inconsistent unit handling across different code paths
- **Mitigation**: Centralize conversion logic in single location
- **Mitigation**: Test both metric and imperial users thoroughly
- **Mitigation**: Add unit tests specifically for conversion scenarios

## Success Criteria

- [ ] Dashboard functionality identical to current implementation
- [ ] Download feature works for both computed and source data views
- [ ] Sharing functionality preserved without regressions
- [ ] Backend unit tests achieve 95%+ coverage with passing tests
- [ ] Performance improvement measurable (≥20% faster dashboard load)
- [ ] All existing frontend tests pass or are appropriately updated
- [ ] No breaking changes to user-facing functionality
- [ ] Zero data accuracy regressions (trend calculations match exactly)

## Estimated Timeline

- **Phase 1**: 2-3 hours (Backend models)
- **Phase 2**: 8-10 hours (Computation service)
- **Phase 3**: 2-3 hours (API integration)
- **Phase 4**: 4-5 hours (Frontend integration)
- **Phase 5**: 4-5 hours (Testing)
- **Phase 6**: 1-2 hours (Cleanup)

**Total Estimated Time**: 21-28 hours (3-4 working days)