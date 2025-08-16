using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Features.Providers;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Common.Models;
using TrendWeight.Features.Common;

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
    private readonly IMeasurementComputationService _measurementComputationService;
    private readonly ILogger<MeasurementsController> _logger;
    private readonly ICurrentRequestContext _requestContext;

    public MeasurementsController(
        IProfileService profileService,
        IProviderIntegrationService providerIntegrationService,
        IMeasurementSyncService measurementSyncService,
        IMeasurementComputationService measurementComputationService,
        ILogger<MeasurementsController> logger,
        ICurrentRequestContext requestContext)
    {
        _profileService = profileService;
        _providerIntegrationService = providerIntegrationService;
        _measurementSyncService = measurementSyncService;
        _measurementComputationService = measurementComputationService;
        _logger = logger;
        _requestContext = requestContext;
    }

    /// <summary>
    /// Gets measurement data, refreshing from providers if needed
    /// Matches legacy /api/data endpoint behavior
    /// </summary>
    /// <param name="progressId">Optional progress ID for tracking sync status</param>
    /// <param name="includeSource">Whether to include raw source data in response</param>
    /// <returns>MeasurementsResponse with computed measurements and optionally source data</returns>
    [HttpGet]
    public async Task<ActionResult<MeasurementsResponse>> GetMeasurements(
        [FromQuery] string? progressId = null,
        [FromQuery] bool includeSource = false)
    {
        try
        {
            // Populate request context from claims and query
            var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(uidClaim) || !Guid.TryParse(uidClaim, out var userGuid))
            {
                return Unauthorized(new ErrorResponse { Error = "User ID not found in token" });
            }
            _requestContext.UserId = userGuid;
            var externalId = User.FindFirst("clerk_user_id")?.Value;
            // External ID is required for RLS updates but may be absent in some test paths; populate when present
            _requestContext.ExternalId = externalId ?? string.Empty;
            if (!string.IsNullOrEmpty(progressId) && Guid.TryParse(progressId, out var pid))
            {
                _requestContext.ProgressId = pid;
                _logger.LogInformation("Progress ID set to: {ProgressId} for user: {UserId}", pid, userGuid);
            }

            _logger.LogInformation("Getting measurements for user ID: {UserId}", userGuid);

            // Get user by Supabase UID
            var user = await _profileService.GetByIdAsync(userGuid);
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

            // Compute measurements from source data
            var computedMeasurements = _measurementComputationService
                .ComputeMeasurements(result.Data, user.Profile);

            return Ok(new MeasurementsResponse
            {
                ComputedMeasurements = computedMeasurements,
                SourceData = includeSource ? result.Data : null,
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
    /// <param name="progressId">Optional progress ID for tracking sync status</param>
    /// <param name="includeSource">Whether to include raw source data in response</param>
    /// <returns>MeasurementsResponse with computed measurements and optionally source data</returns>
    [HttpGet("{sharingCode}")]
    [AllowAnonymous]
    public async Task<ActionResult<MeasurementsResponse>> GetMeasurementsBySharingCode(
        string sharingCode,
        [FromQuery] string? progressId = null,
        [FromQuery] bool includeSource = false)
    {
        try
        {
            // Set progressId in context if provided (for sync progress tracking)
            if (!string.IsNullOrEmpty(progressId) && Guid.TryParse(progressId, out var progressGuid))
            {
                _requestContext.ProgressId = progressGuid;
            }

            // Get user by sharing code
            var user = await _profileService.GetBySharingTokenAsync(sharingCode);
            if (user == null)
            {
                _logger.LogWarning("User not found for sharing code: {SharingCode}", sharingCode);
                return NotFound(new ErrorResponse { Error = "User not found" });
            }

            // Check if sharing is actually enabled
            if (!user.Profile.SharingEnabled)
            {
                _logger.LogWarning("Sharing is disabled for sharing code: {SharingCode}", sharingCode);
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

            // Compute measurements from source data
            var computedMeasurements = _measurementComputationService
                .ComputeMeasurements(result.Data, user.Profile);

            // Always return isMe = false when using sharing code
            // This allows users to preview how their dashboard appears to others
            // Only include providerStatus when it's the authenticated user
            return Ok(new MeasurementsResponse
            {
                ComputedMeasurements = computedMeasurements,
                SourceData = includeSource ? result.Data : null,
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
