using TrendWeight.Common;
using TrendWeight.Infrastructure.DataAccess;
using TrendWeight.Infrastructure.DataAccess.Models;
using TrendWeight.Features.Profile.Models;
using TrendWeight.Infrastructure.Auth;
using TrendWeight.Infrastructure.Services;

namespace TrendWeight.Features.Profile.Services;

public class ProfileService : IProfileService
{
    private readonly ISupabaseService _supabaseService;
    private readonly ILogger<ProfileService> _logger;
    private readonly IUserAccountMappingService _userAccountMappingService;
    private readonly IClerkService _clerkService;

    public ProfileService(
        ISupabaseService supabaseService,
        ILogger<ProfileService> logger,
        IUserAccountMappingService userAccountMappingService,
        IClerkService clerkService)
    {
        _supabaseService = supabaseService;
        _logger = logger;
        _userAccountMappingService = userAccountMappingService;
        _clerkService = clerkService;
    }


    public async Task<DbProfile?> GetByIdAsync(Guid id)
    {
        return await _supabaseService.GetByIdAsync<DbProfile>(id);
    }


    public async Task<DbProfile> CreateAsync(DbProfile profile)
    {
        return await _supabaseService.InsertAsync(profile);
    }

    public async Task<DbProfile> UpdateAsync(DbProfile profile)
    {
        return await _supabaseService.UpdateAsync(profile);
    }

    public async Task<DbProfile> UpdateOrCreateProfileAsync(Guid userId, string email, UpdateProfileRequest request)
    {
        // Try to get existing profile by ID
        var profile = await GetByIdAsync(userId);

        if (profile == null)
        {
            _logger.LogInformation("Creating new profile for user {UserId}", userId);

            // Create new profile with only provided values
            profile = new DbProfile
            {
                Uid = userId,
                Email = email,
                Profile = new ProfileData
                {
                    FirstName = request.FirstName ?? "",
                    UseMetric = request.UseMetric ?? false,
                    GoalStart = request.GoalStart,
                    GoalWeight = request.GoalWeight,
                    PlannedPoundsPerWeek = request.PlannedPoundsPerWeek,
                    DayStartOffset = request.DayStartOffset,
                    ShowCalories = request.ShowCalories,
                    HideDataBeforeStart = request.HideDataBeforeStart ?? false,
                    TrendAlgorithm = request.TrendAlgorithm,
                    SharingToken = await GenerateUniqueShareTokenAsync()
                },
                CreatedAt = DateTime.UtcNow.ToString("o"),
                UpdatedAt = DateTime.UtcNow.ToString("o")
            };

            _logger.LogInformation("Creating profile with UID: {Uid}, Email: {Email}", profile.Uid, profile.Email);
            profile = await CreateAsync(profile);
        }
        else
        {
            _logger.LogInformation("Updating existing profile for user {UserId}", userId);

            // Update all fields from the request
            // Note: The frontend sends all fields, so we update all of them
            // This allows clearing optional fields by setting them to null
            profile.Profile.FirstName = request.FirstName ?? profile.Profile.FirstName;
            profile.Profile.GoalStart = request.GoalStart;
            profile.Profile.GoalWeight = request.GoalWeight;
            profile.Profile.PlannedPoundsPerWeek = request.PlannedPoundsPerWeek;
            profile.Profile.DayStartOffset = request.DayStartOffset;
            profile.Profile.UseMetric = request.UseMetric ?? profile.Profile.UseMetric;
            profile.Profile.ShowCalories = request.ShowCalories;
            profile.Profile.HideDataBeforeStart = request.HideDataBeforeStart ?? profile.Profile.HideDataBeforeStart;
            profile.Profile.TrendAlgorithm = request.TrendAlgorithm ?? profile.Profile.TrendAlgorithm;

            // Update email if it's changed
            if (profile.Email != email)
            {
                _logger.LogInformation("Updating profile email from {OldEmail} to {NewEmail} for user {UserId}", profile.Email, email, userId);
                profile.Email = email;
            }

            // Update timestamp
            profile.UpdatedAt = DateTime.UtcNow.ToString("o");

            profile = await UpdateAsync(profile);
        }

        return profile;
    }

    public async Task<DbProfile?> GetBySharingTokenAsync(string sharingToken)
    {
        var profiles = await _supabaseService.QueryAsync<DbProfile>(query =>
            query.Filter("profile->>SharingToken", Supabase.Postgrest.Constants.Operator.Equals, sharingToken)
        );
        return profiles.FirstOrDefault();
    }

    public async Task<DbProfile?> GetByApiKeyHashAsync(string apiKeyHash)
    {
        var profiles = await _supabaseService.QueryAsync<DbProfile>(query =>
            query.Filter("profile->>ApiKeyHash", Supabase.Postgrest.Constants.Operator.Equals, apiKeyHash)
        );
        return profiles.FirstOrDefault();
    }

