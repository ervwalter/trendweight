using System.Threading.RateLimiting;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using TrendWeight.Infrastructure.Middleware;

namespace TrendWeight.Tests.Infrastructure.Middleware;

public class RateLimitRejectionTests
{
    [Fact]
    public async Task WriteAsync_UsesTheLeaseRetryAfterRoundedUpToWholeSeconds()
    {
        using var limiter = new FixedWindowRateLimiter(new FixedWindowRateLimiterOptions
        {
            PermitLimit = 1,
            Window = TimeSpan.FromMinutes(1),
            AutoReplenishment = false
        });
        using var first = limiter.AttemptAcquire();
        using var rejected = limiter.AttemptAcquire();
        rejected.IsAcquired.Should().BeFalse();
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        await RateLimitRejection.WriteAsync(context, rejected, TestContext.Current.CancellationToken);

        context.Response.StatusCode.Should().Be(StatusCodes.Status429TooManyRequests);
        var retryAfter = int.Parse(context.Response.Headers.RetryAfter.ToString(), System.Globalization.CultureInfo.InvariantCulture);
        retryAfter.Should().BeInRange(1, 60);
        context.Response.ContentType.Should().Be("application/json");
        context.Response.Body.Position = 0;
        var body = await new StreamReader(context.Response.Body).ReadToEndAsync(TestContext.Current.CancellationToken);
        body.Should().Contain("\"errorCode\":\"RATE_LIMITED\"").And.Contain("\"isRetryable\":true");
    }

    [Fact]
    public async Task WriteAsync_FallsBackToTheWindowLengthWithoutLeaseMetadata()
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        await RateLimitRejection.WriteAsync(context, new MetadataFreeLease(), TestContext.Current.CancellationToken);

        context.Response.Headers.RetryAfter.ToString().Should().Be("60");
    }

    private sealed class MetadataFreeLease : RateLimitLease
    {
        public override bool IsAcquired => false;

        public override IEnumerable<string> MetadataNames => [];

        public override bool TryGetMetadata(string metadataName, out object? metadata)
        {
            metadata = null;
            return false;
        }
    }
}
