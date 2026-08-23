using TrendWeight.Features.Measurements.Models;

namespace TrendWeight.Features.Measurements.Manual;

/// <summary>
/// Service for managing manually entered measurements stored in the "manual" source_data row.
/// One reading per date; the date is the key for all operations.
/// </summary>
public interface IManualDataService
{
    /// <summary>
    /// Gets all manual readings for a user, sorted descending by date
    /// </summary>
    Task<List<RawMeasurement>> GetReadingsAsync(Guid userId);

    /// <summary>
    /// Creates or replaces the reading for the given date (idempotent upsert)
    /// </summary>
    /// <returns>The stored reading</returns>
    Task<RawMeasurement> UpsertReadingAsync(Guid userId, RawMeasurement reading);

    /// <summary>
    /// Creates or replaces the readings for multiple dates in a single store
    /// (one document write, used by the v1 batch endpoint)
    /// </summary>
    /// <returns>The stored readings, sorted descending by date</returns>
    Task<List<RawMeasurement>> UpsertReadingsAsync(Guid userId, List<RawMeasurement> readings);

    /// <summary>
    /// Deletes the reading for the given date
    /// </summary>
    /// <returns>True if a reading existed and was deleted, false if none existed</returns>
    Task<bool> DeleteReadingAsync(Guid userId, string readingDate);

    /// <summary>
    /// Deletes all manual readings for a user (clears the measurements array, keeps the row)
    /// </summary>
    Task DeleteAllReadingsAsync(Guid userId);
}
