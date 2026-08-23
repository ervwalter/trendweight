using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Globalization;
using TrendWeight.Features.Profile.Services;
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
    private readonly IMeasurementOrchestrationService _orchestrationService;
    private readonly ILogger<MeasurementsController> _logger;
    private readonly ICurrentRequestContext _requestContext;

    public MeasurementsController(
        IProfileService profileService,
        IMeasurementOrchestrationService orchestrationService,
        ILogger<MeasurementsController> logger,
        ICurrentRequestContext requestContext)
    {
        _profileService = profileService;
        _orchestrationService = orchestrationService;
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
            var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(uidClaim) || !Guid.TryParse(uidClaim, out var userGuid))
            {
                return Unauthorized(new ErrorResponse { Error = "User ID not found in token" });
            }

            var externalId = User.FindFirst("clerk_user_id")?.Value;
            Guid? progressGuid = !string.IsNullOrEmpty(progressId) && Guid.TryParse(progressId, out var pid) ? pid : null;

            var result = await _orchestrationService.GetForUserAsync(userGuid, externalId, progressGuid);
            if (result == null)
            {
                return NotFound(new ErrorResponse { Error = "User not found" });
            }

            return Ok(new MeasurementsResponse
            {
                ComputedMeasurements = result.ComputedMeasurements,
                SourceData = includeSource ? result.SourceData : null,
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
    /// <param name="since">Optional date filter in yyyy-MM-dd format to only return measurements on or after this date</param>
    /// <returns>MeasurementsResponse with computed measurements and optionally source data</returns>
    [HttpGet("{sharingCode}")]
    [AllowAnonymous]
    public async Task<ActionResult<MeasurementsResponse>> GetMeasurementsBySharingCode(
        string sharingCode,
        [FromQuery] string? progressId = null,
        [FromQuery] bool includeSource = false,
        [FromQuery] string? since = null)
    {
        try
        {
            // Set progressId in context if provided (for sync progress tracking)
            if (!string.IsNullOrEmpty(progressId) && Guid.TryParse(progressId, out var progressGuid))
            {
                _requestContext.ProgressId = progressGuid;
            }

            // Validate since date if provided
            if (!string.IsNullOrEmpty(since))
            {
                if (!DateTime.TryParseExact(since, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _))
                {
                    return BadRequest(new ErrorResponse { Error = "Invalid since date format. Expected yyyy-MM-dd format." });
                }
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

            var result = await _orchestrationService.GetForProfileAsync(user);

            // Filter measurements by since date if provided
            var computedMeasurements = result.ComputedMeasurements;
            if (!string.IsNullOrEmpty(since))
            {
                computedMeasurements = [.. computedMeasurements
                    .Where(m => string.Compare(m.Date, since, StringComparison.Ordinal) >= 0)];
            }

            // Always return isMe = false when using sharing code
            // This allows users to preview how their dashboard appears to others
            // Only include providerStatus when it's the authenticated user
            return Ok(new MeasurementsResponse
            {
                ComputedMeasurements = computedMeasurements,
                SourceData = includeSource ? result.SourceData : null,
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
