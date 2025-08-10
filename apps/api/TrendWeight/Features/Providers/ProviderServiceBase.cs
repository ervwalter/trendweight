using System.Text.Json;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Features.ProviderLinks.Services;
using TrendWeight.Features.Providers.Exceptions;
using TrendWeight.Features.Providers.Models;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Features.SyncProgress;
using TrendWeight.Infrastructure.DataAccess.Models;

namespace TrendWeight.Features.Providers;

/// <summary>
/// Base class for provider service implementations
/// </summary>
public abstract class ProviderServiceBase : IProviderService
{
    protected IProviderLinkService ProviderLinkService { get; }
    protected IProfileService ProfileService { get; }
    protected ISyncProgressReporter? ProgressReporter { get; }
    protected ILogger Logger { get; }

    protected ProviderServiceBase(
        IProviderLinkService providerLinkService,
        IProfileService profileService,
        ISyncProgressReporter? progressReporter,
        ILogger logger)
    {
        ProviderLinkService = providerLinkService;
        ProfileService = profileService;
        ProgressReporter = progressReporter;
        Logger = logger;
    }

    /// <inheritdoc />
    public abstract string ProviderName { get; }

    /// <inheritdoc />
    public abstract string GetAuthorizationUrl(string state, string callbackUrl);

    /// <inheritdoc />
    public async Task<bool> ExchangeAuthorizationCodeAsync(string code, string callbackUrl, Guid userId)
    {
        try
        {
            // Get provider-specific token as dictionary
            var token = await ExchangeCodeForTokenAsync(code, callbackUrl);

            // Store the token using ProviderLinkService
            await ProviderLinkService.StoreProviderLinkAsync(userId, ProviderName, token);

            Logger.LogDebug("Successfully stored {Provider} link for user {UserId}", ProviderName, userId);
            return true;
        }
        catch (ProviderException ex) when (ex.ErrorCode == "DUPLICATE_REQUEST")
        {
            // This happens when the same OAuth code is exchanged twice (e.g., React Strict Mode)
            // Check if we already have a valid token for this user
            var existingLink = await ProviderLinkService.GetProviderLinkAsync(userId, ProviderName);
            if (existingLink != null)
            {
                Logger.LogInformation("Duplicate token exchange request for {Provider} user {UserId}, but valid token already exists", ProviderName, userId);
                return true;
            }

            // If no existing link, this is a real error
            throw;
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "Failed to exchange authorization code for {Provider}", ProviderName);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<List<RawMeasurement>?> GetMeasurementsAsync(Guid userId, bool metric, DateTime? startDate = null)
    {
        try
        {
            // Get provider link with automatic token refresh
            var providerLink = await GetActiveProviderLinkAsync(userId);
            if (providerLink == null)
            {
                Logger.LogWarning("No active {Provider} link found for user {UserId}", ProviderName, userId);
                return null;
            }

            // Get measurements from provider
            var startTimestamp = startDate.HasValue ? ToUnixTimeSeconds(startDate.Value) : 1; // 1 = all time
            var measurements = await FetchMeasurementsAsync(providerLink.Token, metric, startTimestamp);

            return measurements;
        }
        catch (ProviderAuthException)
        {
            // Re-throw auth exceptions to be handled by SyncMeasurementsAsync
            throw;
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "Failed to get {Provider} measurements for user {UserId}", ProviderName, userId);
            return null;
        }
    }

