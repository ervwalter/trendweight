using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using System.Security.Claims;
using TrendWeight.Features.Measurements;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Features.Providers;
using TrendWeight.Features.Providers.Models;
using TrendWeight.Infrastructure.DataAccess.Models;
using TrendWeight.Features.Profile.Models;
using TrendWeight.Common.Models;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Tests.Fixtures;
using Xunit;

namespace TrendWeight.Tests.Features.Measurements.Controllers;

public class DataRefreshControllerTests : TestBase
{
    private readonly Mock<IProfileService> _profileServiceMock;
    private readonly Mock<IProviderIntegrationService> _providerIntegrationServiceMock;
    private readonly Mock<ISourceDataService> _sourceDataServiceMock;
    private readonly Mock<ILogger<DataRefreshController>> _loggerMock;
    private readonly DataRefreshController _sut;

    public DataRefreshControllerTests()
    {
        _profileServiceMock = new Mock<IProfileService>();
        _providerIntegrationServiceMock = new Mock<IProviderIntegrationService>();
        _sourceDataServiceMock = new Mock<ISourceDataService>();
        _loggerMock = new Mock<ILogger<DataRefreshController>>();

        _sut = new DataRefreshController(
            _profileServiceMock.Object,
            _providerIntegrationServiceMock.Object,
            _sourceDataServiceMock.Object,
            _loggerMock.Object);
    }

    #region RefreshData Tests

    [Fact]
    public async Task RefreshData_WithValidUserAndProviders_RefreshesAllProviders()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestProfile(userId);
        var activeProviders = new List<string> { "withings", "fitbit" };
        var syncResults = new Dictionary<string, bool>
        {
            { "withings", true },
            { "fitbit", true }
        };

