using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using TrendWeight.Infrastructure.Middleware;
using Xunit;

namespace TrendWeight.Tests.Infrastructure.Middleware;

public class ErrorHandlingMiddlewareTests
{
    [Fact]
    public async Task UnexpectedProductionError_DoesNotExposeExceptionDetails()
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        var middleware = Create(_ => throw new InvalidOperationException("secret connection details"));

        await middleware.InvokeAsync(context);

        context.Response.StatusCode.Should().Be(500);
        context.Response.Body.Position = 0;
        var body = await new StreamReader(context.Response.Body).ReadToEndAsync(TestContext.Current.CancellationToken);
        body.Should().Contain("INTERNAL_ERROR").And.NotContain("secret connection details");
    }

    [Fact]
    public async Task ErrorAfterResponseStarted_PropagatesWithoutRewritingResponse()
    {
        var context = new DefaultHttpContext();
        var response = new Mock<IHttpResponseFeature>();
        response.SetupGet(x => x.HasStarted).Returns(true);
        context.Features.Set(response.Object);
        var error = new InvalidOperationException("stream failed");
        var middleware = Create(_ => throw error);

        var act = () => middleware.InvokeAsync(context);

        (await act.Should().ThrowAsync<InvalidOperationException>()).Which.Should().BeSameAs(error);
        response.VerifySet(x => x.StatusCode = It.IsAny<int>(), Times.Never);
    }

    [Fact]
    public async Task AbortedRequest_PropagatesCancellationWithoutWritingServerError()
    {
        var context = new DefaultHttpContext { RequestAborted = new CancellationToken(true) };
        context.Response.Body = new MemoryStream();
        var middleware = Create(_ => throw new OperationCanceledException(context.RequestAborted));

        var act = () => middleware.InvokeAsync(context);

        await act.Should().ThrowAsync<OperationCanceledException>();
        context.Response.Body.Length.Should().Be(0);
    }

    private static ErrorHandlingMiddleware Create(RequestDelegate next)
    {
        var environment = new Mock<IHostEnvironment>();
        environment.SetupGet(x => x.EnvironmentName).Returns(Environments.Production);
        return new ErrorHandlingMiddleware(next, NullLogger<ErrorHandlingMiddleware>.Instance, environment.Object);
    }
}
