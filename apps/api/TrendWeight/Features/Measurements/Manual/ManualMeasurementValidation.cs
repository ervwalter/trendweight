using System.Globalization;

namespace TrendWeight.Features.Measurements.Manual;

/// <summary>
/// Shared validation rules for manual readings, used by both the internal
/// endpoints and the external /api/v1 surface so the contracts stay identical.
/// </summary>
public static class ManualMeasurementValidation
{
    public const string DateFormat = "yyyy-MM-dd";

    /// <summary>Regex equivalent of <see cref="DateFormat"/>, used as the OpenAPI schema pattern</summary>
    public const string DateJsonPattern = @"^\d{4}-\d{2}-\d{2}$";

    // RawMeasurement requires a time. End-of-day keeps the reading on the user's chosen
    // calendar date for any dayStartOffset (0-23h); manual entries win the per-day merge
    // by source preference, not by time.
    public const string StoredTime = "23:59:59";

    private static readonly DateTime MinDate = new(1900, 1, 1);

    public static bool TryValidateDate(string date, out string error)
    {
        if (!DateTime.TryParseExact(date, DateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
        {
            error = "Date must be in yyyy-MM-dd format";
            return false;
        }

        // Dates are user-local; allow one day of slack for timezones ahead of UTC
        if (parsed < MinDate || parsed > DateTime.UtcNow.Date.AddDays(1))
        {
            error = "Date must be between 1900-01-01 and today";
            return false;
        }

        error = string.Empty;
        return true;
    }

    public static bool TryValidateReading(decimal weight, decimal? fatRatio, out string error)
    {
        if (weight <= 0 || weight >= 700)
        {
            error = "Weight must be between 0 and 700 kg";
            return false;
        }

        if (fatRatio.HasValue && (fatRatio.Value <= 0 || fatRatio.Value >= 1))
        {
            error = "Fat ratio must be a decimal between 0 and 1 (e.g. 0.225 for 22.5%), not a percentage";
            return false;
        }

        error = string.Empty;
        return true;
    }
}
