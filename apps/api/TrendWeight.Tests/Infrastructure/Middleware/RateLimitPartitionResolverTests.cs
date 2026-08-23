using System.Security.Claims;
using System.Threading.RateLimiting;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using TrendWeight.Infrastructure.Middleware;
using Xunit;

namespace TrendWeight.Tests.Infrastructure.Middleware;

public class RateLimitPartitionResolverTests
{
    private static HttpContext CreateContext(ClaimsPrincipal? user = null, string method = "GET")
    {
        var context = new DefaultHttpContext();
        context.Request.Method = method;
        if (user != null)
        {
            context.User = user;
        }
        return context;
    }

    private static ClaimsPrincipal CreatePrincipal(string userId, bool apiKey = false)
    {
        var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, userId) };
        if (apiKey)
        {
            claims.Add(new Claim(RateLimitPartitionResolver.ApiKeyAuthMethodClaim, RateLimitPartitionResolver.ApiKeyAuthMethodValue));
        }
        return new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));
    }

    private static int CountAvailablePermits(RateLimitPartition<string> partition)
    {
        using var limiter = partition.Factory(partition.PartitionKey);
        var count = 0;
        while (limiter.AttemptAcquire().IsAcquired)
        {
            count++;
            if (count > 1000)
            {
                break; // Safety valve for no-op limiters
            }
        }
        return count;
    }

    [Fact]
    public void Resolve_AnonymousRequest_IsNotRateLimited()
    {
        var partition = RateLimitPartitionResolver.Resolve(CreateContext());

        partition.PartitionKey.Should().Be("anonymous");
        CountAvailablePermits(partition).Should().BeGreaterThan(1000);
    }

    [Fact]
    public void Resolve_InteractiveUser_GetsUserPartitionWith100PerMinute()
    {
        var userId = Guid.NewGuid().ToString();
        var partition = RateLimitPartitionResolver.Resolve(CreateContext(CreatePrincipal(userId)));

        partition.PartitionKey.Should().Be(userId);
        CountAvailablePermits(partition).Should().Be(100);
    }

    [Fact]
    public void Resolve_ApiKeyRead_GetsReadPartitionWith60PerMinute()
    {
        var userId = Guid.NewGuid().ToString();
        var partition = RateLimitPartitionResolver.Resolve(CreateContext(CreatePrincipal(userId, apiKey: true)));

        partition.PartitionKey.Should().Be($"api:{userId}:read");
        CountAvailablePermits(partition).Should().Be(60);
    }

    [Theory]
    [InlineData("POST")]
    [InlineData("PUT")]
    [InlineData("PATCH")]
    [InlineData("DELETE")]
    public void Resolve_ApiKeyWrite_GetsWritePartitionWith20PerMinute(string method)
    {
        var userId = Guid.NewGuid().ToString();
        var partition = RateLimitPartitionResolver.Resolve(CreateContext(CreatePrincipal(userId, apiKey: true), method));

        partition.PartitionKey.Should().Be($"api:{userId}:write");
        CountAvailablePermits(partition).Should().Be(20);
    }

    [Fact]
    public void Resolve_ApiKeyReadAndWrite_UseSeparatePartitions()
    {
        var userId = Guid.NewGuid().ToString();
        var read = RateLimitPartitionResolver.Resolve(CreateContext(CreatePrincipal(userId, apiKey: true), "GET"));
        var write = RateLimitPartitionResolver.Resolve(CreateContext(CreatePrincipal(userId, apiKey: true), "PUT"));

        read.PartitionKey.Should().NotBe(write.PartitionKey);
    }
}
