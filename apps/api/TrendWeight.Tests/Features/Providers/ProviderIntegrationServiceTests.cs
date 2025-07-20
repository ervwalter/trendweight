using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Features.Providers;
using TrendWeight.Features.Providers.Models;
using TrendWeight.Tests.Fixtures;
using Xunit;

namespace TrendWeight.Tests.Features.Providers;

public class ProviderIntegrationServiceTests : TestBase
{
    private readonly Mock<IProviderService> _withingsServiceMock;
    private readonly Mock<IProviderService> _fitbitServiceMock;
    private readonly Mock<ILogger<ProviderIntegrationService>> _loggerMock;
    private readonly ProviderIntegrationService _sut;

    public ProviderIntegrationServiceTests()
    {
        _withingsServiceMock = new Mock<IProviderService>();
        _withingsServiceMock.Setup(x => x.ProviderName).Returns("withings");

        _fitbitServiceMock = new Mock<IProviderService>();
        _fitbitServiceMock.Setup(x => x.ProviderName).Returns("fitbit");

        _loggerMock = new Mock<ILogger<ProviderIntegrationService>>();

        var providerServices = new List<IProviderService>
        {
            _withingsServiceMock.Object,
            _fitbitServiceMock.Object
        };

        _sut = new ProviderIntegrationService(providerServices, _loggerMock.Object);
    }

    #region GetProviderService Tests

    [Fact]
    public void GetProviderService_WithValidProviderName_ReturnsService()
    {
        // Act
        var result = _sut.GetProviderService("withings");

        // Assert
        result.Should().NotBeNull();
        result!.ProviderName.Should().Be("withings");
    }

    [Fact]
    public void GetProviderService_WithUppercaseProviderName_ReturnsService()
    {
        // Act
        var result = _sut.GetProviderService("FITBIT");

        // Assert
        result.Should().NotBeNull();
        result!.ProviderName.Should().Be("fitbit");
    }

    [Fact]
    public void GetProviderService_WithInvalidProviderName_ReturnsNull()
    {
        // Act
        var result = _sut.GetProviderService("invalid");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void GetProviderService_WithEmptyProviderName_ReturnsNull()
    {
        // Act
        var result = _sut.GetProviderService("");

        // Assert
        result.Should().BeNull();
    }

    #endregion

    #region GetAllProviderServices Tests

    [Fact]
    public void GetAllProviderServices_ReturnsAllRegisteredServices()
    {
        // Act
        var result = _sut.GetAllProviderServices().ToList();

        // Assert
        result.Should().HaveCount(2);
        result.Should().Contain(s => s.ProviderName == "withings");
        result.Should().Contain(s => s.ProviderName == "fitbit");
    }

    #endregion

    #region SyncAllProvidersAsync Tests

    [Fact]
    public async Task SyncAllProvidersAsync_WithActiveProviders_SyncsAll()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var metric = true;

        _withingsServiceMock.Setup(x => x.HasActiveProviderLinkAsync(userId))
            .ReturnsAsync(true);
        _fitbitServiceMock.Setup(x => x.HasActiveProviderLinkAsync(userId))
            .ReturnsAsync(true);

        _withingsServiceMock.Setup(x => x.SyncMeasurementsAsync(userId, metric, It.IsAny<DateTime?>()))
            .ReturnsAsync(new ProviderSyncResult { Success = true, Provider = "withings" });
        _fitbitServiceMock.Setup(x => x.SyncMeasurementsAsync(userId, metric, It.IsAny<DateTime?>()))
            .ReturnsAsync(new ProviderSyncResult { Success = true, Provider = "fitbit" });

        // Act
        var result = await _sut.SyncAllProvidersAsync(userId, metric);

        // Assert
        result.Should().HaveCount(2);
        result["withings"].Should().BeTrue();
        result["fitbit"].Should().BeTrue();

        _withingsServiceMock.Verify(x => x.SyncMeasurementsAsync(userId, metric, It.IsAny<DateTime?>()), Times.Once);
        _fitbitServiceMock.Verify(x => x.SyncMeasurementsAsync(userId, metric, It.IsAny<DateTime?>()), Times.Once);
    }

    [Fact]
    public async Task SyncAllProvidersAsync_WithNoActiveProviders_SkipsSync()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var metric = true;

        _withingsServiceMock.Setup(x => x.HasActiveProviderLinkAsync(userId))
            .ReturnsAsync(false);
        _fitbitServiceMock.Setup(x => x.HasActiveProviderLinkAsync(userId))
            .ReturnsAsync(false);

