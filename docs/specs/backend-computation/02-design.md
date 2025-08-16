# Backend Measurement Computation - Technical Design

## Architecture Overview

The backend computation system uses a single service to transform raw provider data into computed measurements. All computations operate in metric units (kg), with the frontend handling imperial conversions for display. The design leverages existing models (`SourceData`, `RawMeasurement`) and avoids over-engineering with multiple services.

## Backend Components

### 1. Models

#### ComputedMeasurement Model (New)
```csharp
namespace TrendWeight.Features.Measurements.Models;

/// <summary>
/// Computed measurement with trend calculations
/// Corresponds to frontend Measurement interface but with string date
/// </summary>
public class ComputedMeasurement
{
    /// <summary>Date of measurement (YYYY-MM-DD format)</summary>
    public required string Date { get; init; }
    
    /// <summary>Actual weight in kg</summary>
    public required decimal ActualWeight { get; init; }
    
    /// <summary>Trend weight in kg</summary>
    public required decimal TrendWeight { get; init; }
    
    /// <summary>Whether weight was interpolated</summary>
    public required bool WeightIsInterpolated { get; init; }
    
    /// <summary>Whether fat data was interpolated</summary>
    public required bool FatIsInterpolated { get; init; }
    
    /// <summary>Actual fat percentage (0-1 ratio)</summary>
    public decimal? ActualFatPercent { get; init; }
    
    /// <summary>Trend fat percentage (0-1 ratio)</summary>
    public decimal? TrendFatPercent { get; init; }
    
    // Note: Fat mass and lean mass can be calculated on frontend as:
    // fatMass = weight * fatPercent
    // leanMass = weight * (1 - fatPercent)
    
    // Note: Source information available via includeSource=true parameter
}
```

### 2. Service

#### IMeasurementComputationService
```csharp
namespace TrendWeight.Features.Measurements.Services;

/// <summary>
/// Service for computing measurements from raw source data
/// Contains all computation logic as private methods
/// </summary>
public interface IMeasurementComputationService
{
    /// <summary>
    /// Computes measurements from source data for a user
    /// </summary>
    /// <param name="sourceData">Raw source data from providers</param>
    /// <param name="profile">User profile for timezone/preferences</param>
    /// <returns>Computed measurements with trends</returns>
    List<ComputedMeasurement> ComputeMeasurements(List<SourceData> sourceData, ProfileData profile);
}
```

#### MeasurementComputationService Implementation
```csharp
public class MeasurementComputationService : IMeasurementComputationService
{
    public List<ComputedMeasurement> ComputeMeasurements(
        List<SourceData> sourceData, 
        ProfileData profile)
    {
        // Step 1: Convert raw data using existing RawMeasurement model
        var rawMeasurements = ConvertToSourceMeasurements(sourceData, profile);
        
        // Step 2: Group by day and select first of each day
        var groupedMeasurements = GroupAndSelectFirstByDay(rawMeasurements);
        
        // Step 3: Interpolate missing weight measurements
        var interpolatedWeights = InterpolateWeightMeasurements(groupedMeasurements);
        
        // Step 4: Compute weight trends
        var measurementsWithTrends = ComputeWeightTrends(interpolatedWeights);
        
        // Step 5: Process fat measurements if available
        var fatMeasurements = FilterAndGroupFatMeasurements(rawMeasurements);
        if (fatMeasurements.Any())
        {
            var interpolatedFat = InterpolateFatMeasurements(fatMeasurements);
            measurementsWithTrends = ComputeFatTrends(interpolatedFat, measurementsWithTrends);
        }
        
        return measurementsWithTrends;
    }
    
    // Private methods ported from TypeScript computation files
    private List<RawMeasurement> ConvertToSourceMeasurements(List<SourceData> sourceData, ProfileData profile) 
    {
        // Port logic from apps/web/src/lib/dashboard/computations/conversion.ts
        // BUT: No unit conversion (always work in kg)
    }
    
    private List<RawMeasurement> GroupAndSelectFirstByDay(List<RawMeasurement> measurements) 
    {
        // Port logic from apps/web/src/lib/dashboard/computations/grouping.ts
    }
    
    private List<RawMeasurement> InterpolateWeightMeasurements(List<RawMeasurement> measurements) 
    {
        // Port logic from apps/web/src/lib/dashboard/computations/interpolation.ts
    }
    
    private List<ComputedMeasurement> ComputeWeightTrends(List<RawMeasurement> measurements) 
    {
        // Port logic from apps/web/src/lib/dashboard/computations/trend-calculations.ts
    }
    
    private List<RawMeasurement> FilterAndGroupFatMeasurements(List<RawMeasurement> measurements) 
    {
        // Port logic from apps/web/src/lib/dashboard/computations/grouping.ts
    }
    
    private List<RawMeasurement> InterpolateFatMeasurements(List<RawMeasurement> measurements) 
    {
        // Port logic from apps/web/src/lib/dashboard/computations/interpolation.ts
    }
    
    private List<ComputedMeasurement> ComputeFatTrends(List<RawMeasurement> fatMeasurements, List<ComputedMeasurement> measurements) 
    {
        // Port logic from apps/web/src/lib/dashboard/computations/trend-calculations.ts
    }
}
```