    /// <summary>
    /// Generates a new share token with 128 bits of entropy
    /// </summary>
    public string GenerateShareToken()
    {
        return TokenGenerator.GenerateToken();
    }

    /// <summary>
    /// Generates a unique share token, checking for collisions
    /// </summary>
    public async Task<string> GenerateUniqueShareTokenAsync()
    {
        string token;
        DbProfile? existing;

        do
        {
            token = GenerateShareToken();
            existing = await GetBySharingTokenAsync(token);
        } while (existing != null);

        return token;
    }

    /// <summary>
    /// Updates the sharing token for a user's profile
    /// </summary>
    /// <param name="userId">The user's Supabase UID</param>
    /// <returns>Updated profile with new sharing token</returns>
    public async Task<DbProfile?> GenerateNewSharingTokenAsync(Guid userId)
    {
        var user = await GetByIdAsync(userId);
        if (user == null)
        {
            _logger.LogWarning("User document not found for Supabase UID: {UserId}", userId);
            return null;
        }

        // Generate a new unique token
        var newToken = await GenerateUniqueShareTokenAsync();

        // Update the token
        user.Profile.SharingToken = newToken;
        user.UpdatedAt = DateTime.UtcNow.ToString("o");

        // Save the update
        return await UpdateAsync(user);
    }

    /// <summary>
    /// Completes migration by clearing the IsNewlyMigrated flag
    /// </summary>
    /// <param name="userId">The user's Supabase UID</param>
    /// <returns>True if successful, false otherwise</returns>
    public async Task<bool> CompleteMigrationAsync(Guid userId)
    {
        var user = await GetByIdAsync(userId);
        if (user == null)
        {
            _logger.LogWarning("User document not found for Supabase UID: {UserId}", userId);
            return false;
        }

        // Clear the IsNewlyMigrated flag
        user.Profile.IsNewlyMigrated = false;
        user.UpdatedAt = DateTime.UtcNow.ToString("o");

        // Save the update
        await UpdateAsync(user);
        _logger.LogInformation("Completed migration for user {UserId}", userId);
        return true;
    }

    /// <summary>
    /// Deletes a user account and all associated data
    /// </summary>
    /// <param name="userId">The user's Supabase UID</param>
    /// <returns>True if successful, false otherwise</returns>
    public async Task<bool> DeleteAccountAsync(Guid userId)
    {
        try
        {
            _logger.LogInformation("Starting account deletion for user {UserId}", userId);

            var userAccount = await _userAccountMappingService.GetByInternalIdAsync(userId);
            var profile = await GetByIdAsync(userId);

            // Remove legacy data before the profile: its email is needed to find it
            // again on retry, and leaving it behind can restore deleted measurements.
            if (profile != null)
            {
                if (!string.IsNullOrEmpty(profile.Email))
                {
                    try
                    {
                        var legacyProfiles = await _supabaseService.QueryAsync<DbLegacyProfile>(query =>
                            query.Filter("email", Supabase.Postgrest.Constants.Operator.Equals, profile.Email));
                        foreach (var legacyProfile in legacyProfiles)
                        {
                            await _supabaseService.DeleteAsync(legacyProfile);
                            _logger.LogInformation("Deleted legacy profile for email {Email}", profile.Email);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to delete legacy profile for email {Email}", profile.Email);
                        return false;
                    }
                }

                // Cascades to provider_links and source_data. Do not remove the
                // user's login or mapping until application data deletion succeeds.
                await _supabaseService.DeleteAsync(profile);
                _logger.LogInformation("Deleted profile for user {UserId}", userId);
            }

            var clerkUserId = userAccount?.ExternalId;
            if (!string.IsNullOrEmpty(clerkUserId))
            {
                if (!await _clerkService.DeleteUserAsync(clerkUserId))
                {
                    _logger.LogError("Failed to delete Clerk user {ClerkUserId}", clerkUserId);
                    return false;
                }
            }

            // Clerk users may not have an old Supabase Auth account.
            if (!await _supabaseService.DeleteAuthUserAsync(userId))
            {
                _logger.LogWarning("Could not delete legacy Supabase auth user {UserId}; the account may not exist", userId);
            }

            // Step 5: Delete from user_accounts table
            if (userAccount != null)
            {
                var userAccountDeleted = await _userAccountMappingService.DeleteByInternalIdAsync(userId);
                if (!userAccountDeleted)
                {
                    _logger.LogError("Failed to delete user_accounts record for user {UserId}", userId);
                    return false;
                }
                _logger.LogInformation("Deleted user_accounts record for user {UserId}", userId);
            }
            else
            {
                _logger.LogInformation("No user_accounts record found for user {UserId}, skipping", userId);
            }

            _logger.LogInformation("Successfully completed account deletion for user {UserId}", userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting account for user {UserId}", userId);
            return false;
        }
    }
}
