namespace TrendWeight.Features.ApiKeys.Models;

/// <summary>
/// Metadata about a user's API key (never includes the key itself)
/// </summary>
public class ApiKeyMetadata
{
    public required bool Exists { get; set; }

    /// <summary>Last 4 characters of the key, for display (e.g. "sk-…wxyz")</summary>
    public string? Suffix { get; set; }

    /// <summary>ISO 8601 timestamp of when the key was generated</summary>
    public string? CreatedAt { get; set; }
}

/// <summary>
/// Result of generating a new API key. The plaintext key is returned exactly once
/// and is never stored or retrievable afterwards.
/// </summary>
public class GeneratedApiKey
{
    public required string ApiKey { get; set; }
    public required string Suffix { get; set; }
    public required string CreatedAt { get; set; }
}
