using TrendWeight.Features.Measurements.Models;

namespace TrendWeight.Features.Measurements.Manual;

/// <summary>
/// Manages manually entered measurements in the "manual" source_data row.
/// All mutations funnel through this service so the read-modify-write of the JSONB
/// measurements array happens in one place.
///
/// Concurrency note: updates are last-writer-wins on the whole array. Two concurrent
/// writes to the same user's manual data can drop one edit. This is an accepted
/// trade-off: it's the user's own data and their own scripts, the window is
/// milliseconds, and the batch upsert (one document write for many readings) is the
/// intended path for bulk work.
/// </summary>
public class ManualDataService : IManualDataService
{
    private const string Provider = "manual";

    private readonly ISourceDataService _sourceDataService;
    private readonly ILogger<ManualDataService> _logger;

    public ManualDataService(
        ISourceDataService sourceDataService,
        ILogger<ManualDataService> logger)
    {
        _sourceDataService = sourceDataService;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<List<RawMeasurement>> GetReadingsAsync(Guid userId)
    {
        var measurements = await GetCurrentMeasurementsAsync(userId);
        SortDescending(measurements);
        return measurements;
    }

    /// <inheritdoc />
    public async Task<RawMeasurement> UpsertReadingAsync(Guid userId, RawMeasurement reading)
    {
        var measurements = await GetCurrentMeasurementsAsync(userId);

        // One reading per date - replace any existing entry for this date
        measurements.RemoveAll(m => m.Date == reading.Date);
        measurements.Add(reading);
        SortDescending(measurements);

        await StoreAsync(userId, measurements);
        _logger.LogInformation("Upserted manual reading for user {UserId} on {Date}", userId, reading.Date);

        return reading;
    }

    /// <inheritdoc />
    public async Task<List<RawMeasurement>> UpsertReadingsAsync(Guid userId, List<RawMeasurement> readings)
    {
        var measurements = await GetCurrentMeasurementsAsync(userId);

        // One reading per date - replace any existing entry for each incoming date
        var incomingDates = readings.Select(r => r.Date).ToHashSet();
        measurements.RemoveAll(m => incomingDates.Contains(m.Date));
        measurements.AddRange(readings);
        SortDescending(measurements);

        await StoreAsync(userId, measurements);
        _logger.LogInformation("Upserted {Count} manual readings for user {UserId}", readings.Count, userId);

        var stored = new List<RawMeasurement>(readings);
        SortDescending(stored);
        return stored;
    }

    /// <inheritdoc />
    public async Task<bool> DeleteReadingAsync(Guid userId, string readingDate)
    {
        var measurements = await GetCurrentMeasurementsAsync(userId);

        var removed = measurements.RemoveAll(m => m.Date == readingDate);
        if (removed == 0)
        {
            return false;
        }

        await StoreAsync(userId, measurements);
        _logger.LogInformation("Deleted manual reading for user {UserId} on {Date}", userId, readingDate);
        return true;
    }

    /// <inheritdoc />
    public async Task DeleteAllReadingsAsync(Guid userId)
    {
        await StoreAsync(userId, new List<RawMeasurement>());
        _logger.LogInformation("Deleted all manual readings for user {UserId}", userId);
    }

    private async Task<List<RawMeasurement>> GetCurrentMeasurementsAsync(Guid userId)
    {
        var sourceData = await _sourceDataService.GetSourceDataAsync(userId, new List<string> { Provider });
        var measurements = sourceData?.FirstOrDefault(sd => sd.Source == Provider)?.Measurements;
        return measurements != null ? new List<RawMeasurement>(measurements) : new List<RawMeasurement>();
    }

    private Task StoreAsync(Guid userId, List<RawMeasurement> measurements)
    {
        // Setting LastUpdate keeps the row "fresh" so the next dashboard load skips
        // even the no-op manual refresh
        return _sourceDataService.UpdateSourceDataAsync(userId, new List<SourceData>
        {
            new SourceData
            {
                Source = Provider,
                LastUpdate = DateTime.UtcNow,
                Measurements = measurements
            }
        });
    }

    private static void SortDescending(List<RawMeasurement> measurements)
    {
        // One reading per date, so date alone is a total order
        measurements.Sort((a, b) => string.Compare(b.Date, a.Date, StringComparison.Ordinal));
    }
}
