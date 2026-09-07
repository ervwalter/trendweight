using System.Globalization;
using System.Threading.RateLimiting;
using FluentAssertions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using TrendWeight.Infrastructure.Auth;
using TrendWeight.Infrastructure.Middleware;

namespace TrendWeight.Tests.Infrastructure.Middleware;

public sealed class RateLimitedAuthorizationResultHandlerTests : IDisposable
{
    private static readonly AuthorizationPolicy ApiKeyPolicy = new AuthorizationPolicyBuilder(ApiKeyAuthenticationHandler.SchemeName)
        .RequireAuthenticatedUser()
        .Build();

    private readonly Mock<IAuthenticationService> _authentication = new();
    private readonly PartitionedRateLimiter<HttpContext> _limiter;
    private readonly RateLimitedAuthorizationResultHandler _sut;
    private int _nextCalls;

    public RateLimitedAuthorizationResultHandlerTests()
    {
        // One real partition with a single permit per window, so every acquisition
        // is counted for real rather than mocked.
        _limiter = PartitionedRateLimiter.Create<HttpContext, string>(_ => RateLimitPartition.GetFixedWindowLimiter(
            "anonymous:peer",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 1,
                Window = TimeSpan.FromMinutes(1),
                AutoReplenishment = false
            }));
        _sut = new RateLimitedAuthorizationResultHandler(Options.Create(new RateLimiterOptions { GlobalLimiter = _limiter }));
    }

    public void Dispose() => _limiter.Dispose();

    [Fact]
    public async Task HandleAsync_WhenAuthorized_InvokesNextWithoutConsumingAPermit()
    {
        var context = CreateContext();

        await _sut.HandleAsync(Next, context, ApiKeyPolicy, PolicyAuthorizationResult.Success());

        _nextCalls.Should().Be(1);
        AvailablePermits(context).Should().Be(1);
        _authentication.Verify(a => a.ChallengeAsync(It.IsAny<HttpContext>(), It.IsAny<string?>(), It.IsAny<AuthenticationProperties?>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_WhenChallengedWithPermitsAvailable_IssuesTheSchemeChallengeAndChargesThePartition()
    {
        var context = CreateContext();

        await _sut.HandleAsync(Next, context, ApiKeyPolicy, PolicyAuthorizationResult.Challenge());

        _authentication.Verify(a => a.ChallengeAsync(context, ApiKeyAuthenticationHandler.SchemeName, null), Times.Once);
        _nextCalls.Should().Be(0);
        context.Response.StatusCode.Should().NotBe(StatusCodes.Status429TooManyRequests);
        AvailablePermits(context).Should().Be(0);
    }

    [Fact]
    public async Task HandleAsync_WhenChallengedAndThePartitionIsExhausted_Answers429WithRetryAfter()
    {
        var first = CreateContext();
        var second = CreateContext();

        await _sut.HandleAsync(Next, first, ApiKeyPolicy, PolicyAuthorizationResult.Challenge());
        await _sut.HandleAsync(Next, second, ApiKeyPolicy, PolicyAuthorizationResult.Challenge());

        second.Response.StatusCode.Should().Be(StatusCodes.Status429TooManyRequests);
        var retryAfter = int.Parse(second.Response.Headers.RetryAfter.ToString(), CultureInfo.InvariantCulture);
        retryAfter.Should().BeInRange(1, 60);
        second.Response.ContentType.Should().Be("application/json");
        (await ReadBodyAsync(second)).Should().Contain("\"errorCode\":\"RATE_LIMITED\"");
        _authentication.Verify(a => a.ChallengeAsync(It.IsAny<HttpContext>(), It.IsAny<string?>(), It.IsAny<AuthenticationProperties?>()), Times.Once);
        _nextCalls.Should().Be(0);
    }

    [Fact]
    public async Task HandleAsync_WhenForbidden_ForbidsWithoutConsumingAPermit()
    {
        var context = CreateContext();

        await _sut.HandleAsync(Next, context, ApiKeyPolicy, PolicyAuthorizationResult.Forbid());

        _authentication.Verify(a => a.ForbidAsync(context, ApiKeyAuthenticationHandler.SchemeName, null), Times.Once);
        _nextCalls.Should().Be(0);
        AvailablePermits(context).Should().Be(1);
    }

    [Fact]
    public async Task HandleAsync_WithoutAGlobalLimiter_ChallengesEveryTimeLikeTheDefaultHandler()
    {
        var sut = new RateLimitedAuthorizationResultHandler(Options.Create(new RateLimiterOptions()));
        var contexts = Enumerable.Range(0, 3).Select(_ => CreateContext()).ToList();

        foreach (var context in contexts)
        {
            await sut.HandleAsync(Next, context, ApiKeyPolicy, PolicyAuthorizationResult.Challenge());
        }

        _authentication.Verify(a => a.ChallengeAsync(It.IsAny<HttpContext>(), ApiKeyAuthenticationHandler.SchemeName, null), Times.Exactly(3));
        contexts.Should().AllSatisfy(context => context.Response.StatusCode.Should().NotBe(StatusCodes.Status429TooManyRequests));
        _nextCalls.Should().Be(0);
    }

    private HttpContext CreateContext()
    {
        var services = new ServiceCollection()
            .AddSingleton(_authentication.Object)
            .BuildServiceProvider();
        var context = new DefaultHttpContext { RequestServices = services };
        context.Request.Path = "/api/v1/measurements";
        context.Response.Body = new MemoryStream();
        return context;
    }

    private Task Next(HttpContext context)
    {
        _nextCalls++;
        return Task.CompletedTask;
    }

    private long AvailablePermits(HttpContext context) =>
        _limiter.GetStatistics(context)!.CurrentAvailablePermits;

    private static async Task<string> ReadBodyAsync(HttpContext context)
    {
        context.Response.Body.Position = 0;
        return await new StreamReader(context.Response.Body).ReadToEndAsync(TestContext.Current.CancellationToken);
    }
}
