using Microsoft.AspNetCore.Mvc;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Common.Models;
using TrendWeight.Features.Common;
using TrendWeight.Features.Sharing.Models;

namespace TrendWeight.Features.Sharing;

[Route("api/sharing")]
public class SharingController : BaseAuthController
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
        var user = await _profileService.GetByIdAsync(UserId);
        if (user == null)
        {
            _logger.LogWarning("User document not found for Supabase UID: {UserId}", UserId);
            return NotFound(new ErrorResponse { Error = "User not found" });
        }

        return Ok(new SharingResponse
        {
            SharingEnabled = user.Profile.SharingEnabled,
            SharingToken = user.Profile.SharingToken
        });
    }

    /// <summary>
    /// Toggle sharing enabled state
    /// </summary>
    /// <param name="request">The toggle request</param>
    /// <returns>Updated sharing data</returns>
    [HttpPost("toggle")]
    public async Task<ActionResult<SharingResponse>> ToggleSharing([FromBody] ToggleSharingRequest request)
    {
        var user = await _profileService.GetByIdAsync(UserId);
        if (user == null)
        {
            _logger.LogWarning("User document not found for Supabase UID: {UserId}", UserId);
            return NotFound(new ErrorResponse { Error = "User not found" });
        }

        // Update only the sharing enabled flag
        user.Profile.SharingEnabled = request.Enabled;
        user.UpdatedAt = DateTime.UtcNow.ToString("o");

        var updatedUser = await _profileService.UpdateAsync(user);

        return Ok(new SharingResponse
        {
            SharingEnabled = updatedUser.Profile.SharingEnabled,
            SharingToken = updatedUser.Profile.SharingToken
        });
    }
}
