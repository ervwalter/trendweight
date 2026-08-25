using Microsoft.AspNetCore.Mvc;
using TrendWeight.Features.ApiV1.Models;
using TrendWeight.Features.Measurements.Manual;
using TrendWeight.Features.Measurements.Models;

namespace TrendWeight.Features.ApiV1;

/// <summary>
/// Weight log entries (manually entered readings) for the authenticated user.
/// One entry per date; the date is the key for all operations.
/// </summary>
[Route("api/v1/measurements/manual")]
[Tags("Manual Weight Log")]
public class V1ManualMeasurementsController : BaseApiV1Controller
{
    /// <summary>Maximum entries accepted in one batch upsert</summary>
    public const int MaxBatchSize = 1000;

    private readonly IManualDataService _manualDataService;
    private readonly ILogger<V1ManualMeasurementsController> _logger;

    public V1ManualMeasurementsController(
        IManualDataService manualDataService,
        ILogger<V1ManualMeasurementsController> logger)
    {
        _manualDataService = manualDataService;
        _logger = logger;
    }

    /// <summary>
    /// List manual entries
    /// </summary>
    /// <remarks>
    /// Returns the weight entries that were added manually (in the app or through this
    /// API), newest first. Readings synced from a scale (Withings, Fitbit) are not
    /// included - get those from "Get raw scale readings".
    /// </remarks>
    [HttpGet]
    [EndpointName("listManualEntries")]
    [ProducesResponseType(typeof(List<V1ManualReading>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<V1ManualReading>>> GetReadings()
    {
        var readings = await _manualDataService.GetReadingsAsync(UserId);
        return Ok(readings.Select(ToV1Reading).ToList());
    }

    /// <summary>
    /// Add or replace a manual entry
    /// </summary>
    /// <remarks>
    /// Creates or replaces the manual entry for the given date. Idempotent - safe to
    /// retry. Only manual entries can be written through the API; readings synced from
    /// a scale (Withings, Fitbit) cannot be edited.
    /// </remarks>
    /// <param name="date">Date of the entry (yyyy-MM-dd, user's local timezone)</param>
    /// <param name="request">Entry values (weight in kg, fat as a 0-1 ratio)</param>
    [HttpPut("{date}")]
    [EndpointName("upsertManualEntry")]
    [ProducesResponseType(typeof(V1ManualReading), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(V1ErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<V1ManualReading>> UpsertReading(string date, [FromBody] V1ManualUpsertRequest request)
    {
        if (!ManualMeasurementValidation.TryValidateDate(date, out var error))
        {
            return BadRequest(new V1ErrorResponse { Error = error });
        }

        if (!ManualMeasurementValidation.TryValidateReading(request.Weight, request.FatRatio, out error))
        {
            return BadRequest(new V1ErrorResponse { Error = error });
        }

        var stored = await _manualDataService.UpsertReadingAsync(UserId, ToRawMeasurement(date, request.Weight, request.FatRatio));
        return Ok(ToV1Reading(stored));
    }

    /// <summary>
    /// Add or replace manual entries in bulk
    /// </summary>
    /// <remarks>
    /// Creates or replaces manual entries for multiple dates in one call. The whole
    /// batch is validated first; nothing is stored unless every entry is valid.
    /// </remarks>
    /// <param name="entries">Entries to upsert (max 1000, one per date)</param>
    [HttpPost]
    [EndpointName("upsertManualEntries")]
    [ProducesResponseType(typeof(List<V1ManualReading>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(V1ErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<List<V1ManualReading>>> UpsertReadings([FromBody] List<V1ManualBatchEntry> entries)
    {
        if (entries.Count == 0)
        {
            return BadRequest(new V1ErrorResponse { Error = "At least one entry is required" });
        }

        if (entries.Count > MaxBatchSize)
        {
            return BadRequest(new V1ErrorResponse { Error = $"Too many entries; the maximum per batch is {MaxBatchSize}" });
        }

        var errors = new List<V1EntryError>();
        var seenDates = new HashSet<string>();
        for (var i = 0; i < entries.Count; i++)
        {
            var entry = entries[i];
            if (!ManualMeasurementValidation.TryValidateDate(entry.Date, out var error)
                || !ManualMeasurementValidation.TryValidateReading(entry.Weight, entry.FatRatio, out error))
            {
                errors.Add(new V1EntryError { Index = i, Error = error });
            }
            else if (!seenDates.Add(entry.Date))
            {
                errors.Add(new V1EntryError { Index = i, Error = $"Duplicate date {entry.Date} in batch" });
            }
        }

        if (errors.Count > 0)
        {
            return BadRequest(new V1ErrorResponse { Error = "One or more entries are invalid", Errors = errors });
        }

        var readings = entries.Select(e => ToRawMeasurement(e.Date, e.Weight, e.FatRatio)).ToList();
        var stored = await _manualDataService.UpsertReadingsAsync(UserId, readings);
        _logger.LogInformation("API batch upserted {Count} weight log entries for user {UserId}", stored.Count, UserId);
        return Ok(stored.Select(ToV1Reading).ToList());
    }

    /// <summary>
    /// Delete a manual entry
    /// </summary>
    /// <remarks>
    /// Deletes the manual entry for the given date. Returns 404 if no manual entry
    /// exists for that date (readings synced from a scale cannot be deleted here).
    /// </remarks>
    /// <param name="date">Date of the entry (yyyy-MM-dd)</param>
    [HttpDelete("{date}")]
    [EndpointName("deleteManualEntry")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(V1ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteReading(string date)
    {
        if (!ManualMeasurementValidation.TryValidateDate(date, out var error))
        {
            return BadRequest(new V1ErrorResponse { Error = error });
        }

        var deleted = await _manualDataService.DeleteReadingAsync(UserId, date);
        if (!deleted)
        {
            return NotFound(new V1ErrorResponse { Error = $"No entry found for {date}" });
        }

        return NoContent();
    }

    private static RawMeasurement ToRawMeasurement(string date, decimal weight, decimal? fatRatio)
    {
        return new RawMeasurement
        {
            Date = date,
            Time = ManualMeasurementValidation.StoredTime,
            Weight = decimal.Round(weight, 3),
            FatRatio = fatRatio.HasValue ? decimal.Round(fatRatio.Value, 4) : null
        };
    }

    private static V1ManualReading ToV1Reading(RawMeasurement measurement)
    {
        return new V1ManualReading
        {
            Date = measurement.Date,
            Weight = measurement.Weight,
            FatRatio = measurement.FatRatio
        };
    }
}
