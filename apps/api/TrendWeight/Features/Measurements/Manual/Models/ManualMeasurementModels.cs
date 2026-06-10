namespace TrendWeight.Features.Measurements.Manual.Models;

/// <summary>
/// Request body for upserting a manual reading. The date comes from the URL
/// (one manual entry per date). Weight is always kilograms and fat is a 0-1 ratio,
/// matching the stored RawMeasurement wire format - clients convert display units.
/// </summary>
public class ManualMeasurementRequest
{
    /// <summary>
    /// Weight in kilograms
    /// </summary>
    public required decimal Weight { get; init; }

    /// <summary>
    /// Fat ratio as a decimal (0.0 to 1.0), not a percentage
    /// </summary>
    public decimal? FatRatio { get; init; }
}

/// <summary>
/// A manual reading as returned by the manual measurements endpoints
/// </summary>
public class ManualMeasurementResponse
{
    /// <summary>
    /// Date in the user's local timezone (yyyy-MM-dd)
    /// </summary>
    public required string Date { get; init; }

    /// <summary>
    /// Weight in kilograms
    /// </summary>
    public required decimal Weight { get; init; }

    /// <summary>
    /// Fat ratio as a decimal (0.0 to 1.0)
    /// </summary>
    public decimal? FatRatio { get; init; }
}