        SetupAuthenticatedUser(userId.ToString());
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId.ToString())).ReturnsAsync(user);
        _providerIntegrationServiceMock.Setup(x => x.GetActiveProvidersAsync(userId))
            .ReturnsAsync(activeProviders);
        _sourceDataServiceMock.Setup(x => x.IsResyncRequestedAsync(userId, It.IsAny<string>()))
            .ReturnsAsync(false);
        _providerIntegrationServiceMock.Setup(x => x.SyncAllProvidersAsync(userId, user.Profile.UseMetric))
            .ReturnsAsync(syncResults);

        // Act
        var result = await _sut.RefreshData();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<DataRefreshResponse>().Subject;

        response.Message.Should().Be("Data refresh completed");
        response.Providers.Should().HaveCount(2);
        response.Providers["withings"].Success.Should().Be(true);
        response.Providers["withings"].Synced.Should().Be(true);
        response.Providers["fitbit"].Success.Should().Be(true);
        response.Providers["fitbit"].Synced.Should().Be(true);
    }

    [Fact]
    public async Task RefreshData_WithNoUserIdClaim_ReturnsUnauthorized()
    {
        // Arrange
        SetupAuthenticatedUser(null);

        // Act
        var result = await _sut.RefreshData();

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("User ID not found in token");
    }

    [Fact]
    public async Task RefreshData_WhenUserNotFound_ReturnsNotFound()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString());
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId.ToString())).ReturnsAsync((DbProfile?)null);

        // Act
        var result = await _sut.RefreshData();

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("User not found");
    }

    [Fact]
    public async Task RefreshData_WithNoActiveProviders_ReturnsEmptyProvidersMessage()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestProfile(userId);

        SetupAuthenticatedUser(userId.ToString());
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId.ToString())).ReturnsAsync(user);
        _providerIntegrationServiceMock.Setup(x => x.GetActiveProvidersAsync(userId))
            .ReturnsAsync(new List<string>());

        // Act
        var result = await _sut.RefreshData();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<DataRefreshResponse>().Subject;

        response.Message.Should().Be("No active provider connections found");
        response.Providers.Should().BeEmpty();
    }

    [Fact]
    public async Task RefreshData_WhenProviderNeedsResync_ClearsDataBeforeSync()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestProfile(userId);
        var activeProviders = new List<string> { "withings", "fitbit" };
        var syncResults = new Dictionary<string, bool>
        {
            { "withings", true },
            { "fitbit", true }
        };

        SetupAuthenticatedUser(userId.ToString());
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId.ToString())).ReturnsAsync(user);
        _providerIntegrationServiceMock.Setup(x => x.GetActiveProvidersAsync(userId))
            .ReturnsAsync(activeProviders);

        // Only withings needs resync
        _sourceDataServiceMock.Setup(x => x.IsResyncRequestedAsync(userId, "withings"))
            .ReturnsAsync(true);
        _sourceDataServiceMock.Setup(x => x.IsResyncRequestedAsync(userId, "fitbit"))
            .ReturnsAsync(false);

        _providerIntegrationServiceMock.Setup(x => x.SyncAllProvidersAsync(userId, user.Profile.UseMetric))
            .ReturnsAsync(syncResults);

        // Act
        var result = await _sut.RefreshData();

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        _sourceDataServiceMock.Verify(x => x.ClearSourceDataAsync(userId, "withings"), Times.Once);
        _sourceDataServiceMock.Verify(x => x.ClearSourceDataAsync(userId, "fitbit"), Times.Never);
    }

    [Fact]
    public async Task RefreshData_WhenSyncFails_ReturnsPartialSuccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestProfile(userId);
        var activeProviders = new List<string> { "withings", "fitbit" };
        var syncResults = new Dictionary<string, bool>
        {
            { "withings", true },
            { "fitbit", false } // Fitbit failed
        };

        SetupAuthenticatedUser(userId.ToString());
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId.ToString())).ReturnsAsync(user);
        _providerIntegrationServiceMock.Setup(x => x.GetActiveProvidersAsync(userId))
            .ReturnsAsync(activeProviders);
        _sourceDataServiceMock.Setup(x => x.IsResyncRequestedAsync(userId, It.IsAny<string>()))
            .ReturnsAsync(false);
        _providerIntegrationServiceMock.Setup(x => x.SyncAllProvidersAsync(userId, user.Profile.UseMetric))
            .ReturnsAsync(syncResults);

        // Act
        var result = await _sut.RefreshData();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<DataRefreshResponse>().Subject;

        response.Providers["withings"].Success.Should().Be(true);
        response.Providers["fitbit"].Success.Should().Be(false);
    }

    [Fact]
    public async Task RefreshData_WhenExceptionThrown_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString());
        _profileServiceMock.Setup(x => x.GetByIdAsync(It.IsAny<string>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.RefreshData();

        // Assert
        result.Result.Should().BeOfType<ObjectResult>()
            .Which.StatusCode.Should().Be(500);
        var errorResult = result.Result as ObjectResult;
        errorResult!.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("Internal server error");
    }

    #endregion

    #region RefreshProviderData Tests

    [Fact]
    public async Task RefreshProviderData_WithValidUserAndProvider_RefreshesProvider()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestProfile(userId);
        var provider = "withings";
        var providerService = new Mock<IProviderService>();

        SetupAuthenticatedUser(userId.ToString());
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId.ToString())).ReturnsAsync(user);
        _providerIntegrationServiceMock.Setup(x => x.GetProviderService(provider))
            .Returns(providerService.Object);
        providerService.Setup(x => x.HasActiveProviderLinkAsync(userId))
            .ReturnsAsync(true);
        providerService.Setup(x => x.SyncMeasurementsAsync(userId, user.Profile.UseMetric))
            .ReturnsAsync(new ProviderSyncResult { Provider = provider, Success = true });

        // Act
        var result = await _sut.RefreshProviderData(provider);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ProviderOperationResponse>().Subject;

        response.Message.Should().Be($"{provider} data refreshed successfully");
        providerService.Verify(x => x.SyncMeasurementsAsync(userId, user.Profile.UseMetric), Times.Once);
    }

    [Fact]
    public async Task RefreshProviderData_WithNoUserIdClaim_ReturnsUnauthorized()
    {
        // Arrange
        SetupAuthenticatedUser(null);

        // Act
        var result = await _sut.RefreshProviderData("withings");

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("User ID not found in token");
    }

    [Fact]
    public async Task RefreshProviderData_WhenUserNotFound_ReturnsNotFound()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString());
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId.ToString())).ReturnsAsync((DbProfile?)null);

        // Act
        var result = await _sut.RefreshProviderData("withings");

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("User not found");
    }

    [Fact]
    public async Task RefreshProviderData_WithUnknownProvider_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestProfile(userId);
        var provider = "unknown-provider";

        SetupAuthenticatedUser(userId.ToString());
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId.ToString())).ReturnsAsync(user);
        _providerIntegrationServiceMock.Setup(x => x.GetProviderService(provider))
            .Returns((IProviderService?)null);

        // Act
        var result = await _sut.RefreshProviderData(provider);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be($"Unknown provider: {provider}");
    }

    [Fact]
    public async Task RefreshProviderData_WithNoActiveProviderLink_ReturnsNotFound()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestProfile(userId);
        var provider = "withings";
        var providerService = new Mock<IProviderService>();

        SetupAuthenticatedUser(userId.ToString());
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId.ToString())).ReturnsAsync(user);
        _providerIntegrationServiceMock.Setup(x => x.GetProviderService(provider))
            .Returns(providerService.Object);
        providerService.Setup(x => x.HasActiveProviderLinkAsync(userId))
            .ReturnsAsync(false);

        // Act
        var result = await _sut.RefreshProviderData(provider);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be($"No active {provider} connection found");
    }

    [Fact]
    public async Task RefreshProviderData_WhenSyncFails_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestProfile(userId);
        var provider = "withings";
        var providerService = new Mock<IProviderService>();

        SetupAuthenticatedUser(userId.ToString());
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId.ToString())).ReturnsAsync(user);
        _providerIntegrationServiceMock.Setup(x => x.GetProviderService(provider))
            .Returns(providerService.Object);
        providerService.Setup(x => x.HasActiveProviderLinkAsync(userId))
            .ReturnsAsync(true);
        providerService.Setup(x => x.SyncMeasurementsAsync(userId, user.Profile.UseMetric))
            .ReturnsAsync(new ProviderSyncResult { Provider = provider, Success = false });

        // Act
        var result = await _sut.RefreshProviderData(provider);

        // Assert
        result.Result.Should().BeOfType<ObjectResult>()
            .Which.StatusCode.Should().Be(500);
        var errorResult = result.Result as ObjectResult;
        errorResult!.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be($"Failed to refresh {provider} data");
    }

    [Fact]
    public async Task RefreshProviderData_WhenExceptionThrown_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var provider = "withings";
        SetupAuthenticatedUser(userId.ToString());
        _profileServiceMock.Setup(x => x.GetByIdAsync(It.IsAny<string>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.RefreshProviderData(provider);

        // Assert
        result.Result.Should().BeOfType<ObjectResult>()
            .Which.StatusCode.Should().Be(500);
        var errorResult = result.Result as ObjectResult;
        errorResult!.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("Internal server error");
    }

    #endregion

    #region Helper Methods

    private void SetupAuthenticatedUser(string? userId)
    {
        var claims = new List<Claim>();
        if (userId != null)
            claims.Add(new Claim(ClaimTypes.NameIdentifier, userId));

        var identity = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);

        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };
    }

    private static DbProfile CreateTestProfile(Guid userId)
    {
        return new DbProfile
        {
            Uid = userId,
            Email = "test@example.com",
            Profile = new ProfileData
            {
                FirstName = "Test User",
                UseMetric = false
            }
        };
    }

    #endregion
}
