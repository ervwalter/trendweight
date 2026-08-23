using System.Security.Claims;
using System.Threading.RateLimiting;

namespace TrendWeight.Infrastructure.Middleware;

/// <summary>
/// Resolves the rate limit partition for a request based on its authenticated principal.
/// Anonymous requests are not rate limited (static assets, login pages, health checks are
/// either unauthenticated or explicitly exempt). API-key principals get a stricter tier
/// than interactive users, with writes tighter than reads.
/// </summary>
public static class RateLimitPartitionResolver
{
    public const string ApiKeyAuthMethodClaim = "auth_method";
    public const string ApiKeyAuthMethodValue = "api_key";

    private const int InteractiveLimitPerMinute = 100;
    private const int ApiKeyReadLimitPerMinute = 60;
    private const int ApiKeyWriteLimitPerMinute = 20;

    public static RateLimitPartition<string> Resolve(HttpContext httpContext)
    {
        var userId = httpContext.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(userId))
        {
            // No rate limiting for anonymous requests
            return RateLimitPartition.GetNoLimiter("anonymous");
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
