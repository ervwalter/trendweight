using TrendWeight.Features.Measurements.Models;
using TrendWeight.Features.Providers.Models;

namespace TrendWeight.Features.Providers;

/// <summary>
/// Common interface for all provider integrations (Withings, Fitbit, etc.)
/// </summary>
public interface IProviderService
{
    /// <summary>
    /// Gets the provider name (e.g., "withings", "fitbit")
    /// </summary>
    string ProviderName { get; }

    /// <summary>
    /// Gets the authorization URL for OAuth flow
    /// </summary>
    /// <param name="state">State parameter for OAuth security</param>
    /// <param name="callbackUrl">Callback URL for OAuth redirect</param>
    /// <returns>The authorization URL</returns>
    string GetAuthorizationUrl(string state, string callbackUrl);

    /// <summary>
    /// Exchanges an authorization code for access tokens and stores them
    /// </summary>
    /// <param name="code">Authorization code from OAuth redirect</param>
    /// <param name="callbackUrl">Callback URL used in the authorization request</param>
    /// <param name="userId">Supabase user ID</param>
    /// <returns>Success status</returns>
    Task<bool> ExchangeAuthorizationCodeAsync(string code, string callbackUrl, Guid userId);

    /// <summary>
    /// Gets measurements for a user, automatically handling token refresh if needed
    /// </summary>
    /// <param name="userId">Supabase user ID</param>
    /// <param name="metric">Whether to return measurements in metric units</param>
    /// <param name="startDate">Optional start date for measurements (null for all)</param>
    /// <returns>List of measurements or null if no provider link exists</returns>
    Task<List<RawMeasurement>?> GetMeasurementsAsync(Guid userId, bool metric, DateTime? startDate = null);

    /// <summary>
    /// Syncs measurements for a user from a specific start date
    /// </summary>
    /// <param name="userId">Supabase user ID</param>
    /// <param name="metric">Whether to store measurements in metric units</param>
    /// <param name="startDate">Start date for measurements (null for all)</param>
    /// <returns>Sync result with success status and error details</returns>
    Task<ProviderSyncResult> SyncMeasurementsAsync(Guid userId, bool metric, DateTime? startDate = null);

    /// <summary>
    /// Checks if a user has an active provider link
    /// </summary>
    /// <param name="userId">Supabase user ID</param>
    /// <returns>True if provider link exists and is active</returns>
    Task<bool> HasActiveProviderLinkAsync(Guid userId);

    /// <summary>
    /// Removes the provider link for a user
    /// </summary>
    /// <param name="userId">Supabase user ID</param>
    /// <returns>Success status</returns>
    Task<bool> RemoveProviderLinkAsync(Guid userId);
}
