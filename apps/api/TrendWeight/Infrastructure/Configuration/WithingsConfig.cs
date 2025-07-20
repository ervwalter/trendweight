namespace TrendWeight.Infrastructure.Configuration;

/// <summary>
/// Configuration for Withings API integration
/// </summary>
public class WithingsConfig
{
    /// <summary>
    /// Withings OAuth client ID
    /// </summary>
    public string ClientId { get; set; } = string.Empty;

    /// <summary>
    /// Withings OAuth client secret
    /// </summary>
    public string ClientSecret { get; set; } = string.Empty;
}
