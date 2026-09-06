using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace TrendWeight.Infrastructure.Middleware;

/// <summary>
/// Counts rejected credentials against the rate limiter. The limiter middleware runs
/// after authorization because it partitions on the principal that authorization
/// assigns for non-default schemes, so a request that authorization turns away with
/// 401 would otherwise never be counted. This handler charges such challenges to the
/// partition the limiter would use for them (the anonymous per-peer bucket) and
/// answers 429 once that bucket is exhausted.
/// </summary>
public sealed class RateLimitedAuthorizationResultHandler : IAuthorizationMiddlewareResultHandler
{
    private readonly AuthorizationMiddlewareResultHandler _defaultHandler = new();
    private readonly IOptions<RateLimiterOptions> _options;

    public RateLimitedAuthorizationResultHandler(IOptions<RateLimiterOptions> options)
    {
        _options = options;
    }

    public async Task HandleAsync(RequestDelegate next, HttpContext context, AuthorizationPolicy policy, PolicyAuthorizationResult authorizeResult)
    {
        var options = _options.Value;
        var limiter = options.GlobalLimiter;

        if (authorizeResult.Challenged && limiter != null
            && context.GetEndpoint()?.Metadata.GetMetadata<DisableRateLimitingAttribute>() == null)
        {
            using var lease = await limiter.AcquireAsync(context, 1, context.RequestAborted);
            if (!lease.IsAcquired)
            {
                context.Response.StatusCode = options.RejectionStatusCode;
                if (options.OnRejected != null)
                {
                    await options.OnRejected(new OnRejectedContext { HttpContext = context, Lease = lease }, context.RequestAborted);
                }
                return;
            }
        }

        await _defaultHandler.HandleAsync(next, context, policy, authorizeResult);
    }
}
