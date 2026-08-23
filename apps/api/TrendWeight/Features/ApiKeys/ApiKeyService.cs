using System.Security.Cryptography;
using System.Text;
using TrendWeight.Common;
using TrendWeight.Features.ApiKeys.Models;
using TrendWeight.Features.Profile.Services;

namespace TrendWeight.Features.ApiKeys;

/// <summary>
/// Manages per-user API keys. One key per user, stored as a SHA-256 hash in the
/// profile JSONB alongside a display suffix; the plaintext is returned only once.
/// </summary>
public class ApiKeyService : IApiKeyService
{
    /// <summary>Keys follow the industry "sk-" secret-key convention</summary>
    public const string KeyPrefix = "sk-";

    private const int SuffixLength = 4;

    private readonly IProfileService _profileService;
    private readonly ILogger<ApiKeyService> _logger;

    public ApiKeyService(IProfileService profileService, ILogger<ApiKeyService> logger)
    {
        _profileService = profileService;
        _logger = logger;
    }

    /// <summary>
    /// Hashes an API key for storage/lookup. SHA-256 is sufficient because the key
    /// has 128 bits of entropy, and a deterministic hash enables indexed lookup.
    /// </summary>
    public static string HashKey(string apiKey)
    {
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(apiKey))).ToLowerInvariant();
    }

    public async Task<GeneratedApiKey?> GenerateAsync(Guid userId)
    {
        var profile = await _profileService.GetByIdAsync(userId);
        if (profile == null)
        {
            return null;
        }

        // 128 bits of entropy; no collision check needed, and a collision would only
        // affect the colliding user's own key
        var apiKey = KeyPrefix + TokenGenerator.GenerateToken();
        var createdAt = DateTime.UtcNow.ToString("o");

        profile.Profile.ApiKeyHash = HashKey(apiKey);
        profile.Profile.ApiKeySuffix = apiKey[^SuffixLength..];
        profile.Profile.ApiKeyCreatedAt = createdAt;
        profile.UpdatedAt = createdAt;

        await _profileService.UpdateAsync(profile);
        _logger.LogInformation("Generated new API key for user {UserId}", userId);

        return new GeneratedApiKey
        {
            ApiKey = apiKey,
            Suffix = profile.Profile.ApiKeySuffix,
            CreatedAt = createdAt
        };
    }

    public async Task<ApiKeyMetadata?> GetMetadataAsync(Guid userId)
    {
        var profile = await _profileService.GetByIdAsync(userId);
        if (profile == null)
        {
            return null;
        }

        return new ApiKeyMetadata
        {
            Exists = profile.Profile.ApiKeyHash != null,
            Suffix = profile.Profile.ApiKeySuffix,
            CreatedAt = profile.Profile.ApiKeyCreatedAt
        };
    }

    public async Task<bool> RevokeAsync(Guid userId)
    {
        var profile = await _profileService.GetByIdAsync(userId);
        if (profile == null)
        {
            return false;
        }

        profile.Profile.ApiKeyHash = null;
        profile.Profile.ApiKeySuffix = null;
        profile.Profile.ApiKeyCreatedAt = null;
        profile.UpdatedAt = DateTime.UtcNow.ToString("o");

        await _profileService.UpdateAsync(profile);
        _logger.LogInformation("Revoked API key for user {UserId}", userId);
        return true;
    }
}
