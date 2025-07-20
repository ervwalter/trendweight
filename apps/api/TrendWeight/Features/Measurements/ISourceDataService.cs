using TrendWeight.Features.Measurements.Models;

namespace TrendWeight.Features.Measurements;

/// <summary>
/// Service for managing source measurement data
/// Based on lib/data/source-data.ts in legacy code
/// </summary>
public interface ISourceDataService
{
    /// <summary>
    /// Updates source data for a user
    /// </summary>
    Task UpdateSourceDataAsync(Guid userId, List<SourceData> data);

    /// <summary>
    /// Gets all source data for a user
    /// </summary>
    Task<List<SourceData>?> GetSourceDataAsync(Guid userId);

    /// <summary>
    /// Get the last sync time for a specific provider
    /// </summary>
    /// <param name="userId">User's Supabase UID</param>
    /// <param name="provider">Provider name (e.g., "withings", "fitbit")</param>
    /// <returns>Last sync DateTime in UTC, or null if no data exists</returns>
    Task<DateTime?> GetLastSyncTimeAsync(Guid userId, string provider);

    /// <summary>
    /// Clears source data for a user
    /// </summary>
    /// <param name="userId">User's Supabase UID</param>
    /// <param name="provider">Optional provider name to clear specific provider data. If null, clears all source data.</param>
    Task ClearSourceDataAsync(Guid userId, string? provider = null);

    /// <summary>
    /// Sets the resync requested flag for a provider
    /// </summary>
    /// <param name="userId">User's Supabase UID</param>
    /// <param name="provider">Provider name</param>
    Task SetResyncRequestedAsync(Guid userId, string provider);

    /// <summary>
    /// Checks if resync is requested for a provider
    /// </summary>
    /// <param name="userId">User's Supabase UID</param>
    /// <param name="provider">Provider name</param>
    /// <returns>True if resync is requested</returns>
    Task<bool> IsResyncRequestedAsync(Guid userId, string provider);

    /// <summary>
    /// Deletes source data for a user
    /// </summary>
    /// <param name="userId">User's Supabase UID</param>
    /// <param name="provider">Provider name to delete specific provider data</param>
    Task DeleteSourceDataAsync(Guid userId, string provider);

    /// <summary>
    /// Deletes all source data for a user
    /// </summary>
    /// <param name="userId">User's Supabase UID</param>
    Task DeleteAllSourceDataAsync(Guid userId);

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
}
