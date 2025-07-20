using FluentAssertions;
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
    private readonly Mock<IMeasurementSyncService> _measurementSyncServiceMock;
    private readonly Mock<ILogger<MeasurementsController>> _loggerMock;
    private readonly MeasurementsController _sut;

    public MeasurementsControllerTests()
    {
        _profileServiceMock = new Mock<IProfileService>();
        _providerIntegrationServiceMock = new Mock<IProviderIntegrationService>();
        _measurementSyncServiceMock = new Mock<IMeasurementSyncService>();
        _loggerMock = new Mock<ILogger<MeasurementsController>>();

        _sut = new MeasurementsController(
            _profileServiceMock.Object,
            _providerIntegrationServiceMock.Object,
            _measurementSyncServiceMock.Object,
            _loggerMock.Object);
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
        _measurementSyncServiceMock.Setup(x => x.GetMeasurementsForUserAsync(userId,
                It.IsAny<List<string>>(), user.Profile.UseMetric))
            .ReturnsAsync(new MeasurementsResult
            {
                Data = sourceData,
                ProviderStatus = new Dictionary<string, ProviderSyncStatus>
                {
                    { "withings", new ProviderSyncStatus { Success = true } },
                    { "fitbit", new ProviderSyncStatus { Success = true } }
                }
            });

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
        _measurementSyncServiceMock.Setup(x => x.GetMeasurementsForUserAsync(userId,
                It.IsAny<List<string>>(), user.Profile.UseMetric))
            .ReturnsAsync(new MeasurementsResult
            {
                Data = sourceData,
                ProviderStatus = new Dictionary<string, ProviderSyncStatus>
                {
                    { "withings", new ProviderSyncStatus { Success = true } }
                }
            });

        // Act
        var result = await _sut.GetMeasurements();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<MeasurementsResponse>().Subject;
        response.Data.Should().BeEquivalentTo(sourceData);
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

        // Setup to return error status for provider
        _measurementSyncServiceMock.Setup(x => x.GetMeasurementsForUserAsync(userId,
                It.IsAny<List<string>>(), user.Profile.UseMetric))
            .ReturnsAsync(new MeasurementsResult
            {
                Data = sourceData,
                ProviderStatus = new Dictionary<string, ProviderSyncStatus>
                {
                    { "withings", new ProviderSyncStatus
                        {
                            Success = false,
                            Error = "authfailed",
                            Message = "Authentication expired"
                        }
                    }
                }
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
        _measurementSyncServiceMock.Setup(x => x.GetMeasurementsForUserAsync(userId,
                It.IsAny<List<string>>(), user.Profile.UseMetric))
            .ReturnsAsync(new MeasurementsResult
            {
                Data = sourceData,
                ProviderStatus = new Dictionary<string, ProviderSyncStatus>
                {
                    { "withings", new ProviderSyncStatus { Success = true } }
                }
            });

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

    // Test removed - refresh logic is now internal to MeasurementSyncService

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

    // Test removed - refresh logic is now internal to MeasurementSyncService

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
        _measurementSyncServiceMock.Setup(x => x.GetMeasurementsForUserAsync(userId,
                It.IsAny<List<string>>(), user.Profile.UseMetric))
            .ReturnsAsync(new MeasurementsResult
            {
                Data = new List<SourceData>(),
                ProviderStatus = new Dictionary<string, ProviderSyncStatus>
                {
                    { "unknown-provider", new ProviderSyncStatus
                        {
                            Success = false,
                            Error = "unknown",
                            Message = "Provider service not found"
                        }
                    }
                }
            });

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
