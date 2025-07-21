using System.Globalization;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Infrastructure.DataAccess;
using TrendWeight.Infrastructure.DataAccess.Models;
// Import database models directly
using FeatureSourceData = TrendWeight.Features.Measurements.Models.SourceData;

namespace TrendWeight.Features.Measurements;

/// <summary>
/// Service for managing source measurement data
/// Based on lib/data/source-data.ts in legacy code
/// </summary>
public class SourceDataService : ISourceDataService
{
    private readonly ISupabaseService _supabaseService;
    private readonly ILogger<SourceDataService> _logger;

    public SourceDataService(
        ISupabaseService supabaseService,
        ILogger<SourceDataService> logger)
    {
        _supabaseService = supabaseService;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task UpdateSourceDataAsync(Guid userId, List<FeatureSourceData> data)
    {
        try
        {
            // Save each source data
            foreach (var sourceData in data)
            {
                // Check if record exists to determine insert vs update
                var existingData = await _supabaseService.QueryAsync<DbSourceData>(q =>
                    q.Where(sd => sd.Uid == userId && sd.Provider == sourceData.Source));

                var dbSourceData = existingData.FirstOrDefault();

                if (dbSourceData == null)
                {
                    // Create new record
                    dbSourceData = new DbSourceData
                    {
                        Uid = userId,
                        Provider = sourceData.Source,
                        Measurements = sourceData.Measurements ?? new List<RawMeasurement>(),
                        LastSync = sourceData.LastUpdate.ToUniversalTime().ToString("o"),
                        UpdatedAt = DateTime.UtcNow.ToString("o")
                    };

                    await _supabaseService.InsertAsync(dbSourceData);
                    _logger.LogInformation("Created source data for user {Uid} provider {Provider}", userId, sourceData.Source);
                }
                else
                {
                    // Update existing record with new data
                    dbSourceData.Measurements = sourceData.Measurements ?? new List<RawMeasurement>();
                    dbSourceData.LastSync = sourceData.LastUpdate.ToUniversalTime().ToString("o");
                    dbSourceData.UpdatedAt = DateTime.UtcNow.ToString("o");

                    await _supabaseService.UpdateAsync(dbSourceData);
                    _logger.LogInformation("Updated source data for user {Uid} provider {Provider}", userId, sourceData.Source);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving source data for user {Uid}", userId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<List<FeatureSourceData>?> GetSourceDataAsync(Guid userId)
    {
        try
        {
            // Get all source data for the user
            var sourceDataList = await _supabaseService.QueryAsync<DbSourceData>(q =>
                q.Where(sd => sd.Uid == userId));

            if (sourceDataList.Count == 0)
            {
                return new List<FeatureSourceData>();
            }

            // Convert to feature models
            var result = new List<FeatureSourceData>();
            foreach (var dbSourceData in sourceDataList)
            {
                var measurements = dbSourceData.Measurements;

                // Parse ISO timestamp string as UTC
                var lastSync = string.IsNullOrEmpty(dbSourceData.LastSync)
                    ? DateTime.UtcNow
                    : DateTime.Parse(dbSourceData.LastSync, null, System.Globalization.DateTimeStyles.RoundtripKind).ToUniversalTime();

                result.Add(new FeatureSourceData
                {
                    Source = dbSourceData.Provider,
                    LastUpdate = lastSync,
                    Measurements = measurements
                });
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting source data for user {Uid}", userId);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<DateTime?> GetLastSyncTimeAsync(Guid userId, string provider)
    {
        try
        {
            var sourceData = await _supabaseService.QueryAsync<DbSourceData>(q =>
                q.Where(sd => sd.Uid == userId && sd.Provider == provider));

            var data = sourceData.FirstOrDefault();
            if (data == null)
                return null;

            // Parse ISO timestamp string as UTC
            if (string.IsNullOrEmpty(data.LastSync))
                return null;

            return DateTime.Parse(data.LastSync, null, System.Globalization.DateTimeStyles.RoundtripKind).ToUniversalTime();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting last sync time for user {UserId} provider {Provider}", userId, provider);
            return null;
        }
    }

    /// <inheritdoc />
    public async Task ClearSourceDataAsync(Guid userId, string? provider = null)
    {
        try
        {
            if (provider != null)
            {
                // Clear specific provider data
                var sourceData = await _supabaseService.QueryAsync<DbSourceData>(q =>
                    q.Where(sd => sd.Uid == userId && sd.Provider == provider));

                var data = sourceData.FirstOrDefault();
                if (data != null)
                {
                    // Clear measurements array
                    data.Measurements = new List<RawMeasurement>();
                    data.LastSync = null;
                    data.UpdatedAt = DateTime.UtcNow.ToString("o");

                    await _supabaseService.UpdateAsync(data);
                    _logger.LogInformation("Cleared source data for user {UserId} provider {Provider}", userId, provider);
                }
            }
            else
            {
                // Clear all source data for the user
                var allSourceData = await _supabaseService.QueryAsync<DbSourceData>(q =>
                    q.Where(sd => sd.Uid == userId));

                foreach (var data in allSourceData)
                {
                    data.Measurements = new List<RawMeasurement>();
                    data.LastSync = null;
                    data.UpdatedAt = DateTime.UtcNow.ToString("o");

                    await _supabaseService.UpdateAsync(data);
                }

                _logger.LogInformation("Cleared all source data for user {UserId}", userId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing source data for user {UserId} provider {Provider}", userId, provider);
            throw;
        }
    }



    /// <inheritdoc />
    public async Task DeleteSourceDataAsync(Guid userId, string provider)
    {
        try
        {
            var sourceData = await _supabaseService.QueryAsync<DbSourceData>(q =>
                q.Where(sd => sd.Uid == userId && sd.Provider == provider));

            var data = sourceData.FirstOrDefault();
            if (data != null)
            {
                await _supabaseService.DeleteAsync<DbSourceData>(data);
                _logger.LogInformation("Deleted source data row for user {UserId} provider {Provider}", userId, provider);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting source data for user {UserId} provider {Provider}", userId, provider);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task DeleteAllSourceDataAsync(Guid userId)
    {
        try
        {
            var allSourceData = await _supabaseService.QueryAsync<DbSourceData>(q =>
                q.Where(sd => sd.Uid == userId));

            foreach (var data in allSourceData)
            {
                await _supabaseService.DeleteAsync<DbSourceData>(data);
            }

            _logger.LogInformation("Deleted all source data for user {UserId}", userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting all source data for user {UserId}", userId);
            throw;
        }
    }

}
