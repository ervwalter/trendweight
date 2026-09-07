namespace TrendWeight.Infrastructure.Middleware;

/// <summary>
/// Rewrites request paths before they are logged. Sharing tokens are capability
/// secrets carried in the path of the anonymous sharing routes, so the token
/// segment is replaced with a placeholder; every other path is returned as-is.
/// </summary>
public static class LogSafePath
{
    public const string Placeholder = "{sharing-token}";

    // Route prefixes whose next segment is a sharing token (see ProfileController,
    // MeasurementsController and ProvidersController).
    private static readonly string[] SharingTokenPrefixes =
    [
        "/api/profile/",
        "/api/data/",
        "/api/providers/links/",
    ];

    // Fixed actions that share a prefix with a sharing route. Anything else after
    // the prefix is treated as a token, so a new fixed route is redacted rather
    // than a token being logged.
    private static readonly string[] FixedSegments =
    [
        "generate-token",
        "complete-migration",
    ];

    public static string Redact(PathString path) => Redact(path.Value);

    public static string Redact(string? path)
    {
        if (string.IsNullOrEmpty(path))
        {
            return string.Empty;
        }

        foreach (var prefix in SharingTokenPrefixes)
        {
            if (!path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var segmentEnd = path.IndexOf('/', prefix.Length);
            var segment = segmentEnd < 0 ? path[prefix.Length..] : path[prefix.Length..segmentEnd];
            if (segment.Length == 0 || FixedSegments.Contains(segment, StringComparer.OrdinalIgnoreCase))
            {
                return path;
            }

            var rest = segmentEnd < 0 ? string.Empty : path[segmentEnd..];
            return string.Concat(path.AsSpan(0, prefix.Length), Placeholder, rest);
        }

        return path;
    }
}
