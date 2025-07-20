using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using TrendWeight.Features.Common.Models;
using TrendWeight.Features.Providers.Exceptions;
using TrendWeight.Features.Providers.Fitbit;
using TrendWeight.Infrastructure.Configuration;
using TrendWeight.Tests.Fixtures;
using Xunit;

namespace TrendWeight.Tests.Features.Providers.Fitbit;

public class FitbitLinkControllerTests : TestBase
{
    private readonly Mock<IFitbitService> _fitbitServiceMock;
    private readonly Mock<IOptions<AppOptions>> _appOptionsMock;
    private readonly Mock<IConfiguration> _configurationMock;
    private readonly Mock<ILogger<FitbitLinkController>> _loggerMock;
    private readonly FitbitLinkController _sut;

    public FitbitLinkControllerTests()
    {
        _fitbitServiceMock = new Mock<IFitbitService>();
        _appOptionsMock = new Mock<IOptions<AppOptions>>();
        _configurationMock = new Mock<IConfiguration>();
        _loggerMock = new Mock<ILogger<FitbitLinkController>>();

        // Setup default app options
        var appOptions = new AppOptions
        {
            Fitbit = new FitbitConfig
            {
                ClientId = "test-fitbit-client-id",
                ClientSecret = "test-fitbit-client-secret"
            }
        };
        _appOptionsMock.Setup(x => x.Value).Returns(appOptions);

        _sut = new FitbitLinkController(
            _fitbitServiceMock.Object,
            _appOptionsMock.Object,
            _configurationMock.Object,
            _loggerMock.Object);
    }

    #region LinkFitbit Tests

    [Fact]
    public void LinkFitbit_WithValidConfiguration_ReturnsAuthorizationUrl()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var jwtSigningKey = "test-signing-key-that-is-long-enough-for-hmac-sha256-algorithm";
        var expectedAuthUrl = "https://www.fitbit.com/oauth2/authorize?client_id=test&redirect_uri=test&state=jwt-token&scope=weight";

        SetupAuthenticatedUser(userId.ToString());
        _configurationMock.Setup(x => x["Jwt:SigningKey"]).Returns(jwtSigningKey);
        _fitbitServiceMock.Setup(x => x.GetAuthorizationUrl(It.IsAny<string>(), It.IsAny<string>()))
            .Returns(expectedAuthUrl);

        // Act
        var result = _sut.LinkFitbit();

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value;

        // Use reflection to check the anonymous object properties
        var urlProperty = response!.GetType().GetProperty("url");
        urlProperty!.GetValue(response).Should().Be(expectedAuthUrl);

