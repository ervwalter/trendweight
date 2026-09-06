using System.Net;
using System.Security.Claims;
using System.Threading.RateLimiting;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using TrendWeight.Infrastructure.Middleware;
using Xunit;

namespace TrendWeight.Tests.Infrastructure.Middleware;

public class RateLimitPartitionResolverTests
{
    private static HttpContext CreateContext(ClaimsPrincipal? user = null, string method = "GET", string path = "/api/measurements", string? peer = null)
    {
        var context = new DefaultHttpContext();
        context.Request.Method = method;
        context.Request.Path = path;
        if (user != null)
        {
            context.User = user;
        }
        if (peer != null)
        {
            context.Connection.RemoteIpAddress = IPAddress.Parse(peer);
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

    [Theory]
    [InlineData("/dashboard")]
    [InlineData("/api-docs")]
    [InlineData("/openapi/v1.json")]
    public void Resolve_AnonymousNonApiRequest_IsNotRateLimited(string path)
    {
        var partition = RateLimitPartitionResolver.Resolve(CreateContext(path: path, peer: "203.0.113.10"));

        partition.PartitionKey.Should().Be("anonymous");
        CountAvailablePermits(partition).Should().BeGreaterThan(1000);
    }

    [Theory]
    [InlineData("/api/profile/some-sharing-code")]
    [InlineData("/api/v1/settings")]
    [InlineData("/API/data/some-sharing-code")]
    public void Resolve_AnonymousApiRequest_GetsPeerPartitionWith300PerMinute(string path)
    {
        var partition = RateLimitPartitionResolver.Resolve(CreateContext(path: path, peer: "203.0.113.10"));

        partition.PartitionKey.Should().Be("anonymous:203.0.113.10");
        CountAvailablePermits(partition).Should().Be(300);
    }

    [Fact]
    public void Resolve_AnonymousApiRequests_FromDifferentPeers_UseSeparatePartitions()
    {
        var first = RateLimitPartitionResolver.Resolve(CreateContext(path: "/api/v1/settings", peer: "203.0.113.10"));
        var second = RateLimitPartitionResolver.Resolve(CreateContext(path: "/api/v1/settings", peer: "203.0.113.11"));

        first.PartitionKey.Should().NotBe(second.PartitionKey);
    }

    [Fact]
    public void Resolve_AnonymousApiRequest_WithoutPeerAddress_IsStillLimited()
    {
        var partition = RateLimitPartitionResolver.Resolve(CreateContext(path: "/api/v1/settings"));

        partition.PartitionKey.Should().Be("anonymous:unknown");
        CountAvailablePermits(partition).Should().Be(300);
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
