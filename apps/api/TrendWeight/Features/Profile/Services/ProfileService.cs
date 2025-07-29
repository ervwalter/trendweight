using System.Globalization;
using System.Numerics;
using System.Security.Cryptography;
using System.Text;
using TrendWeight.Infrastructure.DataAccess;
using TrendWeight.Infrastructure.DataAccess.Models;
using TrendWeight.Features.Profile.Models;
using TrendWeight.Features.Measurements;
using TrendWeight.Features.ProviderLinks.Services;
using TrendWeight.Infrastructure.Auth;
using TrendWeight.Infrastructure.Services;

namespace TrendWeight.Features.Profile.Services;

public class ProfileService : IProfileService
{
    private readonly ISupabaseService _supabaseService;
    private readonly ILogger<ProfileService> _logger;
    private readonly ISourceDataService _sourceDataService;
    private readonly IProviderLinkService _providerLinkService;
    private readonly IUserAccountMappingService _userAccountMappingService;
    private readonly IClerkService _clerkService;

    public ProfileService(
        ISupabaseService supabaseService,
        ILogger<ProfileService> logger,
        ISourceDataService sourceDataService,
        IProviderLinkService providerLinkService,
        IUserAccountMappingService userAccountMappingService,
        IClerkService clerkService)
    {
        _supabaseService = supabaseService;
        _logger = logger;
        _sourceDataService = sourceDataService;
        _providerLinkService = providerLinkService;
        _userAccountMappingService = userAccountMappingService;
        _clerkService = clerkService;
    }


    public async Task<DbProfile?> GetByIdAsync(Guid id)
    {
        return await _supabaseService.GetByIdAsync<DbProfile>(id);
    }

    public async Task<DbProfile?> GetByIdAsync(string id)
    {
        // Parse as GUID (Supabase UIDs are UUIDs)
        if (Guid.TryParse(id, out var guid))
        {
            return await GetByIdAsync(guid);
        }

        _logger.LogWarning("Invalid user ID format: {Id}", id);
        return null;
    }


    public async Task<DbProfile> CreateAsync(DbProfile profile)
    {
        return await _supabaseService.InsertAsync(profile);
    }

    public async Task<DbProfile> UpdateAsync(DbProfile profile)
    {
        return await _supabaseService.UpdateAsync(profile);
    }

    public async Task<DbProfile> UpdateOrCreateProfileAsync(string userId, string email, UpdateProfileRequest request)
    {
        // Try to get existing profile by ID
        var profile = await GetByIdAsync(userId);

        if (profile == null)
        {
            _logger.LogInformation("Creating new profile for user {UserId}", userId);

            // Create new profile with only provided values
            var userGuid = Guid.Parse(userId);
            profile = new DbProfile
            {
                Uid = userGuid,
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
        var profiles = await _supabaseService.GetAllAsync<DbProfile>();
        return profiles.FirstOrDefault(p => p.Profile?.SharingToken == sharingToken);
    }

    /// <summary>
    /// Generates a new share token with 128 bits of entropy
    /// </summary>
    public string GenerateShareToken()
    {
        // Generate 128 bits (16 bytes) of cryptographically secure random data
        var bytes = new byte[16];
        using (var rng = System.Security.Cryptography.RandomNumberGenerator.Create())
        {
            rng.GetBytes(bytes);
        }

        // Convert to base36 (0-9, a-z) for URL-friendly, lowercase representation
        // This gives us ~25 characters for 128 bits of entropy
        return ToBase36(bytes);
    }

    /// <summary>
    /// Converts byte array to base36 string (0-9, a-z)
    /// </summary>
    private static string ToBase36(byte[] bytes)
    {
        const string base36Chars = "0123456789abcdefghijklmnopqrstuvwxyz";
        var result = new System.Text.StringBuilder();

        // Convert bytes to BigInteger for easier base conversion
        var bigInt = new System.Numerics.BigInteger(bytes.Concat(new byte[] { 0 }).ToArray());

        // Convert to base36
        while (bigInt > 0)
        {
            var remainder = (int)(bigInt % 36);
            result.Insert(0, base36Chars[remainder]);
            bigInt /= 36;
        }

        // Pad to ensure consistent length (25 chars for 128 bits in base36)
        while (result.Length < 25)
        {
            result.Insert(0, '0');
        }

        return result.ToString();
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
    public async Task<DbProfile?> GenerateNewSharingTokenAsync(string userId)
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
    public async Task<bool> CompleteMigrationAsync(string userId)
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

            // Step 1: Get the user_accounts record to find the Clerk external ID
            var userAccount = await _userAccountMappingService.GetByInternalIdAsync(userId);
            string? clerkUserId = userAccount?.ExternalId;

            // Step 2: Delete from Clerk (if user has a Clerk account)
            if (!string.IsNullOrEmpty(clerkUserId))
            {
                _logger.LogInformation("Deleting Clerk user {ClerkUserId} for internal user {UserId}", clerkUserId, userId);
                var clerkDeleted = await _clerkService.DeleteUserAsync(clerkUserId);
                if (!clerkDeleted)
                {
                    _logger.LogWarning("Failed to delete Clerk user {ClerkUserId}, but continuing with other deletions", clerkUserId);
                    // Continue with other deletions even if Clerk deletion fails
                }
            }
            else
            {
                _logger.LogInformation("No Clerk user ID found for user {UserId}, skipping Clerk deletion", userId);
            }

            // Step 3: Delete from Supabase Auth (if user has a Supabase account)
            var authDeleted = await _supabaseService.DeleteAuthUserAsync(userId);
            if (!authDeleted)
            {
                _logger.LogWarning("Failed to delete Supabase auth user {UserId}, but continuing with other deletions", userId);
                // Continue even if Supabase auth deletion fails - they might not have a Supabase account
            }

            // Step 4: Delete profile (this will CASCADE delete provider_links and source_data)
            var profile = await GetByIdAsync(userId);
            if (profile != null)
            {
                try
                {
                    await _supabaseService.DeleteAsync(profile);
                    _logger.LogInformation("Deleted profile for user {UserId}", userId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to delete profile for user {UserId}", userId);
                    // Continue anyway
                }
            }
            else
            {
                _logger.LogInformation("No profile found for user {UserId}, skipping", userId);
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
