namespace TrendWeight.Features.Profile.Models;

/// <summary>
/// User profile data
/// Corresponds to ProfileData in legacy TypeScript code
/// </summary>
public class ProfileData
{
    public string FirstName { get; set; } = string.Empty;
    public DateTime? GoalStart { get; set; }
    public decimal? GoalWeight { get; set; }
    public decimal? PlannedPoundsPerWeek { get; set; }
    public int? DayStartOffset { get; set; }
    public bool UseMetric { get; set; }
    public bool? ShowCalories { get; set; }
    public string? SharingToken { get; set; }
    public bool SharingEnabled { get; set; }
    public bool IsMigrated { get; set; }
    public bool IsNewlyMigrated { get; set; }
    public bool HideDataBeforeStart { get; set; }
}
