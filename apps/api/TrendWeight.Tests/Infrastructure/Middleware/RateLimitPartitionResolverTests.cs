using System.Net;
using System.Security.Claims;
using System.Threading.RateLimiting;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using TrendWeight.Infrastructure.Configuration;
using TrendWeight.Infrastructure.Middleware;
using Xunit;

namespace TrendWeight.Tests.Infrastructure.Middleware;

public class RateLimitPartitionResolverTests
{
    private static readonly RateLimitingConfig NoHeaders = new();
    private static readonly RateLimitingConfig IngressHeaders = new() { ClientAddressHeaders = "do-connecting-ip;cf-connecting-ip" };

    private static HttpContext CreateContext(
        ClaimsPrincipal? user = null,
        string method = "GET",
        string path = "/api/measurements",
        string? peer = null,
        IDictionary<string, string>? headers = null)
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
        if (headers != null)
        {
            foreach (var (name, value) in headers)
            {
                context.Request.Headers[name] = value;
            }
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
        var partition = RateLimitPartitionResolver.Resolve(CreateContext(path: path, peer: "203.0.113.10"), NoHeaders);

        partition.PartitionKey.Should().Be("anonymous");
        CountAvailablePermits(partition).Should().BeGreaterThan(1000);
    }

    [Theory]
    [InlineData("/api/profile/some-sharing-code")]
    [InlineData("/api/v1/settings")]
    [InlineData("/API/data/some-sharing-code")]
    public void Resolve_AnonymousApiRequest_GetsPeerPartitionWith60PerMinute(string path)
    {
        var partition = RateLimitPartitionResolver.Resolve(CreateContext(path: path, peer: "203.0.113.10"), NoHeaders);

        partition.PartitionKey.Should().Be("anonymous:203.0.113.10");
        CountAvailablePermits(partition).Should().Be(60);
    }

    [Fact]
    public void Resolve_AnonymousApiRequests_FromDifferentPeers_UseSeparatePartitions()
    {
        var first = RateLimitPartitionResolver.Resolve(CreateContext(path: "/api/v1/settings", peer: "203.0.113.10"), NoHeaders);
        var second = RateLimitPartitionResolver.Resolve(CreateContext(path: "/api/v1/settings", peer: "203.0.113.11"), NoHeaders);

        first.PartitionKey.Should().NotBe(second.PartitionKey);
    }

    [Fact]
    public void Resolve_AnonymousApiRequest_WithoutPeerAddress_IsStillLimited()
    {
        var partition = RateLimitPartitionResolver.Resolve(CreateContext(path: "/api/v1/settings"), NoHeaders);

        partition.PartitionKey.Should().Be("anonymous:unknown");
        CountAvailablePermits(partition).Should().Be(60);
    }

    [Fact]
    public void Resolve_AnonymousApiRequest_IgnoresClientAddressHeadersUnlessConfigured()
    {
        var context = CreateContext(path: "/api/v1/settings", peer: "10.0.0.5",
            headers: new Dictionary<string, string> { ["do-connecting-ip"] = "203.0.113.10" });

        var partition = RateLimitPartitionResolver.Resolve(context, NoHeaders);

        partition.PartitionKey.Should().Be("anonymous:10.0.0.5");
    }

    [Fact]
    public void Resolve_AnonymousApiRequest_UsesConfiguredClientAddressHeader()
    {
        var context = CreateContext(path: "/api/v1/settings", peer: "10.0.0.5",
            headers: new Dictionary<string, string> { ["DO-Connecting-IP"] = "203.0.113.10" });

        var partition = RateLimitPartitionResolver.Resolve(context, IngressHeaders);

        partition.PartitionKey.Should().Be("anonymous:203.0.113.10");
        CountAvailablePermits(partition).Should().Be(60);
    }

    [Fact]
    public void ResolveClientAddress_PrefersHeadersInConfiguredOrder()
    {
        var context = CreateContext(path: "/api/v1/settings", peer: "10.0.0.5", headers: new Dictionary<string, string>
        {
            ["cf-connecting-ip"] = "198.51.100.7",
            ["do-connecting-ip"] = "203.0.113.10"
        });

        RateLimitPartitionResolver.ResolveClientAddress(context, IngressHeaders).Should().Be("203.0.113.10");
    }

    [Fact]
    public void ResolveClientAddress_FallsThroughUnparseableHeaderValues()
    {
        var context = CreateContext(path: "/api/v1/settings", peer: "10.0.0.5", headers: new Dictionary<string, string>
        {
            ["do-connecting-ip"] = "not-an-address",
            ["cf-connecting-ip"] = "198.51.100.7"
        });

        RateLimitPartitionResolver.ResolveClientAddress(context, IngressHeaders).Should().Be("198.51.100.7");
    }

