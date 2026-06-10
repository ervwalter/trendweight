using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using TrendWeight.Common.Models;
using TrendWeight.Features.Common;
using TrendWeight.Features.Measurements.Manual.Models;
using TrendWeight.Features.Measurements.Models;

namespace TrendWeight.Features.Measurements.Manual;

/// <summary>
/// Endpoints for managing manually entered measurements.
/// One reading per date; the date in the URL is the key.
/// </summary>
[ApiController]
[Route("api/measurements/manual")]
public class ManualMeasurementsController : BaseAuthController
{
    private const string DateFormat = "yyyy-MM-dd";

    // RawMeasurement requires a time. End-of-day keeps the reading on the user's chosen
    // calendar date for any dayStartOffset (0-23h); manual entries win the per-day merge
    // by source preference, not by time.
    private const string StoredTime = "23:59:59";

    private static readonly DateTime MinDate = new(1900, 1, 1);

    private readonly IManualDataService _manualDataService;

    public ManualMeasurementsController(IManualDataService manualDataService)
    {
        _manualDataService = manualDataService;
    }

    /// <summary>
    /// Gets all manual readings for the authenticated user, newest first
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<ManualMeasurementResponse>>> GetReadings()
    {
        var userGuid = Guid.Parse(UserId);
        var readings = await _manualDataService.GetReadingsAsync(userGuid);
        return Ok(readings.Select(ToResponse).ToList());
    }

    /// <summary>
    /// Creates or replaces the manual reading for the given date (idempotent upsert)
    /// </summary>
    /// <param name="date">Date of the reading (yyyy-MM-dd, user's local timezone)</param>
    /// <param name="request">Reading values (weight in kg, fat as a 0-1 ratio)</param>
    [HttpPut("{date}")]
    public async Task<ActionResult<ManualMeasurementResponse>> UpsertReading(string date, [FromBody] ManualMeasurementRequest request)
    {
        if (!TryValidateDate(date, out var error))
        {
            return BadRequest(new ErrorResponse { Error = error });
        }

        if (!TryValidateRequest(request, out error))
        {
            return BadRequest(new ErrorResponse { Error = error });
        }

        var userGuid = Guid.Parse(UserId);
        var reading = new RawMeasurement
        {
            Date = date,
            Time = StoredTime,
            Weight = decimal.Round(request.Weight, 3),
            FatRatio = request.FatRatio.HasValue ? decimal.Round(request.FatRatio.Value, 4) : null
        };

        var stored = await _manualDataService.UpsertReadingAsync(userGuid, reading);
        return Ok(ToResponse(stored));
    }

    /// <summary>
    /// Deletes the manual reading for the given date
    /// </summary>
    /// <param name="date">Date of the reading (yyyy-MM-dd)</param>
    [HttpDelete("{date}")]
    public async Task<ActionResult<MessageResponse>> DeleteReading(string date)
    {
        if (!TryValidateDate(date, out var error))
        {
            return BadRequest(new ErrorResponse { Error = error });
        }

        var userGuid = Guid.Parse(UserId);
        var deleted = await _manualDataService.DeleteReadingAsync(userGuid, date);
        if (!deleted)
        {
            return NotFound(new ErrorResponse { Error = $"No manual reading found for {date}" });
        }

        return Ok(new MessageResponse { Message = $"Deleted manual reading for {date}" });
    }

    /// <summary>
    /// Deletes all manual readings for the authenticated user
    /// </summary>
    [HttpDelete]
    public async Task<ActionResult<MessageResponse>> DeleteAllReadings()
    {
        var userGuid = Guid.Parse(UserId);
        await _manualDataService.DeleteAllReadingsAsync(userGuid);
        return Ok(new MessageResponse { Message = "Deleted all manual readings" });
    }

    private static bool TryValidateDate(string date, out string error)
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

    private static bool TryValidateRequest(ManualMeasurementRequest request, out string error)
    {
        if (request.Weight <= 0 || request.Weight >= 700)
        {
            error = "Weight must be between 0 and 700 kg";
            return false;
        }

        if (request.FatRatio.HasValue && (request.FatRatio.Value <= 0 || request.FatRatio.Value >= 1))
        {
            error = "Fat ratio must be a decimal between 0 and 1 (e.g. 0.225 for 22.5%), not a percentage";
            return false;
        }

        error = string.Empty;
        return true;
    }

    private static ManualMeasurementResponse ToResponse(RawMeasurement measurement)
    {
        return new ManualMeasurementResponse
        {
            Date = measurement.Date,
            Weight = measurement.Weight,
            FatRatio = measurement.FatRatio
        };
    }
}
