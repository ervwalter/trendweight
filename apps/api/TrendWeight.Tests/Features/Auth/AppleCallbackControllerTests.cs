using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Primitives;
using TrendWeight.Features.Auth;
using TrendWeight.Tests.Fixtures;
using Xunit;

namespace TrendWeight.Tests.Features.Auth;

public class AppleCallbackControllerTests : TestBase
{
    private readonly AppleCallbackController _sut;

    public AppleCallbackControllerTests()
    {
        _sut = new AppleCallbackController();
    }

    #region Callback Tests

    [Fact]
    public void Callback_WithFormData_RedirectsToFrontendWithQueryString()
    {
        // Arrange
        var formData = new Dictionary<string, StringValues>
        {
            { "code", "auth-code-123" },
            { "state", "state-token-456" },
            { "user", "{\"name\":{\"firstName\":\"John\",\"lastName\":\"Doe\"},\"email\":\"john@example.com\"}" }
        };

        SetupHttpContextWithFormData("https", "api.trendweight.com", formData);

        // Act
        var result = _sut.Callback();

        // Assert
        result.Should().BeOfType<RedirectResult>();
        var redirectResult = result as RedirectResult;

        var expectedUrl = "https://api.trendweight.com/auth/apple/callback?code=auth-code-123&state=state-token-456&user=%7B%22name%22%3A%7B%22firstName%22%3A%22John%22%2C%22lastName%22%3A%22Doe%22%7D%2C%22email%22%3A%22john%40example.com%22%7D";
        redirectResult!.Url.Should().Be(expectedUrl);
    }

    [Fact]
    public void Callback_WithEmptyFormData_RedirectsToFrontendWithEmptyQueryString()
    {
        // Arrange
        var formData = new Dictionary<string, StringValues>();
        SetupHttpContextWithFormData("https", "localhost", formData);

        // Act
        var result = _sut.Callback();

        // Assert
        result.Should().BeOfType<RedirectResult>();
        var redirectResult = result as RedirectResult;

        redirectResult!.Url.Should().Be("https://localhost/auth/apple/callback?");
    }

    [Fact]
    public void Callback_WithSingleFormField_RedirectsToFrontendWithCorrectQueryString()
    {
        // Arrange
        var formData = new Dictionary<string, StringValues>
        {
            { "error", "access_denied" }
        };

        SetupHttpContextWithFormData("http", "localhost:3000", formData);

        // Act
        var result = _sut.Callback();

        // Assert
        result.Should().BeOfType<RedirectResult>();
        var redirectResult = result as RedirectResult;

        redirectResult!.Url.Should().Be("http://localhost:3000/auth/apple/callback?error=access_denied");
    }

    [Fact]
    public void Callback_WithSpecialCharactersInFormData_ProperlyEncodesQueryString()
    {
        // Arrange
        var formData = new Dictionary<string, StringValues>
        {
            { "test_key", "value with spaces & symbols!" },
            { "another", "special=chars&more=data" }
        };

        SetupHttpContextWithFormData("https", "app.example.com", formData);

        // Act
        var result = _sut.Callback();

        // Assert
        result.Should().BeOfType<RedirectResult>();
        var redirectResult = result as RedirectResult;

        var expectedUrl = "https://app.example.com/auth/apple/callback?test_key=value%20with%20spaces%20%26%20symbols%21&another=special%3Dchars%26more%3Ddata";
        redirectResult!.Url.Should().Be(expectedUrl);
    }

    [Fact]
    public void Callback_WithMultipleValuesForSameKey_HandlesCorrectly()
    {
        // Arrange
        var formData = new Dictionary<string, StringValues>
        {
            { "scopes", new StringValues(new[] { "read", "write", "admin" }) },
            { "code", "test-code" }
        };

        SetupHttpContextWithFormData("https", "test.com", formData);

        // Act
        var result = _sut.Callback();

        // Assert
        result.Should().BeOfType<RedirectResult>();
        var redirectResult = result as RedirectResult;

        // The StringValues.ToString() method will join multiple values with commas
        var expectedUrl = "https://test.com/auth/apple/callback?scopes=read%2Cwrite%2Cadmin&code=test-code";
        redirectResult!.Url.Should().Be(expectedUrl);
    }

    [Fact]
    public void Callback_UsesRequestSchemeAndHost()
    {
        // Arrange
        var formData = new Dictionary<string, StringValues>
        {
            { "test", "value" }
        };

        SetupHttpContextWithFormData("http", "dev.local:8080", formData);

        // Act
        var result = _sut.Callback();

        // Assert
        result.Should().BeOfType<RedirectResult>();
        var redirectResult = result as RedirectResult;

        redirectResult!.Url.Should().StartWith("http://dev.local:8080/auth/apple/callback");
    }

    #endregion

    #region Helper Methods

    private void SetupHttpContextWithFormData(string scheme, string host, Dictionary<string, StringValues> formData)
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Scheme = scheme;
        httpContext.Request.Host = new HostString(host);

        // Create form collection from dictionary
        var formCollection = new FormCollection(formData);
        httpContext.Request.Form = formCollection;

        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };
    }

    #endregion
}
