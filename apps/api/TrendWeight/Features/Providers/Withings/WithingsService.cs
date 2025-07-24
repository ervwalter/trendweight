using System.Globalization;
using System.Net;
using System.Text.Json;
using System.Web;
using Microsoft.Extensions.Options;
using TrendWeight.Features.Measurements;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Features.ProviderLinks.Services;
using TrendWeight.Features.Providers.Exceptions;
using TrendWeight.Features.Providers.Withings.Models;
using TrendWeight.Infrastructure.Configuration;

namespace TrendWeight.Features.Providers.Withings;

/// <summary>
/// Service for interacting with the Withings API
/// </summary>
public class WithingsService : ProviderServiceBase, IWithingsService
{
    private readonly HttpClient _httpClient;
    private readonly WithingsConfig _config;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    // Token refresh buffer - refresh tokens 5 minutes before they expire
    private const int TOKEN_EXPIRY_BUFFER_SECONDS = 300;

    /// <summary>
    /// Constructor
    /// </summary>
    public WithingsService(
        HttpClient httpClient,
        IOptions<AppOptions> appOptions,
        IProviderLinkService providerLinkService,
        IProfileService profileService,
        ILogger<WithingsService> logger)
        : base(providerLinkService, profileService, logger)
    {
        _httpClient = httpClient;
        _config = appOptions.Value.Withings;
    }

    /// <inheritdoc />
    public override string ProviderName => "withings";

    /// <inheritdoc />
    public override string GetAuthorizationUrl(string state, string callbackUrl)
    {
        var url = new UriBuilder("https://account.withings.com/oauth2_user/authorize2");
        var query = HttpUtility.ParseQueryString(string.Empty);
        query["client_id"] = _config.ClientId;
        query["response_type"] = "code";
        query["scope"] = "user.metrics";
        query["state"] = state;
        query["redirect_uri"] = callbackUrl;
        url.Query = query.ToString();

        // Remove default port 443 from HTTPS URLs
        var result = url.ToString();
        if (url.Scheme == "https" && url.Port == 443)
        {
            result = result.Replace(":443", string.Empty);
        }

        return result;
    }

    /// <inheritdoc />
    protected override async Task<Dictionary<string, object>> ExchangeCodeForTokenAsync(string code, string callbackUrl)
    {
        var parameters = new Dictionary<string, string>
        {
            ["action"] = "requesttoken",
            ["grant_type"] = "authorization_code",
            ["client_id"] = _config.ClientId,
            ["client_secret"] = _config.ClientSecret,
            ["code"] = code,
            ["redirect_uri"] = callbackUrl
        };

        var content = new FormUrlEncodedContent(parameters);
        var response = await _httpClient.PostAsync("https://wbsapi.withings.net/v2/oauth2", content);

        if (!response.IsSuccessStatusCode)
        {
            Logger.LogError("Withings HTTP error: {StatusCode} {ReasonPhrase}",
                response.StatusCode, response.ReasonPhrase);

            var (message, errorCode, isRetryable) = response.StatusCode switch
            {
                HttpStatusCode.TooManyRequests => ("Withings is currently experiencing high traffic. Please try again in a few minutes.", "RATE_LIMITED", true),
                HttpStatusCode.Unauthorized => ("Authorization failed. Please try connecting your Withings account again.", "UNAUTHORIZED", false),
                HttpStatusCode.BadRequest => ("Invalid authorization code. Please try connecting your Withings account again.", "INVALID_CODE", false),
                HttpStatusCode.Forbidden => ("Access denied by Withings. Please check your account permissions.", "FORBIDDEN", false),
                HttpStatusCode.ServiceUnavailable => ("Withings services are temporarily unavailable. Please try again later.", "SERVICE_UNAVAILABLE", true),
                _ => ($"Unable to connect to Withings (Error: {response.StatusCode}). Please try again later.", "UNEXPECTED_ERROR", false)
            };

            throw new ProviderException(message, response.StatusCode, errorCode, isRetryable);
        }

        var responseContent = await response.Content.ReadAsStringAsync();
        Logger.LogDebug("Withings authorization code exchange completed. Response: {Response}", responseContent);

        WithingsResponse<WithingsTokenResponse>? withingsResponse;
        try
        {
            withingsResponse = JsonSerializer.Deserialize<WithingsResponse<WithingsTokenResponse>>(responseContent, JsonOptions);
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "Failed to deserialize Withings response: {Response}", responseContent);
            throw;
        }

