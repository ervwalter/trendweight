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
    private readonly IMeasurementOrchestrationService _orchestrationService;
    private readonly ILogger<V1MeasurementsController> _logger;

    public V1MeasurementsController(
        IMeasurementOrchestrationService orchestrationService,
        ILogger<V1MeasurementsController> logger)
    {
        _orchestrationService = orchestrationService;
        _logger = logger;
    }

    /// <summary>
    /// Get weight data
    /// </summary>
    /// <remarks>
    /// Returns your daily weight data with trend values applied, refreshing from
    /// connected scales first if their data is stale. Set includeSource=true to also
    /// get the raw readings from each source (Withings, Fitbit, your weight log).
    /// All weights are kilograms; body fat is a 0-1 ratio.
    /// </remarks>
    /// <param name="since">Only return measurements on or after this date (yyyy-MM-dd)</param>
    /// <param name="includeSource">Also include the raw per-provider source data</param>
    [HttpGet]
    [EndpointName("getWeightData")]
    [ProducesResponseType(typeof(V1MeasurementsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(V1ErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<V1MeasurementsResponse>> GetMeasurements(
        [FromQuery] string? since = null,
        [FromQuery] bool includeSource = false)
    {
        if (!string.IsNullOrEmpty(since) && !ManualMeasurementValidation.TryValidateDate(since, out _))
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

        List<V1SourceData>? sources = null;
        if (includeSource)
        {
            sources = result.SourceData
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
        }

        return Ok(new V1MeasurementsResponse
        {
            Measurements = measurements,
            Sources = sources
        });
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
