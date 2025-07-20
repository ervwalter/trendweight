namespace TrendWeight.Features.Measurements.Models;

/// <summary>
/// Result from the source data service when fetching measurements with refresh
/// </summary>
public class MeasurementsResult
{
    /// <summary>
    /// The measurement data from all sources
    /// </summary>
    public required List<SourceData> Data { get; init; }

    /// <summary>
    /// Status of provider sync operations
    /// </summary>
    public required Dictionary<string, ProviderSyncStatus> ProviderStatus { get; init; }
}
