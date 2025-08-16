namespace TrendWeight.Features.Measurements.Models;

/// <summary>
/// Processed measurement with date/time information and interpolation flags
/// Corresponds to SourceMeasurement in TypeScript code
/// </summary>
public class SourceMeasurement
{
    /// <summary>
    /// Date of measurement after dayStartOffset adjustment
    /// </summary>
    public required DateTime Date { get; init; }

    /// <summary>
    /// Original timestamp for intra-day sorting
    /// </summary>
    public required DateTime Timestamp { get; init; }

    /// <summary>
    /// Source provider or "interpolated"
    /// </summary>
    public required string Source { get; init; }

    /// <summary>
    /// Weight in kg (no unit conversion in backend)
    /// </summary>
    public required decimal Weight { get; init; }

    /// <summary>
    /// Fat ratio (0-1 ratio) if available
    /// </summary>
    public decimal? FatRatio { get; init; }

    /// <summary>
    /// Whether weight was interpolated
    /// </summary>
    public bool WeightIsInterpolated { get; init; }

    /// <summary>
    /// Whether fat ratio was interpolated
    /// </summary>
    public bool FatRatioIsInterpolated { get; init; }
}
