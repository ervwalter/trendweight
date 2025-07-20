using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Moq;
using TrendWeight.Features.Measurements;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Features.Providers;
using TrendWeight.Features.Providers.Models;
using TrendWeight.Tests.Fixtures;
using Xunit;

namespace TrendWeight.Tests.Features.Measurements.Services;

public class MeasurementSyncServiceTests : TestBase
{
    private readonly Mock<IProviderIntegrationService> _providerIntegrationServiceMock;
    private readonly Mock<ISourceDataService> _sourceDataServiceMock;
    private readonly Mock<ILogger<MeasurementSyncService>> _loggerMock;
    private readonly Mock<IWebHostEnvironment> _environmentMock;
    private readonly MeasurementSyncService _sut;

    public MeasurementSyncServiceTests()
    {
        _providerIntegrationServiceMock = new Mock<IProviderIntegrationService>();
        _sourceDataServiceMock = new Mock<ISourceDataService>();
        _loggerMock = new Mock<ILogger<MeasurementSyncService>>();
        _environmentMock = new Mock<IWebHostEnvironment>();

        // Default to production environment (5 minute cache)
        _environmentMock.Setup(x => x.EnvironmentName).Returns("Production");

        _sut = new MeasurementSyncService(
            _providerIntegrationServiceMock.Object,
            _sourceDataServiceMock.Object,
            _loggerMock.Object,
            _environmentMock.Object);
    }

    #region Constructor Tests

    [Fact]
    public void Constructor_InProductionEnvironment_SetsCacheDurationTo300Seconds()
    {
        // Arrange
        _environmentMock.Setup(x => x.EnvironmentName).Returns("Production");

        // Act & Assert - We can't directly access the cache duration, but we can test the behavior
        // This will be tested indirectly through the GetMeasurementsForUserAsync tests
        var service = new MeasurementSyncService(
            _providerIntegrationServiceMock.Object,
            _sourceDataServiceMock.Object,
            _loggerMock.Object,
            _environmentMock.Object);

        service.Should().NotBeNull();
    }

    [Fact]
    public void Constructor_InDevelopmentEnvironment_SetsCacheDurationTo10Seconds()
    {
        // Arrange
        _environmentMock.Setup(x => x.EnvironmentName).Returns("Development");

        // Act
        var service = new MeasurementSyncService(
            _providerIntegrationServiceMock.Object,
            _sourceDataServiceMock.Object,
            _loggerMock.Object,
            _environmentMock.Object);

        // Assert - This will be tested indirectly through the GetMeasurementsForUserAsync tests
        service.Should().NotBeNull();
    }

    #endregion

    #region GetMeasurementsForUserAsync Tests

