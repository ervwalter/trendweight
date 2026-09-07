using TrendWeight.Infrastructure.Configuration;
using TrendWeight.Features.Providers;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using TrendWeight.Features.Common.Models;
using TrendWeight.Features.Providers.Exceptions;
using TrendWeight.Features.Providers.Withings;
using Xunit;

namespace TrendWeight.Tests.Features.Providers.Withings;

public class WithingsLinkControllerTests
{
    private readonly Mock<IWithingsService> _withingsServiceMock;
    private const string SigningKey = "test-signing-key-that-is-long-enough-for-hmac-sha256-algorithm";
    private readonly Mock<IConfiguration> _configurationMock;
    private readonly Mock<ILogger<WithingsLinkController>> _loggerMock;
    private readonly WithingsLinkController _sut;

    public WithingsLinkControllerTests()
    {
        _withingsServiceMock = new Mock<IWithingsService>();
        _configurationMock = new Mock<IConfiguration>();
        _configurationMock.Setup(x => x["Jwt:SigningKey"]).Returns(SigningKey);
        _loggerMock = new Mock<ILogger<WithingsLinkController>>();

        _sut = new WithingsLinkController(
            _withingsServiceMock.Object,
            _configurationMock.Object,
            _loggerMock.Object,
            new PublicUrl("https://canonical.example", false));
    }

