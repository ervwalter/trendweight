using TrendWeight.Features.Measurements.Models;

namespace TrendWeight.Features.Profile.Models;

/// <summary>
/// Legacy TrendWeight profile from Supabase legacy_profiles table
/// </summary>
public class LegacyProfile
{
    public string Email { get; set; } = string.Empty;
    public string? Username { get; set; }
    public string? FirstName { get; set; }
    public bool? UseMetric { get; set; }
    public DateTime? StartDate { get; set; }
    public decimal? GoalWeight { get; set; }
    public decimal? PlannedPoundsPerWeek { get; set; }
    public int? DayStartOffset { get; set; }
    public string? PrivateUrlKey { get; set; }
    public string? DeviceType { get; set; }
    public string? RefreshToken { get; set; }
    public List<RawMeasurement> Measurements { get; set; } = new List<RawMeasurement>();
}
