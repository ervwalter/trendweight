using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using System.Security.Claims;
using TrendWeight.Features.Measurements;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Features.Providers;
using TrendWeight.Features.Providers.Models;
using TrendWeight.Infrastructure.DataAccess.Models;
using TrendWeight.Features.Profile.Models;
using TrendWeight.Common.Models;
using TrendWeight.Tests.Fixtures;
using Xunit;

namespace TrendWeight.Tests.Features.Measurements.Controllers;

public class MeasurementsControllerTests : TestBase
{
    private readonly Mock<IProfileService> _profileServiceMock;
    private readonly Mock<IProviderIntegrationService> _providerIntegrationServiceMock;
    private readonly Mock<ISourceDataService> _sourceDataServiceMock;
    private readonly Mock<ILogger<MeasurementsController>> _loggerMock;
    private readonly Mock<IWebHostEnvironment> _environmentMock;
    private readonly MeasurementsController _sut;

    public MeasurementsControllerTests()
    {
        _profileServiceMock = new Mock<IProfileService>();
        _providerIntegrationServiceMock = new Mock<IProviderIntegrationService>();
        _sourceDataServiceMock = new Mock<ISourceDataService>();
        _loggerMock = new Mock<ILogger<MeasurementsController>>();
        _environmentMock = new Mock<IWebHostEnvironment>();

        // Default to production environment
        _environmentMock.Setup(x => x.EnvironmentName).Returns("Production");

        _sut = new MeasurementsController(
            _profileServiceMock.Object,
            _providerIntegrationServiceMock.Object,
            _sourceDataServiceMock.Object,
            _loggerMock.Object,
            _environmentMock.Object);
    }

    #region GetMeasurements Tests

    [Fact]
    public async Task GetMeasurements_WithValidUser_ReturnsDataWithProviderStatus()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestProfile(userId);
        var sourceData = CreateTestSourceData();

