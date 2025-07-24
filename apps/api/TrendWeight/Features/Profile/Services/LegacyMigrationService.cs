using TrendWeight.Features.Profile.Models;
using TrendWeight.Features.ProviderLinks.Services;
using TrendWeight.Infrastructure.DataAccess.Models;

namespace TrendWeight.Features.Profile.Services;

public class LegacyMigrationService : ILegacyMigrationService
{
    private readonly IProfileService _profileService;
    private readonly ILegacyDbService _legacyDbService;
    private readonly IProviderLinkService _providerLinkService;
    private readonly ILogger<LegacyMigrationService> _logger;

    // Expired token marker - 1 hour duration for a token received at Unix timestamp 0
    private const int EXPIRED_TOKEN_EXPIRES_IN = 3600;

    public LegacyMigrationService(
        IProfileService profileService,
        ILegacyDbService legacyDbService,
        IProviderLinkService providerLinkService,
        ILogger<LegacyMigrationService> logger)
    {
        _profileService = profileService;
        _legacyDbService = legacyDbService;
        _providerLinkService = providerLinkService;
        _logger = logger;
    }

    /// <summary>
    /// Checks if a user needs migration and performs it if necessary
    /// </summary>
    /// <param name="userId">Supabase UID</param>
    /// <param name="userEmail">User's email address</param>
    /// <returns>Migrated profile if migration was performed, null otherwise</returns>
    public async Task<DbProfile?> CheckAndMigrateIfNeededAsync(string userId, string? userEmail)
    {
        if (string.IsNullOrEmpty(userEmail))
        {
            return null;
        }

        var legacyProfile = await _legacyDbService.FindProfileByEmailAsync(userEmail);

        if (legacyProfile == null)
        {
            return null;
        }

        _logger.LogInformation("Found legacy profile for email {Email}, starting migration", userEmail);
        var result = await MigrateLegacyProfileAsync(userId, userEmail, legacyProfile);

        return result;
    }

    /// <summary>
    /// Migrate a legacy profile to the new system
    /// </summary>
    /// <param name="userId">Supabase UID</param>
    /// <param name="email">User's email address</param>
    /// <param name="legacyProfile">Legacy profile data</param>
    /// <returns>The migrated profile</returns>
    public async Task<DbProfile> MigrateLegacyProfileAsync(string userId, string email, LegacyProfile legacyProfile)
    {
        // Create new profile with migrated data
        var userGuid = Guid.Parse(userId);
        var profile = new DbProfile
        {
            Uid = userGuid,
            Email = email,
            Profile = new ProfileData
            {
                FirstName = legacyProfile.FirstName,
                UseMetric = legacyProfile.UseMetric,
                GoalStart = legacyProfile.StartDate,
                GoalWeight = legacyProfile.GoalWeight,
                PlannedPoundsPerWeek = legacyProfile.PlannedPoundsPerWeek,
                DayStartOffset = legacyProfile.DayStartOffset,
                ShowCalories = true, // it was on in the old site
                SharingToken = legacyProfile.PrivateUrlKey, // Use existing sharing token
                SharingEnabled = true, // Always enabled in legacy app
                IsMigrated = true,
                IsNewlyMigrated = true
            },
            CreatedAt = DateTime.UtcNow.ToString("o"),
            UpdatedAt = DateTime.UtcNow.ToString("o")
        };

        // Save the profile
        profile = await _profileService.CreateAsync(profile);

        // Create provider links if legacy profile has OAuth tokens
        if (!string.IsNullOrEmpty(legacyProfile.FitbitRefreshToken) && !string.IsNullOrEmpty(legacyProfile.DeviceType))
        {
            await MigrateProviderLinkAsync(userGuid, legacyProfile);
        }

        return profile;
    }

    /// <summary>
    /// Migrate provider OAuth tokens from legacy profile
    /// </summary>
    private async Task MigrateProviderLinkAsync(Guid userId, LegacyProfile legacyProfile)
    {
        if (string.IsNullOrEmpty(legacyProfile.DeviceType) || string.IsNullOrEmpty(legacyProfile.FitbitRefreshToken))
        {
            return;
        }

        var providerName = legacyProfile.DeviceType.ToLowerInvariant();

        // Create an expired token that will trigger refresh on first use
        var expiredToken = new Dictionary<string, object>
        {
            ["refresh_token"] = legacyProfile.FitbitRefreshToken!,
            ["access_token"] = "",
            ["token_type"] = "Bearer",
            ["scope"] = "user.metrics",
            ["received_at"] = 0L, // Unix timestamp 0 (1970-01-01)
            ["expires_in"] = EXPIRED_TOKEN_EXPIRES_IN // Already expired since received_at is 0
        };

        await _providerLinkService.StoreProviderLinkAsync(userId, providerName, expiredToken);
        _logger.LogInformation("Migrated {Provider} OAuth token for user {UserId}", providerName, userId);
    }
}

