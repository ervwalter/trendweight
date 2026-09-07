using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using TrendWeight.Infrastructure.Configuration;
using TrendWeight.Features.Measurements;
using TrendWeight.Features.ProviderLinks.Services;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Features.Providers.Models;
using TrendWeight.Common.Models;
using TrendWeight.Infrastructure.DataAccess.Models;

namespace TrendWeight.Features.Providers;

[ApiController]
[Route("api/providers")]
[Authorize]
public class ProvidersController : ControllerBase
{
    private readonly IProviderLinkService _providerLinkService;
    private readonly ISourceDataService _sourceDataService;
    private readonly IProviderIntegrationService _providerIntegrationService;
    private readonly IMeasurementSyncService _measurementSyncService;
    private readonly IProfileService _profileService;
    private readonly FitbitConfig _fitbitConfig;
    private readonly ILogger<ProvidersController> _logger;

    public ProvidersController(
        IProviderLinkService providerLinkService,
        ISourceDataService sourceDataService,
        IProviderIntegrationService providerIntegrationService,
        IMeasurementSyncService measurementSyncService,
        IProfileService profileService,
        IOptions<AppOptions> appOptions,
        ILogger<ProvidersController> logger)
    {
        _providerLinkService = providerLinkService;
        _sourceDataService = sourceDataService;
        _providerIntegrationService = providerIntegrationService;
        _measurementSyncService = measurementSyncService;
        _profileService = profileService;
        _fitbitConfig = appOptions.Value.Fitbit;
        _logger = logger;
    }

    /// <summary>
    /// Gets provider availability configuration (e.g. whether Fitbit is disabled)
    /// </summary>
    [HttpGet("config")]
    public ActionResult<ProvidersConfigResponse> GetProvidersConfig()
    {
        var disabled = new List<string>();
        if (!_fitbitConfig.Enabled)
        {
            disabled.Add("fitbit");
        }

        return Ok(new ProvidersConfigResponse { DisabledProviders = disabled });
    }

    /// <summary>
    /// Gets all provider links for the authenticated user
    /// </summary>
    /// <returns>List of provider links</returns>
    [HttpGet("links")]
    public async Task<ActionResult<List<ProviderLinkResponse>>> GetProviderLinks()
    {
        try
        {
            // Get user ID from authenticated user claim
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
            {
                _logger.LogWarning("User ID not found or invalid in authenticated user claims");
                return Unauthorized(new ErrorResponse { Error = "User ID not found" });
            }

            return Ok(await BuildLinkResponsesAsync(userGuid, includeConnectedAt: true));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting provider links for user");
            return StatusCode(500, new ErrorResponse { Error = "Internal server error" });
        }
    }

