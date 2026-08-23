using System.Security.Claims;
using System.Text.Encodings.Web;
using FluentAssertions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using TrendWeight.Features.ApiKeys;
using TrendWeight.Features.Profile.Models;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Infrastructure.Auth;
using TrendWeight.Infrastructure.DataAccess.Models;
using TrendWeight.Infrastructure.Middleware;
using Xunit;

namespace TrendWeight.Tests.Infrastructure.Auth;

public class ApiKeyAuthenticationHandlerTests
{
    private readonly Mock<IProfileService> _profileServiceMock;
    private readonly ApiKeyAuthenticationHandler _handler;
    private readonly DefaultHttpContext _context;
    private readonly Guid _userId = Guid.NewGuid();

    private const string ValidKey = "sk-0123456789abcdefghijklmno";

    public ApiKeyAuthenticationHandlerTests()
    {
        _profileServiceMock = new Mock<IProfileService>();

        var optionsMock = new Mock<IOptionsMonitor<AuthenticationSchemeOptions>>();
        optionsMock.Setup(x => x.Get(It.IsAny<string>())).Returns(new AuthenticationSchemeOptions());

        var loggerFactoryMock = new Mock<ILoggerFactory>();
        loggerFactoryMock.Setup(x => x.CreateLogger(It.IsAny<string>()))
            .Returns(Mock.Of<ILogger<ApiKeyAuthenticationHandler>>());

        var services = new ServiceCollection();
        services.AddSingleton(_profileServiceMock.Object);

        _context = new DefaultHttpContext
        {
            RequestServices = services.BuildServiceProvider()
        };

        _handler = new ApiKeyAuthenticationHandler(
            optionsMock.Object,
            loggerFactoryMock.Object,
            Mock.Of<UrlEncoder>(),
            _profileServiceMock.Object);

        var scheme = new AuthenticationScheme(
            ApiKeyAuthenticationHandler.SchemeName,
            ApiKeyAuthenticationHandler.SchemeName,
            typeof(ApiKeyAuthenticationHandler));
        _handler.InitializeAsync(scheme, _context).GetAwaiter().GetResult();
    }

    private void SetupValidKey()
    {
        var profile = new DbProfile
        {
            Uid = _userId,
            Email = "test@example.com",
            Profile = new ProfileData { ApiKeyHash = ApiKeyService.HashKey(ValidKey) },
            CreatedAt = DateTime.UtcNow.ToString("o"),
            UpdatedAt = DateTime.UtcNow.ToString("o")
        };
        _profileServiceMock.Setup(x => x.GetByApiKeyHashAsync(ApiKeyService.HashKey(ValidKey)))
            .ReturnsAsync(profile);
    }

    [Fact]
    public async Task AuthenticateAsync_WithNoHeaders_ReturnsNoResult()
    {
        var result = await _handler.AuthenticateAsync();

        result.Succeeded.Should().BeFalse();
        result.None.Should().BeTrue();
    }

    [Fact]
    public async Task AuthenticateAsync_WithBearerJwt_ReturnsNoResult()
    {
        // Clerk JWTs start with "ey" - not an API key, so the ApiKey scheme stays out of it
        _context.Request.Headers["Authorization"] = "Bearer eyJhbGciOiJSUzI1NiJ9.payload.signature";

        var result = await _handler.AuthenticateAsync();

        result.Succeeded.Should().BeFalse();
        result.None.Should().BeTrue();
        _profileServiceMock.Verify(x => x.GetByApiKeyHashAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task AuthenticateAsync_WithUnknownKey_Fails()
    {
        _context.Request.Headers["Authorization"] = "Bearer sk-unknownkey";
        _profileServiceMock.Setup(x => x.GetByApiKeyHashAsync(It.IsAny<string>()))
            .ReturnsAsync((DbProfile?)null);

        var result = await _handler.AuthenticateAsync();

        result.Succeeded.Should().BeFalse();
        result.None.Should().BeFalse();
        result.Failure!.Message.Should().Be("Invalid API key");
    }

    [Fact]
    public async Task AuthenticateAsync_WithValidBearerKey_SucceedsWithExpectedClaims()
    {
        SetupValidKey();
        _context.Request.Headers["Authorization"] = $"Bearer {ValidKey}";

        var result = await _handler.AuthenticateAsync();

        result.Succeeded.Should().BeTrue();
        var principal = result.Principal!;
        principal.FindFirst(ClaimTypes.NameIdentifier)!.Value.Should().Be(_userId.ToString());
        principal.FindFirst(ClaimTypes.Email)!.Value.Should().Be("test@example.com");
        principal.HasClaim(RateLimitPartitionResolver.ApiKeyAuthMethodClaim, RateLimitPartitionResolver.ApiKeyAuthMethodValue).Should().BeTrue();
        principal.FindFirst("provider")!.Value.Should().Be("api_key");
    }

    [Fact]
    public async Task AuthenticateAsync_WithValidXApiKeyHeader_Succeeds()
    {
        SetupValidKey();
        _context.Request.Headers[ApiKeyAuthenticationHandler.ApiKeyHeader] = ValidKey;

        var result = await _handler.AuthenticateAsync();

        result.Succeeded.Should().BeTrue();
        result.Principal!.FindFirst(ClaimTypes.NameIdentifier)!.Value.Should().Be(_userId.ToString());
    }

    [Fact]
    public async Task AuthenticateAsync_WhenLookupThrows_Fails()
    {
        _context.Request.Headers["Authorization"] = $"Bearer {ValidKey}";
        _profileServiceMock.Setup(x => x.GetByApiKeyHashAsync(It.IsAny<string>()))
            .ThrowsAsync(new InvalidOperationException("boom"));

        var result = await _handler.AuthenticateAsync();

        result.Succeeded.Should().BeFalse();
        result.Failure!.Message.Should().Be("Authentication failed");
    }
}
