namespace TrendWeight.Features.ApiV1.Models;

/// <summary>
/// One computed daily measurement
/// </summary>
public class V1Measurement
{
    /// <summary>Date of the measurement (yyyy-MM-dd, user's local timezone)</summary>
    public required string Date { get; set; }

    /// <summary>Actual (or interpolated) scale weight in kilograms</summary>
    public required decimal ActualWeight { get; set; }

    /// <summary>Exponentially-smoothed trend weight in kilograms</summary>
    public required decimal TrendWeight { get; set; }

    /// <summary>True if the weight for this day was interpolated rather than measured</summary>
    public required bool WeightIsInterpolated { get; set; }

    /// <summary>True if the fat reading for this day was interpolated rather than measured</summary>
    public required bool FatIsInterpolated { get; set; }

    /// <summary>Actual body fat as a 0-1 ratio, when available</summary>
    public decimal? ActualFatPercent { get; set; }

    /// <summary>Trend body fat as a 0-1 ratio, when available</summary>
    public decimal? TrendFatPercent { get; set; }

    /// <summary>Trend fat mass in kilograms, when available</summary>
    public decimal? TrendFatMass { get; set; }

    /// <summary>Trend lean mass in kilograms, when available</summary>
    public decimal? TrendLeanMass { get; set; }
}

/// <summary>
/// Raw readings from one scale source
/// </summary>
public class V1SourceData
{
    /// <summary>The source these readings came from: "withings", "fitbit", or "legacy"</summary>
    public required string Provider { get; set; }

    /// <summary>When this source last synced (UTC)</summary>
    public required DateTime LastUpdate { get; set; }

    /// <summary>Raw measurements, newest first</summary>
    public required List<V1RawMeasurement> Measurements { get; set; }
}

/// <summary>
/// One raw reading as reported by a source
/// </summary>
public class V1RawMeasurement
{
    /// <summary>Date of the reading (yyyy-MM-dd, user's local timezone)</summary>
    public required string Date { get; set; }

    /// <summary>Time of the reading (HH:mm:ss)</summary>
    public required string Time { get; set; }

    /// <summary>Weight in kilograms</summary>
    public required decimal Weight { get; set; }

    /// <summary>Body fat as a 0-1 ratio, when reported</summary>
    public decimal? FatRatio { get; set; }
}

/// <summary>
/// One weight log entry (a manually entered reading). One entry per date.
/// </summary>
public class V1ManualReading
{
    /// <summary>Date of the entry (yyyy-MM-dd, user's local timezone)</summary>
    public required string Date { get; set; }

    /// <summary>Weight in kilograms</summary>
    public required decimal Weight { get; set; }

    /// <summary>Body fat as a 0-1 ratio (e.g. 0.225 for 22.5%), when recorded</summary>
    public decimal? FatRatio { get; set; }
}

/// <summary>
/// Values for creating or replacing the weight log entry for a date
/// </summary>
public class V1ManualUpsertRequest
{
    /// <summary>Weight in kilograms (convert before submitting; the API is always metric)</summary>
    public required decimal Weight { get; set; }

    /// <summary>Body fat as a 0-1 ratio (e.g. 0.225 for 22.5%), not a percentage</summary>
    public decimal? FatRatio { get; set; }
}

/// <summary>
/// One entry in a batch upsert
/// </summary>
public class V1ManualBatchEntry
{
    /// <summary>Date of the entry (yyyy-MM-dd, user's local timezone)</summary>
    public required string Date { get; set; }

    /// <summary>Weight in kilograms</summary>
    public required decimal Weight { get; set; }

    /// <summary>Body fat as a 0-1 ratio (e.g. 0.225 for 22.5%), not a percentage</summary>
    public decimal? FatRatio { get; set; }
}

/// <summary>
/// Error details. For batch requests, per-entry errors are listed with their
/// zero-based index into the submitted array.
/// </summary>
public class V1ErrorResponse
{
    /// <summary>Human-readable description of what went wrong</summary>
    public required string Error { get; set; }

    /// <summary>Per-entry errors for batch requests</summary>
    public List<V1EntryError>? Errors { get; set; }
}

/// <summary>
/// A validation error for one entry of a batch request
/// </summary>
public class V1EntryError
{
    /// <summary>Zero-based index of the failing entry in the submitted array</summary>
    public required int Index { get; set; }

    /// <summary>What is wrong with this entry</summary>
    public required string Error { get; set; }
}
