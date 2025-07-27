namespace TrendWeight.Features.Providers.Models;

/// <summary>
/// Response model for provider link information
/// </summary>
public class ProviderLinkResponse
{
    public required string Provider { get; set; }
    public required string ConnectedAt { get; set; }
    public string? UpdateReason { get; set; }
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