        if (withingsResponse?.Status != 0)
        {
            Logger.LogError("Withings API error: {Status} {Error}",
                withingsResponse?.Status, withingsResponse?.Error);

            // Handle "Same arguments in less than 10 seconds" error (status 601)
            // This happens when the same OAuth code is used twice within 10 seconds
            if (withingsResponse?.Status == 601)
            {
                throw new ProviderException(
                    "Request was already processed. If you're seeing this error, the connection may have already succeeded. Please check your account settings.",
                    HttpStatusCode.Conflict,
                    "DUPLICATE_REQUEST",
                    false // Not retryable - the request was already processed
                );
            }

            // Check for auth-related errors
            // Withings uses status 401 for invalid token
            // Withings also uses status 503 with "invalid refresh_token" message
            if (withingsResponse?.Status == 401 ||
                withingsResponse?.Error?.Contains("invalid_token", StringComparison.OrdinalIgnoreCase) == true ||
                withingsResponse?.Error?.Contains("invalid refresh_token", StringComparison.OrdinalIgnoreCase) == true ||
                withingsResponse?.Error?.Contains("unauthorized", StringComparison.OrdinalIgnoreCase) == true ||
                (withingsResponse?.Status == 503 && withingsResponse?.Error?.Contains("invalid", StringComparison.OrdinalIgnoreCase) == true))
            {
                throw new ProviderAuthException(
                    "withings",
                    $"Withings authentication failed: {withingsResponse.Error}",
                    withingsResponse.Status.ToString(CultureInfo.InvariantCulture));
            }

            throw new ProviderApiException("withings", $"Withings API error: {withingsResponse?.Status} {withingsResponse?.Error}", withingsResponse?.Error, withingsResponse?.Status);
        }

        var tokenData = withingsResponse!.Body!;

        // Create token dictionary (excluding userid since we don't use it)
        return new Dictionary<string, object>
        {
            ["access_token"] = tokenData.AccessToken ?? string.Empty,
            ["refresh_token"] = tokenData.RefreshToken ?? string.Empty,
            ["token_type"] = tokenData.TokenType ?? string.Empty,
            ["scope"] = tokenData.Scope ?? string.Empty,
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
            Logger.LogDebug("Withings token missing received_at/expires_in fields, considering expired");
            return true;
        }

        // Calculate expiration from Unix timestamps
        if (long.TryParse(receivedAtObj.ToString(), out var receivedAt) &&
            int.TryParse(expiresInObj.ToString(), out var expiresIn))
        {
            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var expiresAt = receivedAt + expiresIn;
            var isExpired = expiresAt <= now + TOKEN_EXPIRY_BUFFER_SECONDS;

            Logger.LogDebug("Withings token - Received: {ReceivedAt}, ExpiresIn: {ExpiresIn}s, ExpiresAt: {ExpiresAt}, Now: {Now}, IsExpired: {IsExpired}",
                receivedAt, expiresIn, expiresAt, now, isExpired);

            return isExpired;
        }

