using TrendWeight.Infrastructure.DataAccess.Models;

namespace TrendWeight.Features.Measurements.Models;

/// <summary>
/// The full result of fetching a user's measurement data: profile, computed
/// measurements, raw per-provider source data, and per-provider sync status.
/// Callers shape this into their own response DTOs.
/// </summary>
public record MeasurementDataResult(
    DbProfile Profile,
    List<ComputedMeasurement> ComputedMeasurements,
    List<SourceData> SourceData,
    Dictionary<string, ProviderSyncStatus> ProviderStatus);
