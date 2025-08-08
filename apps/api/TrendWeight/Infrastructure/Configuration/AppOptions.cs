namespace TrendWeight.Infrastructure.Configuration;

/// <summary>
/// Unified application configuration options
/// </summary>
public class AppOptions
{
    /// <summary>
    /// Supabase configuration
    /// </summary>
    public SupabaseConfig Supabase { get; set; } = new();

    /// <summary>
    /// Withings API configuration
    /// </summary>
    public WithingsConfig Withings { get; set; } = new();

    /// <summary>
    /// Fitbit API configuration
    /// </summary>
    public FitbitConfig Fitbit { get; set; } = new();

    /// <summary>
    /// Clerk authentication configuration
    /// </summary>
    public ClerkConfig Clerk { get; set; } = new();
}
