using TrendWeight.Features.Measurements.Models;
using TrendWeight.Features.Providers.Models;
using TrendWeight.Features.ProviderLinks.Services;

namespace TrendWeight.Features.Providers;

public class LegacyService : IProviderService
{
    private readonly IProviderLinkService _providerLinkService;
    private readonly ILogger<LegacyService> _logger;

    public LegacyService(
        IProviderLinkService providerLinkService,
        ILogger<LegacyService> logger)
    {
        _providerLinkService = providerLinkService;
        _logger = logger;
    }

    public string ProviderName => "legacy";

    public string GetAuthorizationUrl(string state, string callbackUrl)
    {
        throw new NotSupportedException("Legacy provider does not support OAuth");
    }

    public Task<bool> ExchangeAuthorizationCodeAsync(string code, string callbackUrl, Guid userId)
    {
        // Legacy provider doesn't use OAuth, always return false
        return Task.FromResult(false);
    }

    public Task<List<RawMeasurement>?> GetMeasurementsAsync(Guid userId, bool metric, DateTime? startDate = null)
    {
        // Legacy provider doesn't fetch measurements - data is already stored in source_data
        throw new NotSupportedException("Legacy provider does not support fetching measurements");
    }

    public Task<ProviderSyncResult> SyncMeasurementsAsync(Guid userId, bool metric, DateTime? startDate = null)
    {
        // Legacy data doesn't sync - it's imported once
        _logger.LogInformation("Sync requested for legacy provider (user {UserId}) - no-op", userId);
        return Task.FromResult(new ProviderSyncResult
        {
            Provider = ProviderName,
            Success = true,
            Message = "Legacy data does not require sync"
        });
    }

    public async Task<bool> HasActiveProviderLinkAsync(Guid userId)
    {
        var link = await _providerLinkService.GetProviderLinkAsync(userId, ProviderName);
        if (link == null)
        {
            return false;
        }

        // Check if disabled
        var isDisabled = link.Token?.GetValueOrDefault("disabled") as bool? == true;
        return !isDisabled;
    }

    public async Task<bool> RemoveProviderLinkAsync(Guid userId)
    {
        // Soft delete - just mark as disabled
        var link = await _providerLinkService.GetProviderLinkAsync(userId, ProviderName);
        if (link == null)
        {
            _logger.LogWarning("Attempted to remove non-existent legacy provider link for user {UserId}", userId);
            return false;
        }

        // Update token to set disabled flag
        var updatedToken = new Dictionary<string, object>(link.Token ?? new Dictionary<string, object>());
        updatedToken["disabled"] = true;

        await _providerLinkService.StoreProviderLinkAsync(userId, ProviderName, updatedToken, "User disabled legacy data");
        _logger.LogInformation("Legacy provider disabled for user {UserId}", userId);
        return true;
    }

    /// <summary>
    /// Enables the legacy provider by clearing the disabled flag
    /// </summary>
    public virtual async Task<bool> EnableProviderLinkAsync(Guid userId)
    {
        var link = await _providerLinkService.GetProviderLinkAsync(userId, ProviderName);
        if (link == null)
        {
            _logger.LogWarning("Attempted to enable non-existent legacy provider link for user {UserId}", userId);
            return false;
        }

        // Update token to clear disabled flag
        var updatedToken = new Dictionary<string, object>(link.Token ?? new Dictionary<string, object>());
        updatedToken["disabled"] = false;

        await _providerLinkService.StoreProviderLinkAsync(userId, ProviderName, updatedToken, "User enabled legacy data");
        _logger.LogInformation("Legacy provider enabled for user {UserId}", userId);
        return true;
    }
}