    [Theory]
    [InlineData("")]
    [InlineData("malformed-state")]
    public async Task ExchangeToken_WithInvalidState_DoesNotExchangeCode(string state)
    {
        SetupAuthenticatedUser(Guid.NewGuid().ToString());
        var result = await _sut.ExchangeToken(new WithingsLinkController.ExchangeTokenRequest
        {
            Code = "attacker-code",
            State = state
        });

        result.Should().BeOfType<BadRequestObjectResult>();
        _withingsServiceMock.Verify(x => x.ExchangeAuthorizationCodeAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Guid>()), Times.Never);
    }

    // The error middleware maps UnauthorizedAccessException to 401; a FormatException would be a 500
    [Fact]
    public async Task ExchangeToken_WithNonGuidIdentityClaim_ThrowsUnauthorizedBeforeValidatingState()
    {
        SetupAuthenticatedUser("not-a-guid");
        var request = new WithingsLinkController.ExchangeTokenRequest { Code = "test-code", State = "irrelevant" };

        var act = () => _sut.ExchangeToken(request);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
        _withingsServiceMock.Verify(x => x.ExchangeAuthorizationCodeAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Guid>()), Times.Never);
    }

    #region GetAuthorizationUrl Tests

    [Fact]
    public void GetAuthorizationUrl_WithValidConfiguration_ReturnsAuthorizationData()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var jwtSigningKey = "test-signing-key-that-is-long-enough-for-hmac-sha256-algorithm";
        var expectedAuthUrl = "https://account.withings.com/oauth2/authorize?client_id=test&redirect_uri=test&state=jwt-token&scope=user.metrics";

        SetupAuthenticatedUser(userId.ToString());
        _configurationMock.Setup(x => x["Jwt:SigningKey"]).Returns(jwtSigningKey);
        _withingsServiceMock.Setup(x => x.GetAuthorizationUrl(It.IsAny<string>(), It.IsAny<string>()))
            .Returns(expectedAuthUrl);

        // Act
        var result = _sut.GetAuthorizationUrl();

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value;

        // Use reflection to check the anonymous object properties
        var authUrlProperty = response!.GetType().GetProperty("authorizationUrl");
        authUrlProperty!.GetValue(response).Should().Be(expectedAuthUrl);

        // The signed state is carried only in the authorization URL, never echoed unsigned
        response.GetType().GetProperty("state").Should().BeNull();

        // Verify JWT was created with correct state
        _withingsServiceMock.Verify(x => x.GetAuthorizationUrl(
            It.Is<string>(s => IsValidJwtWithUserData(s, userId.ToString())),
            It.Is<string>(url => url.Contains("/oauth/withings/callback"))), Times.Once);
    }

    [Fact]
    public void GetAuthorizationUrl_WithMissingJwtSigningKey_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString());
        _configurationMock.Setup(x => x["Jwt:SigningKey"]).Returns((string?)null);

        // Act
        var result = _sut.GetAuthorizationUrl();

        // Assert
        result.Should().BeOfType<ObjectResult>();
        var errorResult = result as ObjectResult;
        errorResult!.StatusCode.Should().Be(500);

        errorResult.Value.Should().BeOfType<ApiErrorResponse>()
            .Which.Error.Should().Be("JWT signing key not configured");
    }

    [Fact]
    public void GetAuthorizationUrl_WhenServiceThrowsException_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var jwtSigningKey = "test-signing-key-that-is-long-enough-for-hmac-sha256-algorithm";

        SetupAuthenticatedUser(userId.ToString());
        _configurationMock.Setup(x => x["Jwt:SigningKey"]).Returns(jwtSigningKey);
        _withingsServiceMock.Setup(x => x.GetAuthorizationUrl(It.IsAny<string>(), It.IsAny<string>()))
            .Throws(new Exception("Withings service error"));

        // Act
        var result = _sut.GetAuthorizationUrl();

        // Assert
        result.Should().BeOfType<ObjectResult>();
        var errorResult = result as ObjectResult;
        errorResult!.StatusCode.Should().Be(500);

        errorResult.Value.Should().BeOfType<ApiErrorResponse>()
            .Which.Error.Should().Be("Internal server error");
    }

    [Fact]
    public void GetAuthorizationUrl_IgnoresRequestOriginForCallbackUrl()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var jwtSigningKey = "test-signing-key-that-is-long-enough-for-hmac-sha256-algorithm";

        _configurationMock.Setup(x => x["Jwt:SigningKey"]).Returns(jwtSigningKey);
        _withingsServiceMock.Setup(x => x.GetAuthorizationUrl(It.IsAny<string>(), It.IsAny<string>()))
            .Returns("https://test-auth-url.com");

        // Setup authenticated user with specific scheme and host
        SetupAuthenticatedUserWithHost(userId.ToString(), "https", "example.com");

        // Act
        _sut.GetAuthorizationUrl();

        // Assert
        _withingsServiceMock.Verify(x => x.GetAuthorizationUrl(
            It.IsAny<string>(),
            "https://canonical.example/oauth/withings/callback"), Times.Once);
    }

    #endregion

    #region ExchangeToken Tests

    [Fact]
    public async Task ExchangeToken_WithValidCode_ReturnsSuccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new WithingsLinkController.ExchangeTokenRequest { Code = "valid-auth-code", State = OAuthStateToken.Create(SigningKey, userId.ToString(), "withings") };

        SetupAuthenticatedUser(userId.ToString());
        _withingsServiceMock.Setup(x => x.ExchangeAuthorizationCodeAsync(
            request.Code,
            It.IsAny<string>(),
            userId))
            .ReturnsAsync(true);

        // Act
        var result = await _sut.ExchangeToken(request);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value;

        var successProperty = response!.GetType().GetProperty("success");
        var messageProperty = response.GetType().GetProperty("message");

        successProperty!.GetValue(response).Should().Be(true);
        messageProperty!.GetValue(response).Should().Be("Withings account successfully connected");
    }

    [Fact]
    public async Task ExchangeToken_WithEmptyCode_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new WithingsLinkController.ExchangeTokenRequest { Code = "", State = OAuthStateToken.Create(SigningKey, userId.ToString(), "withings") };

        SetupAuthenticatedUser(userId.ToString());

        // Act
        var result = await _sut.ExchangeToken(request);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
        var badRequestResult = result as BadRequestObjectResult;
        badRequestResult!.Value.Should().BeOfType<ApiErrorResponse>()
            .Which.Error.Should().Be("Authorization code is required");
    }

    [Fact]
    public async Task ExchangeToken_WithNullCode_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new WithingsLinkController.ExchangeTokenRequest { Code = null!, State = OAuthStateToken.Create(SigningKey, userId.ToString(), "withings") };

        SetupAuthenticatedUser(userId.ToString());

        // Act
        var result = await _sut.ExchangeToken(request);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
        var badRequestResult = result as BadRequestObjectResult;
        badRequestResult!.Value.Should().BeOfType<ApiErrorResponse>()
            .Which.Error.Should().Be("Authorization code is required");
    }

    [Fact]
    public async Task ExchangeToken_WhenExchangeFails_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new WithingsLinkController.ExchangeTokenRequest { Code = "invalid-code", State = OAuthStateToken.Create(SigningKey, userId.ToString(), "withings") };

        SetupAuthenticatedUser(userId.ToString());
        _withingsServiceMock.Setup(x => x.ExchangeAuthorizationCodeAsync(
            request.Code,
            It.IsAny<string>(),
            userId))
            .ReturnsAsync(false);

        // Act
        var result = await _sut.ExchangeToken(request);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
        var badRequestResult = result as BadRequestObjectResult;
        badRequestResult!.Value.Should().BeOfType<ApiErrorResponse>()
            .Which.Error.Should().Be("Failed to complete authorization");
    }

    [Fact]
    public async Task ExchangeToken_WithProviderException_ReturnsProviderError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new WithingsLinkController.ExchangeTokenRequest { Code = "error-code", State = OAuthStateToken.Create(SigningKey, userId.ToString(), "withings") };
        var providerException = new ProviderException(
            "Invalid authorization code",
            System.Net.HttpStatusCode.BadRequest,
            ErrorCodes.InvalidCode,
            false);

        SetupAuthenticatedUser(userId.ToString());
        _withingsServiceMock.Setup(x => x.ExchangeAuthorizationCodeAsync(
            request.Code,
            It.IsAny<string>(),
            userId))
            .ThrowsAsync(providerException);

        // Act
        var result = await _sut.ExchangeToken(request);

        // Assert
        result.Should().BeOfType<ObjectResult>();
        var errorResult = result as ObjectResult;
        errorResult!.StatusCode.Should().Be(400);

        var apiErrorResponse = errorResult.Value.Should().BeOfType<ApiErrorResponse>().Subject;
        apiErrorResponse.Error.Should().Be("Invalid authorization code");
        apiErrorResponse.ErrorCode.Should().Be(ErrorCodes.InvalidCode);
        apiErrorResponse.IsRetryable.Should().Be(false);
    }

    [Fact]
    public async Task ExchangeToken_WithGenericException_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new WithingsLinkController.ExchangeTokenRequest { Code = "error-code", State = OAuthStateToken.Create(SigningKey, userId.ToString(), "withings") };

        SetupAuthenticatedUser(userId.ToString());
        _withingsServiceMock.Setup(x => x.ExchangeAuthorizationCodeAsync(
            request.Code,
            It.IsAny<string>(),
            userId))
            .ThrowsAsync(new Exception("Unexpected database error"));

        // Act
        var result = await _sut.ExchangeToken(request);

        // Assert
        result.Should().BeOfType<ObjectResult>();
        var errorResult = result as ObjectResult;
        errorResult!.StatusCode.Should().Be(500);

        var apiErrorResponse = errorResult.Value.Should().BeOfType<ApiErrorResponse>().Subject;
        apiErrorResponse.Error.Should().Be("An unexpected error occurred. Please try again.");
        apiErrorResponse.ErrorCode.Should().Be(ErrorCodes.UnexpectedError);
        apiErrorResponse.IsRetryable.Should().Be(false);
    }

    [Fact]
    public async Task ExchangeToken_IgnoresRequestOriginForRedirectUri()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new WithingsLinkController.ExchangeTokenRequest { Code = "test-code", State = OAuthStateToken.Create(SigningKey, userId.ToString(), "withings") };

        _withingsServiceMock.Setup(x => x.ExchangeAuthorizationCodeAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<Guid>()))
            .ReturnsAsync(true);

        // Setup authenticated user with specific scheme and host
        SetupAuthenticatedUserWithHost(userId.ToString(), "https", "app.trendweight.com");

        // Act
        await _sut.ExchangeToken(request);

        // Assert
        _withingsServiceMock.Verify(x => x.ExchangeAuthorizationCodeAsync(
            request.Code,
            "https://canonical.example/oauth/withings/callback",
            userId), Times.Once);
    }

    #endregion

    #region Helper Methods

    private void SetupAuthenticatedUser(string userId)
    {
        SetupAuthenticatedUserWithHost(userId, "https", "localhost");
    }

    private void SetupAuthenticatedUserWithHost(string userId, string scheme, string host)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId),
            new(ClaimTypes.Email, "test@example.com")
        };

        var identity = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);

        var httpContext = new DefaultHttpContext { User = principal };
        httpContext.Request.Headers["X-Forwarded-Host"] = "attacker.example";
        httpContext.Request.Headers["X-Forwarded-Proto"] = "http";
        httpContext.Request.Scheme = scheme;
        httpContext.Request.Host = new HostString(host);

        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };
    }

    private bool IsValidJwtWithUserData(string jwt, string expectedUserId)
    {
        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.ReadJwtToken(jwt);

            var uidClaim = token.Claims.FirstOrDefault(c => c.Type == "uid");
            var reasonClaim = token.Claims.FirstOrDefault(c => c.Type == "reason");

            return uidClaim?.Value == expectedUserId && reasonClaim?.Value == "link";
        }
        catch
        {
            return false;
        }
    }

    #endregion
}