    /// <summary>
    /// Disconnects a provider from the user's account
    /// </summary>
    /// <param name="provider">The provider to disconnect (withings, fitbit)</param>
    /// <returns>Success or error response</returns>
    [HttpDelete("{provider}")]
    public async Task<ActionResult<ProviderOperationResponse>> DisconnectProvider(string provider)
    {
        try
        {
            // Validate provider
            provider = provider.ToLowerInvariant();
            if (provider != "withings" && provider != "fitbit" && provider != "legacy")
            {
                return BadRequest(new ErrorResponse { Error = "Invalid provider. Must be 'withings', 'fitbit', or 'legacy'" });
            }

            // Get user ID from authenticated user claim
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
            {
                _logger.LogWarning("User ID not found or invalid in authenticated user claims");
                return Unauthorized(new ErrorResponse { Error = "User ID not found" });
            }

            // Check if the provider link exists
            var existingLink = await _providerLinkService.GetProviderLinkAsync(userGuid, provider);
            if (existingLink == null)
            {
                return NotFound(new ErrorResponse { Error = $"No {provider} connection found" });
            }

            // Get provider service to handle disconnection
            var providerService = _providerIntegrationService.GetProviderService(provider);
            if (providerService == null)
            {
                return BadRequest(new ErrorResponse { Error = $"Provider service not found for: {provider}" });
            }

            // Remove provider link (for legacy, this will soft delete)
            var success = await providerService.RemoveProviderLinkAsync(userGuid);
            if (!success)
            {
                return StatusCode(500, new ErrorResponse { Error = $"Failed to disconnect {provider}" });
            }

            // Delete source data for this provider (except for legacy provider which keeps data)
            if (provider != "legacy")
            {
                try
                {
                    await _sourceDataService.DeleteSourceDataAsync(userGuid, provider);
                    _logger.LogDebug("Deleted source data for {Provider} user {UserId}", provider, userGuid);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to delete source data for {Provider} user {UserId}", provider, userGuid);
                    // Don't fail the disconnect operation if source data cleanup fails
                }
            }

            _logger.LogInformation("Disconnected {Provider} for user {UserId}", provider, userId);
            return Ok(new ProviderOperationResponse { Message = $"{provider} disconnected successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error disconnecting provider {Provider} for user", provider);
            return StatusCode(500, new ErrorResponse { Error = "Internal server error" });
        }
    }

    /// <summary>
    /// Requests a full refresh on the next dashboard load, preserving existing readings
    /// </summary>
    /// <param name="provider">The provider to refresh (withings, fitbit)</param>
    /// <returns>Success or error response</returns>
    [HttpPost("{provider}/clear-data")]
    public async Task<ActionResult<ProviderOperationResponse>> ClearProviderData(string provider)
    {
        try
        {
            // Validate provider
            provider = provider.ToLowerInvariant();
            if (provider != "withings" && provider != "fitbit")
            {
                return BadRequest(new ErrorResponse { Error = "Invalid provider. Must be 'withings' or 'fitbit'" });
            }

            // A disabled provider cannot fulfill a queued refresh.
            if (provider == "fitbit" && !_fitbitConfig.Enabled)
            {
                return StatusCode(503, new ErrorResponse { Error = "Fitbit syncing has ended. Resync is unavailable." });
            }

            // Get user ID from authenticated user claim
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
            {
                _logger.LogWarning("User ID not found or invalid in authenticated user claims");
                return Unauthorized(new ErrorResponse { Error = "User ID not found" });
            }

            // Check if the provider link exists
            var existingLink = await _providerLinkService.GetProviderLinkAsync(userGuid, provider);
            if (existingLink == null)
            {
                return NotFound(new ErrorResponse { Error = $"No {provider} connection found" });
            }

            // The legacy URL is retained; resync queues a full fetch without clearing history.
            var result = await _measurementSyncService.RequestFullSyncAsync(userGuid, provider);

            if (result.Success)
            {
                return Ok(new ProviderOperationResponse { Message = $"{provider} full sync requested" });
            }
            else
            {
                _logger.LogError("Failed to request full sync for {Provider} for user {UserId}: {Error}", provider, userId, result.Message);
                return StatusCode(500, new ErrorResponse { Error = result.Message ?? $"Failed to request full sync for {provider}" });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error requesting full sync for provider {Provider} for user", provider);
            return StatusCode(500, new ErrorResponse { Error = "Internal server error" });
        }
    }

    /// <summary>
    /// Enables a disabled legacy provider
    /// </summary>
    /// <param name="provider">The provider to enable (must be 'legacy')</param>
    /// <returns>Success or error response</returns>
    [HttpPost("{provider}/enable")]
    public async Task<ActionResult<ProviderOperationResponse>> EnableProvider(string provider)
    {
        try
        {
            // Validate provider - only legacy can be enabled
            provider = provider.ToLowerInvariant();
            if (provider != "legacy")
            {
                return BadRequest(new ErrorResponse { Error = "Only legacy provider can be enabled" });
            }

            // Get user ID from authenticated user claim
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
            {
                _logger.LogWarning("User ID not found or invalid in authenticated user claims");
                return Unauthorized(new ErrorResponse { Error = "User ID not found" });
            }

            // Get legacy service and enable the provider
            var legacyService = _providerIntegrationService.GetProviderService(provider) as LegacyService;
            if (legacyService == null)
            {
                return BadRequest(new ErrorResponse { Error = "Legacy service not available" });
            }

            var success = await legacyService.EnableProviderLinkAsync(userGuid);
            if (!success)
            {
                return NotFound(new ErrorResponse { Error = $"No {provider} connection found" });
            }

            return Ok(new ProviderOperationResponse { Message = $"{provider} enabled successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error enabling provider {Provider} for user", provider);
            return StatusCode(500, new ErrorResponse { Error = "Internal server error" });
        }
    }

    /// <summary>
    /// Builds the provider link list for a user: every provider_links row plus a
    /// synthetic "manual" link whenever the user has manual readings (manual data has
    /// no provider_links row). Used by both the authenticated and the shared endpoint;
    /// the shared endpoint omits ConnectedAt.
    /// </summary>
    private async Task<List<ProviderLinkResponse>> BuildLinkResponsesAsync(Guid uid, bool includeConnectedAt)
    {
        var providerLinks = await _providerLinkService.GetAllForUserAsync(uid);

        var response = providerLinks
            .Select(link => new ProviderLinkResponse
            {
                Provider = link.Provider,
                ConnectedAt = includeConnectedAt ? ConnectedAtFor(link) : null,
                HasToken = link.Token != null && link.Token.Count > 0,
                IsDisabled = link.Provider == "legacy" && link.Token?.GetValueOrDefault("disabled") as bool? == true
            }).ToList();

        if (await _sourceDataService.HasMeasurementsAsync(uid, "manual"))
        {
            var lastUpdate = await _sourceDataService.GetLastSyncTimeAsync(uid, "manual");
            response.Add(new ProviderLinkResponse
            {
                Provider = "manual",
                ConnectedAt = includeConnectedAt ? (lastUpdate ?? DateTime.UtcNow).ToString("o") : null,
                HasToken = true,
                IsDisabled = false
            });
        }

        return response;
    }

    /// <summary>
    /// The date a link was established. updated_at is rewritten on every token
    /// refresh, so it only serves as a fallback for rows that predate created_at.
    /// </summary>
    private static string ConnectedAtFor(DbProviderLink link)
    {
        return string.IsNullOrEmpty(link.CreatedAt) ? link.UpdatedAt : link.CreatedAt;
    }

    /// <summary>
    /// Gets provider links for a user via sharing code (no authentication required)
    /// </summary>
    /// <param name="sharingCode">The sharing code</param>
    /// <returns>List of provider links</returns>
    [HttpGet("links/{sharingCode}")]
    [AllowAnonymous]
    public async Task<ActionResult<List<ProviderLinkResponse>>> GetProviderLinksBySharingCode(string sharingCode)
    {
        try
        {
            // Get user by sharing code
            var user = await _profileService.GetBySharingTokenAsync(sharingCode);
            if (user == null || !user.Profile.SharingEnabled)
            {
                _logger.LogWarning("User not found or sharing disabled for sharing code: {SharingCode}", sharingCode);
                return NotFound(new ErrorResponse { Error = "User not found" });
            }

            // The shared dashboard gates on the same link list the owner sees, so the
            // synthetic manual link must be present here too for manual-only users.
            // Anonymous viewers only need provider/hasToken/isDisabled.
            return Ok(await BuildLinkResponsesAsync(user.Uid, includeConnectedAt: false));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting provider links for sharing code");
            return StatusCode(500, new ErrorResponse { Error = "Internal server error" });
        }
    }
}
