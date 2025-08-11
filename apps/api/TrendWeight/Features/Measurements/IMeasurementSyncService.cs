using TrendWeight.Features.Measurements.Models;
using TrendWeight.Features.Providers.Models;

namespace TrendWeight.Features.Measurements;

/// <summary>
/// Service responsible for orchestrating measurement synchronization between providers and storage
/// </summary>
public interface IMeasurementSyncService
{
    /// <summary>
    /// Gets measurements for a user with automatic refresh of stale providers
    /// </summary>
    /// <param name="userId">User's Supabase UID</param>
    /// <param name="activeProviders">List of active providers for the user</param>
    /// <param name="useMetric">Whether user prefers metric units</param>
    /// <returns>Measurement data and provider sync status</returns>
    Task<MeasurementsResult> GetMeasurementsForUserAsync(
        Guid userId,
        List<string> activeProviders,
        bool useMetric);

    /// <summary>
    /// Clears source data for a specific provider
    /// </summary>
    /// <param name="userId">User's Supabase UID</param>
    /// <param name="provider">Provider name to clear data for</param>
    /// <returns>Result with success status</returns>
    Task<ProviderSyncResult> ClearProviderDataAsync(
        Guid userId,
        string provider);
}
