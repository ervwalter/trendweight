using System.Globalization;
using System.Net;
using System.Text.Json;
using System.Web;
using Microsoft.Extensions.Options;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Features.ProviderLinks.Services;
using TrendWeight.Features.Providers.Exceptions;
using TrendWeight.Features.Providers.Withings.Models;
using TrendWeight.Features.SyncProgress;
using TrendWeight.Infrastructure.Configuration;
using TimeZoneConverter;

namespace TrendWeight.Features.Providers.Withings;

/// <summary>
/// Service for interacting with the Withings API
/// </summary>
public class WithingsService : ProviderServiceBase, IWithingsService
{
    private const string TokenEndpoint = "https://wbsapi.withings.net/v2/oauth2";

    private readonly HttpClient _httpClient;
    private readonly WithingsConfig _config;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    /// <summary>
    /// Constructor
    /// </summary>
    public WithingsService(
        HttpClient httpClient,
        IOptions<AppOptions> appOptions,
        IProviderLinkService providerLinkService,
        IProfileService profileService,
        ISyncProgressReporter? progressReporter,
        ILogger<WithingsService> logger)
        : base(providerLinkService, profileService, progressReporter, logger)
    {
        _httpClient = httpClient;
        _config = appOptions.Value.Withings;
    }

    /// <inheritdoc />
    public override string ProviderName => "withings";

    /// <inheritdoc />
    public override string GetAuthorizationUrl(string state, string callbackUrl)
    {
        return BuildAuthorizationUrl("https://account.withings.com/oauth2_user/authorize2", _config.ClientId, "user.metrics", state, callbackUrl);
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

        using var content = new FormUrlEncodedContent(parameters);
        using var response = await _httpClient.PostAsync(TokenEndpoint, content);

        if (!response.IsSuccessStatusCode)
        {
            Logger.LogError("Withings HTTP error: {StatusCode} {ReasonPhrase}",
                response.StatusCode, response.ReasonPhrase);
            throw MapHttpError(response.StatusCode, "Invalid authorization code. Please try connecting your Withings account again.");
        }

        var responseContent = await response.Content.ReadAsStringAsync();
        Logger.LogDebug("Withings authorization code exchange completed");

        WithingsResponse<WithingsTokenResponse>? withingsResponse;
        try
        {
            withingsResponse = JsonSerializer.Deserialize<WithingsResponse<WithingsTokenResponse>>(responseContent, JsonOptions);
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "Failed to deserialize Withings token response");
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

            // No user token is involved in a code exchange, so any other rejection means the
            // authorization code itself was invalid, expired, or already used (Withings reports
            // this as status 503 "Invalid Params: invalid code"). Surface it as a 400 the
            // link controller can relay instead of an auth failure that becomes a 500.
            throw new ProviderException(
                "Invalid authorization code. Please try connecting your Withings account again.",
                HttpStatusCode.BadRequest,
                "INVALID_CODE",
                isRetryable: false);
        }

