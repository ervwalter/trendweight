using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using TrendWeight.Infrastructure.Auth;
using TrendWeight.Infrastructure.Configuration;
using TrendWeight.Tests.Fixtures;
using Xunit;

namespace TrendWeight.Tests.Infrastructure.Auth;

public class SupabaseTokenServiceTests : TestBase
{
    private readonly Mock<IOptions<AppOptions>> _appOptionsMock;
    private readonly Mock<ILogger<SupabaseTokenService>> _loggerMock;
    private readonly SupabaseTokenService _sut;
    private readonly string _jwtSecret = "test-jwt-secret-that-is-long-enough-for-hmac-sha256-algorithm";
    private readonly string _supabaseUrl = "https://test.supabase.co";

    public SupabaseTokenServiceTests()
    {
        _appOptionsMock = new Mock<IOptions<AppOptions>>();
        _loggerMock = new Mock<ILogger<SupabaseTokenService>>();

        var appOptions = new AppOptions
        {
            Supabase = new SupabaseConfig
            {
                JwtSecret = _jwtSecret,
                Url = _supabaseUrl,
                ServiceKey = "test-service-key"
            }
        };

        _appOptionsMock.Setup(x => x.Value).Returns(appOptions);
        _sut = new SupabaseTokenService(_appOptionsMock.Object, _loggerMock.Object);
    }

    [Fact]
    public void ValidateTokenAndExtractClaims_WithValidToken_MapsClaimsCorrectly()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var email = "test@example.com";
        var token = GenerateValidJwtToken(userId, email, "authenticated");

        // Act
        var result = _sut.ValidateTokenAndExtractClaims(token);

        // Assert
        result.IsValid.Should().BeTrue();
        result.Principal.Should().NotBeNull();
        result.ErrorMessage.Should().BeNull();

        // Verify our custom claim mapping logic
        var claims = result.Principal!.Claims.ToList();

        // Should have both NameIdentifier and supabase:uid with same value
        claims.Should().Contain(c => c.Type == ClaimTypes.NameIdentifier && c.Value == userId.ToString());
        claims.Should().Contain(c => c.Type == "supabase:uid" && c.Value == userId.ToString());

        // Should have email claim
        claims.Should().Contain(c => c.Type == ClaimTypes.Email && c.Value == email);

        // Should have role claim
        claims.Should().Contain(c => c.Type == ClaimTypes.Role && c.Value == "authenticated");

