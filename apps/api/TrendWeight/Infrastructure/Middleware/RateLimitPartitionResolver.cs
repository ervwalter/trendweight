using System.Security.Claims;
using System.Threading.RateLimiting;

namespace TrendWeight.Infrastructure.Middleware;

/// <summary>
/// Resolves the rate limit partition for a request. Authenticated principals are
/// partitioned per user, with API-key principals on a stricter tier than interactive
/// users and writes tighter than reads. Anonymous requests to the API (sharing-code
/// reads, rejected credentials) are partitioned per peer address; anonymous requests
/// elsewhere (SPA shell, docs) are not limited.
/// </summary>
public static class RateLimitPartitionResolver
{
    public const string ApiKeyAuthMethodClaim = "auth_method";
    public const string ApiKeyAuthMethodValue = "api_key";

    private const int InteractiveLimitPerMinute = 100;
    private const int ApiKeyReadLimitPerMinute = 60;
    private const int ApiKeyWriteLimitPerMinute = 20;

    // The application does not consume forwarded headers, so behind the hosting
    // ingress the peer address is the ingress itself and every anonymous API request
    // shares one bucket. This limit is therefore sized as a ceiling on anonymous
    // database work (sharing-token lookups, API-key hashing) rather than a per-client
    // quota. Authenticated traffic never touches it.
    private const int AnonymousLimitPerMinute = 300;

    public static RateLimitPartition<string> Resolve(HttpContext httpContext)
    {
        var userId = httpContext.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(userId))
        {
            if (!httpContext.Request.Path.StartsWithSegments("/api"))
            {
                return RateLimitPartition.GetNoLimiter("anonymous");
            }

            var peer = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            return CreateFixedWindow($"anonymous:{peer}", AnonymousLimitPerMinute);
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
