using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using TrendWeight.Infrastructure.Middleware;
using TrendWeight.Tests.Fixtures;

namespace TrendWeight.Tests.Infrastructure.Middleware;

public class RequestTimingMiddlewareTests
{
    private readonly CapturingLoggerProvider _logs = new();

    [Fact]
    public async Task FailedRequest_LogsTheRedactedPathAtError()
    {
        var context = SharedDashboardRequest("/api/data/secret-sharing-token");
        var middleware = Create(_ => throw new InvalidOperationException("boom"));

        var act = () => middleware.InvokeAsync(context);

        await act.Should().ThrowAsync<InvalidOperationException>();
        var entry = _logs.Entries.Should().ContainSingle(e => e.Level == LogLevel.Error).Which;
        entry.Message.Should().Contain("GET /api/data/{sharing-token}").And.NotContain("secret-sharing-token");
    }

    [Fact]
    public async Task SlowRequest_LogsTheRedactedPathAtWarning()
    {
        var context = SharedDashboardRequest("/api/profile/secret-sharing-token");
        var middleware = Create(_ => Task.Delay(1100, TestContext.Current.CancellationToken));

        await middleware.InvokeAsync(context);

        var entry = _logs.Entries.Should().ContainSingle(e => e.Level == LogLevel.Warning).Which;
        entry.Message.Should().Contain("GET /api/profile/{sharing-token}").And.NotContain("secret-sharing-token");
    }

    [Fact]
    public async Task ClientAbort_PropagatesWithoutAnErrorLog()
    {
        var context = SharedDashboardRequest("/api/data/secret-sharing-token");
        context.RequestAborted = new CancellationToken(canceled: true);
        var middleware = Create(ctx => throw new OperationCanceledException(ctx.RequestAborted));

        var act = () => middleware.InvokeAsync(context);

        await act.Should().ThrowAsync<OperationCanceledException>();
        _logs.Entries.Should().BeEmpty();
    }

    [Fact]
    public async Task CancellationWithoutAClientAbort_IsStillLoggedAsAFailure()
    {
        var context = SharedDashboardRequest("/api/data/secret-sharing-token");
        var middleware = Create(_ => throw new OperationCanceledException("upstream timeout"));

        var act = () => middleware.InvokeAsync(context);

        await act.Should().ThrowAsync<OperationCanceledException>();
        _logs.Entries.Should().ContainSingle(e => e.Level == LogLevel.Error);
    }

    [Fact]
    public async Task FastSuccessfulRequest_LogsNothing()
    {
        var context = SharedDashboardRequest("/api/profile/secret-sharing-token");
        var middleware = Create(_ => Task.CompletedTask);

        await middleware.InvokeAsync(context);

        _logs.Entries.Should().BeEmpty();
    }

    private static DefaultHttpContext SharedDashboardRequest(string path)
    {
        var context = new DefaultHttpContext();
        context.Request.Method = "GET";
        context.Request.Path = path;
        return context;
    }

    private RequestTimingMiddleware Create(RequestDelegate next) =>
        new(next, _logs.CreateLogger<RequestTimingMiddleware>());
}
