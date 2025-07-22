namespace TrendWeight.Features.Profile.Models;

/// <summary>
/// Response model for profile endpoints
/// </summary>
public class ProfileResponse
{
    public required UserProfileData User { get; set; }
    public required bool IsMe { get; set; }
    public required DateTime Timestamp { get; set; }
}

/// <summary>
/// User profile data included in responses
/// </summary>
public class UserProfileData
{
    public string? FirstName { get; set; }
    public string? GoalStart { get; set; }
    public decimal? GoalWeight { get; set; }
    public decimal? PlannedPoundsPerWeek { get; set; }
    public int DayStartOffset { get; set; }
    public bool UseMetric { get; set; }
    public bool ShowCalories { get; set; }
    public bool SharingEnabled { get; set; }
    public string? SharingToken { get; set; }
    public bool IsMigrated { get; set; }
    public bool IsNewlyMigrated { get; set; }
}

/// <summary>
/// Response model for sharing token generation
/// </summary>
public class SharingTokenResponse
{
    public required bool SharingEnabled { get; set; }
    public required string SharingToken { get; set; }
}