        Logger.LogDebug("Failed to parse Withings token timestamps");
        return true;
    }

    /// <inheritdoc />
    protected override async Task<Dictionary<string, object>> RefreshTokenAsync(Dictionary<string, object> token)
    {
        // Get refresh token
        if (!token.TryGetValue("refresh_token", out var refreshTokenObj) || refreshTokenObj == null)
        {
            throw new InvalidOperationException("No refresh token found");
        }

        var refreshToken = refreshTokenObj.ToString();

        var parameters = new Dictionary<string, string>
        {
            ["action"] = "requesttoken",
            ["grant_type"] = "refresh_token",
            ["client_id"] = _config.ClientId,
            ["client_secret"] = _config.ClientSecret,
            ["refresh_token"] = refreshToken!
        };

        var content = new FormUrlEncodedContent(parameters);
        var response = await _httpClient.PostAsync("https://wbsapi.withings.net/v2/oauth2", content);

        if (!response.IsSuccessStatusCode)
        {
            Logger.LogError("Withings HTTP error: {StatusCode} {ReasonPhrase}",
                response.StatusCode, response.ReasonPhrase);

            var (message, errorCode, isRetryable) = response.StatusCode switch
            {
                HttpStatusCode.TooManyRequests => ("Withings is currently experiencing high traffic. Please try again in a few minutes.", "RATE_LIMITED", true),
                HttpStatusCode.Unauthorized => ("Authorization failed. Please try connecting your Withings account again.", "UNAUTHORIZED", false),
                HttpStatusCode.BadRequest => ("Invalid authorization code. Please try connecting your Withings account again.", "INVALID_CODE", false),
                HttpStatusCode.Forbidden => ("Access denied by Withings. Please check your account permissions.", "FORBIDDEN", false),
                HttpStatusCode.ServiceUnavailable => ("Withings services are temporarily unavailable. Please try again later.", "SERVICE_UNAVAILABLE", true),
                _ => ($"Unable to connect to Withings (Error: {response.StatusCode}). Please try again later.", "UNEXPECTED_ERROR", false)
            };

            throw new ProviderException(message, response.StatusCode, errorCode, isRetryable);
        }

        var responseContent = await response.Content.ReadAsStringAsync();
        Logger.LogDebug("Withings token refresh response: {Response}", responseContent);

        var withingsResponse = JsonSerializer.Deserialize<WithingsResponse<WithingsTokenResponse>>(responseContent, JsonOptions);

        if (withingsResponse?.Status != 0)
        {
            Logger.LogError("Withings API error: {Status} {Error}",
                withingsResponse?.Status, withingsResponse?.Error);

            // Check for auth-related errors
            // Withings uses status 401 for invalid token
            // Withings also uses status 503 with "invalid refresh_token" message
            if (withingsResponse?.Status == 401 ||
                withingsResponse?.Error?.Contains("invalid_token", StringComparison.OrdinalIgnoreCase) == true ||
                withingsResponse?.Error?.Contains("invalid refresh_token", StringComparison.OrdinalIgnoreCase) == true ||
                withingsResponse?.Error?.Contains("unauthorized", StringComparison.OrdinalIgnoreCase) == true ||
                (withingsResponse?.Status == 503 && withingsResponse?.Error?.Contains("invalid", StringComparison.OrdinalIgnoreCase) == true))
            {
                throw new ProviderAuthException(
                    "withings",
                    $"Withings authentication failed: {withingsResponse.Error}",
                    withingsResponse.Status.ToString(CultureInfo.InvariantCulture));
            }

            throw new ProviderApiException("withings", $"Withings API error: {withingsResponse?.Status} {withingsResponse?.Error}", withingsResponse?.Error, withingsResponse?.Status);
        }

        var tokenData = withingsResponse!.Body!;

        // Create refreshed token dictionary (excluding userid since we don't use it)
        return new Dictionary<string, object>
        {
            ["access_token"] = tokenData.AccessToken ?? string.Empty,
            ["refresh_token"] = tokenData.RefreshToken ?? string.Empty,
            ["token_type"] = tokenData.TokenType ?? string.Empty,
            ["scope"] = tokenData.Scope ?? string.Empty,
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
        bool hasMore = true;
        object? offset = null;

        while (hasMore)
        {
            var (measurements, more, newOffset, timezone) = await GetMeasurementPageAsync(accessToken!, startTimestamp, offset);
            allMeasurements.AddRange(measurements);
            hasMore = more;
            offset = newOffset;
        }

        return allMeasurements;
    }

    /// <summary>
    /// Gets a single page of measurements from Withings API
    /// </summary>
    private async Task<(List<RawMeasurement> measurements, bool more, object? offset, string timezone)>
        GetMeasurementPageAsync(string accessToken, long start, object? offset = null)
    {
        Logger.LogDebug("Fetching Withings measurements page with offset: {Offset}", offset);

        var request = new HttpRequestMessage(HttpMethod.Get, "https://wbsapi.withings.net/measure");
        request.Headers.Add("Authorization", $"Bearer {accessToken}");

        var uriBuilder = new UriBuilder(request.RequestUri!);
        var query = HttpUtility.ParseQueryString(uriBuilder.Query);

        query["action"] = "getmeas";
        query["category"] = "1"; // 1 for real measures
        query["meastypes"] = "1,6"; // 1 for Weight (kg), 6 for Fat Ratio (%)
        query["startdate"] = start.ToString(CultureInfo.InvariantCulture);

        if (offset != null)
        {
            query["offset"] = offset.ToString() ?? string.Empty;
        }

        uriBuilder.Query = query.ToString();
        request.RequestUri = uriBuilder.Uri;

        Logger.LogDebug("Withings API request: {Uri}", request.RequestUri);

        var response = await _httpClient.SendAsync(request);

        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            Logger.LogError("Withings HTTP error: {StatusCode} {ReasonPhrase}. Response content: {Content}",
                response.StatusCode, response.ReasonPhrase, errorContent);

            var (message, errorCode, isRetryable) = response.StatusCode switch
            {
                HttpStatusCode.TooManyRequests => ("Withings is currently experiencing high traffic. Please try again in a few minutes.", "RATE_LIMITED", true),
                HttpStatusCode.Unauthorized => ("Authorization failed. Please try connecting your Withings account again.", "UNAUTHORIZED", false),
                HttpStatusCode.BadRequest => ("Invalid request to Withings. Please try again.", "INVALID_CODE", false),
                HttpStatusCode.Forbidden => ("Access denied by Withings. Please check your account permissions.", "FORBIDDEN", false),
                HttpStatusCode.ServiceUnavailable => ("Withings services are temporarily unavailable. Please try again later.", "SERVICE_UNAVAILABLE", true),
                _ => ($"Unable to connect to Withings (Error: {response.StatusCode}). Please try again later.", "UNEXPECTED_ERROR", false)
            };

            throw new ProviderException(message, response.StatusCode, errorCode, isRetryable);
        }

        var responseContent = await response.Content.ReadAsStringAsync();
        Logger.LogDebug("Withings measurements response received, length: {Length} bytes", responseContent.Length);

        var withingsResponse = JsonSerializer.Deserialize<WithingsResponse<WithingsGetMeasuresResponse>>(responseContent);

        if (withingsResponse?.Status != 0)
        {
            Logger.LogError("Withings API error: {Status} {Error}",
                withingsResponse?.Status, withingsResponse?.Error);

            // Check for auth-related errors
            // Withings uses status 401 for invalid token
            // Withings also uses status 503 with "invalid refresh_token" message
            if (withingsResponse?.Status == 401 ||
                withingsResponse?.Error?.Contains("invalid_token", StringComparison.OrdinalIgnoreCase) == true ||
                withingsResponse?.Error?.Contains("invalid refresh_token", StringComparison.OrdinalIgnoreCase) == true ||
                withingsResponse?.Error?.Contains("unauthorized", StringComparison.OrdinalIgnoreCase) == true ||
                (withingsResponse?.Status == 503 && withingsResponse?.Error?.Contains("invalid", StringComparison.OrdinalIgnoreCase) == true))
            {
                throw new ProviderAuthException(
                    "withings",
                    $"Withings authentication failed: {withingsResponse.Error}",
                    withingsResponse.Status.ToString(CultureInfo.InvariantCulture));
            }

            throw new ProviderApiException("withings", $"Withings API error: {withingsResponse?.Status} {withingsResponse?.Error}", withingsResponse?.Error, withingsResponse?.Status);
        }

        var body = withingsResponse!.Body!;
        var timezone = body.Timezone;

        // Get timezone info for conversion
        TimeZoneInfo? tzInfo = null;
        if (!string.IsNullOrEmpty(timezone))
        {
            try
            {
                tzInfo = TimeZoneInfo.FindSystemTimeZoneById(timezone);
            }
            catch (Exception ex)
            {
                Logger.LogWarning("Failed to parse timezone {Timezone}, will use UTC: {Error}", timezone, ex.Message);
            }
        }

        var measurements = new List<RawMeasurement>();
        foreach (var group in body.MeasureGroups)
        {
            var timestamp = group.Date;

            var weightMeasure = group.Measures.Find(m => m.Type == 1); // Type 1 = Weight
            var fatMeasure = group.Measures.Find(m => m.Type == 6);    // Type 6 = Fat Percentage

            if (weightMeasure != null)
            {
                var weight = MeasureToDecimal(weightMeasure);

                decimal? fatRatio = null;
                if (fatMeasure != null)
                {
                    var fatPercent = MeasureToDecimal(fatMeasure);
                    fatRatio = fatPercent / 100m; // Convert percentage to ratio
                }

                // Convert Unix timestamp to local date/time
                var utcDateTime = DateTimeOffset.FromUnixTimeSeconds(timestamp).UtcDateTime;
                var localDateTime = tzInfo != null
                    ? TimeZoneInfo.ConvertTimeFromUtc(utcDateTime, tzInfo)
                    : utcDateTime; // Fallback to UTC if timezone not available

                var measurement = new RawMeasurement
                {
                    Date = localDateTime.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                    Time = localDateTime.ToString("HH:mm:ss", CultureInfo.InvariantCulture),
                    Weight = weight, // Always store in kg
                    FatRatio = fatRatio
                };

                measurements.Add(measurement);
            }
        }

        // Sort measurements in descending order by date/time
        measurements.Sort((a, b) => string.Compare($"{b.Date} {b.Time}", $"{a.Date} {a.Time}", StringComparison.Ordinal));

        return (measurements, body.More > 0, body.Offset, timezone);
    }

    /// <summary>
    /// Converts a Withings measure to a decimal value
    /// </summary>
    private static decimal MeasureToDecimal(WithingsMeasure measure)
    {
        return (decimal)(measure.Value * Math.Pow(10, measure.Unit));
    }

}
