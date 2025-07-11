using System.Text.Json;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Infrastructure.DataAccess;
using TrendWeight.Infrastructure.DataAccess.Models;
// Import database models directly
using FeatureSourceData = TrendWeight.Features.Measurements.Models.SourceData;

namespace TrendWeight.Features.Measurements;

/// <summary>
/// Service for managing source measurement data
/// Based on lib/data/source-data.ts in legacy code
/// </summary>
public class SourceDataService : ISourceDataService
{
    private readonly ISupabaseService _supabaseService;
    private readonly ILogger<SourceDataService> _logger;

    public SourceDataService(ISupabaseService supabaseService, ILogger<SourceDataService> logger)
    {
        _supabaseService = supabaseService;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task UpdateSourceDataAsync(Guid userId, List<FeatureSourceData> data)
    {
        try
        {

            // Update each source data
            foreach (var sourceData in data)
            {
                // Check if source data already exists
                var existingData = await _supabaseService.QueryAsync<DbSourceData>(q =>
                    q.Where(sd => sd.Uid == userId && sd.Provider == sourceData.Source));

                var dbSourceData = existingData.FirstOrDefault();

                if (dbSourceData == null)
                {
                    // Create new source data
                    dbSourceData = new DbSourceData
                    {
                        Uid = userId,
                        Provider = sourceData.Source,
                        Measurements = sourceData.Measurements ?? new List<RawMeasurement>(),
                        LastSync = sourceData.LastUpdate.ToUniversalTime().ToString("o"),
                        UpdatedAt = DateTime.UtcNow.ToString("o")
                    };

                    await _supabaseService.InsertAsync(dbSourceData);
                    _logger.LogInformation("Created new source data for user {Uid} provider {Provider}", userId, sourceData.Source);
                }
                else
                {
                    // Merge measurements instead of replacing
                    var newMeasurements = sourceData.Measurements ?? new List<RawMeasurement>();
                    var existingMeasurements = dbSourceData.Measurements ?? new List<RawMeasurement>();

                    // Calculate the cutoff timestamp (90 days before last sync)
                    var lastSyncTime = string.IsNullOrEmpty(dbSourceData.LastSync)
                        ? DateTime.UtcNow
                        : DateTime.Parse(dbSourceData.LastSync, null, System.Globalization.DateTimeStyles.RoundtripKind).ToUniversalTime();
                    var cutoffTimestamp = ((DateTimeOffset)lastSyncTime.AddDays(-90)).ToUnixTimeSeconds();

                    // Sort new measurements in descending order by timestamp
                    newMeasurements.Sort((a, b) => b.Timestamp.CompareTo(a.Timestamp));

                    // Get existing measurements that should be replaced (within the refresh window)
                    var existingMeasurementsToReplace = existingMeasurements
                        .Where(m => m.Timestamp >= cutoffTimestamp)
                        .OrderByDescending(m => m.Timestamp)
                        .ToList();

                    // Check if data actually changed by comparing overlapping measurements
                    bool dataChanged = !AreMeasurementsEqual(existingMeasurementsToReplace, newMeasurements);

                    if (dataChanged)
                    {
                        // Keep older measurements (before the refresh window)
                        var existingMeasurementsToKeep = existingMeasurements
                            .Where(m => m.Timestamp < cutoffTimestamp)
                            .ToList();

                        // Combine: new measurements + older kept measurements
                        var mergedMeasurements = newMeasurements.Concat(existingMeasurementsToKeep).ToList();

                        // Sort merged measurements in descending order
                        mergedMeasurements.Sort((a, b) => b.Timestamp.CompareTo(a.Timestamp));

                        // Update the measurements
                        dbSourceData.Measurements = mergedMeasurements;

                        _logger.LogInformation("Merged measurements for user {Uid} provider {Provider}: " +
                            "{NewCount} new + {KeptCount} kept = {TotalCount} total",
                            userId, sourceData.Source, newMeasurements.Count,
                            existingMeasurementsToKeep.Count, mergedMeasurements.Count);
                    }
                    else
                    {
                        _logger.LogInformation("No measurement changes detected for user {Uid} provider {Provider}",
                            userId, sourceData.Source);
                    }

                    // Always update LastSync timestamp and clear resync flag
                    dbSourceData.LastSync = sourceData.LastUpdate.ToUniversalTime().ToString("o");
                    dbSourceData.ResyncRequested = false; // Clear the flag after successful sync
                    dbSourceData.UpdatedAt = DateTime.UtcNow.ToString("o");

                    await _supabaseService.UpdateAsync(dbSourceData);
                    _logger.LogInformation("Updated source data for user {Uid} provider {Provider}", userId, sourceData.Source);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating source data for user {Uid}", userId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<List<FeatureSourceData>?> GetSourceDataAsync(Guid userId)
    {
        try
        {
            // Get all source data for the user
            var sourceDataList = await _supabaseService.QueryAsync<DbSourceData>(q =>
                q.Where(sd => sd.Uid == userId));

            if (sourceDataList.Count == 0)
            {
                return new List<FeatureSourceData>();
            }

            // Convert to feature models
            var result = new List<FeatureSourceData>();
            foreach (var dbSourceData in sourceDataList)
            {
                var measurements = dbSourceData.Measurements;

                // Parse ISO timestamp string as UTC
                var lastSync = string.IsNullOrEmpty(dbSourceData.LastSync)
                    ? DateTime.UtcNow
                    : DateTime.Parse(dbSourceData.LastSync, null, System.Globalization.DateTimeStyles.RoundtripKind).ToUniversalTime();

                result.Add(new FeatureSourceData
                {
                    Source = dbSourceData.Provider,
                    LastUpdate = lastSync,
                    Measurements = measurements
                });
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting source data for user {Uid}", userId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<DateTime?> GetLastSyncTimeAsync(Guid userId, string provider)
    {
        try
        {
            var sourceData = await _supabaseService.QueryAsync<DbSourceData>(q =>
                q.Where(sd => sd.Uid == userId && sd.Provider == provider));

            var data = sourceData.FirstOrDefault();
            if (data == null)
                return null;

            // Parse ISO timestamp string as UTC
            if (string.IsNullOrEmpty(data.LastSync))
                return null;

            return DateTime.Parse(data.LastSync, null, System.Globalization.DateTimeStyles.RoundtripKind).ToUniversalTime();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting last sync time for user {UserId} provider {Provider}", userId, provider);
            return null;
        }
    }

    /// <inheritdoc />
    public async Task ClearSourceDataAsync(Guid userId, string? provider = null)
    {
        try
        {
            if (provider != null)
            {
                // Clear specific provider data
                var sourceData = await _supabaseService.QueryAsync<DbSourceData>(q =>
                    q.Where(sd => sd.Uid == userId && sd.Provider == provider));

                var data = sourceData.FirstOrDefault();
                if (data != null)
                {
                    // Clear measurements array
                    data.Measurements = new List<RawMeasurement>();
                    data.LastSync = null;
                    data.ResyncRequested = false; // Clear the flag when clearing data
                    data.UpdatedAt = DateTime.UtcNow.ToString("o");

                    await _supabaseService.UpdateAsync(data);
                    _logger.LogInformation("Cleared source data for user {UserId} provider {Provider}", userId, provider);
                }
            }
            else
            {
                // Clear all source data for the user
                var allSourceData = await _supabaseService.QueryAsync<DbSourceData>(q =>
                    q.Where(sd => sd.Uid == userId));

                foreach (var data in allSourceData)
                {
                    data.Measurements = new List<RawMeasurement>();
                    data.LastSync = null;
                    data.ResyncRequested = false; // Clear the flag when clearing data
                    data.UpdatedAt = DateTime.UtcNow.ToString("o");

                    await _supabaseService.UpdateAsync(data);
                }

                _logger.LogInformation("Cleared all source data for user {UserId}", userId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing source data for user {UserId} provider {Provider}", userId, provider);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task SetResyncRequestedAsync(Guid userId, string provider)
    {
        try
        {
            var sourceData = await _supabaseService.QueryAsync<DbSourceData>(q =>
                q.Where(sd => sd.Uid == userId && sd.Provider == provider));

            var data = sourceData.FirstOrDefault();
            if (data == null)
            {
                // Create a new entry with resync requested
                data = new DbSourceData
                {
                    Uid = userId,
                    Provider = provider,
                    Measurements = new List<RawMeasurement>(),
                    ResyncRequested = true,
                    UpdatedAt = DateTime.UtcNow.ToString("o")
                };
                await _supabaseService.InsertAsync(data);
            }
            else
            {
                // Update existing entry
                data.ResyncRequested = true;
                data.UpdatedAt = DateTime.UtcNow.ToString("o");
                await _supabaseService.UpdateAsync(data);
            }

            _logger.LogInformation("Set resync requested for user {UserId} provider {Provider}", userId, provider);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting resync requested for user {UserId} provider {Provider}", userId, provider);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<bool> IsResyncRequestedAsync(Guid userId, string provider)
    {
        try
        {
            var sourceData = await _supabaseService.QueryAsync<DbSourceData>(q =>
                q.Where(sd => sd.Uid == userId && sd.Provider == provider));

            var data = sourceData.FirstOrDefault();
            return data?.ResyncRequested ?? false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking resync requested for user {UserId} provider {Provider}", userId, provider);
            return false;
        }
    }

    /// <summary>
    /// Compares two lists of measurements for equality
    /// </summary>
    private static bool AreMeasurementsEqual(List<RawMeasurement> list1, List<RawMeasurement> list2)
    {
        if (list1.Count != list2.Count)
            return false;

        for (int i = 0; i < list1.Count; i++)
        {
            var m1 = list1[i];
            var m2 = list2[i];

            if (m1.Timestamp != m2.Timestamp ||
                m1.Weight != m2.Weight ||
                m1.FatRatio != m2.FatRatio)
            {
                return false;
            }
        }

        return true;
    }

    /// <inheritdoc />
    public async Task DeleteSourceDataAsync(Guid userId, string provider)
    {
        try
        {
            var sourceData = await _supabaseService.QueryAsync<DbSourceData>(q =>
                q.Where(sd => sd.Uid == userId && sd.Provider == provider));

            var data = sourceData.FirstOrDefault();
            if (data != null)
            {
                await _supabaseService.DeleteAsync<DbSourceData>(data);
                _logger.LogInformation("Deleted source data row for user {UserId} provider {Provider}", userId, provider);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting source data for user {UserId} provider {Provider}", userId, provider);
            throw;
        }
    }
}
