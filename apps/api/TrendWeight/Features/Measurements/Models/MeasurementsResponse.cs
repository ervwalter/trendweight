namespace TrendWeight.Features.Measurements.Models;

/// <summary>
/// Response model for the measurements endpoint that includes provider sync status
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
    /// Status of provider sync operations (only included for authenticated user)
    /// </summary>
    public Dictionary<string, ProviderSyncStatus>? ProviderStatus { get; init; }
}

/// <summary>
/// Status information for a provider sync operation
/// </summary>
public class ProviderSyncStatus
{
    /// <summary>
    /// Whether the sync was successful
    /// </summary>
    public required bool Success { get; init; }

    /// <summary>
    /// Error type if sync failed
    /// </summary>
    public string? Error { get; init; }

    /// <summary>
    /// Human-readable error message
    /// </summary>
    public string? Message { get; init; }
}

