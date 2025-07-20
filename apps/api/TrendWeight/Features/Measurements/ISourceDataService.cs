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
}