## Data Flow Architecture

```
Raw Source Data (existing SourceData/RawMeasurement models)
    ↓
[Single MeasurementComputationService with private methods]
    ↓
Computed Measurements (ComputedMeasurement model)
```

## API Changes

### Updated MeasurementsResponse Model
```csharp
namespace TrendWeight.Features.Measurements.Models;

/// <summary>
/// Enhanced response model with computed measurements
/// </summary>
public class MeasurementsResponse
{
    /// <summary>
    /// Computed measurements with trends (always included)
    /// </summary>
    public required List<ComputedMeasurement> ComputedMeasurements { get; init; }
    
    /// <summary>
    /// Raw source data (only when includeSource=true)
    /// </summary>
    public List<SourceData>? SourceData { get; init; }
    
    /// <summary>
    /// Whether this is the authenticated user's own data
    /// </summary>
    public required bool IsMe { get; init; }
    
    /// <summary>
    /// Status of provider sync operations (only for authenticated user)
    /// </summary>
    public Dictionary<string, ProviderSyncStatus>? ProviderStatus { get; init; }
}
```

### Controller Method Updates
```csharp
// In MeasurementsController.cs
[HttpGet]
public async Task<ActionResult<MeasurementsResponse>> GetMeasurements(
    [FromQuery] string? progressId = null,
    [FromQuery] bool includeSource = false)
{
    // ... existing auth logic ...
    
    // Get measurements with automatic refresh
    var result = await _measurementSyncService.GetMeasurementsForUserAsync(
        user.Uid,
        activeProviders,
        user.Profile.UseMetric);

    // Compute measurements from source data
    var computedMeasurements = _measurementComputationService
        .ComputeMeasurements(result.Data, user.Profile);

    return Ok(new MeasurementsResponse
    {
        ComputedMeasurements = computedMeasurements,
        SourceData = includeSource ? result.Data : null,
        IsMe = true,
        ProviderStatus = result.ProviderStatus
    });
}
```

## Frontend Integration