    /// <inheritdoc />
    public async Task<ProviderSyncResult> SyncMeasurementsAsync(Guid userId, bool metric, DateTime? startDate = null)
    {
        try
        {
            // Get measurements from the provider
            var measurements = await GetMeasurementsAsync(userId, metric, startDate);
            if (measurements == null)
            {
                // This should rarely happen now that we have specific exception handling
                // but keeping it as a fallback
                return new ProviderSyncResult
                {
                    Provider = ProviderName,
                    Success = false,
                    Error = ProviderSyncError.Unknown,
                    Message = $"Failed to retrieve measurements from {ProviderName}"
                };
            }

            Logger.LogDebug("Successfully retrieved {Count} {Provider} measurements for user {UserId}",
                measurements.Count, ProviderName, userId);

            return new ProviderSyncResult
            {
                Provider = ProviderName,
                Success = true,
                Measurements = measurements
            };
        }
        catch (ProviderAuthException ex)
        {
            Logger.LogWarning(ex, "Authentication failed for {Provider} user {UserId}", ProviderName, userId);
            return new ProviderSyncResult
            {
                Provider = ProviderName,
                Success = false,
                Error = ProviderSyncError.AuthFailed,
                Message = $"{ProviderName} authentication failed. Please reconnect your account."
            };
        }
        catch (HttpRequestException ex)
        {
            Logger.LogError(ex, "Network error syncing {Provider} measurements for user {UserId}", ProviderName, userId);
            return new ProviderSyncResult
            {
                Provider = ProviderName,
                Success = false,
                Error = ProviderSyncError.NetworkError,
                Message = $"Network error connecting to {ProviderName}. Please try again later."
            };
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "Failed to sync {Provider} measurements for user {UserId}", ProviderName, userId);
            return new ProviderSyncResult
            {
                Provider = ProviderName,
                Success = false,
                Error = ProviderSyncError.Unknown,
                Message = $"An error occurred syncing {ProviderName} data"
            };
        }
    }

    /// <inheritdoc />
    public async Task<bool> HasActiveProviderLinkAsync(Guid userId)
    {
        var providerLink = await ProviderLinkService.GetProviderLinkAsync(userId, ProviderName);
        return providerLink != null;
    }

    /// <inheritdoc />
    public async Task<bool> RemoveProviderLinkAsync(Guid userId)
    {
        try
        {
            // Remove the provider link
            await ProviderLinkService.RemoveProviderLinkAsync(userId, ProviderName);

            // Note: Source data deletion is now handled by the caller if needed
            Logger.LogInformation("Removed {Provider} link for user {UserId}", ProviderName, userId);
            return true;
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "Failed to remove {Provider} link for user {UserId}", ProviderName, userId);
            return false;
        }
    }

    /// <summary>
    /// Gets the active provider link, automatically refreshing token if needed
    /// </summary>
    protected async Task<DbProviderLink?> GetActiveProviderLinkAsync(Guid userId)
    {
        var providerLink = await ProviderLinkService.GetProviderLinkAsync(userId, ProviderName);
        if (providerLink == null)
        {
            return null;
        }

        // Check if token needs refresh (provider-specific logic)
        var isExpired = IsTokenExpired(providerLink.Token);
        Logger.LogDebug("Checking {Provider} token expiration for user {UserId}: {IsExpired}", ProviderName, userId, isExpired);

        if (isExpired)
        {
            Logger.LogDebug("Token expired for {Provider} user {UserId}, attempting refresh", ProviderName, userId);

            try
            {
                var refreshedToken = await RefreshTokenAsync(providerLink.Token);
                await ProviderLinkService.StoreProviderLinkAsync(userId, ProviderName, refreshedToken);
                // Update the local copy with the new token
                providerLink.Token = refreshedToken;
            }
            catch (ProviderAuthException)
            {
                Logger.LogWarning("Token refresh failed with auth error for {Provider} user {UserId}. User needs to re-link account.", ProviderName, userId);
                // Re-throw to be handled by the calling method
                throw;
            }
            catch (InvalidOperationException ex) when (ex.Message.Contains("null or undefined") || ex.Message.Contains("No refresh token"))
            {
                Logger.LogWarning("Token for {Provider} user {UserId} is invalid and cannot be refreshed. User needs to re-link account.", ProviderName, userId);
                // Return null to indicate no valid provider link
                return null;
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Failed to refresh token for {Provider} user {UserId}", ProviderName, userId);
                throw;
            }
        }

        return providerLink;
    }

    /// <summary>
    /// Extension point to convert Unix timestamp to DateTime
    /// </summary>
    protected static long ToUnixTimeSeconds(DateTime dateTime)
    {
        return ((DateTimeOffset)dateTime).ToUnixTimeSeconds();
    }


    // Abstract methods that provider-specific implementations must provide

    /// <summary>
    /// Exchanges authorization code for access token (provider-specific)
    /// </summary>
    protected abstract Task<Dictionary<string, object>> ExchangeCodeForTokenAsync(string code, string callbackUrl);

    /// <summary>
    /// Checks if a token is expired (provider-specific)
    /// </summary>
    protected abstract bool IsTokenExpired(Dictionary<string, object> token);

    /// <summary>
    /// Refreshes an expired access token (provider-specific)
    /// </summary>
    protected abstract Task<Dictionary<string, object>> RefreshTokenAsync(Dictionary<string, object> token);

    /// <summary>
    /// Fetches measurements from the provider API (provider-specific)
    /// </summary>
    protected abstract Task<List<RawMeasurement>> FetchMeasurementsAsync(Dictionary<string, object> token, bool metric, long startTimestamp);
}
