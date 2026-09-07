using System.Text.Json.Serialization;

namespace TrendWeight.Features.Providers.Withings.Models;

/// <summary>
/// Represents a single measure from the Withings API
/// </summary>
public class WithingsMeasure
{
    /// <summary>
    /// The value of the measurement (needs to be converted using the unit).
    /// Documented as an integer, but read as a decimal so a fractional value
    /// does not fail the whole page.
    /// </summary>
    [JsonPropertyName("value")]
    public decimal Value { get; set; }

    /// <summary>
    /// The type of measurement:
    /// 1 = Weight
    /// 6 = Fat Percentage
    /// </summary>
    [JsonPropertyName("type")]
    public int Type { get; set; }

    /// <summary>
    /// The unit of the measurement (power of 10 to convert value)
    /// </summary>
    [JsonPropertyName("unit")]
    public int Unit { get; set; }
}
