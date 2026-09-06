namespace TrendWeight.Features.ApiV1.Models;

/// <summary>Behavioral and display preferences, without account or sharing details.</summary>
public class V1Settings
{
    /// <summary>Goal start date (yyyy-MM-dd), omitted when unset.</summary>
    public string? GoalStart { get; set; }

    /// <summary>Goal weight in kilograms when useMetric is true, otherwise pounds. Omitted when unset.</summary>
    public decimal? GoalWeight { get; set; }

    /// <summary>Planned weekly weight change in kilograms when useMetric is true, otherwise pounds. Negative means loss, positive means gain, zero means maintenance. Omitted when unset.</summary>
    public decimal? PlannedWeightChangePerWeek { get; set; }

    /// <summary>Whether the user displays metric units. Determines the units of goalWeight and plannedWeightChangePerWeek in this response.</summary>
    public bool UseMetric { get; set; }

    /// <summary>Hour (0-23) at which a measurement day starts in the user's local time.</summary>
    public int DayStartOffset { get; set; }

    /// <summary>Whether to display calorie estimates.</summary>
    public bool ShowCalories { get; set; }

    /// <summary>Whether to hide measurements before the goal start date.</summary>
    public bool HideDataBeforeStart { get; set; }

    /// <summary>Effective trend preset: default, holt-gentle, holt, or holt-responsive.</summary>
    public required string TrendAlgorithm { get; set; }
}
