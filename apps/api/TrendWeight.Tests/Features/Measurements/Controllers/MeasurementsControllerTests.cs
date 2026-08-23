using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using System.Security.Claims;
using TrendWeight.Features.Measurements;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Infrastructure.DataAccess.Models;
using TrendWeight.Features.Profile.Models;
using TrendWeight.Common.Models;
using TrendWeight.Tests.Fixtures;
using Xunit;
using TrendWeight.Features.Common;

namespace TrendWeight.Tests.Features.Measurements.Controllers;

public class MeasurementsControllerTests : TestBase
{
    private readonly Mock<IProfileService> _profileServiceMock;
    private readonly Mock<IMeasurementOrchestrationService> _orchestrationServiceMock;
    private readonly Mock<ICurrentRequestContext> _requestContextMock;
    private readonly MeasurementsController _sut;

    public MeasurementsControllerTests()
    {
        _profileServiceMock = new Mock<IProfileService>();
        _orchestrationServiceMock = new Mock<IMeasurementOrchestrationService>();
        _requestContextMock = new Mock<ICurrentRequestContext>();
        _requestContextMock.SetupAllProperties();

        _sut = new MeasurementsController(
            _profileServiceMock.Object,
            _orchestrationServiceMock.Object,
            Mock.Of<ILogger<MeasurementsController>>(),
            _requestContextMock.Object);
    }

    #region GetMeasurements Tests

    [Fact]
    public async Task GetMeasurements_WithValidUser_ReturnsDataWithProviderStatus()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var dataResult = CreateDataResult(userId);

        SetupAuthenticatedUser(userId.ToString());
        _orchestrationServiceMock.Setup(x => x.GetForUserAsync(userId, null, null)).ReturnsAsync(dataResult);

