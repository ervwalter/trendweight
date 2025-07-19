using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Web;
using TrendWeight.Features.Measurements;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Features.ProviderLinks.Services;
using TrendWeight.Features.Providers.Exceptions;
using TrendWeight.Features.Providers.Fitbit.Models;

namespace TrendWeight.Features.Providers.Fitbit;

/// <summary>
/// Service for interacting with the Fitbit API
/// </summary>
public class FitbitService : ProviderServiceBase, IFitbitService
{
    private readonly HttpClient _httpClient;
    private readonly FitbitConfig _config;
    private const decimal PoundsToKgFactor = 2.20462m;
    private int _remainingApiCalls = int.MaxValue;
    private DateTimeOffset _rateLimitResetTime = DateTimeOffset.UtcNow;

    // Token refresh buffer - refresh tokens 5 minutes before they expire
    private const int TOKEN_EXPIRY_BUFFER_SECONDS = 300;

    /// <summary>
    /// Constructor
    /// </summary>
    public FitbitService(
        HttpClient httpClient,
        FitbitConfig config,
        IProviderLinkService providerLinkService,
        ISourceDataService sourceDataService,
        IProfileService profileService,
        ILogger<FitbitService> logger)
        : base(providerLinkService, sourceDataService, profileService, logger)
    {
        _httpClient = httpClient;
        _config = config;
    }

    /// <inheritdoc />
    public override string ProviderName => "fitbit";

    /// <inheritdoc />
    public override string GetAuthorizationUrl(string state, string callbackUrl)
    {
        var url = new UriBuilder("https://www.fitbit.com/oauth2/authorize");
        var query = HttpUtility.ParseQueryString(string.Empty);
        query["client_id"] = _config.ClientId;
        query["response_type"] = "code";
        query["scope"] = "weight";
        query["state"] = state;
        query["redirect_uri"] = callbackUrl;
        url.Query = query.ToString();

        Logger.LogDebug("Generated Fitbit authorization URL");
        return url.ToString();
    }

    /// <inheritdoc />
    protected override async Task<Dictionary<string, object>> ExchangeCodeForTokenAsync(string code, string callbackUrl)
    {
        var parameters = new Dictionary<string, string>
        {
            ["code"] = code,
            ["grant_type"] = "authorization_code",
            ["redirect_uri"] = callbackUrl
        };

        var content = new FormUrlEncodedContent(parameters);

        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.fitbit.com/oauth2/token")
        {
            Content = content
        };

        // Use Basic Auth with client credentials
        var credentials = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{_config.ClientId}:{_config.ClientSecret}"));
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);

        var response = await _httpClient.SendAsync(request);

        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            Logger.LogError("Fitbit token exchange failed: {StatusCode} {Content}",
                response.StatusCode, errorContent);

            var (message, errorCode, isRetryable) = response.StatusCode switch
            {
                HttpStatusCode.TooManyRequests => ("Fitbit is currently experiencing high traffic. Please try again in a few minutes.", "RATE_LIMITED", true),
                HttpStatusCode.Unauthorized => ("Authorization failed. Please try connecting your Fitbit account again.", "UNAUTHORIZED", false),
                HttpStatusCode.BadRequest => ("Invalid authorization code. Please try connecting your Fitbit account again.", "INVALID_CODE", false),
                HttpStatusCode.Forbidden => ("Access denied by Fitbit. Please check your account permissions.", "FORBIDDEN", false),
                HttpStatusCode.ServiceUnavailable => ("Fitbit services are temporarily unavailable. Please try again later.", "SERVICE_UNAVAILABLE", true),
                _ => ($"Unable to connect to Fitbit (Error: {response.StatusCode}). Please try again later.", "UNEXPECTED_ERROR", false)
            };