        SetupAuthenticatedUser(userId.ToString());
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId.ToString())).ReturnsAsync(user);
        _providerIntegrationServiceMock.Setup(x => x.GetActiveProvidersAsync(userId))
            .ReturnsAsync(new List<string> { "withings", "fitbit" });
        _sourceDataServiceMock.Setup(x => x.GetLastSyncTimeAsync(userId, It.IsAny<string>()))
            .ReturnsAsync(DateTime.UtcNow.AddMinutes(-1)); // Fresh data
        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId))
            .ReturnsAsync(sourceData);

        // Act
        var result = await _sut.GetMeasurements();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<MeasurementsResponse>().Subject;
        response.IsMe.Should().Be(true);
        response.Data.Should().BeEquivalentTo(sourceData);
        response.ProviderStatus.Should().NotBeNull();

        response.ProviderStatus.Should().HaveCount(2);
        response.ProviderStatus!["withings"].Success.Should().BeTrue();
        response.ProviderStatus["fitbit"].Success.Should().BeTrue();
    }

    [Fact]
    public async Task GetMeasurements_WithNoUserIdClaim_ReturnsUnauthorized()
    {
        // Arrange
        SetupAuthenticatedUser(null);

        // Act
        var result = await _sut.GetMeasurements();

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("User ID not found in token");
    }

    [Fact]
    public async Task GetMeasurements_WhenUserNotFound_ReturnsNotFound()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString());
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId.ToString())).ReturnsAsync((DbProfile?)null);

        // Act
        var result = await _sut.GetMeasurements();

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("User not found");
    }

    [Fact]
    public async Task GetMeasurements_WhenDataNeedsRefresh_RefreshesAndReturnsData()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestProfile(userId);
        var sourceData = CreateTestSourceData();
        var providerService = new Mock<IProviderService>();

        SetupAuthenticatedUser(userId.ToString());
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId.ToString())).ReturnsAsync(user);
        _providerIntegrationServiceMock.Setup(x => x.GetActiveProvidersAsync(userId))
            .ReturnsAsync(new List<string> { "withings" });
        _sourceDataServiceMock.Setup(x => x.GetLastSyncTimeAsync(userId, "withings"))
            .ReturnsAsync(DateTime.UtcNow.AddHours(-1)); // Stale data
        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId))
            .ReturnsAsync(sourceData);

        _providerIntegrationServiceMock.Setup(x => x.GetProviderService("withings"))
            .Returns(providerService.Object);
        providerService.Setup(x => x.SyncMeasurementsAsync(userId, It.IsAny<bool>()))
            .ReturnsAsync(new ProviderSyncResult { Provider = "withings", Success = true });

        // Act
        var result = await _sut.GetMeasurements();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        providerService.Verify(x => x.SyncMeasurementsAsync(userId, false), Times.Once);
    }

    [Fact]
    public async Task GetMeasurements_WhenProviderRefreshFails_ReturnsDataWithErrorStatus()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestProfile(userId);
        var sourceData = CreateTestSourceData();
        var providerService = new Mock<IProviderService>();

        SetupAuthenticatedUser(userId.ToString());
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId.ToString())).ReturnsAsync(user);
        _providerIntegrationServiceMock.Setup(x => x.GetActiveProvidersAsync(userId))
            .ReturnsAsync(new List<string> { "withings" });
        _sourceDataServiceMock.Setup(x => x.GetLastSyncTimeAsync(userId, "withings"))
            .ReturnsAsync((DateTime?)null); // Never synced
        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId))
            .ReturnsAsync(sourceData);

        _providerIntegrationServiceMock.Setup(x => x.GetProviderService("withings"))
            .Returns(providerService.Object);
        providerService.Setup(x => x.SyncMeasurementsAsync(userId, It.IsAny<bool>()))
            .ReturnsAsync(new ProviderSyncResult
            {
                Provider = "withings",
                Success = false,
                Error = ProviderSyncError.AuthFailed,
                Message = "Authentication expired"
            });

        // Act
        var result = await _sut.GetMeasurements();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<MeasurementsResponse>().Subject;
        response.ProviderStatus!["withings"].Success.Should().BeFalse();
        response.ProviderStatus["withings"].Error.Should().Be("authfailed");
        response.ProviderStatus["withings"].Message.Should().Be("Authentication expired");
    }

    [Fact]
    public async Task GetMeasurements_InDevelopmentEnvironment_UsesShorterCacheDuration()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestProfile(userId);

        // Create new controller with development environment
        var envMock = new Mock<IWebHostEnvironment>();
        envMock.Setup(x => x.EnvironmentName).Returns("Development");
        // Development environment is already set by EnvironmentName

        var controller = new MeasurementsController(
            _profileServiceMock.Object,
            _providerIntegrationServiceMock.Object,
            _sourceDataServiceMock.Object,
            _loggerMock.Object,
            envMock.Object);

        SetupAuthenticatedUser(userId.ToString(), controller);
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId.ToString())).ReturnsAsync(user);
        _providerIntegrationServiceMock.Setup(x => x.GetActiveProvidersAsync(userId))
            .ReturnsAsync(new List<string> { "withings" });
        _sourceDataServiceMock.Setup(x => x.GetLastSyncTimeAsync(userId, "withings"))
            .ReturnsAsync(DateTime.UtcNow.AddSeconds(-15)); // 15 seconds old (stale in dev)
        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId))
            .ReturnsAsync(new List<SourceData>());

        var providerService = new Mock<IProviderService>();
        _providerIntegrationServiceMock.Setup(x => x.GetProviderService("withings"))
            .Returns(providerService.Object);
        providerService.Setup(x => x.SyncMeasurementsAsync(userId, It.IsAny<bool>()))
            .ReturnsAsync(new ProviderSyncResult { Provider = "withings", Success = true });

        // Act
        var result = await controller.GetMeasurements();

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        providerService.Verify(x => x.SyncMeasurementsAsync(userId, It.IsAny<bool>()), Times.Once);
    }

    [Fact]
    public async Task GetMeasurements_WhenExceptionThrown_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString());
        _profileServiceMock.Setup(x => x.GetByIdAsync(It.IsAny<string>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.GetMeasurements();

        // Assert
        result.Result.Should().BeOfType<ObjectResult>()
            .Which.StatusCode.Should().Be(500);
    }

    #endregion

    #region GetMeasurementsBySharingCode Tests

    [Fact]
    public async Task GetMeasurementsBySharingCode_WithValidCode_ReturnsDataWithoutProviderStatus()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var sharingCode = "test-sharing-code";
        var user = CreateTestProfile(userId);
        user.Profile.SharingEnabled = true;
        user.Profile.SharingToken = sharingCode;
        var sourceData = CreateTestSourceData();

        _profileServiceMock.Setup(x => x.GetBySharingTokenAsync(sharingCode)).ReturnsAsync(user);
        _providerIntegrationServiceMock.Setup(x => x.GetActiveProvidersAsync(userId))
            .ReturnsAsync(new List<string> { "withings" });
        _sourceDataServiceMock.Setup(x => x.GetLastSyncTimeAsync(userId, It.IsAny<string>()))
            .ReturnsAsync(DateTime.UtcNow.AddMinutes(-1)); // Fresh data
        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId))
            .ReturnsAsync(sourceData);

        // Act
        var result = await _sut.GetMeasurementsBySharingCode(sharingCode);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<MeasurementsResponse>().Subject;
        response.IsMe.Should().Be(false);
        response.Data.Should().BeEquivalentTo(sourceData);
        response.ProviderStatus.Should().BeNull(); // No provider status for shared view
    }

    [Fact]
    public async Task GetMeasurementsBySharingCode_WhenUserNotFound_ReturnsNotFound()
    {
        // Arrange
        var sharingCode = "invalid-code";
        _profileServiceMock.Setup(x => x.GetBySharingTokenAsync(sharingCode)).ReturnsAsync((DbProfile?)null);

        // Act
        var result = await _sut.GetMeasurementsBySharingCode(sharingCode);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("User not found");
    }

    [Fact]
    public async Task GetMeasurementsBySharingCode_StillRefreshesDataIfNeeded()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var sharingCode = "test-sharing-code";
        var user = CreateTestProfile(userId);
        user.Profile.SharingEnabled = true;
        user.Profile.SharingToken = sharingCode;
        var providerService = new Mock<IProviderService>();

        _profileServiceMock.Setup(x => x.GetBySharingTokenAsync(sharingCode)).ReturnsAsync(user);
        _providerIntegrationServiceMock.Setup(x => x.GetActiveProvidersAsync(userId))
            .ReturnsAsync(new List<string> { "withings" });
        _sourceDataServiceMock.Setup(x => x.GetLastSyncTimeAsync(userId, "withings"))
            .ReturnsAsync((DateTime?)null); // Never synced
        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId))
            .ReturnsAsync(new List<SourceData>());

        _providerIntegrationServiceMock.Setup(x => x.GetProviderService("withings"))
            .Returns(providerService.Object);
        providerService.Setup(x => x.SyncMeasurementsAsync(userId, It.IsAny<bool>()))
            .ReturnsAsync(new ProviderSyncResult { Provider = "withings", Success = true });

        // Act
        var result = await _sut.GetMeasurementsBySharingCode(sharingCode);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        providerService.Verify(x => x.SyncMeasurementsAsync(userId, false), Times.Once);
    }

    [Fact]
    public async Task GetMeasurementsBySharingCode_WhenExceptionThrown_ReturnsInternalServerError()
    {
        // Arrange
        var sharingCode = "test-code";
        _profileServiceMock.Setup(x => x.GetBySharingTokenAsync(It.IsAny<string>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.GetMeasurementsBySharingCode(sharingCode);

        // Assert
        result.Result.Should().BeOfType<ObjectResult>()
            .Which.StatusCode.Should().Be(500);
    }

    #endregion

    #region Multiple Providers Tests

    [Fact]
    public async Task GetMeasurements_WithMultipleProviders_RefreshesOnlyStaleProviders()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestProfile(userId);
        var withingsService = new Mock<IProviderService>();
        var fitbitService = new Mock<IProviderService>();

        SetupAuthenticatedUser(userId.ToString());
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId.ToString())).ReturnsAsync(user);
        _providerIntegrationServiceMock.Setup(x => x.GetActiveProvidersAsync(userId))
            .ReturnsAsync(new List<string> { "withings", "fitbit" });

        // Withings is fresh, Fitbit is stale
        _sourceDataServiceMock.Setup(x => x.GetLastSyncTimeAsync(userId, "withings"))
            .ReturnsAsync(DateTime.UtcNow.AddMinutes(-1));
        _sourceDataServiceMock.Setup(x => x.GetLastSyncTimeAsync(userId, "fitbit"))
            .ReturnsAsync(DateTime.UtcNow.AddHours(-1));

        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId))
            .ReturnsAsync(new List<SourceData>());

        _providerIntegrationServiceMock.Setup(x => x.GetProviderService("withings"))
            .Returns(withingsService.Object);
        _providerIntegrationServiceMock.Setup(x => x.GetProviderService("fitbit"))
            .Returns(fitbitService.Object);

        fitbitService.Setup(x => x.SyncMeasurementsAsync(userId, It.IsAny<bool>()))
            .ReturnsAsync(new ProviderSyncResult { Provider = "fitbit", Success = true });

        // Act
        var result = await _sut.GetMeasurements();

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        withingsService.Verify(x => x.SyncMeasurementsAsync(It.IsAny<Guid>(), It.IsAny<bool>()), Times.Never);
        fitbitService.Verify(x => x.SyncMeasurementsAsync(userId, false), Times.Once);
    }

    [Fact]
    public async Task GetMeasurements_WhenProviderServiceNotFound_ReturnsErrorForThatProvider()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestProfile(userId);

        SetupAuthenticatedUser(userId.ToString());
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId.ToString())).ReturnsAsync(user);
        _providerIntegrationServiceMock.Setup(x => x.GetActiveProvidersAsync(userId))
            .ReturnsAsync(new List<string> { "unknown-provider" });
        _sourceDataServiceMock.Setup(x => x.GetLastSyncTimeAsync(userId, "unknown-provider"))
            .ReturnsAsync((DateTime?)null);
        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId))
            .ReturnsAsync(new List<SourceData>());

        _providerIntegrationServiceMock.Setup(x => x.GetProviderService("unknown-provider"))
            .Returns((IProviderService?)null);

        // Act
        var result = await _sut.GetMeasurements();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<MeasurementsResponse>().Subject;
        response.ProviderStatus!["unknown-provider"].Success.Should().BeFalse();
        response.ProviderStatus["unknown-provider"].Error.Should().Be("unknown");
        response.ProviderStatus["unknown-provider"].Message.Should().Contain("Provider service not found");
    }

    #endregion

    #region Helper Methods


    private void SetupAuthenticatedUser(string? userId, MeasurementsController? controller = null)
    {
        var claims = new List<Claim>();
        if (userId != null)
            claims.Add(new Claim(ClaimTypes.NameIdentifier, userId));

        var identity = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);

        var targetController = controller ?? _sut;
        targetController.ControllerContext = new ControllerContext
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
                UseMetric = false,
                SharingToken = "test-token",
                SharingEnabled = true
            }
        };
    }

    private static List<SourceData> CreateTestSourceData()
    {
        return new List<SourceData>
        {
            new SourceData
            {
                Source = "withings",
                LastUpdate = DateTime.UtcNow,
                Measurements = new List<RawMeasurement>
                {
                    new RawMeasurement
                    {
                        Date = DateTime.UtcNow.Date.ToString("yyyy-MM-dd"),
                        Time = "08:00:00",
                        Weight = 75.5m,
                        FatRatio = 0.225m
                    }
                }
            },
            new SourceData
            {
                Source = "fitbit",
                LastUpdate = DateTime.UtcNow,
                Measurements = new List<RawMeasurement>
                {
                    new RawMeasurement
                    {
                        Date = DateTime.UtcNow.Date.AddDays(-1).ToString("yyyy-MM-dd"),
                        Time = "08:00:00",
                        Weight = 75.8m,
                        FatRatio = 0.228m
                    }
                }
            }
        };
    }

    #endregion
}
