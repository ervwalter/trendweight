using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using TrendWeight.Features.Common.Models;

namespace TrendWeight.Infrastructure.Middleware;

/// <summary>
/// Writes the 429 response shared by the rate limiter middleware and the
/// authorization handler that charges rejected credentials. Scripted API clients
/// key their back-off on Retry-After, which the fixed-window lease supplies.
/// </summary>
public static class RateLimitRejection
{
    /// <summary>Used when the lease carries no retry metadata: the limiter windows are one minute.</summary>
    public const int DefaultRetryAfterSeconds = 60;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public static async Task WriteAsync(HttpContext context, RateLimitLease lease, CancellationToken cancellationToken)
    {
        context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        context.Response.Headers.RetryAfter = RetryAfterSeconds(lease).ToString(CultureInfo.InvariantCulture);
        context.Response.ContentType = "application/json";

        var response = new ApiErrorResponse
        {
            Error = "Too many requests. Please try again later.",
            ErrorCode = ErrorCodes.RateLimited,
            IsRetryable = true
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(response, JsonOptions), cancellationToken);
    }

    public static int RetryAfterSeconds(RateLimitLease lease)
    {
        if (lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter) && retryAfter > TimeSpan.Zero)
        {
            return (int)Math.Ceiling(retryAfter.TotalSeconds);
        }

        return DefaultRetryAfterSeconds;
    }
}
