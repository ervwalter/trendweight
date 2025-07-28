using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Moq;
using Moq.Protected;
using TrendWeight.Infrastructure.Auth;
using TrendWeight.Infrastructure.Configuration;
using Xunit;

namespace TrendWeight.Tests.Infrastructure.Auth;

public class ClerkTokenServiceTests
{
    private readonly Mock<IHttpClientFactory> _httpClientFactoryMock;
    private readonly Mock<ILogger<ClerkTokenService>> _loggerMock;
    private readonly Mock<HttpMessageHandler> _httpMessageHandlerMock;
    private readonly HttpClient _httpClient;
    private readonly IOptions<AppOptions> _options;
    private readonly string _testAuthority = "https://test.clerk.accounts.dev";
    private readonly string _testJwksUrl;
    private readonly string _testSigningKey = "test-signing-key-that-is-long-enough-for-hs256";

    public ClerkTokenServiceTests()
    {
        _httpClientFactoryMock = new Mock<IHttpClientFactory>();
        _loggerMock = new Mock<ILogger<ClerkTokenService>>();
        _httpMessageHandlerMock = new Mock<HttpMessageHandler>();
        _httpClient = new HttpClient(_httpMessageHandlerMock.Object);
        _testJwksUrl = $"{_testAuthority}/.well-known/jwks.json";

        _options = Options.Create(new AppOptions
        {
            Clerk = new ClerkConfig
            {
                Authority = _testAuthority,
                SecretKey = "test-secret"
            }
        });

        _httpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>()))
            .Returns(_httpClient);
    }

    [Fact]
    public async Task ValidateTokenAsync_WithValidToken_ReturnsClaimsPrincipal()
    {
        // Arrange
        var jwks = CreateTestJwks();
        SetupHttpResponse(jwks);

        var token = CreateTestToken(
            issuer: _testAuthority,
            audience: null,
            claims: new[]
            {
                new Claim("sub", "user_123"),
                new Claim("email", "test@example.com"),
                new Claim("azp", "https://example.com")
            });

        var service = new ClerkTokenService(_httpClientFactoryMock.Object, _loggerMock.Object, _options);

        // Act
        var principal = await service.ValidateTokenAsync(token);

        // Assert
        Assert.NotNull(principal);
        // JWT handler maps 'sub' claim to ClaimTypes.NameIdentifier
        var nameIdentifier = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var sub = principal.FindFirst("sub")?.Value;
        Assert.True(nameIdentifier == "user_123" || sub == "user_123",
            $"Expected user_123 but got NameIdentifier: {nameIdentifier}, sub: {sub}");

        // JWT handler maps 'email' claim to ClaimTypes.Email
        var emailClaim = principal.FindFirst(ClaimTypes.Email)?.Value;
        var email = principal.FindFirst("email")?.Value;
        Assert.True(emailClaim == "test@example.com" || email == "test@example.com",
            $"Expected test@example.com but got Email: {emailClaim}, email: {email}");
    }

    [Fact]
    public async Task ValidateTokenAsync_WithInvalidIssuer_ReturnsNull()
    {
        // Arrange
        var jwks = CreateTestJwks();
        SetupHttpResponse(jwks);

        var token = CreateTestToken(
            issuer: "https://wrong.issuer.com",
            audience: null,
            claims: new[]
            {
                new Claim("sub", "user_123"),
                new Claim("email", "test@example.com")
            });

        var service = new ClerkTokenService(_httpClientFactoryMock.Object, _loggerMock.Object, _options);

        // Act
        var principal = await service.ValidateTokenAsync(token);

        // Assert
        Assert.Null(principal);
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Failed to validate Clerk JWT token")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task ValidateTokenAsync_WithExpiredToken_ReturnsNull()
    {
        // Arrange
        var jwks = CreateTestJwks();
        SetupHttpResponse(jwks);

        var token = CreateExpiredTestToken(
            issuer: _testAuthority,
            audience: null,
            claims: new[]
            {
                new Claim("sub", "user_123"),
                new Claim("email", "test@example.com")
            });

        var service = new ClerkTokenService(_httpClientFactoryMock.Object, _loggerMock.Object, _options);

        // Act
        var principal = await service.ValidateTokenAsync(token);

        // Assert
        Assert.Null(principal);
    }

    [Fact]
    public async Task ValidateTokenAsync_WithRequestOrigin_ValidatesAzpClaim()
    {
        // Arrange
        var jwks = CreateTestJwks();
        SetupHttpResponse(jwks);

        var requestOrigin = "https://example.com";
        var token = CreateTestToken(
            issuer: _testAuthority,
            audience: null,
            claims: new[]
            {
                new Claim("sub", "user_123"),
                new Claim("email", "test@example.com"),
                new Claim("azp", requestOrigin)
            });

        var service = new ClerkTokenService(_httpClientFactoryMock.Object, _loggerMock.Object, _options);

        // Act
        var principal = await service.ValidateTokenAsync(token, requestOrigin);

        // Assert
        Assert.NotNull(principal);
    }

    [Fact]
    public async Task ValidateTokenAsync_WithMismatchedAzp_ReturnsNull()
    {
        // Arrange
        var jwks = CreateTestJwks();
        SetupHttpResponse(jwks);

        var token = CreateTestToken(
            issuer: _testAuthority,
            audience: null,
            claims: new[]
            {
                new Claim("sub", "user_123"),
                new Claim("email", "test@example.com"),
                new Claim("azp", "https://wrong-origin.com")
            });

        var service = new ClerkTokenService(_httpClientFactoryMock.Object, _loggerMock.Object, _options);

        // Act
        var principal = await service.ValidateTokenAsync(token, "https://example.com");

        // Assert
        Assert.Null(principal);
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("does not match request origin")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task ValidateTokenAsync_CachesJwks()
    {
        // Arrange
        var jwks = CreateTestJwks();
        SetupHttpResponse(jwks);

        var token = CreateTestToken(
            issuer: _testAuthority,
            audience: null,
            claims: new[]
            {
                new Claim("sub", "user_123"),
                new Claim("email", "test@example.com")
            });

        var service = new ClerkTokenService(_httpClientFactoryMock.Object, _loggerMock.Object, _options);

        // Act
        var principal1 = await service.ValidateTokenAsync(token);
        var principal2 = await service.ValidateTokenAsync(token);

        // Assert
        Assert.NotNull(principal1);
        Assert.NotNull(principal2);

        // Verify HTTP call was made only once due to caching
        _httpMessageHandlerMock.Protected().Verify(
            "SendAsync",
            Times.Once(),
            ItExpr.IsAny<HttpRequestMessage>(),
            ItExpr.IsAny<CancellationToken>()
        );
    }

    [Fact]
    public void GetClerkUserId_ExtractsUserIdFromClaims()
    {
        // Arrange
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, "user_123"),
            new Claim("sub", "user_456")
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims));
        var service = new ClerkTokenService(_httpClientFactoryMock.Object, _loggerMock.Object, _options);

        // Act
        var userId = service.GetClerkUserId(principal);

        // Assert
        Assert.Equal("user_123", userId); // ClaimTypes.NameIdentifier takes precedence
    }

    [Fact]
    public void GetClerkUserId_FallsBackToSubClaim()
    {
        // Arrange
        var claims = new List<Claim>
        {
            new Claim("sub", "user_456")
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims));
        var service = new ClerkTokenService(_httpClientFactoryMock.Object, _loggerMock.Object, _options);

        // Act
        var userId = service.GetClerkUserId(principal);

        // Assert
        Assert.Equal("user_456", userId);
    }

    [Fact]
    public void GetEmail_ExtractsEmailFromClaims()
    {
        // Arrange
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.Email, "test@example.com"),
            new Claim("email", "other@example.com")
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims));
        var service = new ClerkTokenService(_httpClientFactoryMock.Object, _loggerMock.Object, _options);

        // Act
        var email = service.GetEmail(principal);

        // Assert
        Assert.Equal("test@example.com", email); // ClaimTypes.Email takes precedence
    }

    private void SetupHttpResponse(string content)
    {
        var response = new HttpResponseMessage
        {
            StatusCode = System.Net.HttpStatusCode.OK,
            Content = new StringContent(content)
        };

        _httpMessageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(req => req.RequestUri!.ToString() == _testJwksUrl),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(response);
    }

    private string CreateTestJwks()
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_testSigningKey));
        var jwk = JsonWebKeyConverter.ConvertFromSecurityKey(key);
        jwk.Kid = "test-key-id";
        jwk.Use = "sig";

        return $$"""
        {
            "keys": [
                {
                    "kid": "{{jwk.Kid}}",
                    "kty": "{{jwk.Kty}}",
                    "use": "{{jwk.Use}}",
                    "k": "{{jwk.K}}"
                }
            ]
        }
        """;
    }

    private string CreateTestToken(string issuer, string? audience, Claim[] claims, DateTime? expires = null)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_testSigningKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = expires ?? DateTime.UtcNow.AddHours(1),
            NotBefore = DateTime.UtcNow.AddMinutes(-5), // Ensure token is valid now
            Issuer = issuer,
            Audience = audience,
            SigningCredentials = creds
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    private string CreateExpiredTestToken(string issuer, string? audience, Claim[] claims)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_testSigningKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddHours(-1), // Expired
            NotBefore = DateTime.UtcNow.AddHours(-2), // Valid from 2 hours ago
            Issuer = issuer,
            Audience = audience,
            SigningCredentials = creds
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }
}
