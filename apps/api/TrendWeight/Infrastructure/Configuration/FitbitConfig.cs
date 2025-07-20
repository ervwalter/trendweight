namespace TrendWeight.Infrastructure.Configuration;

/// <summary>
/// Configuration for Fitbit OAuth
/// </summary>
public class FitbitConfig
{
    /// <summary>
    /// Fitbit OAuth client ID
    /// </summary>
    public string ClientId { get; set; } = string.Empty;

    /// <summary>
    /// Fitbit OAuth client secret
    /// </summary>
    public string ClientSecret { get; set; } = string.Empty;
}