        return ToToken(withingsResponse.Body);
    }

    /// <inheritdoc />
    protected override async Task<Dictionary<string, object>> RefreshTokenAsync(Dictionary<string, object> token)
    {
        // Get refresh token
        if (!token.TryGetValue("refresh_token", out var refreshTokenObj) || refreshTokenObj == null)
        {
            throw new InvalidOperationException("No refresh token found");
        }

        var parameters = new Dictionary<string, string>
        {
            ["action"] = "requesttoken",
            ["grant_type"] = "refresh_token",
            ["client_id"] = _config.ClientId,
            ["client_secret"] = _config.ClientSecret,
            ["refresh_token"] = refreshTokenObj.ToString()!
        };

        using var content = new FormUrlEncodedContent(parameters);
        using var response = await _httpClient.PostAsync(TokenEndpoint, content);

        if (!response.IsSuccessStatusCode)
        {
            Logger.LogError("Withings HTTP error: {StatusCode} {ReasonPhrase}",
                response.StatusCode, response.ReasonPhrase);
            throw MapHttpError(response.StatusCode, "Withings rejected the token refresh request. Please try connecting your Withings account again.");
        }

        var responseContent = await response.Content.ReadAsStringAsync();
        Logger.LogDebug("Withings token refresh completed");

        var withingsResponse = JsonSerializer.Deserialize<WithingsResponse<WithingsTokenResponse>>(responseContent, JsonOptions);

        if (withingsResponse?.Status != 0)
        {
            Logger.LogError("Withings API error: {Status} {Error}",
                withingsResponse?.Status, withingsResponse?.Error);
            throw ApiError(withingsResponse);
        }

        return ToToken(withingsResponse.Body);
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
        var pageNumber = 1;
        var mostRecentYear = 0;
        var seenOffsets = new HashSet<string>();

        while (hasMore)
        {
            // Report progress before each page
            if (ProgressReporter != null)
            {
                string message;
                if (pageNumber == 1)
                {
                    message = "Downloading readings from Withings";
                }
                else
                {
                    // For page 2+, show year-based message if we have multiple years of data
                    if (mostRecentYear > 0)
                    {
                        message = $"Downloading readings from Withings for {mostRecentYear}";
                    }
                    else
                    {
                        message = $"Downloading readings from Withings (page {pageNumber})";
                    }
                }

                await ProgressReporter.ReportProviderProgressAsync(
                    "withings",
                    stage: "fetching",
                    message: message,
                    current: pageNumber,
                    total: null); // Withings API doesn't provide total page count
            }

            var (measurements, more, newOffset) = await GetMeasurementPageAsync(accessToken!, startTimestamp, offset);
            allMeasurements.AddRange(measurements);

            // Track the most recent year from each page for progress messages
            if (measurements.Count > 0)
            {
                // Find the most recent date from measurements (don't assume any ordering)
                var mostRecentDate = measurements
                    .Select(m => DateTime.TryParse(m.Date, out var date) ? date : (DateTime?)null)
                    .Where(d => d.HasValue)
                    .OrderByDescending(d => d)
                    .FirstOrDefault();

                if (mostRecentDate.HasValue)
                {
                    mostRecentYear = mostRecentDate.Value.Year;
                }
            }

            if (more && (newOffset == null || !seenOffsets.Add(newOffset.ToString()!)))
            {
                throw new ProviderApiException("withings", "Withings returned an invalid pagination cursor");
            }

            hasMore = more;
            offset = newOffset;
            pageNumber++;
        }

        // Report completion
        if (ProgressReporter != null)
        {
            await ProgressReporter.ReportProviderProgressAsync(
                "withings",
                stage: "fetching",
                message: "Finishing up...",
                current: pageNumber,
                total: pageNumber);
        }

        return allMeasurements;
    }

    /// <summary>
    /// Gets a single page of measurements from Withings API
    /// </summary>
    private async Task<(List<RawMeasurement> measurements, bool more, object? offset)>
        GetMeasurementPageAsync(string accessToken, long start, object? offset = null)
    {
        Logger.LogDebug("Fetching Withings measurements page with offset: {Offset}", offset);

        using var request = new HttpRequestMessage(HttpMethod.Get, "https://wbsapi.withings.net/measure");
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

        using var response = await _httpClient.SendAsync(request);

        if (response.StatusCode == HttpStatusCode.Unauthorized)
        {
            // A transport-level 401 means the access token was rejected outright; report it
            // like Fitbit does so the sync surfaces AuthFailed instead of Unknown.
            Logger.LogWarning("Withings API returned 401 Unauthorized for measurement fetch");
            throw new ProviderAuthException(
                "withings",
                "Withings authorization expired. Please reconnect your account.",
                "401");
        }

        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            Logger.LogError("Withings HTTP error: {StatusCode} {ReasonPhrase}. Response content: {Content}",
                response.StatusCode, response.ReasonPhrase, errorContent);
            throw MapHttpError(response.StatusCode, "Invalid request to Withings. Please try again.");
        }

        var responseContent = await response.Content.ReadAsStringAsync();
        Logger.LogDebug("Withings measurements response received, length: {Length} bytes", responseContent.Length);

        var withingsResponse = JsonSerializer.Deserialize<WithingsResponse<WithingsGetMeasuresResponse>>(responseContent);

        if (withingsResponse?.Status != 0)
        {
            Logger.LogError("Withings API error: {Status} {Error}",
                withingsResponse?.Status, withingsResponse?.Error);
            throw ApiError(withingsResponse);
        }

        var body = withingsResponse.Body!;
        var timezone = body.Timezone;

        // Get timezone info for conversion with robust IANA/Windows ID support
        TimeZoneInfo? tzInfo = null;
        bool usedUtcFallback = false;
        if (!string.IsNullOrEmpty(timezone))
        {
            try
            {
                // Prefer TZConvert to resolve both IANA and Windows time zone IDs across platforms
                tzInfo = TZConvert.GetTimeZoneInfo(timezone);
            }
            catch (Exception ex1)
            {
                Logger.LogWarning("Withings timezone id not resolved via TZConvert: {Timezone}. Error: {Error}", timezone, ex1.Message);
                try
                {
                    // Fallback to platform-specific lookup as a secondary attempt
                    tzInfo = TimeZoneInfo.FindSystemTimeZoneById(timezone);
                }
                catch (Exception ex2)
                {
                    usedUtcFallback = true;
                    Logger.LogWarning("Withings timezone fallback to UTC. id: {Timezone}. Error: {Error}", timezone, ex2.Message);
                }
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

                if (usedUtcFallback)
                {
                    // Log once per group when we fell back to UTC to aid observability
                    Logger.LogWarning("Withings measurement converted using UTC due to unresolved timezone id: {Timezone}", timezone);
                    usedUtcFallback = false; // avoid repeated warnings within the same page
                }

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

        return (measurements, body.More > 0, body.Offset);
    }

    /// <summary>
    /// Maps a non-success HTTP status from the Withings API to a ProviderException.
    /// The 400 message depends on which call was rejected.
    /// </summary>
    private static ProviderException MapHttpError(HttpStatusCode statusCode, string badRequestMessage)
    {
        var (message, errorCode, isRetryable) = statusCode switch
        {
            HttpStatusCode.TooManyRequests => ("Withings is currently experiencing high traffic. Please try again in a few minutes.", "RATE_LIMITED", true),
            HttpStatusCode.Unauthorized => ("Authorization failed. Please try connecting your Withings account again.", "UNAUTHORIZED", false),
            HttpStatusCode.BadRequest => (badRequestMessage, "INVALID_CODE", false),
            HttpStatusCode.Forbidden => ("Access denied by Withings. Please check your account permissions.", "FORBIDDEN", false),
            HttpStatusCode.ServiceUnavailable => ("Withings services are temporarily unavailable. Please try again later.", "SERVICE_UNAVAILABLE", true),
            _ => ($"Unable to connect to Withings (Error: {statusCode}). Please try again later.", "UNEXPECTED_ERROR", false)
        };

        return new ProviderException(message, statusCode, errorCode, isRetryable);
    }

    /// <summary>
    /// Withings reports failures as HTTP 200 with a non-zero status. Token problems
    /// (status 401, or 503 with an "invalid refresh_token"-style message) become
    /// ProviderAuthException; anything else is a ProviderApiException.
    /// </summary>
    private static Exception ApiError<T>(WithingsResponse<T>? response)
    {
        var error = response?.Error;
        var isAuthError = response != null && (
            response.Status == 401 ||
            error?.Contains("invalid_token", StringComparison.OrdinalIgnoreCase) == true ||
            error?.Contains("invalid refresh_token", StringComparison.OrdinalIgnoreCase) == true ||
            error?.Contains("unauthorized", StringComparison.OrdinalIgnoreCase) == true ||
            (response.Status == 503 && error?.Contains("invalid", StringComparison.OrdinalIgnoreCase) == true));

        if (isAuthError)
        {
            return new ProviderAuthException(
                "withings",
                $"Withings authentication failed: {error}",
                response!.Status.ToString(CultureInfo.InvariantCulture));
        }

        return new ProviderApiException("withings", $"Withings API error: {response?.Status} {error}", error, response?.Status);
    }

    /// <summary>
    /// Converts a token endpoint body into the stored token shape (userid is not kept)
    /// </summary>
    private static Dictionary<string, object> ToToken(WithingsTokenResponse? tokenData)
    {
        if (tokenData == null || string.IsNullOrWhiteSpace(tokenData.AccessToken)
            || string.IsNullOrWhiteSpace(tokenData.RefreshToken) || tokenData.ExpiresIn <= 0)
        {
            throw new JsonException("Withings returned an incomplete token response");
        }

        return new Dictionary<string, object>
        {
            ["access_token"] = tokenData.AccessToken,
            ["refresh_token"] = tokenData.RefreshToken,
            ["token_type"] = tokenData.TokenType ?? string.Empty,
            ["scope"] = tokenData.Scope ?? string.Empty,
            ["received_at"] = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
            ["expires_in"] = tokenData.ExpiresIn
        };
    }

    /// <summary>
    /// Converts a Withings measure to a decimal value
    /// </summary>
    private static decimal MeasureToDecimal(WithingsMeasure measure)
    {
        return (decimal)(measure.Value * Math.Pow(10, measure.Unit));
    }
}
