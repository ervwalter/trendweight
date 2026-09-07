using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using TrendWeight.Features.ApiV1.Models;
using TrendWeight.Features.Measurements;
using TrendWeight.Features.Measurements.Manual;
using TrendWeight.Features.Measurements.Models;

namespace TrendWeight.Features.ApiV1;

/// <summary>
/// Read access to the authenticated user's measurement data
/// </summary>
[Route("api/v1/measurements")]
[Tags("Weight Data")]
public class V1MeasurementsController : BaseApiV1Controller
{
    // Manual entries are excluded from the raw-readings endpoint; they have their own
    // read/write operations under the Manual Weight Log tag
    private static readonly string[] SourceProviders = ["withings", "fitbit", "legacy"];

    private readonly IMeasurementOrchestrationService _orchestrationService;

    public V1MeasurementsController(IMeasurementOrchestrationService orchestrationService)
    {
        _orchestrationService = orchestrationService;
    }

    /// <summary>
    /// Get weight data
    /// </summary>
    /// <remarks>
    /// Returns your daily weight data with trend values applied, refreshing from
    /// connected scales first if their data is stale. This is the combined view of all
    /// sources. For the raw readings behind it, see "Get raw scale readings" and the
    /// Manual Weight Log operations. All weights are kilograms; body fat is a 0-1 ratio.
    /// </remarks>
    /// <param name="since">Only return measurements on or after this date (yyyy-MM-dd)</param>
    [HttpGet]
    [EndpointName("getWeightData")]
    [ProducesResponseType(typeof(List<V1Measurement>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(V1ErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<List<V1Measurement>>> GetMeasurements([FromQuery] string? since = null)
    {
        if (!IsValidSince(since))
        {
            return BadRequest(new V1ErrorResponse { Error = "Invalid since date. Expected yyyy-MM-dd format." });
        }

        // ProgressId null disables sync progress reporting - API callers have no UI to report to
        var result = await _orchestrationService.GetForUserAsync(UserId, null, null);
        if (result == null)
        {
            return NotFound(new V1ErrorResponse { Error = "User not found" });
        }

        var measurements = result.ComputedMeasurements
            .Where(m => SinceFilter(m.Date, since))
            .Select(ToV1Measurement)
            .ToList();

        return Ok(measurements);
    }

    /// <summary>
    /// Get raw scale readings
    /// </summary>
    /// <remarks>
    /// Returns the raw readings exactly as reported by each scale source (Withings,
    /// Fitbit, and legacy TrendWeight data), refreshing from connected scales first if
    /// their data is stale - the API equivalent of the per-source views on the download
    /// page. Manual entries are not included here; use the Manual Weight Log operations
    /// for those.
    /// </remarks>
    /// <param name="since">Only return readings on or after this date (yyyy-MM-dd)</param>
    /// <param name="provider">Only return readings from this source (withings, fitbit, or legacy)</param>
    [HttpGet("sources")]
    [EndpointName("listSourceReadings")]
    [ProducesResponseType(typeof(List<V1SourceData>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(V1ErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<List<V1SourceData>>> GetSourceReadings(
        [FromQuery] string? since = null,
        [FromQuery] string? provider = null)
    {
        if (!IsValidSince(since))
        {
            return BadRequest(new V1ErrorResponse { Error = "Invalid since date. Expected yyyy-MM-dd format." });
        }

        if (!string.IsNullOrEmpty(provider) && !SourceProviders.Contains(provider.ToLowerInvariant()))
        {
            return BadRequest(new V1ErrorResponse { Error = "Invalid provider. Must be 'withings', 'fitbit', or 'legacy'." });
        }

        var result = await _orchestrationService.GetForUserAsync(UserId, null, null);
        if (result == null)
        {
            return NotFound(new V1ErrorResponse { Error = "User not found" });
        }

        var sources = result.SourceData
            .Where(sd => SourceProviders.Contains(sd.Source))
            .Where(sd => string.IsNullOrEmpty(provider) || string.Equals(sd.Source, provider, StringComparison.OrdinalIgnoreCase))
            .Select(sd => new V1SourceData
            {
                Provider = sd.Source,
                LastUpdate = sd.LastUpdate,
                Measurements = (sd.Measurements ?? new List<RawMeasurement>())
                    .Where(m => SinceFilter(m.Date, since))
                    .Select(m => new V1RawMeasurement
                    {
                        Date = m.Date,
                        Time = m.Time,
                        Weight = m.Weight,
                        FatRatio = m.FatRatio
                    })
                    .ToList()
            })
            .ToList();

        return Ok(sources);
    }

    // `since` is a filter, not a reading: any well-formed date is acceptable. A date in the
    // future simply matches nothing, and a date before 1900 matches everything.
    private static bool IsValidSince(string? since)
    {
        return string.IsNullOrEmpty(since)
            || DateTime.TryParseExact(since, ManualMeasurementValidation.DateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out _);
    }

    private static bool SinceFilter(string date, string? since)
    {
        return string.IsNullOrEmpty(since) || string.Compare(date, since, StringComparison.Ordinal) >= 0;
    }

    private static V1Measurement ToV1Measurement(ComputedMeasurement m)
    {
        return new V1Measurement
        {
            Date = m.Date,
            ActualWeight = m.ActualWeight,
            TrendWeight = m.TrendWeight,
            WeightIsInterpolated = m.WeightIsInterpolated,
            FatIsInterpolated = m.FatIsInterpolated,
            ActualFatPercent = m.ActualFatPercent,
            TrendFatPercent = m.TrendFatPercent,
            TrendFatMass = m.TrendFatMass,
            TrendLeanMass = m.TrendLeanMass
        };
    }
}
