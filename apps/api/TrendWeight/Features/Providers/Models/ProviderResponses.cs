namespace TrendWeight.Features.Providers.Models;

/// <summary>
/// Response model for provider link information
/// </summary>
public class ProviderLinkResponse
{
    public required string Provider { get; set; }

    /// <summary>
    /// When the link was established. Only returned to the account owner; the
    /// anonymous sharing endpoint leaves it null so it is omitted from the payload.
    /// </summary>
    public string? ConnectedAt { get; set; }

    public required bool HasToken { get; set; }
    public bool IsDisabled { get; set; }
}

/// <summary>
/// Response model for provider disconnect/resync operations
/// </summary>
public class ProviderOperationResponse
{
    public required string Message { get; set; }
}

/// <summary>
/// Provider availability configuration for the frontend
/// </summary>
public class ProvidersConfigResponse
{
    /// <summary>
    /// Providers that no longer accept new connections or syncs (e.g. "fitbit"
    /// once Google retires its API). Existing data remains visible.
    /// </summary>
    public required List<string> DisabledProviders { get; set; }
}
