using TrendWeight.Features.Measurements.Models;

namespace TrendWeight.Features.Providers.Models;

/// <summary>
/// Result of a provider sync operation
/// </summary>
public class ProviderSyncResult
{
    /// <summary>
    /// The provider name
    /// </summary>
    public required string Provider { get; init; }

    /// <summary>
    /// Whether the sync was successful
    /// </summary>
    public required bool Success { get; init; }

    /// <summary>
    /// Error type if sync failed
    /// </summary>
    public ProviderSyncError? Error { get; init; }

    /// <summary>
    /// Human-readable error message
    /// </summary>
    public string? Message { get; init; }

    /// <summary>
    /// The measurements retrieved (if successful)
    /// </summary>
    public List<RawMeasurement>? Measurements { get; init; }
}

/// <summary>
/// Types of provider sync errors
/// </summary>
public enum ProviderSyncError
{
    /// <summary>
    /// OAuth token is invalid or expired and cannot be refreshed
    /// </summary>
    AuthFailed,

    /// <summary>
    /// Network or API communication error
    /// </summary>
    NetworkError,

    /// <summary>
    /// Unknown or unexpected error
    /// </summary>
    Unknown
}

