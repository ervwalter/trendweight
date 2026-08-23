using TrendWeight.Features.Measurements.Models;
using TrendWeight.Infrastructure.DataAccess.Models;

namespace TrendWeight.Features.Measurements;

/// <summary>
/// Orchestrates a full measurement fetch: provider sync (with freshness cache),
/// then trend computation. Shared by the internal dashboard endpoints and the
/// external /api/v1 surface.
/// </summary>
public interface IMeasurementOrchestrationService
{
    /// <summary>
    /// Fetches measurement data for an authenticated user, populating the request
    /// context (used by sync progress reporting) along the way. ProgressId null
    /// disables progress reporting entirely (e.g. for API callers).
    /// Returns null if no profile exists for the user.
    /// </summary>
    Task<MeasurementDataResult?> GetForUserAsync(Guid userId, string? externalId, Guid? progressId);

    /// <summary>
    /// Fetches measurement data for an already-resolved profile (e.g. via sharing code)
    /// </summary>
    Task<MeasurementDataResult> GetForProfileAsync(DbProfile profile);
}
