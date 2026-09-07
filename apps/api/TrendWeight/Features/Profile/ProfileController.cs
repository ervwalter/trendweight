using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Globalization;
using System.Security.Claims;
using TrendWeight.Common.Models;
using TrendWeight.Features.Common;
using TrendWeight.Features.Measurements;
using TrendWeight.Features.Profile.Models;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Infrastructure.DataAccess.Models;

namespace TrendWeight.Features.Profile;

[Route("api/profile")]
public class ProfileController : BaseAuthController
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

    private string? UserEmail => User.FindFirst(ClaimTypes.Email)?.Value;

    /// <summary>
    /// Gets the user's profile/settings
    /// </summary>
    /// <returns>The user's profile data</returns>
    [HttpGet]
    public async Task<ActionResult<ProfileResponse>> GetProfile()
    {
        var userId = UserGuid;
        var userEmail = UserEmail;

        var user = await _profileService.GetByIdAsync(userId);
        if (user == null)
        {
            // A first sign-in from a legacy account migrates the old profile and data
            var migratedProfile = await _legacyMigrationService.CheckAndMigrateIfNeededAsync(userId, userEmail);
            if (migratedProfile != null)
            {
                return BuildProfileResponse(migratedProfile, isMe: true);
            }

            _logger.LogWarning("User document not found for Supabase UID: {UserId}", userId);
            return NotFound(new ErrorResponse { Error = "User not found" });
        }

        if (user.Profile.IsMigrated == true)
        {
            // Migrated users may still have legacy measurements waiting to be imported
            await _legacyMigrationService.CheckAndMigrateLegacyDataIfNeededAsync(userId, userEmail);
        }

        // Keep the stored email in step with the Clerk claim
        if (!string.IsNullOrEmpty(userEmail) && user.Email != userEmail)
        {
            _logger.LogInformation("Updating profile email from {OldEmail} to {NewEmail} for user {UserId}", user.Email, userEmail, userId);
            user.Email = userEmail;
            user.UpdatedAt = DateTime.UtcNow.ToString("o");
            await _profileService.UpdateAsync(user);
        }

        return BuildProfileResponse(user, isMe: true);
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
        var user = await _profileService.GetBySharingTokenAsync(sharingCode);
        if (user == null || !user.Profile.SharingEnabled)
        {
            _logger.LogWarning("User not found or sharing disabled for the supplied sharing code");
            return NotFound(new ErrorResponse { Error = "User not found" });
        }

        // Always isMe = false via a sharing code so owners can preview the shared view
        return BuildProfileResponse(user, isMe: false);
    }

    /// <summary>
    /// Updates the user's profile/settings or creates a new profile if none exists
    /// </summary>
    /// <param name="request">The profile fields to update</param>
    /// <returns>The updated profile data</returns>
    [HttpPut]
    public async Task<ActionResult<ProfileResponse>> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = UserGuid;
        var userEmail = UserEmail;
        if (string.IsNullOrEmpty(userEmail))
        {
            _logger.LogWarning("User email not found in authenticated user claims");
            return Unauthorized(new ErrorResponse { Error = "User email not found" });
        }

        if (!TryValidateUpdateRequest(request, out var validationError))
        {
            return BadRequest(new ErrorResponse { Error = validationError });
        }

        var profile = await _profileService.UpdateOrCreateProfileAsync(userId, userEmail, request);
        return BuildProfileResponse(profile, isMe: true);
    }

    /// <summary>
    /// Generate a new sharing token
    /// </summary>
    /// <returns>Updated sharing data with new token</returns>
    [HttpPost("generate-token")]
    public async Task<ActionResult<SharingTokenResponse>> GenerateNewToken()
    {
        var updatedUser = await _profileService.GenerateNewSharingTokenAsync(UserGuid);
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

    /// <summary>
    /// Complete the migration process by clearing the IsNewlyMigrated flag
    /// </summary>
    /// <returns>Success response</returns>
    [HttpPost("complete-migration")]
    public async Task<ActionResult<SuccessResponse>> CompleteMigration()
    {
        var success = await _profileService.CompleteMigrationAsync(UserGuid);
        if (!success)
        {
            return NotFound(new ErrorResponse { Error = "User not found" });
        }

        return Ok(new SuccessResponse { Success = true });
    }

    /// <summary>
    /// Deletes the user's account and all associated data
    /// </summary>
    /// <returns>Success or error response</returns>
    [HttpDelete]
    public async Task<ActionResult<MessageResponse>> DeleteAccount()
    {
        var userId = UserGuid;

        var success = await _profileService.DeleteAccountAsync(userId);
        if (!success)
        {
            return StatusCode(500, new ErrorResponse { Error = "Failed to delete account" });
        }

        _logger.LogInformation("Account deleted successfully for user {UserId}", userId);
        return Ok(new MessageResponse { Message = "Account deleted successfully" });
    }

    private ActionResult<ProfileResponse> BuildProfileResponse(DbProfile user, bool isMe)
    {
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
}
