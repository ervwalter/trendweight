using System.Net;
using System.Security.Claims;
using System.Threading.RateLimiting;
using TrendWeight.Infrastructure.Configuration;

namespace TrendWeight.Infrastructure.Middleware;

/// <summary>
/// Resolves rate limit partitions. Authenticated principals are partitioned per
/// user, with API-key principals on a stricter tier than interactive users and
/// writes tighter than reads. Anonymous requests to the API (sharing-code reads,
/// rejected credentials) are partitioned per client address and additionally
/// capped by one shared ceiling; anonymous requests elsewhere (SPA shell, docs)
/// are not limited.
/// </summary>
public static class RateLimitPartitionResolver
{
    public const string ApiKeyAuthMethodClaim = "auth_method";
    public const string ApiKeyAuthMethodValue = "api_key";
    public const string AnonymousCeilingPartitionKey = "anonymous:all";

    private const int InteractiveLimitPerMinute = 100;
    private const int ApiKeyReadLimitPerMinute = 60;
    private const int ApiKeyWriteLimitPerMinute = 20;

    // Per-client budget for anonymous API traffic. A shared dashboard load is a
    // handful of requests, so this is generous for a person and tight for a scanner.
    private const int AnonymousClientLimitPerMinute = 60;

    // Ceiling on all anonymous API work regardless of how many client addresses
    // it arrives from. This bounds sharing-token lookups and API-key hashing even
    // if the client address header were ever spoofable.
    private const int AnonymousCeilingPerMinute = 300;

    /// <summary>
    /// Per-principal (or per anonymous client) partition.
    /// </summary>
    public static RateLimitPartition<string> Resolve(HttpContext httpContext, RateLimitingConfig config)
    {
        var userId = httpContext.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(userId))
        {
            if (!IsApiRequest(httpContext))
            {
                return RateLimitPartition.GetNoLimiter("anonymous");
            }

            var client = ResolveClientAddress(httpContext, config);
            return CreateFixedWindow($"anonymous:{client}", AnonymousClientLimitPerMinute);
        }

        if (httpContext.User!.HasClaim(ApiKeyAuthMethodClaim, ApiKeyAuthMethodValue))
        {
            var isWrite = httpContext.Request.Method is "POST" or "PUT" or "PATCH" or "DELETE";
            return isWrite
                ? CreateFixedWindow($"api:{userId}:write", ApiKeyWriteLimitPerMinute)
                : CreateFixedWindow($"api:{userId}:read", ApiKeyReadLimitPerMinute);
        }

        return CreateFixedWindow(userId, InteractiveLimitPerMinute);
    }

    /// <summary>
    /// Shared ceiling across every anonymous API request; chained after
    /// <see cref="Resolve"/> so authenticated traffic never touches it.
    /// </summary>
    public static RateLimitPartition<string> ResolveAnonymousCeiling(HttpContext httpContext)
    {
        var userId = httpContext.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrEmpty(userId) || !IsApiRequest(httpContext))
        {
            return RateLimitPartition.GetNoLimiter("unlimited");
        }

        return CreateFixedWindow(AnonymousCeilingPartitionKey, AnonymousCeilingPerMinute);
    }

    /// <summary>
    /// The address used to partition anonymous traffic: the first configured
    /// header carrying a parseable IP address, otherwise the peer address.
    /// </summary>
    public static string ResolveClientAddress(HttpContext httpContext, RateLimitingConfig config)
    {
        foreach (var header in config.ClientAddressHeaderNames)
        {
            if (!httpContext.Request.Headers.TryGetValue(header, out var values))
            {
                continue;
            }

            // Take the first address of the first value; a comma-separated chain
            // would list the original client first.
            var candidate = values.ToString().Split(',', 2)[0].Trim();
            if (IPAddress.TryParse(candidate, out var address))
            {
                return address.ToString();
            }
        }

        return httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    private static bool IsApiRequest(HttpContext httpContext) =>
        httpContext.Request.Path.StartsWithSegments("/api");

    private static RateLimitPartition<string> CreateFixedWindow(string partitionKey, int permitLimit)
    {
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey,
            partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = permitLimit,
                Window = TimeSpan.FromMinutes(1)
            });
    }
}