        // Verify JWT was created with correct callback URL
        _fitbitServiceMock.Verify(x => x.GetAuthorizationUrl(
            It.Is<string>(s => IsValidJwtWithUserData(s, userId.ToString())),
            It.Is<string>(url => url.Contains("/oauth/fitbit/callback"))), Times.Once);
    }

    [Fact]
    public void LinkFitbit_WithMissingJwtSigningKey_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString());
        _configurationMock.Setup(x => x["Jwt:SigningKey"]).Returns((string?)null);

        // Act
        var result = _sut.LinkFitbit();

        // Assert
        result.Should().BeOfType<ObjectResult>();
        var errorResult = result as ObjectResult;
        errorResult!.StatusCode.Should().Be(500);

        var errorResponse = errorResult.Value;
        var errorProperty = errorResponse!.GetType().GetProperty("error");
        errorProperty!.GetValue(errorResponse).Should().Be("JWT signing key not configured");
    }


    [Fact]
    public void LinkFitbit_UsesCorrectCallbackUrl()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var jwtSigningKey = "test-signing-key-that-is-long-enough-for-hmac-sha256-algorithm";

        _configurationMock.Setup(x => x["Jwt:SigningKey"]).Returns(jwtSigningKey);
        _fitbitServiceMock.Setup(x => x.GetAuthorizationUrl(It.IsAny<string>(), It.IsAny<string>()))
            .Returns("https://test-auth-url.com");

        // Setup authenticated user with specific scheme and host
        SetupAuthenticatedUserWithHost(userId.ToString(), "https", "api.trendweight.com");

        // Act
        _sut.LinkFitbit();

        // Assert
        _fitbitServiceMock.Verify(x => x.GetAuthorizationUrl(
            It.IsAny<string>(),
            "https://api.trendweight.com/oauth/fitbit/callback"), Times.Once);
    }

    #endregion

    #region ExchangeToken Tests

    [Fact]
    public async Task ExchangeToken_WithValidCode_ReturnsSuccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new FitbitLinkController.ExchangeTokenRequest { Code = "valid-auth-code" };

        SetupAuthenticatedUser(userId.ToString());
        _fitbitServiceMock.Setup(x => x.ExchangeAuthorizationCodeAsync(
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
        messageProperty!.GetValue(response).Should().Be("Fitbit account successfully connected");
    }

    [Fact]
    public async Task ExchangeToken_WithEmptyCode_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new FitbitLinkController.ExchangeTokenRequest { Code = "" };

        SetupAuthenticatedUser(userId.ToString());

        // Act
        var result = await _sut.ExchangeToken(request);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
        var badRequestResult = result as BadRequestObjectResult;
        var errorResponse = badRequestResult!.Value;

        var errorProperty = errorResponse!.GetType().GetProperty("error");
        errorProperty!.GetValue(errorResponse).Should().Be("Authorization code is required");
    }

    [Fact]
    public async Task ExchangeToken_WithNullCode_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new FitbitLinkController.ExchangeTokenRequest { Code = null! };

        SetupAuthenticatedUser(userId.ToString());

        // Act
        var result = await _sut.ExchangeToken(request);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
        var badRequestResult = result as BadRequestObjectResult;
        var errorResponse = badRequestResult!.Value;

        var errorProperty = errorResponse!.GetType().GetProperty("error");
        errorProperty!.GetValue(errorResponse).Should().Be("Authorization code is required");
    }

    [Fact]
    public async Task ExchangeToken_WhenExchangeFails_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new FitbitLinkController.ExchangeTokenRequest { Code = "invalid-code" };

        SetupAuthenticatedUser(userId.ToString());
        _fitbitServiceMock.Setup(x => x.ExchangeAuthorizationCodeAsync(
            request.Code,
            It.IsAny<string>(),
            userId))
            .ReturnsAsync(false);

        // Act
        var result = await _sut.ExchangeToken(request);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
        var badRequestResult = result as BadRequestObjectResult;
        var errorResponse = badRequestResult!.Value;

        var errorProperty = errorResponse!.GetType().GetProperty("error");
        errorProperty!.GetValue(errorResponse).Should().Be("Failed to complete authorization");
    }

    [Fact]
    public async Task ExchangeToken_WithProviderException_ReturnsProviderError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new FitbitLinkController.ExchangeTokenRequest { Code = "error-code" };
        var providerException = new ProviderException(
            "Invalid authorization code",
            System.Net.HttpStatusCode.BadRequest,
            ErrorCodes.InvalidCode,
            false);

        SetupAuthenticatedUser(userId.ToString());
        _fitbitServiceMock.Setup(x => x.ExchangeAuthorizationCodeAsync(
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
        var request = new FitbitLinkController.ExchangeTokenRequest { Code = "error-code" };

        SetupAuthenticatedUser(userId.ToString());
        _fitbitServiceMock.Setup(x => x.ExchangeAuthorizationCodeAsync(
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
    public async Task ExchangeToken_UsesCorrectRedirectUri()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new FitbitLinkController.ExchangeTokenRequest { Code = "test-code" };

        _fitbitServiceMock.Setup(x => x.ExchangeAuthorizationCodeAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<Guid>()))
            .ReturnsAsync(true);

        // Setup authenticated user with specific scheme and host
        SetupAuthenticatedUserWithHost(userId.ToString(), "https", "api.trendweight.com");

        // Act
        await _sut.ExchangeToken(request);

        // Assert
        _fitbitServiceMock.Verify(x => x.ExchangeAuthorizationCodeAsync(
            request.Code,
            "https://api.trendweight.com/oauth/fitbit/callback",
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