### API Query Updates
```typescript
// In apps/web/src/lib/api/queries.ts

// Internal type for API response (not exported)
interface ApiComputedMeasurement {
  date: string; // Only difference from Measurement is string vs LocalDate
  actualWeight: number;
  trendWeight: number;
  weightIsInterpolated: boolean;
  fatIsInterpolated: boolean;
  actualFatPercent?: number;
  trendFatPercent?: number;
  // Note: Fat/lean mass calculated on frontend, source info in includeSource
}

interface ApiMeasurementsResponse {
  computedMeasurements: ApiComputedMeasurement[];
  sourceData?: ApiSourceData[];
  isMe: boolean;
  providerStatus?: Record<string, ProviderSyncStatus>;
}

const queryOptions = {
  data: (getToken: GetToken, options?: { 
    sharingCode?: string; 
    progressId?: string;
    includeSource?: boolean;
  }) => ({
    queryKey: options?.sharingCode 
      ? queryKeys.measurementDataShared(options.sharingCode, options.includeSource)
      : queryKeys.measurementData(options.includeSource),
    queryFn: async (): Promise<{
      measurements: Measurement[];
      sourceData?: ApiSourceData[];
      isMe: boolean;
      providerStatus?: Record<string, ProviderSyncStatus>;
    }> => {
      const params = new URLSearchParams();
      if (options?.progressId) params.append('progressId', options.progressId);
      if (options?.includeSource) params.append('includeSource', 'true');
      
      const endpoint = options?.sharingCode 
        ? `/api/data/${options.sharingCode}`
        : '/api/data';
      
      const url = params.toString() ? `${endpoint}?${params}` : endpoint;
      
      const response = await apiRequest<ApiMeasurementsResponse>(url, { 
        token: options?.sharingCode ? undefined : await getToken() 
      });
      
      // Convert string dates to LocalDate only
      const measurements: Measurement[] = response.computedMeasurements.map(m => ({
        ...m,
        date: LocalDate.parse(m.date),
      }));
      
      return {
        measurements,
        sourceData: response.sourceData,
        isMe: response.isMe,
        providerStatus: response.providerStatus,
      };
    },
  }),
};
```

### Unit Conversion Strategy
```typescript
// Unit conversion happens in useComputeDashboardData hook
// Query returns measurements in kg, hook converts based on profile

// In useComputeDashboardData:
export const useComputeDashboardData = (sharingCode?: string): DashboardData => {
  // ... existing code to get profile and measurements from API ...
  
  // Convert measurements to user's preferred units
  const convertedMeasurements = useMemo(() => {
    if (!profile) return [];
    
    const conversionFactor = profile.useMetric ? 1 : 2.20462262;
    
    return measurements.map(m => ({
      ...m,
      actualWeight: m.actualWeight * conversionFactor,
      trendWeight: m.trendWeight * conversionFactor,
      actualFatMass: m.actualFatMass ? m.actualFatMass * conversionFactor : undefined,
      trendFatMass: m.trendFatMass ? m.trendFatMass * conversionFactor : undefined,
      actualLeanMass: m.actualLeanMass ? m.actualLeanMass * conversionFactor : undefined,
      trendLeanMass: m.trendLeanMass ? m.trendLeanMass * conversionFactor : undefined,
    }));
  }, [measurements, profile?.useMetric]);

  // Use convertedMeasurements for dataPoints, stats, etc.
  const dataPoints = useMemo(() => computeDataPoints(mode, convertedMeasurements), [convertedMeasurements, mode]);
  // ...
};
```

### Download Feature Updates
```typescript
// For download page, use includeSource=true to get provider data
const downloadQueries = useDashboardQueries(undefined, { includeSource: true });

// Download component can then access both computed and source data
const { measurements, sourceData } = downloadQueries;
```

## Implementation Strategy

### Phase 1: Backend Implementation
1. Create `ComputedMeasurement` model
2. Update `MeasurementsResponse` model  
3. Implement `MeasurementComputationService` with private methods
4. Update `MeasurementsController` to use service and handle `includeSource`

### Phase 2: Frontend Integration
1. Update API types (internal `ApiComputedMeasurement`, not exported)
2. Update queries to convert dates only, return `Measurement[]` in kg
3. Update `useComputeDashboardData` to convert units and use API measurements
4. Update download to use `includeSource=true`

### Phase 3: Cleanup
1. Remove unused frontend computation files
2. No unit conversion changes needed in rest of frontend (handled in hook)

## Testing Strategy

### Backend Tests
- Port existing TypeScript test cases to C# xUnit tests
- Test each private method with known inputs/outputs
- Verify mathematical accuracy matches frontend exactly

### Frontend Tests  
- Update tests to use mock API responses instead of computation
- Test unit conversion in display components
- Verify download functionality with both data types

## Error Handling

- Service returns empty list for invalid/missing data
- Controller handles computation errors gracefully
- Frontend falls back to empty state appropriately