using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TrendWeight.Features.Common;
using TrendWeight.Tests.Fixtures;
using Xunit;

namespace TrendWeight.Tests.Features.Common;

public class BaseAuthControllerTests : TestBase
{
    private readonly TestAuthController _sut;

    public BaseAuthControllerTests()
    {
        _sut = new TestAuthController();
    }

    [Fact]
    public void UserId_WithValidNameIdentifierClaim_ReturnsUserId()
    {
        // Arrange
        var expectedUserId = Guid.NewGuid().ToString();
        SetupAuthenticatedUser(expectedUserId);

        // Act
        var userId = _sut.GetUserId();

        // Assert
        userId.Should().Be(expectedUserId);
    }

    [Fact]
    public void UserId_WithNoNameIdentifierClaim_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        SetupAuthenticatedUserWithNoClaims();

        // Act
        var act = () => _sut.GetUserId();

        // Assert
        act.Should().Throw<UnauthorizedAccessException>()
            .WithMessage("User ID not found");
    }

    [Fact]
    public void UserEmail_WithValidEmailClaim_ReturnsEmail()
    {
        // Arrange
        var expectedEmail = "test@example.com";
        SetupAuthenticatedUserWithEmail(expectedEmail);

        // Act
        var email = _sut.GetUserEmail();

        // Assert
        email.Should().Be(expectedEmail);
    }

    [Fact]
    public void UserEmail_WithNoEmailClaim_ReturnsNull()
    {
        // Arrange
        SetupAuthenticatedUser(Guid.NewGuid().ToString());

        // Act
        var email = _sut.GetUserEmail();

        // Assert
        email.Should().BeNull();
    }

    [Fact]
    public void GetClaim_WithExistingClaim_ReturnsClaimValue()
    {
        // Arrange
        var customClaimType = "custom_claim";
        var customClaimValue = "custom_value";
        SetupAuthenticatedUserWithCustomClaim(customClaimType, customClaimValue);

        // Act
        var claimValue = _sut.TestGetClaim(customClaimType);

        // Assert
        claimValue.Should().Be(customClaimValue);
    }

    [Fact]
    public void GetClaim_WithNonExistingClaim_ReturnsNull()
    {
        // Arrange
        SetupAuthenticatedUser(Guid.NewGuid().ToString());

        // Act
        var claimValue = _sut.TestGetClaim("non_existing_claim");

        // Assert
        claimValue.Should().BeNull();
    }

    [Fact]
    public void HasClaim_WithExistingClaim_ReturnsTrue()
    {
        // Arrange
        var customClaimType = "custom_claim";
        SetupAuthenticatedUserWithCustomClaim(customClaimType, "value");

        // Act
        var hasClaim = _sut.TestHasClaim(customClaimType);

        // Assert
        hasClaim.Should().BeTrue();
    }

    [Fact]
    public void HasClaim_WithNonExistingClaim_ReturnsFalse()
    {
        // Arrange
        SetupAuthenticatedUser(Guid.NewGuid().ToString());

        // Act
        var hasClaim = _sut.TestHasClaim("non_existing_claim");

        // Assert
        hasClaim.Should().BeFalse();
    }

    [Fact]
    public void AuthorizeAttribute_IsAppliedToBaseClass()
    {
        // Assert
        typeof(BaseAuthController).Should().BeDecoratedWith<Microsoft.AspNetCore.Authorization.AuthorizeAttribute>();
    }

    [Fact]
    public void ApiControllerAttribute_IsAppliedToBaseClass()
    {
        // Assert
        typeof(BaseAuthController).Should().BeDecoratedWith<ApiControllerAttribute>();
    }

    [Fact]
    public void RouteAttribute_IsAppliedToBaseClass()
    {
        // Assert
        typeof(BaseAuthController).Should().BeDecoratedWith<RouteAttribute>(
            attr => attr.Template == "api/[controller]");
    }

    #region Helper Methods

    private void SetupAuthenticatedUser(string userId)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId)
        };

        var identity = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);

        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };
    }

    private void SetupAuthenticatedUserWithEmail(string email)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new(ClaimTypes.Email, email)
        };

        var identity = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);

        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };
    }

    private void SetupAuthenticatedUserWithCustomClaim(string claimType, string claimValue)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new(claimType, claimValue)
        };

        var identity = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);

        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };
    }

    private void SetupAuthenticatedUserWithNoClaims()
    {
        var identity = new ClaimsIdentity(new List<Claim>(), "Test");
        var principal = new ClaimsPrincipal(identity);

        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };
    }

    #endregion

    // Test controller to expose protected members
    private class TestAuthController : BaseAuthController
    {
        public string GetUserId() => UserId;
        public string? GetUserEmail() => UserEmail;
        public string? TestGetClaim(string claimType) => GetClaim(claimType);
        public bool TestHasClaim(string claimType) => HasClaim(claimType);
    }
}
