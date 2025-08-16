using TrendWeight.Features.Measurements.Models;
using TrendWeight.Features.Profile.Models;

namespace TrendWeight.Features.Measurements;

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
