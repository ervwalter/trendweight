using System.Collections.Concurrent;
using System.Globalization;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Infrastructure.DataAccess;
using TrendWeight.Infrastructure.DataAccess.Models;

namespace TrendWeight.Features.Measurements;

/// <summary>
/// Service for managing source measurement data
/// Based on lib/data/source-data.ts in legacy code
/// </summary>
public class SourceDataService : ISourceDataService
{
    private readonly ISupabaseService _supabaseService;
    private readonly ILogger<SourceDataService> _logger;

    // Thread-safe in-memory cache for source data within the HTTP request scope
    private readonly ConcurrentDictionary<(Guid userId, string provider), DbSourceData> _dataCache = new();

    public SourceDataService(
        ISupabaseService supabaseService,
        ILogger<SourceDataService> logger)
    {
        _supabaseService = supabaseService;
        _logger = logger;
    }

    /// <summary>
    /// Gets source data from cache or fetches from database and caches it
    /// </summary>
    private async Task<DbSourceData?> GetOrFetchSourceDataAsync(Guid userId, string provider)
    {
        var key = (userId, provider);

        // Return from cache if available
        if (_dataCache.TryGetValue(key, out var cachedData))
        {
            _logger.LogDebug("Returning cached source data for user {UserId} provider {Provider}", userId, provider);
            return cachedData;
        }

        // Fetch from database
        var sourceDataList = await _supabaseService.QueryAsync<DbSourceData>(q =>
            q.Where(sd => sd.Uid == userId && sd.Provider == provider));

        var dbSourceData = sourceDataList.FirstOrDefault();
        if (dbSourceData == null)
        {
            _logger.LogDebug("No source data found for user {UserId} provider {Provider}", userId, provider);
            return null;
        }

        // Cache the raw DB data and return
        _dataCache[key] = dbSourceData;
        _logger.LogDebug("Cached source data for user {UserId} provider {Provider}", userId, provider);

        return dbSourceData;
    }

    /// <summary>
    /// Updates source data in database and cache
    /// </summary>
    private async Task UpdateAndCacheSourceDataAsync(Guid userId, SourceData sourceData)
    {
        // Check if record exists to determine insert vs update
        var existingData = await _supabaseService.QueryAsync<DbSourceData>(q =>
            q.Where(sd => sd.Uid == userId && sd.Provider == sourceData.Source));

        var dbSourceData = existingData.FirstOrDefault();

        if (dbSourceData == null)
        {
            // Create new record
            dbSourceData = new DbSourceData
            {
                Uid = userId,
                Provider = sourceData.Source,
                Measurements = sourceData.Measurements ?? new List<RawMeasurement>(),
                LastSync = sourceData.LastUpdate.ToUniversalTime().ToString("o"),
                UpdatedAt = DateTime.UtcNow.ToString("o")
            };

            await _supabaseService.InsertAsync(dbSourceData);
            _logger.LogInformation("Created source data for user {Uid} provider {Provider}", userId, sourceData.Source);
        }
        else
        {
            // Update existing record with new data
            dbSourceData.Measurements = sourceData.Measurements ?? new List<RawMeasurement>();
            dbSourceData.LastSync = sourceData.LastUpdate.ToUniversalTime().ToString("o");
            dbSourceData.UpdatedAt = DateTime.UtcNow.ToString("o");

            await _supabaseService.UpdateAsync(dbSourceData);
            _logger.LogInformation("Updated source data for user {Uid} provider {Provider}", userId, sourceData.Source);
        }

        // Update cache with the saved DbSourceData
        var key = (userId, sourceData.Source);
        _dataCache[key] = dbSourceData;
        _logger.LogDebug("Updated cache for user {UserId} provider {Provider}", userId, sourceData.Source);
    }

    /// <summary>
    /// Clears cache entries for a user and optionally specific provider
    /// </summary>
    private void ClearCache(Guid userId, string? provider = null)
    {
        if (provider != null)
        {
            // Clear specific provider
            var key = (userId, provider);
            _dataCache.TryRemove(key, out _);
            _logger.LogDebug("Removed from cache for user {UserId} provider {Provider}", userId, provider);
        }
        else
        {
            // Clear all entries for this user
            var keysToRemove = _dataCache.Keys.Where(k => k.userId == userId).ToList();
            foreach (var key in keysToRemove)
            {
                _dataCache.TryRemove(key, out _);
            }
            _logger.LogDebug("Cleared all cache entries for user {UserId}", userId);
        }
    }

