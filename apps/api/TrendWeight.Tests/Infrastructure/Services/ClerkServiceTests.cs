using System.Net;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using TrendWeight.Infrastructure.Configuration;
using TrendWeight.Infrastructure.Services;

namespace TrendWeight.Tests.Infrastructure.Services;

public class ClerkServiceTests
{
    private readonly Mock<HttpMessageHandler> _handler = new();
    private HttpRequestMessage? _sent;

    [Theory]
    [InlineData(HttpStatusCode.OK, true)]
    [InlineData(HttpStatusCode.NoContent, true)]
    [InlineData(HttpStatusCode.NotFound, true)]
    [InlineData(HttpStatusCode.Unauthorized, false)]
    [InlineData(HttpStatusCode.TooManyRequests, false)]
    [InlineData(HttpStatusCode.InternalServerError, false)]
    public async Task DeleteUserAsync_ReportsSuccessOnlyWhenTheUserIsGone(HttpStatusCode status, bool expected)
    {
        // 404 counts as success: the user no longer exists either way.
        Respond(status);

        var result = await Create().DeleteUserAsync("user_123");

        result.Should().Be(expected);
        _sent!.Method.Should().Be(HttpMethod.Delete);
        _sent.RequestUri!.AbsoluteUri.Should().Be("https://api.clerk.com/v1/users/user_123");
        _sent.Headers.Authorization!.Scheme.Should().Be("Bearer");
    }

    [Fact]
    public async Task DeleteUserAsync_EscapesTheUserIdInThePath()
    {
        Respond(HttpStatusCode.OK);

        await Create().DeleteUserAsync("user 123/other");

        _sent!.RequestUri!.AbsoluteUri.Should().Be("https://api.clerk.com/v1/users/user%20123%2Fother");
    }

    [Fact]
    public async Task DeleteUserAsync_ReportsFailureWhenTheRequestThrows()
    {
        _handler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("connection refused"));

        var result = await Create().DeleteUserAsync("user_123");

        result.Should().BeFalse();
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public void Constructor_RequiresTheSecretKey(string? secretKey)
    {
        var act = () => Create(secretKey!);

        act.Should().Throw<InvalidOperationException>().WithMessage("Clerk:SecretKey*");
    }

    private void Respond(HttpStatusCode status)
    {
        _handler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .Returns((HttpRequestMessage request, CancellationToken _) =>
            {
                _sent = request;
                return Task.FromResult(new HttpResponseMessage(status) { Content = new StringContent("{}") });
            });
    }

    private ClerkService Create(string secretKey = "sk_test_synthetic") =>
        new(new HttpClient(_handler.Object), NullLogger<ClerkService>.Instance,
            Options.Create(new AppOptions { Clerk = new ClerkConfig { Authority = "https://test.clerk.accounts.dev", SecretKey = secretKey } }));
}
