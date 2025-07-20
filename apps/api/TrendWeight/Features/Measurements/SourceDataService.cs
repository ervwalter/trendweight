using System.Globalization;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Features.Providers;
using TrendWeight.Features.Providers.Models;
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
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<SourceDataService> _logger;
    private readonly int _cacheDurationSeconds;
    
    private IProviderIntegrationService? _providerIntegrationService;
    private IProviderIntegrationService ProviderIntegrationService => 
        _providerIntegrationService ??= _serviceProvider.GetRequiredService<IProviderIntegrationService>();

    // Data is considered fresh for 5 minutes in production
    private const int CACHE_DURATION_SECONDS_PRODUCTION = 300;
    // Use shorter cache duration in development for easier debugging  
    private const int CACHE_DURATION_SECONDS_DEVELOPMENT = 10;

    public SourceDataService(
        ISupabaseService supabaseService,
        IServiceProvider serviceProvider,
        ILogger<SourceDataService> logger,
        IWebHostEnvironment environment)
    {
        _supabaseService = supabaseService;
        _serviceProvider = serviceProvider;
        _logger = logger;

        _cacheDurationSeconds = environment.IsDevelopment()
            ? CACHE_DURATION_SECONDS_DEVELOPMENT
            : CACHE_DURATION_SECONDS_PRODUCTION;
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
                }
                else
                {
                    // Merge measurements instead of replacing
                    var newMeasurements = sourceData.Measurements ?? new List<RawMeasurement>();
                    var existingMeasurements = dbSourceData.Measurements ?? new List<RawMeasurement>();

                    // Calculate the cutoff date (90 days before last sync)
                    var lastSyncTime = string.IsNullOrEmpty(dbSourceData.LastSync)
                        ? DateTime.UtcNow
                        : DateTime.Parse(dbSourceData.LastSync, null, System.Globalization.DateTimeStyles.RoundtripKind).ToUniversalTime();
                    var cutoffDate = lastSyncTime.AddDays(-90).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

                    // Sort new measurements in descending order by date/time
                    newMeasurements.Sort((a, b) => string.Compare($"{b.Date} {b.Time}", $"{a.Date} {a.Time}", StringComparison.Ordinal));

                    // Get existing measurements that should be replaced (within the refresh window)
                    var existingMeasurementsToReplace = existingMeasurements
                        .Where(m => string.Compare(m.Date, cutoffDate, StringComparison.Ordinal) >= 0)
                        .OrderByDescending(m => $"{m.Date} {m.Time}")
                        .ToList();

                    // Check if data actually changed by comparing overlapping measurements
                    bool dataChanged = !AreMeasurementsEqual(existingMeasurementsToReplace, newMeasurements);

                    if (dataChanged)
                    {
                        // Keep older measurements (before the refresh window)
                        var existingMeasurementsToKeep = existingMeasurements
                            .Where(m => string.Compare(m.Date, cutoffDate, StringComparison.Ordinal) < 0)
                            .ToList();

                        // Combine: new measurements + older kept measurements
                        var mergedMeasurements = newMeasurements.Concat(existingMeasurementsToKeep).ToList();

                        // Sort merged measurements in descending order by date/time
                        mergedMeasurements.Sort((a, b) => string.Compare($"{b.Date} {b.Time}", $"{a.Date} {a.Time}", StringComparison.Ordinal));

                        // Update the measurements
                        dbSourceData.Measurements = mergedMeasurements;

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

            if (m1.Date != m2.Date ||
                m1.Time != m2.Time ||
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

            _logger.LogInformation("Deleted all source data for user {UserId}", userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting all source data for user {UserId}", userId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<MeasurementsResult> GetMeasurementsForUserAsync(
        Guid userId,
        List<string> activeProviders,
        bool useMetric)
    {
        try
        {
            // Track provider sync status
            var providerStatus = new Dictionary<string, ProviderSyncStatus>();

            // For each active provider, check if refresh is needed
            var refreshTasks = new List<Task<ProviderSyncResult>>();
            var now = DateTime.UtcNow;

            // Check each provider's last sync time and resync flag
            foreach (var provider in activeProviders)
            {
                // Check last sync time for this provider
                var lastSync = await GetLastSyncTimeAsync(userId, provider);
                var needsRefresh = lastSync == null || (now - lastSync.Value).TotalSeconds > _cacheDurationSeconds;

                // Also check if resync is requested
                var resyncRequested = await IsResyncRequestedAsync(userId, provider);

                if (lastSync != null)
                {
                    _logger.LogInformation("Provider {Provider} - Now: {Now}, LastSync: {LastSync}, Age: {Age}s, CacheDuration: {CacheDuration}s, ResyncRequested: {ResyncRequested}",
                        provider, now.ToString("o"), lastSync.Value.ToString("o"), (now - lastSync.Value).TotalSeconds, _cacheDurationSeconds, resyncRequested);
                }

                if (needsRefresh || resyncRequested)
                {
                    _logger.LogInformation("Provider {Provider} needs refresh (last sync: {LastSync}, resync requested: {ResyncRequested})",
                        provider, lastSync?.ToString("o") ?? "never", resyncRequested);

                    // Add refresh task
                    refreshTasks.Add(RefreshProviderAsync(userId, provider, useMetric));
                }
                else
                {
                    _logger.LogInformation("Provider {Provider} data is fresh (last sync: {LastSync})",
                        provider, lastSync!.Value.ToString("o"));

                    // Mark provider as successful since we have fresh data
                    providerStatus[provider] = new ProviderSyncStatus
                    {
                        Success = true
                    };
                }
            }

            // Wait for all refresh tasks to complete
            if (refreshTasks.Count > 0)
            {
                var refreshResults = await Task.WhenAll(refreshTasks);
                foreach (var result in refreshResults)
                {
                    providerStatus[result.Provider] = new ProviderSyncStatus
                    {
                        Success = result.Success,
                        Error = result.Error?.ToString().ToLowerInvariant(),
                        Message = result.Message
                    };

                    if (!result.Success)
                    {
                        _logger.LogWarning("Failed to refresh data for provider {Provider}: {Error}",
                            result.Provider, result.Message);
                    }
                }
            }

            // Get the current data (whether refreshed or cached)
            var currentData = await GetSourceDataAsync(userId) ?? new List<FeatureSourceData>();

            return new MeasurementsResult
            {
                Data = currentData,
                ProviderStatus = providerStatus
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting measurements for user");
            throw;
        }
    }

    private async Task<ProviderSyncResult> RefreshProviderAsync(Guid userId, string provider, bool useMetric)
    {
        try
        {
            var providerService = ProviderIntegrationService.GetProviderService(provider);
            if (providerService == null)
            {
                return new ProviderSyncResult
                {
                    Provider = provider,
                    Success = false,
                    Error = ProviderSyncError.Unknown,
                    Message = $"Provider service not found for {provider}"
                };
            }

            var result = await providerService.SyncMeasurementsAsync(userId, useMetric);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing {Provider} data", provider);
            return new ProviderSyncResult
            {
                Provider = provider,
                Success = false,
                Error = ProviderSyncError.Unknown,
                Message = $"Unexpected error refreshing {provider} data"
            };
        }
    }
}
