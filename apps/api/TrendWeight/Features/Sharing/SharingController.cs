using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Common.Models;
using TrendWeight.Features.Profile.Models;
using TrendWeight.Features.Sharing.Models;
using TrendWeight.Infrastructure.DataAccess.Models;

namespace TrendWeight.Features.Sharing;

[ApiController]
[Route("api/sharing")]
[Authorize]
public class SharingController : ControllerBase
{
    private readonly IProfileService _profileService;
    private readonly ILogger<SharingController> _logger;

    public SharingController(
        IProfileService profileService,
        ILogger<SharingController> logger)
    {
        _profileService = profileService;
        _logger = logger;
    }

    /// <summary>
    /// Gets the user's sharing settings
    /// </summary>
    /// <returns>The user's sharing data</returns>
    [HttpGet]
    public async Task<ActionResult<SharingResponse>> GetSharingSettings()
    {
        try
        {
            // Get user ID from authenticated user claim
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("User ID not found in authenticated user claims");
                return Unauthorized(new ErrorResponse { Error = "User ID not found" });
            }

            // Get user from Supabase by UID
            var user = await _profileService.GetByIdAsync(userId);
            if (user == null)
            {
                _logger.LogWarning("User document not found for Supabase UID: {UserId}", userId);
                return NotFound(new ErrorResponse { Error = "User not found" });
            }

            return Ok(new SharingResponse
            {
                SharingEnabled = user.Profile.SharingEnabled,
                SharingToken = user.Profile.SharingToken
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting sharing settings for user");
            return StatusCode(500, new ErrorResponse { Error = "Internal server error" });
        }
    }

    /// <summary>
    /// Toggle sharing enabled state
    /// </summary>
    /// <param name="request">The toggle request</param>
    /// <returns>Updated sharing data</returns>
    [HttpPost("toggle")]
    public async Task<ActionResult<SharingResponse>> ToggleSharing([FromBody] ToggleSharingRequest request)
    {
        try
        {
            // Get user ID from authenticated user claim
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("User ID not found in authenticated user claims");
                return Unauthorized(new ErrorResponse { Error = "User ID not found" });
            }

            // Get user from Supabase by UID
            var user = await _profileService.GetByIdAsync(userId);
            if (user == null)
            {
                _logger.LogWarning("User document not found for Supabase UID: {UserId}", userId);
                return NotFound(new ErrorResponse { Error = "User not found" });
            }

            // Update only the sharing enabled flag
            user.Profile.SharingEnabled = request.Enabled;
            user.UpdatedAt = DateTime.UtcNow.ToString("o");

            // Save the update
            var updatedUser = await _profileService.UpdateAsync(user);

            return Ok(new SharingResponse
            {
                SharingEnabled = updatedUser.Profile.SharingEnabled,
                SharingToken = updatedUser.Profile.SharingToken
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error toggling sharing for user");
            return StatusCode(500, new ErrorResponse { Error = "Internal server error" });
        }
    }

}