    [Fact]
    public void ResolveClientAddress_FallsBackToPeerWhenNoHeaderIsUsable()
    {
        var context = CreateContext(path: "/api/v1/settings", peer: "10.0.0.5",
            headers: new Dictionary<string, string> { ["do-connecting-ip"] = "" });

        RateLimitPartitionResolver.ResolveClientAddress(context, IngressHeaders).Should().Be("10.0.0.5");
    }

    [Fact]
    public void ResolveClientAddress_TakesTheFirstAddressOfAChain()
    {
        var context = CreateContext(path: "/api/v1/settings", peer: "10.0.0.5",
            headers: new Dictionary<string, string> { ["do-connecting-ip"] = "203.0.113.10, 198.51.100.7" });

        RateLimitPartitionResolver.ResolveClientAddress(context, IngressHeaders).Should().Be("203.0.113.10");
    }

    [Fact]
    public void ResolveClientAddress_NormalizesIPv6()
    {
        var context = CreateContext(path: "/api/v1/settings", peer: "10.0.0.5",
            headers: new Dictionary<string, string> { ["do-connecting-ip"] = "2001:DB8:0:0:0:0:0:1" });

        RateLimitPartitionResolver.ResolveClientAddress(context, IngressHeaders).Should().Be("2001:db8::1");
    }

    [Fact]
    public void ResolveAnonymousCeiling_AnonymousApiRequests_ShareOne300PerMinuteBucket()
    {
        var first = RateLimitPartitionResolver.ResolveAnonymousCeiling(CreateContext(path: "/api/v1/settings", peer: "203.0.113.10"));
        var second = RateLimitPartitionResolver.ResolveAnonymousCeiling(CreateContext(path: "/api/profile/code", peer: "203.0.113.11"));

        first.PartitionKey.Should().Be(RateLimitPartitionResolver.AnonymousCeilingPartitionKey);
        second.PartitionKey.Should().Be(first.PartitionKey);
        CountAvailablePermits(first).Should().Be(300);
    }

    [Fact]
    public void ResolveAnonymousCeiling_AuthenticatedRequest_IsNotLimited()
    {
        var partition = RateLimitPartitionResolver.ResolveAnonymousCeiling(CreateContext(CreatePrincipal(Guid.NewGuid().ToString())));

        partition.PartitionKey.Should().Be("unlimited");
        CountAvailablePermits(partition).Should().BeGreaterThan(1000);
    }

    [Fact]
    public void ResolveAnonymousCeiling_AnonymousNonApiRequest_IsNotLimited()
    {
        var partition = RateLimitPartitionResolver.ResolveAnonymousCeiling(CreateContext(path: "/dashboard", peer: "203.0.113.10"));

        partition.PartitionKey.Should().Be("unlimited");
        CountAvailablePermits(partition).Should().BeGreaterThan(1000);
    }

    [Fact]
    public void Resolve_InteractiveUser_GetsUserPartitionWith100PerMinute()
    {
        var userId = Guid.NewGuid().ToString();
        var partition = RateLimitPartitionResolver.Resolve(CreateContext(CreatePrincipal(userId)), NoHeaders);

        partition.PartitionKey.Should().Be(userId);
        CountAvailablePermits(partition).Should().Be(100);
    }

    [Fact]
    public void Resolve_ApiKeyRead_GetsReadPartitionWith60PerMinute()
    {
        var userId = Guid.NewGuid().ToString();
        var partition = RateLimitPartitionResolver.Resolve(CreateContext(CreatePrincipal(userId, apiKey: true)), NoHeaders);

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
        var partition = RateLimitPartitionResolver.Resolve(CreateContext(CreatePrincipal(userId, apiKey: true), method), NoHeaders);

        partition.PartitionKey.Should().Be($"api:{userId}:write");
        CountAvailablePermits(partition).Should().Be(20);
    }

    [Fact]
    public void Resolve_ApiKeyReadAndWrite_UseSeparatePartitions()
    {
        var userId = Guid.NewGuid().ToString();
        var read = RateLimitPartitionResolver.Resolve(CreateContext(CreatePrincipal(userId, apiKey: true), "GET"), NoHeaders);
        var write = RateLimitPartitionResolver.Resolve(CreateContext(CreatePrincipal(userId, apiKey: true), "PUT"), NoHeaders);

        read.PartitionKey.Should().NotBe(write.PartitionKey);
    }

    [Fact]
    public void RateLimitingConfig_ParsesHeaderListWithTrimmingAndEmptyEntries()
    {
        var config = new RateLimitingConfig { ClientAddressHeaders = " do-connecting-ip ; ;cf-connecting-ip" };

        config.ClientAddressHeaderNames.Should().Equal("do-connecting-ip", "cf-connecting-ip");
        new RateLimitingConfig().ClientAddressHeaderNames.Should().BeEmpty();
    }
}