        // Should preserve original claims
        claims.Should().Contain(c => c.Type == "sub" && c.Value == userId.ToString());
        claims.Should().Contain(c => c.Type == "email" && c.Value == email);
        claims.Should().Contain(c => c.Type == "role" && c.Value == "authenticated");
    }

    [Fact]
    public void ValidateTokenAndExtractClaims_WithTokenMissingSubClaim_StillCreatesValidPrincipal()
    {
        // Arrange
        var email = "test@example.com";
        var token = GenerateTokenWithoutSubClaim(email);

        // Act
        var result = _sut.ValidateTokenAndExtractClaims(token);

        // Assert
        result.IsValid.Should().BeTrue();
        result.Principal.Should().NotBeNull();

        var claims = result.Principal!.Claims.ToList();

        // Should NOT have NameIdentifier or supabase:uid since sub was missing
        claims.Should().NotContain(c => c.Type == ClaimTypes.NameIdentifier);
        claims.Should().NotContain(c => c.Type == "supabase:uid");

        // Should still have email claim
        claims.Should().Contain(c => c.Type == ClaimTypes.Email && c.Value == email);
    }

    [Fact]
    public void ValidateTokenAndExtractClaims_WithCustomClaims_PreservesAllClaims()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var email = "test@example.com";
        var customClaims = new[]
        {
            new Claim("custom_claim", "custom_value"),
            new Claim("app_metadata", "{\"provider\":\"email\"}"),
            new Claim("user_metadata", "{\"full_name\":\"Test User\"}")
        };
        var token = GenerateTokenWithCustomClaims(userId, email, customClaims);

        // Act
        var result = _sut.ValidateTokenAndExtractClaims(token);

        // Assert
        result.IsValid.Should().BeTrue();

        var claims = result.Principal!.Claims.ToList();

        // Verify all custom claims are preserved
        foreach (var customClaim in customClaims)
        {
            claims.Should().Contain(c => c.Type == customClaim.Type && c.Value == customClaim.Value);
        }
    }

    [Fact]
    public void ValidateTokenAndExtractClaims_WithExpiredToken_ReturnsExpiredError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var email = "test@example.com";
        var token = GenerateExpiredToken(userId, email);

        // Act
        var result = _sut.ValidateTokenAndExtractClaims(token);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Principal.Should().BeNull();
        result.ErrorMessage.Should().Be("Token has expired");
    }

    [Fact]
    public void ValidateTokenAndExtractClaims_WithInvalidSignature_ReturnsValidationError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var email = "test@example.com";
        var token = GenerateTokenWithInvalidSignature(userId, email);

        // Act
        var result = _sut.ValidateTokenAndExtractClaims(token);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Principal.Should().BeNull();
        result.ErrorMessage.Should().Be("Token validation failed");

        // Verify warning was logged
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Token validation failed")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public void ValidateTokenAndExtractClaims_WithInvalidIssuer_ReturnsValidationError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var email = "test@example.com";
        var token = GenerateTokenWithInvalidIssuer(userId, email);

        // Act
        var result = _sut.ValidateTokenAndExtractClaims(token);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Principal.Should().BeNull();
        result.ErrorMessage.Should().Be("Token validation failed");
    }

    [Fact]
    public void ValidateTokenAndExtractClaims_WithInvalidAudience_ReturnsValidationError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var email = "test@example.com";
        var token = GenerateTokenWithInvalidAudience(userId, email);

        // Act
        var result = _sut.ValidateTokenAndExtractClaims(token);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Principal.Should().BeNull();
        result.ErrorMessage.Should().Be("Token validation failed");
    }

    [Fact]
    public void ValidateTokenAndExtractClaims_WithMalformedToken_ReturnsError()
    {
        // Arrange
        var token = "not-a-valid-jwt-token";

        // Act
        var result = _sut.ValidateTokenAndExtractClaims(token);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Principal.Should().BeNull();
        result.ErrorMessage.Should().Be("An error occurred during token validation");

        // Verify error was logged
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Unexpected error during token validation")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public void ValidateTokenAndExtractClaims_WithDuplicateClaims_DoesNotDuplicate()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var email = "test@example.com";

        // Create a token that somehow has duplicate claims
        var duplicateClaims = new[]
        {
            new Claim("sub", userId.ToString()),
            new Claim("email", email),
            new Claim("role", "authenticated"),
            new Claim("custom", "value1"),
            new Claim("custom", "value2") // Same type, different value
        };
        var token = GenerateTokenWithSpecificClaims(duplicateClaims);

        // Act
        var result = _sut.ValidateTokenAndExtractClaims(token);

        // Assert
        result.IsValid.Should().BeTrue();

        var claims = result.Principal!.Claims.ToList();

        // Our mapped claims should exist only once
        claims.Count(c => c.Type == ClaimTypes.NameIdentifier).Should().Be(1);
        claims.Count(c => c.Type == "supabase:uid").Should().Be(1);
        claims.Count(c => c.Type == ClaimTypes.Email).Should().Be(1);
        claims.Count(c => c.Type == ClaimTypes.Role).Should().Be(1);

        // The custom duplicate claims should only have one instance because our logic doesn't add duplicates
        claims.Count(c => c.Type == "custom").Should().Be(1);
    }

    #region Helper Methods

    private string GenerateValidJwtToken(Guid userId, string email, string role)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_jwtSecret);
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim("sub", userId.ToString()),
                new Claim("email", email),
                new Claim("role", role),
                new Claim("aud", "authenticated")
            }),
            Expires = DateTime.UtcNow.AddHours(1),
            Issuer = $"{_supabaseUrl}/auth/v1",
            Audience = "authenticated",
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    private string GenerateTokenWithoutSubClaim(string email)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_jwtSecret);
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim("email", email),
                new Claim("role", "authenticated")
            }),
            Expires = DateTime.UtcNow.AddHours(1),
            Issuer = $"{_supabaseUrl}/auth/v1",
            Audience = "authenticated",
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    private string GenerateTokenWithCustomClaims(Guid userId, string email, Claim[] customClaims)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_jwtSecret);

        var claims = new List<Claim>
        {
            new Claim("sub", userId.ToString()),
            new Claim("email", email),
            new Claim("role", "authenticated")
        };
        claims.AddRange(customClaims);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddHours(1),
            Issuer = $"{_supabaseUrl}/auth/v1",
            Audience = "authenticated",
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    private string GenerateTokenWithSpecificClaims(Claim[] claims)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_jwtSecret);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddHours(1),
            Issuer = $"{_supabaseUrl}/auth/v1",
            Audience = "authenticated",
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    private string GenerateExpiredToken(Guid userId, string email)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_jwtSecret);
        var now = DateTime.UtcNow;

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim("sub", userId.ToString()),
                new Claim("email", email),
                new Claim("role", "authenticated")
            }),
            NotBefore = now.AddHours(-2),
            Expires = now.AddHours(-1),
            IssuedAt = now.AddHours(-2),
            Issuer = $"{_supabaseUrl}/auth/v1",
            Audience = "authenticated",
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    private string GenerateTokenWithInvalidSignature(Guid userId, string email)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var wrongKey = Encoding.UTF8.GetBytes("wrong-secret-key-that-is-long-enough-for-hmac-sha256");
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim("sub", userId.ToString()),
                new Claim("email", email),
                new Claim("role", "authenticated")
            }),
            Expires = DateTime.UtcNow.AddHours(1),
            Issuer = $"{_supabaseUrl}/auth/v1",
            Audience = "authenticated",
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(wrongKey),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    private string GenerateTokenWithInvalidIssuer(Guid userId, string email)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_jwtSecret);
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim("sub", userId.ToString()),
                new Claim("email", email),
                new Claim("role", "authenticated")
            }),
            Expires = DateTime.UtcNow.AddHours(1),
            Issuer = "https://wrong-issuer.com",
            Audience = "authenticated",
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    private string GenerateTokenWithInvalidAudience(Guid userId, string email)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_jwtSecret);
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim("sub", userId.ToString()),
                new Claim("email", email),
                new Claim("role", "authenticated")
            }),
            Expires = DateTime.UtcNow.AddHours(1),
            Issuer = $"{_supabaseUrl}/auth/v1",
            Audience = "wrong-audience",
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    #endregion
}
