namespace TrendWeight.Features.Profile.Models;

public class UpdateProfileRequest
{
    public string? FirstName { get; set; }
    public DateTime? GoalStart { get; set; }
    public decimal? GoalWeight { get; set; }
    public decimal? PlannedPoundsPerWeek { get; set; }
    public int? DayStartOffset { get; set; }
    public bool? UseMetric { get; set; }
    public bool? ShowCalories { get; set; }
    public bool? HideDataBeforeStart { get; set; }
}
