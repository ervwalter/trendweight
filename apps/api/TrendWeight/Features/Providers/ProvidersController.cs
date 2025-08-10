using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TrendWeight.Features.Measurements;
using TrendWeight.Features.ProviderLinks.Services;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Features.Providers.Models;
using TrendWeight.Common.Models;
using TrendWeight.Features.Profile.Models;

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
    private readonly ILogger<ProvidersController> _logger;

    public ProvidersController(
        IProviderLinkService providerLinkService,
        ISourceDataService sourceDataService,
        IProviderIntegrationService providerIntegrationService,
        IMeasurementSyncService measurementSyncService,
        IProfileService profileService,
        ILogger<ProvidersController> logger)
    {
        _providerLinkService = providerLinkService;
        _sourceDataService = sourceDataService;
        _providerIntegrationService = providerIntegrationService;
        _measurementSyncService = measurementSyncService;
        _profileService = profileService;
        _logger = logger;
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

            // Get all provider links for the user
            var providerLinks = await _providerLinkService.GetAllForUserAsync(userGuid);

            // Transform to response format
            var response = providerLinks
                .Select(link => new ProviderLinkResponse
                {
                    Provider = link.Provider,
                    ConnectedAt = link.UpdatedAt,
                    UpdateReason = link.UpdateReason,
                    HasToken = link.Token != null && link.Token.Count > 0,
                    IsDisabled = link.Provider == "legacy" && link.Token?.GetValueOrDefault("disabled") as bool? == true
                }).ToList();

            return Ok(response);
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
                return BadRequest(new ErrorResponse { Error = "Invalid provider. Must be 'withings' or 'fitbit'" });
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
    /// Triggers a data resync for a specific provider
    /// </summary>
    /// <param name="provider">The provider to resync (withings, fitbit)</param>
    /// <returns>Success or error response</returns>
    [HttpPost("{provider}/resync")]
    public async Task<ActionResult<ProviderOperationResponse>> ResyncProvider(string provider)
    {
        try
        {
            // Validate provider
            provider = provider.ToLowerInvariant();
            if (provider != "withings" && provider != "fitbit")
            {
                return BadRequest(new ErrorResponse { Error = "Invalid provider. Must be 'withings' or 'fitbit'" });
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

            // Get user to check metric preference
            var user = await _profileService.GetByIdAsync(userId);
            if (user == null)
            {
                return NotFound(new ErrorResponse { Error = "User not found" });
            }

            // Use the measurement sync service to handle the resync
            var syncResult = await _measurementSyncService.ResyncProviderAsync(userGuid, provider, user.Profile.UseMetric);

            if (syncResult.Success)
            {
                return Ok(new ProviderOperationResponse { Message = $"{provider} resync completed successfully" });
            }
            else
            {
                _logger.LogError("Failed to resync {Provider} for user {UserId}: {Error}", provider, userId, syncResult.Message);
                return StatusCode(500, new ErrorResponse { Error = syncResult.Message ?? $"Failed to resync {provider} data" });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resyncing provider {Provider} for user", provider);
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

            // Get all provider links for the user
            var providerLinks = await _providerLinkService.GetAllForUserAsync(user.Uid);

            // Transform to response format
            var response = providerLinks
                .Select(link => new ProviderLinkResponse
                {
                    Provider = link.Provider,
                    ConnectedAt = link.UpdatedAt,
                    UpdateReason = link.UpdateReason,
                    HasToken = link.Token != null && link.Token.Count > 0,
                    IsDisabled = link.Provider == "legacy" && link.Token?.GetValueOrDefault("disabled") as bool? == true
                }).ToList();

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting provider links for sharing code");
            return StatusCode(500, new ErrorResponse { Error = "Internal server error" });
        }
    }
}
