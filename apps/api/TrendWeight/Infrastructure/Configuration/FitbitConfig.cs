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

    /// <summary>
    /// Kill-switch for the day Google retires the Fitbit API. Setting
    /// Fitbit__Enabled=false stops Fitbit syncing and new Fitbit connections;
    /// existing history is preserved and keeps charting. No code change needed.
    /// </summary>
    public bool Enabled { get; set; } = true;
}
