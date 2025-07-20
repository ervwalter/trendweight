using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Options;
using TrendWeight.Features.Profile.Models;
using TrendWeight.Infrastructure.Configuration;

namespace TrendWeight.Features.Profile.Services;

/// <summary>
/// Service implementation for accessing legacy TrendWeight database
/// </summary>
public class LegacyDbService : ILegacyDbService
{
    private readonly string? _connectionString;
    private readonly ILogger<LegacyDbService> _logger;

    public LegacyDbService(IOptions<AppOptions> options, ILogger<LegacyDbService> logger)
    {
        _connectionString = options.Value.LegacyDbConnectionString;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<LegacyProfile?> FindProfileByEmailAsync(string email)
    {
        // Skip if no connection string configured
        if (string.IsNullOrEmpty(_connectionString))
        {
            _logger.LogDebug("Legacy database connection string not configured, skipping migration check");
            return null;
        }

        try
        {
            using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            const string query = @"
                SELECT 
                    p.UserId,
                    m.Email,
                    p.FirstName,
                    p.UseMetric,
                    p.StartDate,
                    p.GoalWeight,
                    p.PlannedPoundsPerWeek,
                    p.DayStartOffset,
                    p.PrivateUrlKey,
                    p.DeviceType,
                    p.FitbitRefreshToken
                FROM TrendWeightProfiles p
                JOIN Memberships m ON p.UserId = m.UserId
                WHERE m.Email = @Email";

            var legacyProfile = await connection.QueryFirstOrDefaultAsync<LegacyProfile>(query, new { Email = email });

            if (legacyProfile != null)
            {
                _logger.LogInformation("Found legacy profile for email {Email}", email);
            }

            return legacyProfile;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error accessing legacy database for email {Email}", email);
            return null;
        }
    }
}
