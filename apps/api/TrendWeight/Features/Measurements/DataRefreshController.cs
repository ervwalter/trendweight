using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Features.Providers;

namespace TrendWeight.Features.Measurements;

/// <summary>
/// Controller for refreshing measurement data from all providers
/// </summary>
[ApiController]
[Route("api/data")]
[Authorize]
public class DataRefreshController : ControllerBase
{
    private readonly IProfileService _profileService;
    private readonly IProviderIntegrationService _providerIntegrationService;
    private readonly ISourceDataService _sourceDataService;
    private readonly ILogger<DataRefreshController> _logger;

    public DataRefreshController(
        IProfileService profileService,
        IProviderIntegrationService providerIntegrationService,
        ISourceDataService sourceDataService,
        ILogger<DataRefreshController> logger)
    {
        _profileService = profileService;
        _providerIntegrationService = providerIntegrationService;
        _sourceDataService = sourceDataService;
        _logger = logger;
    }

    /// <summary>
    /// Refreshes measurement data from all connected providers
    /// </summary>
    /// <returns>Status of each provider sync operation</returns>
    [HttpPost("refresh")]
    public async Task<IActionResult> RefreshData()
    {
        try
        {
            // Get Supabase UID from JWT
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "User ID not found in token" });
            }

            _logger.LogInformation("Refreshing data for user ID: {UserId}", userId);

            // Get user by Supabase UID
            var user = await _profileService.GetByIdAsync(userId);
            if (user == null)
            {
                return NotFound(new { error = "User not found" });
            }

            // Get active providers for user
            var activeProviders = await _providerIntegrationService.GetActiveProvidersAsync(user.Uid);
            if (activeProviders.Count == 0)
            {
                return Ok(new
                {
                    message = "No active provider connections found",
                    providers = new Dictionary<string, object>()
                });
            }

            // Check for any providers that need resync
            var providersNeedingResync = new List<string>();
            foreach (var provider in activeProviders)
            {
                if (await _sourceDataService.IsResyncRequestedAsync(user.Uid, provider))
                {
                    providersNeedingResync.Add(provider);
                    _logger.LogInformation("Provider {Provider} has resync requested flag set for user {UserId}", provider, user.Uid);
                }
            }

            // If any providers need resync, clear their data first
            foreach (var provider in providersNeedingResync)
            {
                await _sourceDataService.ClearSourceDataAsync(user.Uid, provider);
                _logger.LogInformation("Cleared data for {Provider} due to resync request", provider);
            }

            // Sync all providers
            var syncResults = await _providerIntegrationService.SyncAllProvidersAsync(
                user.Uid,
                user.Profile.UseMetric);

            // Build response
            var providerStatuses = new Dictionary<string, object>();
            foreach (var provider in activeProviders)
            {
                providerStatuses[provider] = new
                {
                    success = syncResults.TryGetValue(provider, out var success) && success,
                    synced = syncResults.ContainsKey(provider)
                };
            }

            return Ok(new
            {
                message = "Data refresh completed",
                providers = providerStatuses,
                timestamp = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing data");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Refreshes measurement data from a specific provider
    /// </summary>
    /// <param name="provider">The provider name (e.g., "withings", "fitbit")</param>
    /// <returns>Status of the sync operation</returns>
    [HttpPost("refresh/{provider}")]
    public async Task<IActionResult> RefreshProviderData(string provider)
    {
        try
        {
            // Get Supabase UID from JWT
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { error = "User ID not found in token" });
            }

            // Get user by Supabase UID
            var user = await _profileService.GetByIdAsync(userId);
            if (user == null)
            {
                return NotFound(new { error = "User not found" });
            }

            // Get provider service
            var providerService = _providerIntegrationService.GetProviderService(provider);
            if (providerService == null)
            {
                return BadRequest(new { error = $"Unknown provider: {provider}" });
            }

            // Check if user has active provider link
            if (!await providerService.HasActiveProviderLinkAsync(user.Uid))
            {
                return NotFound(new { error = $"No active {provider} connection found" });
            }

            // Sync provider data
            _logger.LogInformation("Refreshing {Provider} data for user {UserId}", provider, user.Uid);
            var syncResult = await providerService.SyncMeasurementsAsync(user.Uid, user.Profile.UseMetric);

            if (syncResult.Success)
            {
                return Ok(new
                {
                    message = $"{provider} data refreshed successfully",
                    provider = provider,
                    timestamp = DateTime.UtcNow
                });
            }
            else
            {
                return StatusCode(500, new { error = $"Failed to refresh {provider} data" });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing {Provider} data", provider);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
}