            throw new ProviderException(message, response.StatusCode, errorCode, isRetryable);
        }

        var responseContent = await response.Content.ReadAsStringAsync();
        var tokenData = JsonSerializer.Deserialize<FitbitTokenResponse>(responseContent);

        if (tokenData == null)
        {
            throw new JsonException("Failed to parse Fitbit token response");
        }

        Logger.LogDebug("Successfully exchanged Fitbit authorization code for tokens");

        // Create token dictionary (excluding user_id since we don't use it)
        return new Dictionary<string, object>
        {
            ["access_token"] = tokenData.AccessToken,
            ["refresh_token"] = tokenData.RefreshToken,
            ["token_type"] = tokenData.TokenType,
            ["scope"] = tokenData.Scope,
            ["received_at"] = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
            ["expires_in"] = tokenData.ExpiresIn
        };
    }

    /// <inheritdoc />
    protected override bool IsTokenExpired(Dictionary<string, object> token)
    {
        // Check if we have the required fields
        if (!token.TryGetValue("received_at", out var receivedAtObj) ||
            !token.TryGetValue("expires_in", out var expiresInObj))
        {
            Logger.LogDebug("Fitbit token missing received_at/expires_in fields, considering expired");
            return true;
        }

        // Calculate expiration from Unix timestamps
        if (long.TryParse(receivedAtObj.ToString(), out var receivedAt) &&
            int.TryParse(expiresInObj.ToString(), out var expiresIn))
        {
            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var expiresAt = receivedAt + expiresIn;
            var isExpired = expiresAt <= now + TOKEN_EXPIRY_BUFFER_SECONDS;

            Logger.LogDebug("Fitbit token - Received: {ReceivedAt}, ExpiresIn: {ExpiresIn}s, ExpiresAt: {ExpiresAt}, Now: {Now}, IsExpired: {IsExpired}",
                receivedAt, expiresIn, expiresAt, now, isExpired);

            return isExpired;
        }

        Logger.LogDebug("Failed to parse Fitbit token timestamps");
        return true;
    }

    /// <inheritdoc />
    protected override async Task<Dictionary<string, object>> RefreshTokenAsync(Dictionary<string, object> token)
    {
        Logger.LogDebug("Attempting to refresh Fitbit token");
        // Get refresh token
        if (!token.TryGetValue("refresh_token", out var refreshTokenObj) || refreshTokenObj == null)
        {
            throw new InvalidOperationException("No refresh token found");
        }

        var refreshToken = refreshTokenObj.ToString();

        var parameters = new Dictionary<string, string>
        {
            ["grant_type"] = "refresh_token",
            ["refresh_token"] = refreshToken!
        };

        var content = new FormUrlEncodedContent(parameters);

        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.fitbit.com/oauth2/token")
        {
            Content = content
        };

        // Use Basic Auth with client credentials
        var credentials = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{_config.ClientId}:{_config.ClientSecret}"));
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);

        var response = await _httpClient.SendAsync(request);

        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            Logger.LogError("Fitbit token refresh failed: {StatusCode} {Content}",
                response.StatusCode, errorContent);

            // Check if this is an auth failure
            if (response.StatusCode == HttpStatusCode.Unauthorized ||
                response.StatusCode == HttpStatusCode.BadRequest &&
                (errorContent.Contains("invalid_grant", StringComparison.OrdinalIgnoreCase) ||
                 errorContent.Contains("refresh_token_invalid", StringComparison.OrdinalIgnoreCase)))
            {
                throw new ProviderAuthException(
                    "fitbit",
                    "Fitbit refresh token is invalid or expired. Please reconnect your account.",
                    response.StatusCode.ToString());
            }

            throw new HttpRequestException($"Fitbit token refresh failed: {response.StatusCode}");
        }

        var responseContent = await response.Content.ReadAsStringAsync();
        var tokenData = JsonSerializer.Deserialize<FitbitTokenResponse>(responseContent);

        if (tokenData == null)
        {
            throw new JsonException("Failed to parse Fitbit token refresh response");
        }

        Logger.LogDebug("Successfully refreshed Fitbit access token");

        // Create refreshed token dictionary (excluding user_id since we don't use it)
        return new Dictionary<string, object>
        {
            ["access_token"] = tokenData.AccessToken,
            ["refresh_token"] = tokenData.RefreshToken,
            ["token_type"] = tokenData.TokenType,
            ["scope"] = tokenData.Scope,
            ["received_at"] = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
            ["expires_in"] = tokenData.ExpiresIn
        };
    }

    /// <inheritdoc />
    protected override async Task<List<RawMeasurement>> FetchMeasurementsAsync(Dictionary<string, object> token, bool metric, long startTimestamp)
    {
        // Get access token
        if (!token.TryGetValue("access_token", out var accessTokenObj) || accessTokenObj == null)
        {
            throw new InvalidOperationException("No access token found");
        }

        var accessToken = accessTokenObj.ToString();

        var allMeasurements = new List<RawMeasurement>();

        // Determine date range
        DateTime startDate;
        DateTime endDate = DateTime.UtcNow.Date;

        if (startTimestamp > 1)
        {
            // Convert Unix timestamp to DateTime
            startDate = DateTimeOffset.FromUnixTimeSeconds(startTimestamp).UtcDateTime.Date;
        }
        else
        {
            // For initial sync, use Fitbit's earliest allowed date
            // The API doesn't allow requests before 2009-01-01
            startDate = new DateTime(2009, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            Logger.LogInformation("Starting Fitbit sync from earliest allowed date: {StartDate}", startDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
        }

        Logger.LogInformation("Fetching Fitbit measurements from {StartDate} to {EndDate}",
            startDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), endDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));

        // Calculate total days and chunks needed
        var totalDays = (endDate - startDate).TotalDays;
        var estimatedChunks = Math.Ceiling(totalDays / 32);
        Logger.LogInformation("Total days to fetch: {TotalDays}, estimated API calls: {Chunks}", totalDays, estimatedChunks);

        // Fetch data in 32-day chunks (Fitbit's maximum allowed range)
        var currentStart = startDate;
        while (currentStart <= endDate)
        {
            var currentEnd = currentStart.AddDays(31); // 32 days total
            if (currentEnd > endDate)
            {
                currentEnd = endDate;
            }

            var measurements = await GetWeightLogAsync(accessToken!, currentStart, currentEnd);
            allMeasurements.AddRange(measurements);

            currentStart = currentEnd.AddDays(1);
        }


        return allMeasurements;
    }

    /// <summary>
    /// Sends an HTTP request with rate limiting
    /// </summary>
    private async Task<HttpResponseMessage> SendRateLimitedRequestAsync(HttpRequestMessage request)
    {
        // Check if we need to wait before making the request
        if (_remainingApiCalls < 5 && DateTimeOffset.UtcNow < _rateLimitResetTime)
        {
            var waitTime = _rateLimitResetTime - DateTimeOffset.UtcNow;
            Logger.LogWarning("Rate limit nearly exhausted. Waiting {WaitTime} seconds before next request", waitTime.TotalSeconds);
            await Task.Delay(waitTime);
        }

        var response = await _httpClient.SendAsync(request);

        // Update rate limit tracking from response headers
        UpdateRateLimitTracking(response);

        return response;
    }

    /// <summary>
    /// Updates rate limit tracking from Fitbit response headers
    /// </summary>
    private void UpdateRateLimitTracking(HttpResponseMessage response)
    {
        if (response.Headers.TryGetValues("fitbit-rate-limit-limit", out var limitValues))
        {
            var limit = limitValues.FirstOrDefault();
            if (response.Headers.TryGetValues("fitbit-rate-limit-remaining", out var remainingValues) &&
                response.Headers.TryGetValues("fitbit-rate-limit-reset", out var resetValues))
            {
                var remaining = remainingValues.FirstOrDefault();
                var reset = resetValues.FirstOrDefault();

                if (int.TryParse(remaining, out var remainingCalls))
                {
                    _remainingApiCalls = remainingCalls;
                }

                if (int.TryParse(reset, out var resetSeconds))
                {
                    _rateLimitResetTime = DateTimeOffset.UtcNow.AddSeconds(resetSeconds);
                }

                Logger.LogDebug("Fitbit rate limit: {Remaining}/{Limit} (resets in {Reset}s)",
                    remaining, limit, reset);

                // Log warning if approaching limit
                if (_remainingApiCalls < 10)
                {
                    Logger.LogWarning("Approaching Fitbit rate limit: {Remaining} calls remaining", _remainingApiCalls);
                }
            }
        }
    }

    /// <summary>
    /// Gets weight log for a date range
    /// </summary>
    private async Task<List<RawMeasurement>> GetWeightLogAsync(string accessToken, DateTime startDate, DateTime endDate)
    {
        var measurements = new List<RawMeasurement>();

        var startStr = startDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var endStr = endDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

        Logger.LogDebug("Fetching Fitbit weight log from {StartDate} to {EndDate}", startStr, endStr);

        var request = new HttpRequestMessage(HttpMethod.Get,
            $"https://api.fitbit.com/1/user/-/body/log/weight/date/{startStr}/{endStr}.json");

        // Always request in US locale to get pounds (avoids Fitbit rounding error)
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        request.Headers.Add("Accept-Language", "en_US");

        var response = await SendRateLimitedRequestAsync(request);

        if (response.StatusCode == HttpStatusCode.Unauthorized)
        {
            var unauthorizedContent = await response.Content.ReadAsStringAsync();
            Logger.LogWarning("Fitbit API returned 401 Unauthorized. Response headers: {Headers}. Response content: {Content}",
                response.Headers.ToString(), unauthorizedContent);
            throw new ProviderAuthException(
                "fitbit",
                "Fitbit authorization expired. Please reconnect your account.",
                "401");
        }

        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            Logger.LogError("Failed to get weight log: {StatusCode} {Content}", response.StatusCode, errorContent);
            return measurements;
        }

        var content = await response.Content.ReadAsStringAsync();
        var weightLog = JsonSerializer.Deserialize<FitbitWeightLog>(content);

        if (weightLog?.Weight == null)
        {
            Logger.LogWarning("No weight data in Fitbit response");
            return measurements;
        }


        if (weightLog.Weight.Count == 0)
        {
            Logger.LogDebug("Weight array is empty for date range {StartDate} to {EndDate}", startStr, endStr);
            return measurements;
        }

        foreach (var entry in weightLog.Weight)
        {
            // Convert pounds to kg for storage
            var weightInKg = entry.Weight / PoundsToKgFactor;

            // Fitbit already provides date/time in local timezone - store as-is
            var measurement = new RawMeasurement
            {
                Date = entry.Date,  // Already "yyyy-MM-dd" format
                Time = entry.Time,  // Already "HH:mm:ss" format
                Weight = weightInKg,
                FatRatio = entry.Fat.HasValue ? entry.Fat.Value / 100m : null // Convert percentage to ratio
            };

            measurements.Add(measurement);
        }

        Logger.LogDebug("Processed {Count} measurements from Fitbit", measurements.Count);
        return measurements;
    }
}