    /// <inheritdoc />
    public async Task UpdateSourceDataAsync(Guid userId, List<SourceData> data)
    {
        try
        {
            // Save each source data
            foreach (var sourceData in data)
            {
                await UpdateAndCacheSourceDataAsync(userId, sourceData);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving source data for user {Uid}", userId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<List<SourceData>?> GetSourceDataAsync(Guid userId, List<string> activeProviders)
    {
        try
        {
            var result = new List<SourceData>();
            var providersToFetch = new List<string>();

            // Check cache first for each provider
            foreach (var provider in activeProviders)
            {
                var key = (userId, provider);
                if (_dataCache.TryGetValue(key, out var cachedData))
                {
                    // Convert cached DbSourceData to SourceData
                    var lastSync = string.IsNullOrEmpty(cachedData.LastSync)
                        ? DateTime.UtcNow
                        : DateTime.Parse(cachedData.LastSync, null, DateTimeStyles.RoundtripKind).ToUniversalTime();

                    result.Add(new SourceData
                    {
                        Source = cachedData.Provider,
                        LastUpdate = lastSync,
                        Measurements = cachedData.Measurements
                    });

                    _logger.LogDebug("Returning cached source data for user {UserId} provider {Provider}", userId, provider);
                }
                else
                {
                    providersToFetch.Add(provider);
                }
            }

            // If we need to fetch any providers from database, do it in one bulk query
            if (providersToFetch.Count > 0)
            {
                var sourceDataList = await _supabaseService.QueryAsync<DbSourceData>(q =>
                    q.Filter("uid", Supabase.Postgrest.Constants.Operator.Equals, userId.ToString())
                     .Filter("provider", Supabase.Postgrest.Constants.Operator.In, providersToFetch.Cast<object>().ToList()));

                foreach (var dbSourceData in sourceDataList)
                {
                    // Cache the fetched data
                    var key = (userId, dbSourceData.Provider);
                    _dataCache[key] = dbSourceData;
                    _logger.LogDebug("Cached source data for user {UserId} provider {Provider}", userId, dbSourceData.Provider);

                    // Convert to SourceData
                    var lastSync = string.IsNullOrEmpty(dbSourceData.LastSync)
                        ? DateTime.UtcNow
                        : DateTime.Parse(dbSourceData.LastSync, null, DateTimeStyles.RoundtripKind).ToUniversalTime();

                    result.Add(new SourceData
                    {
                        Source = dbSourceData.Provider,
                        LastUpdate = lastSync,
                        Measurements = dbSourceData.Measurements
                    });
                }
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting source data for user {Uid} with providers {Providers}", userId, string.Join(", ", activeProviders));
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<DateTime?> GetLastSyncTimeAsync(Guid userId, string provider)
    {
        try
        {
            var dbSourceData = await GetOrFetchSourceDataAsync(userId, provider);
            if (dbSourceData == null || string.IsNullOrEmpty(dbSourceData.LastSync))
            {
                return null;
            }

            return DateTime.Parse(dbSourceData.LastSync, null, DateTimeStyles.RoundtripKind).ToUniversalTime();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting last sync time for user {UserId} provider {Provider}", userId, provider);
            return null;
        }
    }

    /// <inheritdoc />
    public async Task<bool> GetForceFullSyncAsync(Guid userId, string provider)
    {
        try
        {
            var dbSourceData = await GetOrFetchSourceDataAsync(userId, provider);
            return dbSourceData?.ForceFullSync ?? false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting force_full_sync for user {UserId} provider {Provider}", userId, provider);
            return false;
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
                    data.UpdatedAt = DateTime.UtcNow.ToString("o");

                    await _supabaseService.UpdateAsync(data);
                    _logger.LogInformation("Cleared source data for user {UserId} provider {Provider}", userId, provider);
                }

                // Clear from cache
                ClearCache(userId, provider);
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
                    data.UpdatedAt = DateTime.UtcNow.ToString("o");

                    await _supabaseService.UpdateAsync(data);
                }

                // Clear from cache
                ClearCache(userId);

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

            // Clear from cache
            ClearCache(userId, provider);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting source data for user {UserId} provider {Provider}", userId, provider);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task DeleteAllSourceDataAsync(Guid userId)
    {
        try
        {
            var allSourceData = await _supabaseService.QueryAsync<DbSourceData>(q =>
                q.Where(sd => sd.Uid == userId));

            foreach (var data in allSourceData)
            {
                await _supabaseService.DeleteAsync<DbSourceData>(data);
            }

            // Clear from cache
            ClearCache(userId);

            _logger.LogInformation("Deleted all source data for user {UserId}", userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting all source data for user {UserId}", userId);
            throw;
        }
    }

}
