using System.Net;
using System.Text;
using Microsoft.Extensions.Logging;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Features.ProviderLinks.Services;
using TrendWeight.Features.Providers;
using TrendWeight.Features.SyncProgress;

namespace TrendWeight.Tests.Fixtures;

/// <summary>
/// Stored OAuth token dictionaries in the shape both providers persist
/// (received_at in Unix seconds, expires_in in seconds).
/// </summary>
public static class ProviderTokens
{
    public static Dictionary<string, object> Valid(string accessToken = "test-access-token", int expiresIn = 3600)
    {
        return new Dictionary<string, object>
        {
            ["access_token"] = accessToken,
            ["refresh_token"] = "test-refresh-token",
            ["token_type"] = "Bearer",
            ["scope"] = "weight",
            ["received_at"] = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
            ["expires_in"] = expiresIn
        };
    }

    /// <summary>A token whose lifetime ended two hours ago</summary>
    public static Dictionary<string, object> Expired(string accessToken = "expired-access-token")
    {
        var token = Valid(accessToken);
        token["received_at"] = DateTimeOffset.UtcNow.AddHours(-3).ToUnixTimeSeconds();
        return token;
    }

    /// <summary>An expired token that cannot be refreshed</summary>
    public static Dictionary<string, object> ExpiredWithoutRefreshToken()
    {
        var token = Expired();
        token.Remove("refresh_token");
        return token;
    }
}

/// <summary>
/// One recorded outbound request: the URL, the Authorization header and the body
/// as sent (the services dispose their requests, so the body is captured at send time).
/// </summary>
public sealed record RecordedRequest(HttpMethod Method, Uri Uri, string? AuthScheme, string? AuthParameter, string? Body);

/// <summary>
/// Routes requests to canned responses by predicate and records every request.
/// Unmatched requests fail loudly so a test cannot pass by accident.
/// </summary>
public sealed class RecordingHttpHandler : HttpMessageHandler
{
    private readonly List<(Func<HttpRequestMessage, bool> Match, Func<HttpRequestMessage, HttpResponseMessage> Respond)> _routes = new();

    public List<RecordedRequest> Requests { get; } = new();

    public RecordingHttpHandler When(Func<HttpRequestMessage, bool> match, Func<HttpRequestMessage, HttpResponseMessage> respond)
    {
        _routes.Add((match, respond));
        return this;
    }

    public RecordingHttpHandler WhenUrlContains(string fragment, HttpStatusCode status, string json)
    {
        return When(r => r.RequestUri!.ToString().Contains(fragment, StringComparison.Ordinal), _ => Json(status, json));
    }

    public static HttpResponseMessage Json(HttpStatusCode status, string json)
    {
        return new HttpResponseMessage(status)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var body = request.Content == null ? null : await request.Content.ReadAsStringAsync(cancellationToken);
        Requests.Add(new RecordedRequest(
            request.Method,
            request.RequestUri!,
            request.Headers.Authorization?.Scheme,
            request.Headers.Authorization?.Parameter,
            body));

        foreach (var (match, respond) in _routes)
        {
            if (match(request))
            {
                return respond(request);
            }
        }

        throw new InvalidOperationException($"Unexpected request: {request.Method} {request.RequestUri}");
    }
}

/// <summary>
/// Minimal concrete provider for exercising ProviderServiceBase on its own: exposes
/// IsTokenExpired and lets a test script the code exchange.
/// </summary>
public sealed class TestProviderService : ProviderServiceBase
{
    public Func<string, string, Task<Dictionary<string, object>>> ExchangeCode { get; set; } =
        (_, _) => Task.FromResult(ProviderTokens.Valid());

    public TestProviderService(IProviderLinkService providerLinkService, IProfileService profileService, ILogger logger)
        : base(providerLinkService, profileService, progressReporter: null, logger)
    {
    }

    public override string ProviderName => "test";

    public override string GetAuthorizationUrl(string state, string callbackUrl) => "https://example.test/authorize";

    public bool IsExpired(Dictionary<string, object> token) => IsTokenExpired(token);

    protected override Task<Dictionary<string, object>> ExchangeCodeForTokenAsync(string code, string callbackUrl) => ExchangeCode(code, callbackUrl);

    protected override Task<Dictionary<string, object>> RefreshTokenAsync(Dictionary<string, object> token) =>
        throw new NotSupportedException();

    protected override Task<List<RawMeasurement>> FetchMeasurementsAsync(Dictionary<string, object> token, bool metric, long startTimestamp) =>
        Task.FromResult(new List<RawMeasurement>());
}
