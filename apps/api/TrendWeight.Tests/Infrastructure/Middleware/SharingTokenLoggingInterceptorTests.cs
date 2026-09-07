using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpLogging;
using TrendWeight.Infrastructure.Middleware;

namespace TrendWeight.Tests.Infrastructure.Middleware;

public class SharingTokenLoggingInterceptorTests
{
    private const HttpLoggingFields PathAndMethod = HttpLoggingFields.RequestPath | HttpLoggingFields.RequestMethod;

    private readonly SharingTokenLoggingInterceptor _sut = new();

    [Theory]
    [InlineData("/api/data/secret-code", "/api/data/{sharing-token}")]
    [InlineData("/api/profile/secret-code", "/api/profile/{sharing-token}")]
    [InlineData("/api/providers/links/secret-code", "/api/providers/links/{sharing-token}")]
    public async Task OnRequestAsync_ReplacesTheLoggedPathWithItsRedactedForm(string path, string expected)
    {
        var context = CreateContext(path, PathAndMethod);

        await _sut.OnRequestAsync(context);

        context.LoggingFields.Should().Be(HttpLoggingFields.RequestMethod, "the built-in path field is disabled so the raw path is never written");
        context.Parameters.Should().Contain(new KeyValuePair<string, object?>("Path", expected));
        context.Parameters.Should().Contain(new KeyValuePair<string, object?>("PathBase", string.Empty));
        context.Parameters.Select(parameter => parameter.Value?.ToString() ?? string.Empty).Should().AllSatisfy(value => value.Should().NotContain("secret-code"));
    }

    [Fact]
    public async Task OnRequestAsync_LogsThePathBaseAlongsideTheRedactedPath()
    {
        var context = CreateContext("/api/data/secret-code", PathAndMethod, pathBase: "/app");

        await _sut.OnRequestAsync(context);

        context.Parameters.Should().Contain(new KeyValuePair<string, object?>("PathBase", "/app"));
        context.Parameters.Should().Contain(new KeyValuePair<string, object?>("Path", "/api/data/" + LogSafePath.Placeholder));
    }

    [Fact]
    public async Task OnRequestAsync_WhenThePathIsNotLogged_LeavesTheContextUntouched()
    {
        var context = CreateContext("/api/data/secret-code", HttpLoggingFields.RequestMethod);

        await _sut.OnRequestAsync(context);

        context.LoggingFields.Should().Be(HttpLoggingFields.RequestMethod);
        context.Parameters.Should().BeEmpty();
    }

    [Fact]
    public async Task OnRequestAsync_LogsAPathWithoutATokenAsIs()
    {
        var context = CreateContext("/api/health", PathAndMethod);

        await _sut.OnRequestAsync(context);

        context.LoggingFields.Should().Be(HttpLoggingFields.RequestMethod);
        context.Parameters.Should().Contain(new KeyValuePair<string, object?>("Path", "/api/health"));
    }

    [Fact]
    public async Task OnResponseAsync_AddsNothing()
    {
        var context = CreateContext("/api/data/secret-code", PathAndMethod);

        await _sut.OnResponseAsync(context);

        context.LoggingFields.Should().Be(PathAndMethod);
        context.Parameters.Should().BeEmpty();
    }

    private static HttpLoggingInterceptorContext CreateContext(string path, HttpLoggingFields fields, string pathBase = "")
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Method = "GET";
        httpContext.Request.PathBase = pathBase;
        httpContext.Request.Path = path;

        return new HttpLoggingInterceptorContext
        {
            HttpContext = httpContext,
            LoggingFields = fields
        };
    }
}
