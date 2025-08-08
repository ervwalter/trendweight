using TrendWeight.Features.Profile.Models;
using TrendWeight.Infrastructure.DataAccess;
using TrendWeight.Infrastructure.DataAccess.Models;

namespace TrendWeight.Features.Profile.Services;

/// <summary>
/// Service implementation for accessing legacy TrendWeight database via Supabase
/// </summary>
public class LegacyDbService : ILegacyDbService
{
    private readonly ISupabaseService _supabaseService;
    private readonly ILogger<LegacyDbService> _logger;

    public LegacyDbService(ISupabaseService supabaseService, ILogger<LegacyDbService> logger)
    {
        _supabaseService = supabaseService;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<LegacyProfile?> FindProfileByEmailAsync(string email)
    {
        try
        {
            var profiles = await _supabaseService.QueryAsync<DbLegacyProfile>(query =>
                query.Filter("email", Supabase.Postgrest.Constants.Operator.Equals, email)
            );

            var dbProfile = profiles.FirstOrDefault();
            if (dbProfile == null)
            {
                _logger.LogDebug("No legacy profile found for email {Email}", email);
                return null;
            }

            _logger.LogInformation("Found legacy profile for email {Email}", email);

            // Map DbLegacyProfile to LegacyProfile
            return new LegacyProfile
            {
                Email = dbProfile.Email,
                Username = dbProfile.Username,
                FirstName = dbProfile.FirstName,
                UseMetric = dbProfile.UseMetric,
                StartDate = dbProfile.StartDate,
                GoalWeight = dbProfile.GoalWeight,
                PlannedPoundsPerWeek = dbProfile.PlannedPoundsPerWeek,
                DayStartOffset = dbProfile.DayStartOffset,
                PrivateUrlKey = dbProfile.PrivateUrlKey,
                DeviceType = dbProfile.DeviceType,
                RefreshToken = dbProfile.RefreshToken,
                Measurements = dbProfile.Measurements
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error accessing legacy profile for email {Email}", email);
            return null;
        }
    }
}
