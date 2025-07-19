using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Features.Providers;
using TrendWeight.Features.Providers.Models;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Infrastructure.DataAccess.Models;

namespace TrendWeight.Features.Measurements;

/// <summary>
/// Controller for fetching measurement data
/// Based on legacy pages/api/data/index.ts
/// </summary>
[ApiController]
[Route("api/data")]
[Authorize]
public class MeasurementsController : ControllerBase
{
    private readonly IProfileService _profileService;
    private readonly IProviderIntegrationService _providerIntegrationService;
    private readonly ISourceDataService _sourceDataService;
    private readonly ILogger<MeasurementsController> _logger;
    private readonly IWebHostEnvironment _environment;

    // Data is considered fresh for 5 minutes in production
    private const int CACHE_DURATION_SECONDS_PRODUCTION = 300;
    // Use shorter cache duration in development for easier debugging  
    private const int CACHE_DURATION_SECONDS_DEVELOPMENT = 10;

    private readonly int _cacheDurationSeconds;

    public MeasurementsController(
        IProfileService profileService,
        IProviderIntegrationService providerIntegrationService,
        ISourceDataService sourceDataService,
        ILogger<MeasurementsController> logger,
        IWebHostEnvironment environment)
    {
        _profileService = profileService;
        _providerIntegrationService = providerIntegrationService;
        _sourceDataService = sourceDataService;
        _logger = logger;
        _environment = environment;

        _cacheDurationSeconds = _environment.IsDevelopment()
            ? CACHE_DURATION_SECONDS_DEVELOPMENT
            : CACHE_DURATION_SECONDS_PRODUCTION;

        _logger.LogDebug("Cache duration set to {Duration} seconds ({Environment} mode)",
            _cacheDurationSeconds, _environment.EnvironmentName);
    }

    /// <summary>
    /// Gets measurement data, refreshing from providers if needed
    /// Matches legacy /api/data endpoint behavior
    /// </summary>
    /// <returns>MeasurementsResponse with data and provider status</returns>
    [HttpGet]
    public async Task<IActionResult> GetMeasurements()
    {
        try
        {
            // Get Supabase UID from JWT
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "User ID not found in token" });
            }

            _logger.LogInformation("Getting measurements for user ID: {UserId}", userId);

            // Get user by Supabase UID
            var user = await _profileService.GetByIdAsync(userId);
            if (user == null)
            {
                return NotFound(new { error = "User not found" });
            }

            return await GetMeasurementsForUser(user, isMe: true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting measurements");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Gets measurement data via sharing code, refreshing from providers if needed
    /// </summary>
    /// <param name="sharingCode">The sharing code</param>
    /// <returns>MeasurementsResponse with data and provider status</returns>
    [HttpGet("{sharingCode}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetMeasurementsBySharingCode(string sharingCode)
    {
        try
        {
            // Get user by sharing code
            var user = await _profileService.GetBySharingTokenAsync(sharingCode);
            if (user == null)
            {
                _logger.LogWarning("User not found for sharing code: {SharingCode}", sharingCode);
                return NotFound(new { error = "User not found" });
            }

            _logger.LogInformation("Getting measurements for user ID: {UserId} via sharing code", user.Uid);

            // Always return isMe = false when using sharing code
            // This allows users to preview how their dashboard appears to others
            return await GetMeasurementsForUser(user, isMe: false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting measurements for sharing code");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    private async Task<IActionResult> GetMeasurementsForUser(DbProfile user, bool isMe)
    {
        try
        {
            var userId = user.Uid;

            // Get active providers
            var activeProviders = await _providerIntegrationService.GetActiveProvidersAsync(userId);

            // Track provider sync status
            var providerStatus = new Dictionary<string, ProviderSyncStatus>();

            // For each active provider, check if refresh is needed
            var refreshTasks = new List<Task<ProviderSyncResult>>();
            var now = DateTime.UtcNow;

            // Check each provider's last sync time directly from the database
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
                    refreshTasks.Add(RefreshProviderAsync(userId, provider, user.Profile.UseMetric));
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
            var currentData = await _sourceDataService.GetSourceDataAsync(userId) ?? new List<SourceData>();

            // Return the enhanced response with isMe flag
            // Only include providerStatus when it's the authenticated user
            var response = new Dictionary<string, object>
            {
                ["data"] = currentData,
                ["isMe"] = isMe
            };

            if (isMe)
            {
                response["providerStatus"] = providerStatus;
            }

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting measurements for user");
            return StatusCode(500, new { error = "Internal server error" });
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
