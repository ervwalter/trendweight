using System.Globalization;
using System.Numerics;
using System.Security.Cryptography;
using System.Text;
using TrendWeight.Infrastructure.DataAccess;
using TrendWeight.Infrastructure.DataAccess.Models;
using TrendWeight.Features.Profile.Models;
using TrendWeight.Features.Measurements;
using TrendWeight.Features.ProviderLinks.Services;

namespace TrendWeight.Features.Profile.Services;

public class ProfileService : IProfileService
{
    private readonly ISupabaseService _supabaseService;
    private readonly ILogger<ProfileService> _logger;
    private readonly ISourceDataService _sourceDataService;
    private readonly IProviderLinkService _providerLinkService;

    public ProfileService(
        ISupabaseService supabaseService,
        ILogger<ProfileService> logger,
        ISourceDataService sourceDataService,
        IProviderLinkService providerLinkService)
    {
        _supabaseService = supabaseService;
        _logger = logger;
        _sourceDataService = sourceDataService;
        _providerLinkService = providerLinkService;
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
    /// Deletes a user account and all associated data
    /// </summary>
    /// <param name="userId">The user's Supabase UID</param>
    /// <returns>True if successful, false otherwise</returns>
    public async Task<bool> DeleteAccountAsync(Guid userId)
    {
        try
        {
            _logger.LogInformation("Starting account deletion for user {UserId}", userId);

            // 1. Delete all source data
            await _sourceDataService.DeleteAllSourceDataAsync(userId);
            _logger.LogInformation("Deleted all source data for user {UserId}", userId);

            // 2. Delete all provider links
            await _providerLinkService.DeleteAllProviderLinksAsync(userId);
            _logger.LogInformation("Deleted all provider links for user {UserId}", userId);

            // 3. Delete the user's profile
            var profile = await GetByIdAsync(userId);
            if (profile != null)
            {
                await _supabaseService.DeleteAsync<DbProfile>(profile);
                _logger.LogInformation("Deleted profile for user {UserId}", userId);
            }

            // 4. Delete the user from Supabase Auth
            var authDeleted = await _supabaseService.DeleteAuthUserAsync(userId);
            if (!authDeleted)
            {
                _logger.LogError("Failed to delete auth user {UserId}, but other data was deleted", userId);
                return false;
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
