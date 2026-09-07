namespace TrendWeight.Infrastructure.Configuration;

/// <summary>
/// Startup check for the settings every deployment needs. Without it a container
/// with a missing or placeholder value passes the health check and fails on the
/// first authenticated request instead.
/// </summary>
public static class RequiredConfiguration
{
    public static readonly string[] Keys =
    [
        "Clerk:Authority",
        "Clerk:SecretKey",
        "Supabase:Url",
        "Supabase:ServiceKey",
    ];

    // Markers used by the placeholder values in appsettings.json and the example files.
    private static readonly string[] PlaceholderMarkers = ["your-", "paste-"];

    /// <summary>
    /// Throws when any required key is missing or still holds a placeholder value.
    /// </summary>
    public static void Validate(IConfiguration configuration)
    {
        var invalid = Keys.Where(key => IsMissingOrPlaceholder(configuration[key])).ToList();
        if (invalid.Count > 0)
        {
            throw new InvalidOperationException(
                $"Required configuration is missing or still set to a placeholder: {string.Join(", ", invalid)}");
        }
    }

    public static bool IsMissingOrPlaceholder(string? value) =>
        string.IsNullOrWhiteSpace(value)
        || PlaceholderMarkers.Any(marker => value.Contains(marker, StringComparison.OrdinalIgnoreCase));
}