        // Act
        var result = await _sut.GetMeasurements();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<MeasurementsResponse>().Subject;
        response.IsMe.Should().Be(true);
        response.ComputedMeasurements.Should().BeSameAs(dataResult.ComputedMeasurements);
        response.SourceData.Should().BeNull(); // Default includeSource=false
        response.ProviderStatus.Should().ContainKey("withings");
    }

    [Fact]
    public async Task GetMeasurements_WithIncludeSource_ReturnsSourceData()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var dataResult = CreateDataResult(userId);

        SetupAuthenticatedUser(userId.ToString());
        _orchestrationServiceMock.Setup(x => x.GetForUserAsync(userId, null, null)).ReturnsAsync(dataResult);

        // Act
        var result = await _sut.GetMeasurements(includeSource: true);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<MeasurementsResponse>().Subject;
        response.SourceData.Should().BeSameAs(dataResult.SourceData);
    }

    [Fact]
    public async Task GetMeasurements_PassesClerkIdAndProgressIdToOrchestration()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var progressId = Guid.NewGuid();
        var dataResult = CreateDataResult(userId);

        SetupAuthenticatedUser(userId.ToString(), clerkUserId: "clerk_123");
        _orchestrationServiceMock.Setup(x => x.GetForUserAsync(userId, "clerk_123", progressId)).ReturnsAsync(dataResult);

        // Act
        var result = await _sut.GetMeasurements(progressId: progressId.ToString());

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        _orchestrationServiceMock.Verify(x => x.GetForUserAsync(userId, "clerk_123", progressId), Times.Once);
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
        _orchestrationServiceMock.Setup(x => x.GetForUserAsync(userId, null, null))
            .ReturnsAsync((MeasurementDataResult?)null);

        // Act
        var result = await _sut.GetMeasurements();

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("User not found");
    }

    [Fact]
    public async Task GetMeasurements_WhenExceptionThrown_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString());
        _orchestrationServiceMock.Setup(x => x.GetForUserAsync(It.IsAny<Guid>(), It.IsAny<string?>(), It.IsAny<Guid?>()))
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
        var dataResult = CreateDataResult(userId);
        var user = dataResult.Profile;
        user.Profile.SharingEnabled = true;
        user.Profile.SharingToken = sharingCode;

        _profileServiceMock.Setup(x => x.GetBySharingTokenAsync(sharingCode)).ReturnsAsync(user);
        _orchestrationServiceMock.Setup(x => x.GetForProfileAsync(user)).ReturnsAsync(dataResult);

        // Act
        var result = await _sut.GetMeasurementsBySharingCode(sharingCode);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<MeasurementsResponse>().Subject;
        response.IsMe.Should().Be(false);
        response.ComputedMeasurements.Should().NotBeNull();
        response.SourceData.Should().BeNull(); // Default includeSource=false
        response.ProviderStatus.Should().BeNull(); // No provider status for shared view
    }

    [Fact]
    public async Task GetMeasurementsBySharingCode_WithSinceFilter_FiltersMeasurements()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var sharingCode = "test-sharing-code";
        var dataResult = CreateDataResult(userId, computedMeasurements: new List<ComputedMeasurement>
        {
            CreateComputedMeasurement("2024-01-01"),
            CreateComputedMeasurement("2024-06-15"),
            CreateComputedMeasurement("2024-12-31")
        });
        var user = dataResult.Profile;
        user.Profile.SharingEnabled = true;

        _profileServiceMock.Setup(x => x.GetBySharingTokenAsync(sharingCode)).ReturnsAsync(user);
        _orchestrationServiceMock.Setup(x => x.GetForProfileAsync(user)).ReturnsAsync(dataResult);

        // Act
        var result = await _sut.GetMeasurementsBySharingCode(sharingCode, since: "2024-06-15");

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<MeasurementsResponse>().Subject;
        response.ComputedMeasurements.Should().HaveCount(2);
        response.ComputedMeasurements.Select(m => m.Date).Should().Equal("2024-06-15", "2024-12-31");
    }

    [Fact]
    public async Task GetMeasurementsBySharingCode_WithInvalidSince_ReturnsBadRequest()
    {
        // Act
        var result = await _sut.GetMeasurementsBySharingCode("code", since: "not-a-date");

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
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
    public async Task GetMeasurementsBySharingCode_WhenSharingDisabled_ReturnsNotFound()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var sharingCode = "disabled-code";
        var user = CreateTestProfile(userId);
        user.Profile.SharingEnabled = false;

        _profileServiceMock.Setup(x => x.GetBySharingTokenAsync(sharingCode)).ReturnsAsync(user);

        // Act
        var result = await _sut.GetMeasurementsBySharingCode(sharingCode);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
        _orchestrationServiceMock.Verify(x => x.GetForProfileAsync(It.IsAny<DbProfile>()), Times.Never);
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

    #region Helper Methods

    private void SetupAuthenticatedUser(string? userId, string? clerkUserId = null)
    {
        var claims = new List<Claim>();
        if (userId != null)
            claims.Add(new Claim(ClaimTypes.NameIdentifier, userId));
        if (clerkUserId != null)
            claims.Add(new Claim("clerk_user_id", clerkUserId));

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
                UseMetric = false,
                SharingToken = "test-token",
                SharingEnabled = true
            }
        };
    }

    private static ComputedMeasurement CreateComputedMeasurement(string date)
    {
        return new ComputedMeasurement
        {
            Date = date,
            ActualWeight = 75.5m,
            TrendWeight = 75.5m,
            WeightIsInterpolated = false,
            FatIsInterpolated = false
        };
    }

    private static MeasurementDataResult CreateDataResult(Guid userId, List<ComputedMeasurement>? computedMeasurements = null)
    {
        var sourceData = new List<SourceData>
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
            }
        };

        return new MeasurementDataResult(
            CreateTestProfile(userId),
            computedMeasurements ?? new List<ComputedMeasurement>(),
            sourceData,
            new Dictionary<string, ProviderSyncStatus>
            {
                { "withings", new ProviderSyncStatus { Success = true } }
            });
    }

    #endregion
}
