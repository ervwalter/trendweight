using TrendWeight.Features.ApiKeys.Models;

namespace TrendWeight.Features.ApiKeys;

public interface IApiKeyService
{
    /// <summary>
    /// Generates a new API key for the user, replacing any existing one.
    /// Returns null if the user's profile doesn't exist.
    /// </summary>
    Task<GeneratedApiKey?> GenerateAsync(Guid userId);

    /// <summary>
    /// Gets metadata about the user's API key. Returns null if the profile doesn't exist.
    /// </summary>
    Task<ApiKeyMetadata?> GetMetadataAsync(Guid userId);

    /// <summary>
    /// Revokes the user's API key. Returns false if the profile doesn't exist.
    /// </summary>
    Task<bool> RevokeAsync(Guid userId);
}
