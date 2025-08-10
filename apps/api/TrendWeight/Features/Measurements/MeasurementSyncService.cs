using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Features.Providers;
using TrendWeight.Features.Providers.Models;
using TrendWeight.Features.SyncProgress;

namespace TrendWeight.Features.Measurements;

/// <summary>
/// Service responsible for orchestrating measurement synchronization between providers and storage
/// </summary>
public class MeasurementSyncService : IMeasurementSyncService
{
    private readonly IProviderIntegrationService _providerIntegrationService;
    private readonly ISourceDataService _sourceDataService;
    private readonly ILogger<MeasurementSyncService> _logger;
    private readonly ISyncProgressReporter? _progressReporter;
    private readonly int _cacheDurationSeconds;

    // Data is considered fresh for 5 minutes in production
    private const int CACHE_DURATION_SECONDS_PRODUCTION = 300;
    // Use shorter cache duration in development for easier debugging  
    private const int CACHE_DURATION_SECONDS_DEVELOPMENT = 10;

    public MeasurementSyncService(
        IProviderIntegrationService providerIntegrationService,
        ISourceDataService sourceDataService,
        ILogger<MeasurementSyncService> logger,
        IWebHostEnvironment environment,
        ISyncProgressReporter? progressReporter = null)
    {
        _providerIntegrationService = providerIntegrationService;
        _sourceDataService = sourceDataService;
        _logger = logger;
        _progressReporter = progressReporter;

        _cacheDurationSeconds = environment.IsDevelopment()
            ? CACHE_DURATION_SECONDS_DEVELOPMENT
            : CACHE_DURATION_SECONDS_PRODUCTION;
    }

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
                var lastSync = await _sourceDataService.GetLastSyncTimeAsync(userId, provider);
                var needsRefresh = lastSync == null || (now - lastSync.Value).TotalSeconds > _cacheDurationSeconds;

                if (lastSync != null)
                {
                    _logger.LogInformation("Provider {Provider} - Now: {Now}, LastSync: {LastSync}, Age: {Age}s, CacheDuration: {CacheDuration}s",
                        provider, now.ToString("o"), lastSync.Value.ToString("o"), (now - lastSync.Value).TotalSeconds, _cacheDurationSeconds);
                }

                if (needsRefresh)
                {
                    _logger.LogInformation("Provider {Provider} needs refresh (last sync: {LastSync})",
                        provider, lastSync?.ToString("o") ?? "never");

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
                // Start progress reporting if we have a reporter
                if (_progressReporter != null)
                {
                    await _progressReporter.StartAsync("all", "running");
                }

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

                // Update overall status based on results
                if (_progressReporter != null)
                {
                    var allSuccess = refreshResults.All(r => r.Success);
                    if (allSuccess)
                    {
                        await _progressReporter.UpdateStatusAsync("succeeded", "Sync completed successfully");
                    }
                    else
                    {
                        var failedProviders = refreshResults.Where(r => !r.Success).Select(r => r.Provider);
                        await _progressReporter.UpdateStatusAsync("failed", $"Sync failed for: {string.Join(", ", failedProviders)}");
                    }
                }
            }

            // Get the current data (whether refreshed or cached) - only for active providers
            var currentData = await _sourceDataService.GetSourceDataAsync(userId, activeProviders) ?? new List<SourceData>();

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
            var providerService = _providerIntegrationService.GetProviderService(provider);
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

            // Calculate start date for sync
            DateTime? startDate = null;
            // For regular refresh, fetch from 90 days before last sync
            var lastSyncTime = await _sourceDataService.GetLastSyncTimeAsync(userId, provider);
            if (lastSyncTime.HasValue)
            {
                startDate = lastSyncTime.Value.AddDays(-90);
                _logger.LogDebug("Fetching {Provider} measurements from {StartDate} (90 days before last sync)",
                    provider, startDate.Value.ToString("o"));
            }
            else
            {
                // No previous sync - fetch all data
                _logger.LogDebug("No previous sync for {Provider}, fetching all measurements", provider);
            }

            // Sync measurements from provider
            var result = await providerService.SyncMeasurementsAsync(userId, useMetric, startDate);

            // If sync was successful and we have measurements, merge and store them
            if (result.Success && result.Measurements != null)
            {
                // Get existing data to merge with - only need data for this specific provider
                var existingSourceData = await _sourceDataService.GetSourceDataAsync(userId, new List<string> { provider });
                var existingProviderData = existingSourceData?.FirstOrDefault(sd => sd.Source == provider);

                List<RawMeasurement> mergedMeasurements;

                if (existingProviderData?.Measurements != null && startDate.HasValue)
                {
                    // We have existing data and a sync window - merge them
                    var cutoffDate = startDate.Value.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);

                    // Keep only measurements before the cutoff date from existing data
                    var existingMeasurementsToKeep = existingProviderData.Measurements
                        .Where(m => string.Compare(m.Date, cutoffDate, StringComparison.Ordinal) < 0)
                        .ToList();

                    // Combine: new measurements (truth for sync window) + older kept measurements
                    mergedMeasurements = result.Measurements.Concat(existingMeasurementsToKeep).ToList();
                }
                else
                {
                    // No existing data or no start date (full sync) - use provider data as complete truth
                    mergedMeasurements = result.Measurements;
                }

                // Sort merged measurements in descending order by date/time
                mergedMeasurements.Sort((a, b) => string.Compare($"{b.Date} {b.Time}", $"{a.Date} {a.Time}", StringComparison.Ordinal));

                var sourceData = new SourceData
                {
                    Source = provider,
                    LastUpdate = DateTime.UtcNow,
                    Measurements = mergedMeasurements
                };

                await _sourceDataService.UpdateSourceDataAsync(userId, new List<SourceData> { sourceData });
                _logger.LogInformation("Successfully stored {Count} measurements for {Provider}",
                    mergedMeasurements.Count, provider);
            }

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

    public async Task<ProviderSyncResult> ResyncProviderAsync(
        Guid userId,
        string provider,
        bool useMetric)
    {
        try
        {
            // Clear existing source data for this provider
            await _sourceDataService.ClearSourceDataAsync(userId, provider);
            _logger.LogInformation("Cleared source data for {Provider} for user {UserId}", provider, userId);

            // Now refresh - it will fetch all data since LastSync is null
            return await RefreshProviderAsync(userId, provider, useMetric);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resyncing {Provider} data", provider);
            return new ProviderSyncResult
            {
                Provider = provider,
                Success = false,
                Error = ProviderSyncError.Unknown,
                Message = $"Unexpected error resyncing {provider} data"
            };
        }
    }
}
