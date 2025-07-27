namespace TrendWeight.Features.Profile.Models;

/// <summary>
/// Legacy TrendWeight profile from MSSQL database
/// </summary>
public class LegacyProfile
{
    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public bool UseMetric { get; set; }
    public DateTime StartDate { get; set; }
    public decimal GoalWeight { get; set; }
    public decimal PlannedPoundsPerWeek { get; set; }
    public int DayStartOffset { get; set; }
    public string PrivateUrlKey { get; set; } = string.Empty;
    public string? DeviceType { get; set; }
    public string? FitbitRefreshToken { get; set; }
}

/// <summary>
/// Legacy TrendWeight measurement from MSSQL database
/// </summary>
public class LegacyMeasurement
{
    public Guid UserId { get; set; }
    public int GroupId { get; set; }
    public DateTime Timestamp { get; set; }
    public DateTime Date { get; set; }
    public decimal Weight { get; set; }
    public decimal? FatRatio { get; set; }
}