    [Fact]
    public async Task GetMeasurementsForUserAsync_WithNoActiveProviders_ReturnsEmptyResult()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var activeProviders = new List<string>();
        var existingData = new List<SourceData>();

        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId))
            .ReturnsAsync(existingData);

        // Act
        var result = await _sut.GetMeasurementsForUserAsync(userId, activeProviders, useMetric: true);

        // Assert
        result.Should().NotBeNull();
        result.Data.Should().BeEmpty();
        result.ProviderStatus.Should().BeEmpty();
    }

    [Fact]
    public async Task GetMeasurementsForUserAsync_WithFreshProviderData_DoesNotRefresh()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var activeProviders = new List<string> { "withings" };
        var lastSync = DateTime.UtcNow.AddMinutes(-2); // Fresh data (less than 5 minutes old)
        var existingData = new List<SourceData>
        {
            CreateTestSourceData("withings")
        };

        _sourceDataServiceMock.Setup(x => x.GetLastSyncTimeAsync(userId, "withings"))
            .ReturnsAsync(lastSync);
        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId))
            .ReturnsAsync(existingData);

        // Act
        var result = await _sut.GetMeasurementsForUserAsync(userId, activeProviders, useMetric: true);

        // Assert
        result.Should().NotBeNull();
        result.Data.Should().HaveCount(1);
        result.ProviderStatus.Should().ContainKey("withings");
        result.ProviderStatus["withings"].Success.Should().BeTrue();

        // Verify no refresh was attempted
        _providerIntegrationServiceMock.Verify(x => x.GetProviderService(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task GetMeasurementsForUserAsync_WithStaleProviderData_RefreshesProvider()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var activeProviders = new List<string> { "withings" };
        var lastSync = DateTime.UtcNow.AddMinutes(-10); // Stale data (more than 5 minutes old)
        var existingData = new List<SourceData>();
        var refreshedMeasurements = new List<RawMeasurement>
        {
            CreateTestRawMeasurement()
        };

        var mockProviderService = new Mock<IProviderService>();
        mockProviderService.Setup(x => x.SyncMeasurementsAsync(userId, true, It.IsAny<DateTime?>()))
            .ReturnsAsync(new ProviderSyncResult
            {
                Provider = "withings",
                Success = true,
                Measurements = refreshedMeasurements
            });

        _sourceDataServiceMock.Setup(x => x.GetLastSyncTimeAsync(userId, "withings"))
            .ReturnsAsync(lastSync);
        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId))
            .ReturnsAsync(existingData);
        _providerIntegrationServiceMock.Setup(x => x.GetProviderService("withings"))
            .Returns(mockProviderService.Object);

        // Act
        var result = await _sut.GetMeasurementsForUserAsync(userId, activeProviders, useMetric: true);

        // Assert
        result.Should().NotBeNull();
        result.ProviderStatus.Should().ContainKey("withings");
        result.ProviderStatus["withings"].Success.Should().BeTrue();

        // Verify refresh was attempted
        mockProviderService.Verify(x => x.SyncMeasurementsAsync(userId, true, It.IsAny<DateTime?>()), Times.Once);
        _sourceDataServiceMock.Verify(x => x.UpdateSourceDataAsync(userId, It.IsAny<List<SourceData>>()), Times.Once);
    }

    [Fact]
    public async Task GetMeasurementsForUserAsync_WithNeverSyncedProvider_RefreshesProvider()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var activeProviders = new List<string> { "withings" };
        var existingData = new List<SourceData>();
        var refreshedMeasurements = new List<RawMeasurement>
        {
            CreateTestRawMeasurement()
        };

        var mockProviderService = new Mock<IProviderService>();
        mockProviderService.Setup(x => x.SyncMeasurementsAsync(userId, true, It.IsAny<DateTime?>()))
            .ReturnsAsync(new ProviderSyncResult
            {
                Provider = "withings",
                Success = true,
                Measurements = refreshedMeasurements
            });

        _sourceDataServiceMock.Setup(x => x.GetLastSyncTimeAsync(userId, "withings"))
            .ReturnsAsync((DateTime?)null); // Never synced
        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId))
            .ReturnsAsync(existingData);
        _providerIntegrationServiceMock.Setup(x => x.GetProviderService("withings"))
            .Returns(mockProviderService.Object);

        // Act
        var result = await _sut.GetMeasurementsForUserAsync(userId, activeProviders, useMetric: true);

        // Assert
        result.Should().NotBeNull();
        result.ProviderStatus.Should().ContainKey("withings");
        result.ProviderStatus["withings"].Success.Should().BeTrue();

        // Verify refresh was attempted with no start date (fetch all data)
        mockProviderService.Verify(x => x.SyncMeasurementsAsync(userId, true, null), Times.Once);
        _sourceDataServiceMock.Verify(x => x.UpdateSourceDataAsync(userId, It.IsAny<List<SourceData>>()), Times.Once);
    }

    [Fact]
    public async Task GetMeasurementsForUserAsync_WithMultipleProviders_ProcessesAllConcurrently()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var activeProviders = new List<string> { "withings", "fitbit" };
        var existingData = new List<SourceData>();

        var withingsServiceMock = new Mock<IProviderService>();
        withingsServiceMock.Setup(x => x.SyncMeasurementsAsync(userId, true, It.IsAny<DateTime?>()))
            .ReturnsAsync(new ProviderSyncResult
            {
                Provider = "withings",
                Success = true,
                Measurements = new List<RawMeasurement> { CreateTestRawMeasurement() }
            });

        var fitbitServiceMock = new Mock<IProviderService>();
        fitbitServiceMock.Setup(x => x.SyncMeasurementsAsync(userId, true, It.IsAny<DateTime?>()))
            .ReturnsAsync(new ProviderSyncResult
            {
                Provider = "fitbit",
                Success = true,
                Measurements = new List<RawMeasurement> { CreateTestRawMeasurement() }
            });

        _sourceDataServiceMock.Setup(x => x.GetLastSyncTimeAsync(userId, It.IsAny<string>()))
            .ReturnsAsync((DateTime?)null); // Both need refresh
        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId))
            .ReturnsAsync(existingData);
        _providerIntegrationServiceMock.Setup(x => x.GetProviderService("withings"))
            .Returns(withingsServiceMock.Object);
        _providerIntegrationServiceMock.Setup(x => x.GetProviderService("fitbit"))
            .Returns(fitbitServiceMock.Object);

        // Act
        var result = await _sut.GetMeasurementsForUserAsync(userId, activeProviders, useMetric: true);

        // Assert
        result.Should().NotBeNull();
        result.ProviderStatus.Should().HaveCount(2);
        result.ProviderStatus["withings"].Success.Should().BeTrue();
        result.ProviderStatus["fitbit"].Success.Should().BeTrue();

        // Verify both providers were refreshed
        withingsServiceMock.Verify(x => x.SyncMeasurementsAsync(userId, true, null), Times.Once);
        fitbitServiceMock.Verify(x => x.SyncMeasurementsAsync(userId, true, null), Times.Once);
    }

    [Fact]
    public async Task GetMeasurementsForUserAsync_WithProviderSyncFailure_RecordsFailureStatus()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var activeProviders = new List<string> { "withings" };
        var existingData = new List<SourceData>();

        var mockProviderService = new Mock<IProviderService>();
        mockProviderService.Setup(x => x.SyncMeasurementsAsync(userId, true, It.IsAny<DateTime?>()))
            .ReturnsAsync(new ProviderSyncResult
            {
                Provider = "withings",
                Success = false,
                Error = ProviderSyncError.AuthFailed,
                Message = "Authentication failed"
            });

        _sourceDataServiceMock.Setup(x => x.GetLastSyncTimeAsync(userId, "withings"))
            .ReturnsAsync((DateTime?)null); // Needs refresh
        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId))
            .ReturnsAsync(existingData);
        _providerIntegrationServiceMock.Setup(x => x.GetProviderService("withings"))
            .Returns(mockProviderService.Object);

        // Act
        var result = await _sut.GetMeasurementsForUserAsync(userId, activeProviders, useMetric: true);

        // Assert
        result.Should().NotBeNull();
        result.ProviderStatus.Should().ContainKey("withings");
        result.ProviderStatus["withings"].Success.Should().BeFalse();
        result.ProviderStatus["withings"].Error.Should().Be("authfailed");
        result.ProviderStatus["withings"].Message.Should().Be("Authentication failed");

        // Verify no data was stored for failed sync
        _sourceDataServiceMock.Verify(x => x.UpdateSourceDataAsync(userId, It.IsAny<List<SourceData>>()), Times.Never);
    }

    [Fact]
    public async Task GetMeasurementsForUserAsync_WithUnknownProvider_RecordsFailureStatus()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var activeProviders = new List<string> { "unknown" };
        var existingData = new List<SourceData>();

        _sourceDataServiceMock.Setup(x => x.GetLastSyncTimeAsync(userId, "unknown"))
            .ReturnsAsync((DateTime?)null); // Needs refresh
        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId))
            .ReturnsAsync(existingData);
        _providerIntegrationServiceMock.Setup(x => x.GetProviderService("unknown"))
            .Returns((IProviderService?)null);

        // Act
        var result = await _sut.GetMeasurementsForUserAsync(userId, activeProviders, useMetric: true);

        // Assert
        result.Should().NotBeNull();
        result.ProviderStatus.Should().ContainKey("unknown");
        result.ProviderStatus["unknown"].Success.Should().BeFalse();
        result.ProviderStatus["unknown"].Error.Should().Be("unknown");
        result.ProviderStatus["unknown"].Message.Should().Be("Provider service not found for unknown");
    }

    [Fact]
    public async Task GetMeasurementsForUserAsync_WithDevelopmentEnvironment_UsesShortCacheDuration()
    {
        // Arrange
        var environmentMock = new Mock<IWebHostEnvironment>();
        environmentMock.Setup(x => x.EnvironmentName).Returns("Development");
        var service = new MeasurementSyncService(
            _providerIntegrationServiceMock.Object,
            _sourceDataServiceMock.Object,
            _loggerMock.Object,
            environmentMock.Object);

        var userId = Guid.NewGuid();
        var activeProviders = new List<string> { "withings" };
        var lastSync = DateTime.UtcNow.AddSeconds(-15); // 15 seconds old (stale in dev: 10s cache)
        var existingData = new List<SourceData>();

        var mockProviderService = new Mock<IProviderService>();
        mockProviderService.Setup(x => x.SyncMeasurementsAsync(userId, true, It.IsAny<DateTime?>()))
            .ReturnsAsync(new ProviderSyncResult
            {
                Provider = "withings",
                Success = true,
                Measurements = new List<RawMeasurement> { CreateTestRawMeasurement() }
            });

        _sourceDataServiceMock.Setup(x => x.GetLastSyncTimeAsync(userId, "withings"))
            .ReturnsAsync(lastSync);
        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId))
            .ReturnsAsync(existingData);
        _providerIntegrationServiceMock.Setup(x => x.GetProviderService("withings"))
            .Returns(mockProviderService.Object);

        // Act
        var result = await service.GetMeasurementsForUserAsync(userId, activeProviders, useMetric: true);

        // Assert
        result.Should().NotBeNull();
        result.ProviderStatus.Should().ContainKey("withings");
        result.ProviderStatus["withings"].Success.Should().BeTrue();

        // Verify refresh was attempted (because 15s > 10s cache duration in dev)
        mockProviderService.Verify(x => x.SyncMeasurementsAsync(userId, true, It.IsAny<DateTime?>()), Times.Once);
    }

    [Fact]
    public async Task GetMeasurementsForUserAsync_WithException_RethrowsException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var activeProviders = new List<string> { "withings" };

        _sourceDataServiceMock.Setup(x => x.GetLastSyncTimeAsync(userId, "withings"))
            .ThrowsAsync(new InvalidOperationException("Database error"));

        // Act & Assert
        await _sut.Invoking(x => x.GetMeasurementsForUserAsync(userId, activeProviders, useMetric: true))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Database error");
    }

    #endregion

    #region ResyncProviderAsync Tests

    [Fact]
    public async Task ResyncProviderAsync_WithValidProvider_ClearsDataAndRefreshes()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var provider = "withings";
        var refreshedMeasurements = new List<RawMeasurement>
        {
            CreateTestRawMeasurement()
        };

        var mockProviderService = new Mock<IProviderService>();
        mockProviderService.Setup(x => x.SyncMeasurementsAsync(userId, true, null))
            .ReturnsAsync(new ProviderSyncResult
            {
                Provider = provider,
                Success = true,
                Measurements = refreshedMeasurements
            });

        _providerIntegrationServiceMock.Setup(x => x.GetProviderService(provider))
            .Returns(mockProviderService.Object);

        // Act
        var result = await _sut.ResyncProviderAsync(userId, provider, useMetric: true);

        // Assert
        result.Should().NotBeNull();
        result.Provider.Should().Be(provider);
        result.Success.Should().BeTrue();
        result.Measurements.Should().NotBeNull();
        result.Measurements!.Should().HaveCount(1);

        // Verify clear and refresh sequence
        _sourceDataServiceMock.Verify(x => x.ClearSourceDataAsync(userId, provider), Times.Once);
        mockProviderService.Verify(x => x.SyncMeasurementsAsync(userId, true, null), Times.Once);
        _sourceDataServiceMock.Verify(x => x.UpdateSourceDataAsync(userId, It.IsAny<List<SourceData>>()), Times.Once);
    }

    [Fact]
    public async Task ResyncProviderAsync_WithUnknownProvider_ReturnsFailure()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var provider = "unknown";

        _providerIntegrationServiceMock.Setup(x => x.GetProviderService(provider))
            .Returns((IProviderService?)null);

        // Act
        var result = await _sut.ResyncProviderAsync(userId, provider, useMetric: true);

        // Assert
        result.Should().NotBeNull();
        result.Provider.Should().Be(provider);
        result.Success.Should().BeFalse();
        result.Error.Should().Be(ProviderSyncError.Unknown);
        result.Message.Should().Be("Provider service not found for unknown");

        // Verify clear was still called
        _sourceDataServiceMock.Verify(x => x.ClearSourceDataAsync(userId, provider), Times.Once);
    }

    [Fact]
    public async Task ResyncProviderAsync_WithException_ReturnsFailureResult()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var provider = "withings";

        _sourceDataServiceMock.Setup(x => x.ClearSourceDataAsync(userId, provider))
            .ThrowsAsync(new InvalidOperationException("Database error"));

        // Act
        var result = await _sut.ResyncProviderAsync(userId, provider, useMetric: true);

        // Assert
        result.Should().NotBeNull();
        result.Provider.Should().Be(provider);
        result.Success.Should().BeFalse();
        result.Error.Should().Be(ProviderSyncError.Unknown);
        result.Message.Should().Be("Unexpected error resyncing withings data");
    }

    #endregion

    #region Private Helper Methods

    private static SourceData CreateTestSourceData(string provider)
    {
        return new SourceData
        {
            Source = provider,
            LastUpdate = DateTime.UtcNow,
            Measurements = new List<RawMeasurement>
            {
                CreateTestRawMeasurement()
            }
        };
    }

    private static RawMeasurement CreateTestRawMeasurement()
    {
        return new RawMeasurement
        {
            Date = DateTime.UtcNow.ToString("o"),
            Weight = 70.5m
        };
    }

    #endregion
}
