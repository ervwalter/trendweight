using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Features.Providers;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Features.Profile.Models;
using TrendWeight.Common.Models;

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
    private readonly IMeasurementSyncService _measurementSyncService;
    private readonly ILogger<MeasurementsController> _logger;

    public MeasurementsController(
        IProfileService profileService,
        IProviderIntegrationService providerIntegrationService,
        IMeasurementSyncService measurementSyncService,
        ILogger<MeasurementsController> logger)
    {
        _profileService = profileService;
        _providerIntegrationService = providerIntegrationService;
        _measurementSyncService = measurementSyncService;
        _logger = logger;
    }

    /// <summary>
    /// Gets measurement data, refreshing from providers if needed
    /// Matches legacy /api/data endpoint behavior
    /// </summary>
    /// <returns>MeasurementsResponse with data and provider status</returns>
    [HttpGet]
    public async Task<ActionResult<MeasurementsResponse>> GetMeasurements()
    {
        try
        {
            // Get Supabase UID from JWT
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new ErrorResponse { Error = "User ID not found in token" });
            }

            _logger.LogInformation("Getting measurements for user ID: {UserId}", userId);

            // Get user by Supabase UID
            var user = await _profileService.GetByIdAsync(userId);
            if (user == null)
            {
                return NotFound(new ErrorResponse { Error = "User not found" });
            }

            // Get active providers
            var activeProviders = await _providerIntegrationService.GetActiveProvidersAsync(user.Uid);

            // Get measurements with automatic refresh
            var result = await _measurementSyncService.GetMeasurementsForUserAsync(
                user.Uid,
                activeProviders,
                user.Profile.UseMetric);

            return Ok(new MeasurementsResponse
            {
                Data = result.Data,
                IsMe = true,
                ProviderStatus = result.ProviderStatus
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting measurements");
            return StatusCode(500, new ErrorResponse { Error = "Internal server error" });
        }
    }

    /// <summary>
    /// Gets measurement data via sharing code, refreshing from providers if needed
    /// </summary>
    /// <param name="sharingCode">The sharing code</param>
    /// <returns>MeasurementsResponse with data and provider status</returns>
    [HttpGet("{sharingCode}")]
    [AllowAnonymous]
    public async Task<ActionResult<MeasurementsResponse>> GetMeasurementsBySharingCode(string sharingCode)
    {
        try
        {
            // Get user by sharing code
            var user = await _profileService.GetBySharingTokenAsync(sharingCode);
            if (user == null)
            {
                _logger.LogWarning("User not found for sharing code: {SharingCode}", sharingCode);
                return NotFound(new ErrorResponse { Error = "User not found" });
            }

            _logger.LogInformation("Getting measurements for user ID: {UserId} via sharing code", user.Uid);

            // Get active providers
            var activeProviders = await _providerIntegrationService.GetActiveProvidersAsync(user.Uid);

            // Get measurements with automatic refresh
            var result = await _measurementSyncService.GetMeasurementsForUserAsync(
                user.Uid,
                activeProviders,
                user.Profile.UseMetric);

            // Always return isMe = false when using sharing code
            // This allows users to preview how their dashboard appears to others
            // Only include providerStatus when it's the authenticated user
            return Ok(new MeasurementsResponse
            {
                Data = result.Data,
                IsMe = false,
                ProviderStatus = null
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting measurements for sharing code");
            return StatusCode(500, new ErrorResponse { Error = "Internal server error" });
        }
    }

}