        // Act
        var result = await _sut.SyncAllProvidersAsync(userId, metric);

        // Assert
        result.Should().BeEmpty();

        _withingsServiceMock.Verify(x => x.SyncMeasurementsAsync(It.IsAny<Guid>(), It.IsAny<bool>(), It.IsAny<DateTime?>()), Times.Never);
        _fitbitServiceMock.Verify(x => x.SyncMeasurementsAsync(It.IsAny<Guid>(), It.IsAny<bool>(), It.IsAny<DateTime?>()), Times.Never);
    }

    [Fact]
    public async Task SyncAllProvidersAsync_WithPartialActiveProviders_SyncsOnlyActive()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var metric = false;

        _withingsServiceMock.Setup(x => x.HasActiveProviderLinkAsync(userId))
            .ReturnsAsync(true);
        _fitbitServiceMock.Setup(x => x.HasActiveProviderLinkAsync(userId))
            .ReturnsAsync(false);

        _withingsServiceMock.Setup(x => x.SyncMeasurementsAsync(userId, metric, It.IsAny<DateTime?>()))
            .ReturnsAsync(new ProviderSyncResult { Success = true, Provider = "withings" });

        // Act
        var result = await _sut.SyncAllProvidersAsync(userId, metric);

        // Assert
        result.Should().HaveCount(1);
        result["withings"].Should().BeTrue();

        _withingsServiceMock.Verify(x => x.SyncMeasurementsAsync(userId, metric, It.IsAny<DateTime?>()), Times.Once);
        _fitbitServiceMock.Verify(x => x.SyncMeasurementsAsync(It.IsAny<Guid>(), It.IsAny<bool>(), It.IsAny<DateTime?>()), Times.Never);
    }

    [Fact]
    public async Task SyncAllProvidersAsync_WithSyncFailure_RecordsFailure()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var metric = true;

        _withingsServiceMock.Setup(x => x.HasActiveProviderLinkAsync(userId))
            .ReturnsAsync(true);
        _fitbitServiceMock.Setup(x => x.HasActiveProviderLinkAsync(userId))
            .ReturnsAsync(true);

        _withingsServiceMock.Setup(x => x.SyncMeasurementsAsync(userId, metric, It.IsAny<DateTime?>()))
            .ReturnsAsync(new ProviderSyncResult { Success = true, Provider = "withings" });
        _fitbitServiceMock.Setup(x => x.SyncMeasurementsAsync(userId, metric, It.IsAny<DateTime?>()))
            .ReturnsAsync(new ProviderSyncResult { Success = false, Provider = "fitbit" });

        // Act
        var result = await _sut.SyncAllProvidersAsync(userId, metric);

        // Assert
        result.Should().HaveCount(2);
        result["withings"].Should().BeTrue();
        result["fitbit"].Should().BeFalse();

        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Failed to sync fitbit")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task SyncAllProvidersAsync_WithException_CatchesAndRecordsFailure()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var metric = true;

        _withingsServiceMock.Setup(x => x.HasActiveProviderLinkAsync(userId))
            .ReturnsAsync(true);
        _fitbitServiceMock.Setup(x => x.HasActiveProviderLinkAsync(userId))
            .ReturnsAsync(true);

        _withingsServiceMock.Setup(x => x.SyncMeasurementsAsync(userId, metric, It.IsAny<DateTime?>()))
            .ReturnsAsync(new ProviderSyncResult { Success = true, Provider = "withings" });
        _fitbitServiceMock.Setup(x => x.SyncMeasurementsAsync(userId, metric, It.IsAny<DateTime?>()))
            .ThrowsAsync(new Exception("Network error"));

        // Act
        var result = await _sut.SyncAllProvidersAsync(userId, metric);

        // Assert
        result.Should().HaveCount(2);
        result["withings"].Should().BeTrue();
        result["fitbit"].Should().BeFalse();

        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Error syncing fitbit")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task SyncAllProvidersAsync_WithMultipleExceptions_ContinuesWithOtherProviders()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var metric = true;

        _withingsServiceMock.Setup(x => x.HasActiveProviderLinkAsync(userId))
            .ThrowsAsync(new Exception("Provider check failed"));
        _fitbitServiceMock.Setup(x => x.HasActiveProviderLinkAsync(userId))
            .ReturnsAsync(true);

        _fitbitServiceMock.Setup(x => x.SyncMeasurementsAsync(userId, metric, It.IsAny<DateTime?>()))
            .ReturnsAsync(new ProviderSyncResult { Success = true, Provider = "fitbit" });

        // Act
        var result = await _sut.SyncAllProvidersAsync(userId, metric);

        // Assert
        result.Should().HaveCount(2);
        result["withings"].Should().BeFalse();
        result["fitbit"].Should().BeTrue();

        // Verify fitbit was still synced despite withings exception
        _fitbitServiceMock.Verify(x => x.SyncMeasurementsAsync(userId, metric, It.IsAny<DateTime?>()), Times.Once);
    }

    #endregion

    #region GetActiveProvidersAsync Tests

    [Fact]
    public async Task GetActiveProvidersAsync_WithAllActiveProviders_ReturnsAll()
    {
        // Arrange
        var userId = Guid.NewGuid();

        _withingsServiceMock.Setup(x => x.HasActiveProviderLinkAsync(userId))
            .ReturnsAsync(true);
        _fitbitServiceMock.Setup(x => x.HasActiveProviderLinkAsync(userId))
            .ReturnsAsync(true);

        // Act
        var result = await _sut.GetActiveProvidersAsync(userId);

        // Assert
        result.Should().HaveCount(2);
        result.Should().Contain("withings");
        result.Should().Contain("fitbit");
    }

    [Fact]
    public async Task GetActiveProvidersAsync_WithNoActiveProviders_ReturnsEmpty()
    {
        // Arrange
        var userId = Guid.NewGuid();

        _withingsServiceMock.Setup(x => x.HasActiveProviderLinkAsync(userId))
            .ReturnsAsync(false);
        _fitbitServiceMock.Setup(x => x.HasActiveProviderLinkAsync(userId))
            .ReturnsAsync(false);

        // Act
        var result = await _sut.GetActiveProvidersAsync(userId);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetActiveProvidersAsync_WithPartialActiveProviders_ReturnsOnlyActive()
    {
        // Arrange
        var userId = Guid.NewGuid();

        _withingsServiceMock.Setup(x => x.HasActiveProviderLinkAsync(userId))
            .ReturnsAsync(false);
        _fitbitServiceMock.Setup(x => x.HasActiveProviderLinkAsync(userId))
            .ReturnsAsync(true);

        // Act
        var result = await _sut.GetActiveProvidersAsync(userId);

        // Assert
        result.Should().HaveCount(1);
        result.Should().Contain("fitbit");
        result.Should().NotContain("withings");
    }

    #endregion

    #region Integration Scenario Tests

    [Fact]
    public async Task Integration_MultipleProvidersWithDifferentStates_HandlesCorrectly()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var metric = true;

        // Setup three providers with different states
        var garminServiceMock = new Mock<IProviderService>();
        garminServiceMock.Setup(x => x.ProviderName).Returns("garmin");
        garminServiceMock.Setup(x => x.HasActiveProviderLinkAsync(userId))
            .ReturnsAsync(true);
        garminServiceMock.Setup(x => x.SyncMeasurementsAsync(userId, metric, It.IsAny<DateTime?>()))
            .ReturnsAsync(new ProviderSyncResult { Success = true, Provider = "garmin" });

        var providerServices = new List<IProviderService>
        {
            _withingsServiceMock.Object,
            _fitbitServiceMock.Object,
            garminServiceMock.Object
        };

        var service = new ProviderIntegrationService(providerServices, _loggerMock.Object);

        // Withings: active and successful
        _withingsServiceMock.Setup(x => x.HasActiveProviderLinkAsync(userId))
            .ReturnsAsync(true);
        _withingsServiceMock.Setup(x => x.SyncMeasurementsAsync(userId, metric, It.IsAny<DateTime?>()))
            .ReturnsAsync(new ProviderSyncResult { Success = true, Provider = "withings" });

        // Fitbit: active but fails
        _fitbitServiceMock.Setup(x => x.HasActiveProviderLinkAsync(userId))
            .ReturnsAsync(true);
        _fitbitServiceMock.Setup(x => x.SyncMeasurementsAsync(userId, metric, It.IsAny<DateTime?>()))
            .ReturnsAsync(new ProviderSyncResult { Success = false, Provider = "fitbit" });

        // Garmin: active and successful

        // Act
        var syncResults = await service.SyncAllProvidersAsync(userId, metric);
        var activeProviders = await service.GetActiveProvidersAsync(userId);

        // Assert
        syncResults.Should().HaveCount(3);
        syncResults["withings"].Should().BeTrue();
        syncResults["fitbit"].Should().BeFalse();
        syncResults["garmin"].Should().BeTrue();

        activeProviders.Should().HaveCount(3);
        activeProviders.Should().BeEquivalentTo(new[] { "withings", "fitbit", "garmin" });
    }

    #endregion
}
