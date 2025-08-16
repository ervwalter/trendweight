namespace TrendWeight.Features.Measurements.Models;

/// <summary>
/// Computed measurement with trend calculations
/// Corresponds to frontend Measurement interface but with string date
/// </summary>
public class ComputedMeasurement
{
    /// <summary>Date of measurement (YYYY-MM-DD format)</summary>
    public required string Date { get; init; }

    /// <summary>Actual weight in kg</summary>
    public required decimal ActualWeight { get; init; }

    /// <summary>Trend weight in kg</summary>
    public required decimal TrendWeight { get; init; }

    /// <summary>Whether weight was interpolated</summary>
    public required bool WeightIsInterpolated { get; init; }

    /// <summary>Whether fat data was interpolated</summary>
    public required bool FatIsInterpolated { get; init; }

    /// <summary>Actual fat percentage (0-1 ratio)</summary>
    public decimal? ActualFatPercent { get; init; }

    /// <summary>Trend fat percentage (0-1 ratio)</summary>
    public decimal? TrendFatPercent { get; init; }
}
