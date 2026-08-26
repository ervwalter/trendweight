namespace TrendWeight.Features.Measurements;

/// <summary>
/// A named trend-smoothing configuration. Alpha smooths the level (the displayed trend value);
/// Beta smooths the slope. Beta = 0 with a zero-initialized slope is exactly the default
/// Hacker's Diet exponentially smoothed moving average.
/// </summary>
public sealed record TrendAlgorithmPreset(string Id, decimal Alpha, decimal Beta);

/// <summary>
/// The fixed set of trend algorithm presets selectable in profile settings.
/// Preset ids are stored in profile JSONB and must never be renamed; add new ids instead.
/// </summary>
public static class TrendAlgorithmPresets
{
    public const string DefaultId = "default";

    public static IReadOnlyList<TrendAlgorithmPreset> All { get; } = new List<TrendAlgorithmPreset>
    {
        new(DefaultId, Alpha: 0.1m, Beta: 0m),
        new("holt-gentle", Alpha: 0.1m, Beta: 0.05m),
        new("holt", Alpha: 0.1m, Beta: 0.1m),
        new("holt-responsive", Alpha: 0.15m, Beta: 0.15m),
    };

    /// <summary>
    /// Resolves a stored preset id to a preset. Null, empty, or unknown ids fall back to the
    /// default preset so profiles written by future versions still compute sensibly.
    /// </summary>
    public static TrendAlgorithmPreset Resolve(string? id)
    {
        return All.FirstOrDefault(p => p.Id == id) ?? All[0];
    }

    /// <summary>
    /// Whether an id is acceptable in a profile update. Null is valid and means the default.
    /// </summary>
    public static bool IsValid(string? id)
    {
        return id == null || All.Any(p => p.Id == id);
    }
}
