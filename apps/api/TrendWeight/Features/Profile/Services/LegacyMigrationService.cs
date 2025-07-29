using System.Globalization;
using TrendWeight.Features.Measurements;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Features.Profile.Models;
using TrendWeight.Features.ProviderLinks.Services;
using TrendWeight.Infrastructure.DataAccess.Models;

namespace TrendWeight.Features.Profile.Services;

public class LegacyMigrationService : ILegacyMigrationService
{
    private readonly IProfileService _profileService;
    private readonly ILegacyDbService _legacyDbService;
    private readonly IProviderLinkService _providerLinkService;
    private readonly ISourceDataService _sourceDataService;
    private readonly ILogger<LegacyMigrationService> _logger;

    // Expired token marker - 1 hour duration for a token received at Unix timestamp 0
    private const int EXPIRED_TOKEN_EXPIRES_IN = 3600;

    // Pounds to kilograms conversion factor
    private const decimal POUNDS_TO_KG = 0.453592m;

    public LegacyMigrationService(
        IProfileService profileService,
        ILegacyDbService legacyDbService,
        IProviderLinkService providerLinkService,
        ISourceDataService sourceDataService,
        ILogger<LegacyMigrationService> logger)
    {
        _profileService = profileService;
        _legacyDbService = legacyDbService;
        _providerLinkService = providerLinkService;
        _sourceDataService = sourceDataService;
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
                PlannedPoundsPerWeek = legacyProfile.UseMetric
                    ? legacyProfile.PlannedPoundsPerWeek / 2
                    : legacyProfile.PlannedPoundsPerWeek,
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

        // Migrate legacy measurements for the new user
        await MigrateLegacyMeasurementsAsync(userGuid, email);

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

    /// <summary>
    /// Migrate legacy measurements for an existing migrated user
    /// </summary>
    /// <param name="userId">Supabase UID</param>
    /// <param name="userEmail">User's email address</param>
    /// <returns>True if measurements were migrated, false otherwise</returns>
    public async Task<bool> MigrateLegacyMeasurementsAsync(Guid userId, string userEmail)
    {
        // Find legacy profile to get UseMetric setting
        var legacyProfile = await _legacyDbService.FindProfileByEmailAsync(userEmail);
        if (legacyProfile == null)
        {
            _logger.LogInformation("No legacy profile found for email {Email}", userEmail);
            return false;
        }

        // Get all legacy measurements
        var measurements = await _legacyDbService.GetMeasurementsByEmailAsync(userEmail);
        if (measurements.Count == 0)
        {
            _logger.LogInformation("No legacy measurements found for email {Email}", userEmail);
            return false;
        }

        _logger.LogInformation("Found {Count} legacy measurements for email {Email}", measurements.Count, userEmail);

        // Convert measurements to source data format
        var rawMeasurements = measurements.Select(m => new RawMeasurement
        {
            Date = m.Timestamp.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            Time = m.Timestamp.ToString("HH:mm:ss", CultureInfo.InvariantCulture),
            // Convert weight to kg if legacy profile was in pounds
            Weight = legacyProfile.UseMetric ? m.Weight : m.Weight * POUNDS_TO_KG,
            FatRatio = m.FatRatio
        }).ToList();

        // Create source data entry
        var sourceData = new List<SourceData>
        {
            new SourceData
            {
                Source = "legacy",
                LastUpdate = DateTime.UtcNow,
                Measurements = rawMeasurements
            }
        };

        // Save source data
        await _sourceDataService.UpdateSourceDataAsync(userId, sourceData);

        // Create provider link for legacy data
        await _providerLinkService.StoreProviderLinkAsync(userId, "legacy", new Dictionary<string, object>() { { "disabled", false } });

        _logger.LogInformation("Successfully imported {Count} legacy measurements for user {UserId}", measurements.Count, userId);
        return true;
    }

    /// <summary>
    /// Check if legacy data needs to be migrated for an existing migrated user
    /// </summary>
    /// <param name="userId">Supabase UID</param>
    /// <param name="userEmail">User's email address</param>
    public async Task CheckAndMigrateLegacyDataIfNeededAsync(Guid userId, string? userEmail)
    {
        try
        {
            if (string.IsNullOrEmpty(userEmail))
            {
                return;
            }

            // Check if legacy provider link exists
            var legacyLink = await _providerLinkService.GetProviderLinkAsync(userId, "legacy");

            // Import only if link doesn't exist at all
            if (legacyLink == null)
            {
                _logger.LogInformation("Importing legacy data for existing migrated user {UserId}", userId);
                await MigrateLegacyMeasurementsAsync(userId, userEmail);
            }
        }
        catch (Exception ex)
        {
            // Don't fail the profile load if legacy import fails
            _logger.LogError(ex, "Error checking/importing legacy data for user {UserId}", userId);
        }
    }
}

