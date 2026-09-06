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
    }
}
