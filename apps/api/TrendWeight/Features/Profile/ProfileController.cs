using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Globalization;
using System.Security.Claims;
using TrendWeight.Features.Profile.Models;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Infrastructure.DataAccess.Models;

namespace TrendWeight.Features.Profile;

[ApiController]
[Route("api/profile")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly IProfileService _profileService;
    private readonly ILegacyMigrationService _legacyMigrationService;
    private readonly ILogger<ProfileController> _logger;

    public ProfileController(
        IProfileService profileService,
        ILegacyMigrationService legacyMigrationService,
        ILogger<ProfileController> logger)
    {
        _profileService = profileService;
        _legacyMigrationService = legacyMigrationService;
        _logger = logger;
    }

    /// <summary>
    /// Gets the user's profile/settings
    /// </summary>
    /// <returns>The user's profile data</returns>
    [HttpGet]
    public async Task<ActionResult<object>> GetProfile()
    {
        try
        {
            // Get user ID from authenticated user claim
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("User ID not found in authenticated user claims");
                return Unauthorized(new { error = "User ID not found" });
            }

            // Get user from Supabase by UID
            var user = await _profileService.GetByIdAsync(userId);
            if (user == null)
            {
                // Check for legacy profile migration
                var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
                var migratedProfile = await _legacyMigrationService.CheckAndMigrateIfNeededAsync(userId, userEmail);

                if (migratedProfile != null)
                {
                    return BuildProfileResponse(migratedProfile, isMe: true);
                }

                _logger.LogWarning("User document not found for Supabase UID: {UserId}", userId);
                return NotFound(new { error = "User not found" });
            }

            return BuildProfileResponse(user, isMe: true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting profile for user");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Gets a user's profile/settings via sharing code (no authentication required)
    /// </summary>
    /// <param name="sharingCode">The sharing code</param>
    /// <returns>The user's profile data</returns>
    [HttpGet("{sharingCode}")]
    [AllowAnonymous]
    public async Task<ActionResult<object>> GetProfileBySharingCode(string sharingCode)
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

            // Check if sharing is actually enabled
            if (!user.Profile.SharingEnabled)
            {
                _logger.LogWarning("Sharing is disabled for sharing code: {SharingCode}", sharingCode);
                return NotFound(new { error = "Sharing is disabled" });
            }

            // Always return isMe = false when using sharing code
            // This allows users to preview how their dashboard appears to others
            return BuildProfileResponse(user, isMe: false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting profile for sharing code");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    private ActionResult<object> BuildProfileResponse(DbProfile user, bool isMe)
    {
        // Map to ProfileData
        var profileData = new ProfileData
        {
            FirstName = user.Profile.FirstName,
            GoalStart = user.Profile.GoalStart,
            GoalWeight = user.Profile.GoalWeight,
            PlannedPoundsPerWeek = user.Profile.PlannedPoundsPerWeek,
            DayStartOffset = user.Profile.DayStartOffset,
            UseMetric = user.Profile.UseMetric,
            ShowCalories = user.Profile.ShowCalories,
            SharingToken = user.Profile.SharingToken,
            SharingEnabled = user.Profile.SharingEnabled,
            IsMigrated = user.Profile.IsMigrated,
            IsNewlyMigrated = user.Profile.IsNewlyMigrated
        };

        // Return profile data with metadata
        return Ok(new
        {
            user = new
            {
                uid = user.Uid.ToString(),
                email = user.Email,
                firstName = profileData.FirstName,
                goalStart = profileData.GoalStart?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                goalWeight = profileData.GoalWeight,
                plannedPoundsPerWeek = profileData.PlannedPoundsPerWeek,
                dayStartOffset = profileData.DayStartOffset,
                useMetric = profileData.UseMetric,
                showCalories = profileData.ShowCalories,
                sharingEnabled = profileData.SharingEnabled,
                isMigrated = profileData.IsMigrated,
                isNewlyMigrated = profileData.IsNewlyMigrated
            },
            isMe = isMe,
            timestamp = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Updates the user's profile/settings or creates a new profile if none exists
    /// </summary>
    /// <param name="request">The profile fields to update</param>
    /// <returns>The updated profile data</returns>
    [HttpPut]
    public async Task<ActionResult<object>> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        try
        {
            // Get user ID from authenticated user claim
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("User ID not found in authenticated user claims");
                return Unauthorized(new { error = "User ID not found" });
            }

            // Get user email from authenticated user claim
            var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
            if (string.IsNullOrEmpty(userEmail))
            {
                _logger.LogWarning("User email not found in authenticated user claims");
                return Unauthorized(new { error = "User email not found" });
            }

            // Use the service to update or create the profile
            var profile = await _profileService.UpdateOrCreateProfileAsync(userId, userEmail, request);

            // Return updated profile data in the same format as GET
            return BuildProfileResponse(profile, isMe: true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating profile for user");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Generate a new sharing token
    /// </summary>
    /// <returns>Updated sharing data with new token</returns>
    [HttpPost("generate-token")]
    public async Task<ActionResult<object>> GenerateNewToken()
    {
        try
        {
            // Get user ID from authenticated user claim
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("User ID not found in authenticated user claims");
                return Unauthorized(new { error = "User ID not found" });
            }

            // Use service to generate new token
            var updatedUser = await _profileService.GenerateNewSharingTokenAsync(userId);
            if (updatedUser == null)
            {
                return NotFound(new { error = "User not found" });
            }

            return Ok(new
            {
                sharingEnabled = updatedUser.Profile.SharingEnabled,
                sharingToken = updatedUser.Profile.SharingToken
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating new share token for user");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Complete the migration process by clearing the IsNewlyMigrated flag
    /// </summary>
    /// <returns>Success response</returns>
    [HttpPost("complete-migration")]
    public async Task<ActionResult> CompleteMigration()
    {
        try
        {
            // Get user ID from authenticated user claim
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("User ID not found in authenticated user claims");
                return Unauthorized(new { error = "User ID not found" });
            }

            // Use service to complete migration
            var success = await _profileService.CompleteMigrationAsync(userId);
            if (!success)
            {
                return NotFound(new { error = "User not found" });
            }

            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error completing migration for user");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Deletes the user's account and all associated data
    /// </summary>
    /// <returns>Success or error response</returns>
    [HttpDelete]
    public async Task<ActionResult> DeleteAccount()
    {
        try
        {
            // Get user ID from authenticated user claim
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("User ID not found in authenticated user claims");
                return Unauthorized(new { error = "User ID not found" });
            }

            // Parse user ID as GUID
            if (!Guid.TryParse(userId, out var userGuid))
            {
                _logger.LogWarning("Invalid user ID format: {UserId}", userId);
                return BadRequest(new { error = "Invalid user ID format" });
            }

            // Delete the account
            var success = await _profileService.DeleteAccountAsync(userGuid);
            if (!success)
            {
                return StatusCode(500, new { error = "Failed to delete account" });
            }

            _logger.LogInformation("Account deleted successfully for user {UserId}", userId);
            return Ok(new { message = "Account deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting account");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

}
