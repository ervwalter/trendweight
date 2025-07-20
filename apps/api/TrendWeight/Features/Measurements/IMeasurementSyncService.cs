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
    /// Forces a full resync of a specific provider for a user
    /// </summary>
    /// <param name="userId">User's Supabase UID</param>
    /// <param name="provider">Provider name to resync</param>
    /// <param name="useMetric">Whether user prefers metric units</param>
    /// <returns>Sync result with success status</returns>
    Task<ProviderSyncResult> ResyncProviderAsync(
        Guid userId,
        string provider,
        bool useMetric);
}
