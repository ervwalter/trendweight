using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Globalization;
using System.Security.Claims;
using TrendWeight.Common.Models;
using TrendWeight.Features.Measurements;
using TrendWeight.Features.Profile.Models;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Infrastructure.DataAccess;
using TrendWeight.Infrastructure.DataAccess.Models;

namespace TrendWeight.Features.Profile;

[ApiController]
[Route("api/profile")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly IProfileService _profileService;
    private readonly ILegacyMigrationService _legacyMigrationService;
    private readonly ISupabaseService _supabaseService;
    private readonly ILogger<ProfileController> _logger;

    public ProfileController(
        IProfileService profileService,
        ILegacyMigrationService legacyMigrationService,
        ISupabaseService supabaseService,
        ILogger<ProfileController> logger)
    {
        _profileService = profileService;
        _legacyMigrationService = legacyMigrationService;
        _supabaseService = supabaseService;
        _logger = logger;
    }

    /// <summary>
    /// Gets the user's profile/settings
    /// </summary>
    /// <returns>The user's profile data</returns>
    [HttpGet]
    public async Task<ActionResult<ProfileResponse>> GetProfile()
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

            // Parse user ID and get email for potential legacy operations
            if (!Guid.TryParse(userId, out var userGuid))
            {
                _logger.LogWarning("Invalid user ID format: {UserId}", userId);
                return Unauthorized(new ErrorResponse { Error = "Invalid authentication" });
            }
            var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;

            // Get user from Supabase by UID
            var user = await _profileService.GetByIdAsync(userId);

            if (user == null)
            {

                // Check for legacy profile migration
                var migratedProfile = await _legacyMigrationService.CheckAndMigrateIfNeededAsync(userId, userEmail);

                if (migratedProfile != null)
                {
                    // Legacy profile was found and migrated (includes data import)
                    return BuildProfileResponse(migratedProfile, isMe: true);
                }

                _logger.LogWarning("User document not found for Supabase UID: {UserId}", userId);
                return NotFound(new ErrorResponse { Error = "User not found" });
            }
            else if (user.Profile.IsMigrated == true)
            {
                // Check if we need to migrate legacy data for existing migrated users
                await _legacyMigrationService.CheckAndMigrateLegacyDataIfNeededAsync(userGuid, userEmail);
            }

            // Update email in profile if it doesn't match Clerk claim
            if (!string.IsNullOrEmpty(userEmail) && user.Email != userEmail)
            {
                _logger.LogInformation("Updating profile email from {OldEmail} to {NewEmail} for user {UserId}", user.Email, userEmail, userId);
                user.Email = userEmail;
                user.UpdatedAt = DateTime.UtcNow.ToString("o");
                await _supabaseService.UpdateAsync(user);
            }

            return BuildProfileResponse(user, isMe: true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting profile for user");
            return StatusCode(500, new ErrorResponse { Error = "Internal server error" });
        }
    }

    /// <summary>
    /// Gets a user's profile/settings via sharing code (no authentication required)
    /// </summary>
    /// <param name="sharingCode">The sharing code</param>
    /// <returns>The user's profile data</returns>
    [HttpGet("{sharingCode}")]
    [AllowAnonymous]
    public async Task<ActionResult<ProfileResponse>> GetProfileBySharingCode(string sharingCode)
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

            // Check if sharing is actually enabled
            if (!user.Profile.SharingEnabled)
            {
                _logger.LogWarning("Sharing is disabled for sharing code: {SharingCode}", sharingCode);
                return NotFound(new ErrorResponse { Error = "User not found" });
            }

            // Always return isMe = false when using sharing code
            // This allows users to preview how their dashboard appears to others
            return BuildProfileResponse(user, isMe: false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting profile for sharing code");
            return StatusCode(500, new ErrorResponse { Error = "Internal server error" });
        }
    }

    private ActionResult<ProfileResponse> BuildProfileResponse(DbProfile user, bool isMe)
    {
        // Return profile data with metadata
        return Ok(new ProfileResponse
        {
            User = new UserProfileData
            {
                FirstName = user.Profile.FirstName,
                GoalStart = user.Profile.GoalStart?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                GoalWeight = user.Profile.GoalWeight,
                PlannedPoundsPerWeek = user.Profile.PlannedPoundsPerWeek,
                DayStartOffset = user.Profile.DayStartOffset ?? 0,
                UseMetric = user.Profile.UseMetric,
                ShowCalories = user.Profile.ShowCalories ?? false,
                HideDataBeforeStart = user.Profile.HideDataBeforeStart,
                TrendAlgorithm = TrendAlgorithmPresets.Resolve(user.Profile.TrendAlgorithm).Id,
                SharingEnabled = user.Profile.SharingEnabled,
                SharingToken = user.Profile.SharingToken,
                IsMigrated = user.Profile.IsMigrated,
                IsNewlyMigrated = user.Profile.IsNewlyMigrated
            },
            IsMe = isMe,
            Timestamp = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Updates the user's profile/settings or creates a new profile if none exists
    /// </summary>
    /// <param name="request">The profile fields to update</param>
    /// <returns>The updated profile data</returns>
    [HttpPut]
    public async Task<ActionResult<ProfileResponse>> UpdateProfile([FromBody] UpdateProfileRequest request)
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

            // Get user email from authenticated user claim
            var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
            if (string.IsNullOrEmpty(userEmail))
            {
                _logger.LogWarning("User email not found in authenticated user claims");
                return Unauthorized(new ErrorResponse { Error = "User email not found" });
            }

            // Parse the user ID
            if (!Guid.TryParse(userId, out var userGuid))
            {
                _logger.LogWarning("Invalid user ID format: {UserId}", userId);
                return Unauthorized(new ErrorResponse { Error = "Invalid authentication" });
            }

            if (!TryValidateUpdateRequest(request, out var validationError))
            {
                return BadRequest(new ErrorResponse { Error = validationError });
            }

            // Use the service to update or create the profile
            var profile = await _profileService.UpdateOrCreateProfileAsync(userId, userEmail, request);

            // Return updated profile data in the same format as GET
            return BuildProfileResponse(profile, isMe: true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating profile for user");
            return StatusCode(500, new ErrorResponse { Error = "Internal server error" });
        }
    }

    // Goal weight and weekly plan arrive in the user's display units (kg or lb), so the
    // bounds are deliberately loose: they reject nonsense, not unusual-but-real values.
    private const decimal MaxGoalWeight = 1500m;
    private const decimal MaxPlannedChangePerWeek = 5m;
    private const int MaxFirstNameLength = 100;
    private static readonly DateTime MinGoalStart = new(1900, 1, 1);

    private static bool TryValidateUpdateRequest(UpdateProfileRequest request, out string error)
    {
        if (request.DayStartOffset is < 0 or > 23)
        {
            error = "Day start must be between 0 and 23 hours";
            return false;
        }

        if (!TrendAlgorithmPresets.IsValid(request.TrendAlgorithm))
        {
            error = "Invalid trend algorithm";
            return false;
        }

        if (request.GoalWeight is <= 0 or >= MaxGoalWeight)
        {
            error = $"Goal weight must be between 0 and {MaxGoalWeight}";
            return false;
        }

        if (request.PlannedPoundsPerWeek is < -MaxPlannedChangePerWeek or > MaxPlannedChangePerWeek)
        {
            error = $"Planned weekly change must be between -{MaxPlannedChangePerWeek} and {MaxPlannedChangePerWeek}";
            return false;
        }

        if (request.FirstName?.Length > MaxFirstNameLength)
        {
            error = $"First name must be {MaxFirstNameLength} characters or fewer";
            return false;
        }

        // Dates are user-local; allow one day of slack for timezones ahead of UTC
        if (request.GoalStart.HasValue &&
            (request.GoalStart.Value.Date < MinGoalStart || request.GoalStart.Value.Date > DateTime.UtcNow.Date.AddDays(1)))
        {
            error = "Start date must be between 1900-01-01 and today";
            return false;
        }

        error = string.Empty;
        return true;
    }

    /// <summary>
    /// Generate a new sharing token
    /// </summary>
    /// <returns>Updated sharing data with new token</returns>
    [HttpPost("generate-token")]
    public async Task<ActionResult<SharingTokenResponse>> GenerateNewToken()
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

            // Use service to generate new token
            var updatedUser = await _profileService.GenerateNewSharingTokenAsync(userId);
            if (updatedUser == null)
            {
                return NotFound(new ErrorResponse { Error = "User not found" });
            }

            return Ok(new SharingTokenResponse
            {
                SharingEnabled = updatedUser.Profile.SharingEnabled,
                SharingToken = updatedUser.Profile.SharingToken ?? string.Empty
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating new share token for user");
            return StatusCode(500, new ErrorResponse { Error = "Internal server error" });
        }
    }

    /// <summary>
    /// Complete the migration process by clearing the IsNewlyMigrated flag
    /// </summary>
    /// <returns>Success response</returns>
    [HttpPost("complete-migration")]
    public async Task<ActionResult<SuccessResponse>> CompleteMigration()
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

            // Use service to complete migration
            var success = await _profileService.CompleteMigrationAsync(userId);
            if (!success)
            {
                return NotFound(new ErrorResponse { Error = "User not found" });
            }

            return Ok(new SuccessResponse { Success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error completing migration for user");
            return StatusCode(500, new ErrorResponse { Error = "Internal server error" });
        }
    }

    /// <summary>
    /// Deletes the user's account and all associated data
    /// </summary>
    /// <returns>Success or error response</returns>
    [HttpDelete]
    public async Task<ActionResult<MessageResponse>> DeleteAccount()
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

            // Parse user ID as GUID
            if (!Guid.TryParse(userId, out var userGuid))
            {
                _logger.LogWarning("Invalid user ID format: {UserId}", userId);
                return BadRequest(new ErrorResponse { Error = "Invalid user ID format" });
            }

            // Delete the account
            var success = await _profileService.DeleteAccountAsync(userGuid);
            if (!success)
            {
                return StatusCode(500, new ErrorResponse { Error = "Failed to delete account" });
            }

            _logger.LogInformation("Account deleted successfully for user {UserId}", userId);
            return Ok(new MessageResponse { Message = "Account deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting account");
            return StatusCode(500, new ErrorResponse { Error = "Internal server error" });
        }
    }

}
