using TrendWeight.Features.Profile.Models;

namespace TrendWeight.Features.Profile.Services;

/// <summary>
/// Service for accessing legacy TrendWeight database
/// </summary>
public interface ILegacyDbService
{
    /// <summary>
    /// Finds a legacy profile by email address
    /// </summary>
    Task<LegacyProfile?> FindProfileByEmailAsync(string email);

    /// <summary>
    /// Gets all measurements for a legacy user by email
    /// </summary>
    Task<List<LegacyMeasurement>> GetMeasurementsByEmailAsync(string email);
}
