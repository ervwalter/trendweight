using TrendWeight.Features.Measurements;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Features.Providers.Models;

namespace TrendWeight.Features.Providers;

/// <summary>
/// Provider service for manually entered measurements.
/// Manual data is always-on and implicit: there is no provider_links row and no OAuth.
/// The provider is considered "active" whenever the user has at least one manual reading,
/// which is what makes manual data flow into computed measurements, downloads, and shares.
/// </summary>
public class ManualService : IProviderService
{
    private readonly ISourceDataService _sourceDataService;
    private readonly ILogger<ManualService> _logger;

    public ManualService(
        ISourceDataService sourceDataService,
        ILogger<ManualService> logger)
    {
        _sourceDataService = sourceDataService;
        _logger = logger;
    }

    public string ProviderName => "manual";

    public string GetAuthorizationUrl(string state, string callbackUrl)
    {
        throw new NotSupportedException("Manual provider does not support OAuth");
    }

    public Task<bool> ExchangeAuthorizationCodeAsync(string code, string callbackUrl, Guid userId)
    {
        // Manual provider doesn't use OAuth, always return false
        return Task.FromResult(false);
    }

    public Task<List<RawMeasurement>?> GetMeasurementsAsync(Guid userId, bool metric, DateTime? startDate = null)
    {
        // Manual provider doesn't fetch measurements - data is already stored in source_data
        throw new NotSupportedException("Manual provider does not support fetching measurements");
    }

    public Task<ProviderSyncResult> SyncMeasurementsAsync(Guid userId, bool metric, DateTime? startDate = null)
    {
        // Manual data doesn't sync - it's entered by the user
        _logger.LogInformation("Sync requested for manual provider (user {UserId}) - no-op", userId);
        return Task.FromResult(new ProviderSyncResult
        {
            Provider = ProviderName,
            Success = true,
            Message = "Manual data does not require sync"
        });
    }

    public Task<bool> HasActiveProviderLinkAsync(Guid userId)
    {
        // Manual is implicit: active whenever the user has at least one manual reading
        return _sourceDataService.HasMeasurementsAsync(userId, ProviderName);
    }

    public Task<bool> RemoveProviderLinkAsync(Guid userId)
    {
        // There is no provider link for manual data; deleting readings is handled by
        // the manual measurements endpoints
        return Task.FromResult(false);
    }
}
