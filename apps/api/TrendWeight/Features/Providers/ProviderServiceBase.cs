using System.Web;
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
    // Refresh tokens 5 minutes before they expire
    private const int TokenExpiryBufferSeconds = 300;

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
        catch (HttpRequestException)
        {
            // Preserve network failures for SyncMeasurementsAsync to classify.
            throw;
        }
        catch (ProviderException ex) when (ex.IsRetryable)
        {
            // Rate limits and provider outages are transient; SyncMeasurementsAsync reports them as retryable.
            throw;
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "Failed to get {Provider} measurements for user {UserId}", ProviderName, userId);
            return null;
        }
    }

    /// <inheritdoc />
    public virtual async Task<ProviderSyncResult> SyncMeasurementsAsync(Guid userId, bool metric, DateTime? startDate = null)
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
        catch (ProviderException ex) when (ex.IsRetryable)
        {
            Logger.LogWarning(ex, "Transient {Provider} error syncing measurements for user {UserId}", ProviderName, userId);
            return new ProviderSyncResult
            {
                Provider = ProviderName,
                Success = false,
                Error = ProviderSyncError.NetworkError,
                Message = ex.Message
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

    // Both providers rotate refresh tokens, so two overlapping requests that each spend the
    // same refresh token leave the loser with invalid_grant and a spurious "please reconnect"
    // even though the winner just stored a valid token. Refreshes for a given link are
    // serialized within this process and re-read the stored link before spending the token.
    // The lock map only holds keys with an in-flight refresh, so it does not grow over time.
    private static readonly KeyedAsyncLock<(Guid UserId, string Provider)> RefreshLocks = new();

    /// <summary>Test hook: whether a refresh lock entry is currently retained for the link</summary>
    internal static bool HasRefreshLock(Guid userId, string provider) => RefreshLocks.Contains((userId, provider));

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

        if (!IsTokenExpired(providerLink.Token))
        {
            return providerLink;
        }

        using (await RefreshLocks.AcquireAsync((userId, ProviderName)))
        {
            // A concurrent request may have refreshed while this one waited for the lock
            providerLink = await ProviderLinkService.GetProviderLinkAsync(userId, ProviderName);
            if (providerLink == null)
            {
                return null;
            }

            if (!IsTokenExpired(providerLink.Token))
            {
                Logger.LogDebug("{Provider} token for user {UserId} was refreshed by a concurrent request", ProviderName, userId);
                return providerLink;
            }

            if (!providerLink.Token.TryGetValue("refresh_token", out var refreshToken) || string.IsNullOrEmpty(refreshToken?.ToString()))
            {
                Logger.LogWarning("Token for {Provider} user {UserId} has no refresh token and cannot be refreshed. User needs to re-link account.", ProviderName, userId);
                // No valid provider link
                return null;
            }

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
            catch (Exception ex)
            {
                Logger.LogError(ex, "Failed to refresh token for {Provider} user {UserId}", ProviderName, userId);
                throw;
            }
        }

        return providerLink;
    }

    /// <summary>
    /// Both providers store the token issue time as received_at (Unix seconds) and its lifetime
    /// as expires_in (seconds). A token missing either field, or within the refresh buffer of
    /// its expiry, is treated as expired.
    /// </summary>
    protected virtual bool IsTokenExpired(Dictionary<string, object> token)
    {
        if (!token.TryGetValue("received_at", out var receivedAtObj) ||
            !token.TryGetValue("expires_in", out var expiresInObj) ||
            !long.TryParse(receivedAtObj?.ToString(), out var receivedAt) ||
            !int.TryParse(expiresInObj?.ToString(), out var expiresIn))
        {
            return true;
        }

        return receivedAt + expiresIn <= DateTimeOffset.UtcNow.ToUnixTimeSeconds() + TokenExpiryBufferSeconds;
    }

    /// <summary>
    /// Builds the OAuth authorization URL for a provider's authorize endpoint
    /// </summary>
    protected static string BuildAuthorizationUrl(string authorizeEndpoint, string clientId, string scope, string state, string callbackUrl)
    {
        var url = new UriBuilder(authorizeEndpoint);
        var query = HttpUtility.ParseQueryString(string.Empty);
        query["client_id"] = clientId;
        query["response_type"] = "code";
        query["scope"] = scope;
        query["state"] = state;
        query["redirect_uri"] = callbackUrl;
        url.Query = query.ToString();

        // UriBuilder renders the default port explicitly; providers expect it omitted
        var result = url.ToString();
        if (url.Scheme == "https" && url.Port == 443)
        {
            result = result.Replace(":443", string.Empty);
        }

        return result;
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
    /// Refreshes an expired access token (provider-specific)
    /// </summary>
    protected abstract Task<Dictionary<string, object>> RefreshTokenAsync(Dictionary<string, object> token);

    /// <summary>
    /// Fetches measurements from the provider API (provider-specific)
    /// </summary>
    protected abstract Task<List<RawMeasurement>> FetchMeasurementsAsync(Dictionary<string, object> token, bool metric, long startTimestamp);
}
