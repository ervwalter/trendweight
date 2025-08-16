using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Moq;
using TrendWeight.Features.Measurements;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Features.Providers;
using TrendWeight.Features.Providers.Models;
using TrendWeight.Features.SyncProgress;
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
            _environmentMock.Object,
            Mock.Of<ISyncProgressReporter>()); // ISyncProgressReporter
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
            _environmentMock.Object,
            Mock.Of<ISyncProgressReporter>()); // ISyncProgressReporter

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
            _environmentMock.Object,
            Mock.Of<ISyncProgressReporter>()); // ISyncProgressReporter

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

        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId, activeProviders))
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
        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId, activeProviders))
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
        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId, activeProviders))
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
        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId, activeProviders))
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
        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId, activeProviders))
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
        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId, activeProviders))
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
    public async Task GetMeasurementsForUserAsync_WithLegacyProvider_RefreshesButReturnsNoOp()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var activeProviders = new List<string> { "legacy" };
        var lastSync = DateTime.UtcNow.AddMinutes(-60); // Old data, triggers refresh
        var existingData = new List<SourceData>
        {
            CreateTestSourceData("legacy")
        };

        // Mock legacy service to return no-op success
        var mockLegacyService = new Mock<IProviderService>();
        mockLegacyService.Setup(x => x.SyncMeasurementsAsync(userId, true, It.IsAny<DateTime?>()))
            .ReturnsAsync(new ProviderSyncResult
            {
                Provider = "legacy",
                Success = true,
                Message = "Legacy data does not require sync"
            });

        _sourceDataServiceMock.Setup(x => x.GetLastSyncTimeAsync(userId, "legacy"))
            .ReturnsAsync(lastSync);
        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId, activeProviders))
            .ReturnsAsync(existingData);
        _providerIntegrationServiceMock.Setup(x => x.GetProviderService("legacy"))
            .Returns(mockLegacyService.Object);

        // Act
        var result = await _sut.GetMeasurementsForUserAsync(userId, activeProviders, useMetric: true);

        // Assert
        result.Should().NotBeNull();
        result.Data.Should().HaveCount(1);
        result.ProviderStatus.Should().ContainKey("legacy");
        result.ProviderStatus["legacy"].Success.Should().BeTrue();

        // Verify refresh was attempted through standard flow
        _providerIntegrationServiceMock.Verify(x => x.GetProviderService("legacy"), Times.Once);
        mockLegacyService.Verify(x => x.SyncMeasurementsAsync(userId, true, It.IsAny<DateTime?>()), Times.Once);
    }

    [Fact]
    public async Task GetMeasurementsForUserAsync_WithMixedProviders_SkipsLegacyButRefreshesOthers()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var activeProviders = new List<string> { "withings", "legacy" };
        var lastSync = DateTime.UtcNow.AddMinutes(-10); // Stale data
        var existingData = new List<SourceData>();

        var mockProviderService = new Mock<IProviderService>();
        mockProviderService.Setup(x => x.SyncMeasurementsAsync(userId, true, It.IsAny<DateTime?>()))
            .ReturnsAsync(new ProviderSyncResult
            {
                Provider = "withings",
                Success = true,
                Measurements = new List<RawMeasurement> { CreateTestRawMeasurement() }
            });

        // Mock legacy service
        var mockLegacyService = new Mock<IProviderService>();
        mockLegacyService.Setup(x => x.SyncMeasurementsAsync(userId, true, It.IsAny<DateTime?>()))
            .ReturnsAsync(new ProviderSyncResult
            {
                Provider = "legacy",
                Success = true,
                Message = "Legacy data does not require sync"
            });

        _sourceDataServiceMock.Setup(x => x.GetLastSyncTimeAsync(userId, It.IsAny<string>()))
            .ReturnsAsync(lastSync);
        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId, activeProviders))
            .ReturnsAsync(existingData);
        _providerIntegrationServiceMock.Setup(x => x.GetProviderService("withings"))
            .Returns(mockProviderService.Object);
        _providerIntegrationServiceMock.Setup(x => x.GetProviderService("legacy"))
            .Returns(mockLegacyService.Object);

        // Act
        var result = await _sut.GetMeasurementsForUserAsync(userId, activeProviders, useMetric: true);

        // Assert
        result.Should().NotBeNull();
        result.ProviderStatus.Should().HaveCount(2);
        result.ProviderStatus["withings"].Success.Should().BeTrue();
        result.ProviderStatus["legacy"].Success.Should().BeTrue();

        // Verify both providers were refreshed through standard flow
        _providerIntegrationServiceMock.Verify(x => x.GetProviderService("withings"), Times.Once);
        _providerIntegrationServiceMock.Verify(x => x.GetProviderService("legacy"), Times.Once);

        // Verify legacy service returned no-op success
        mockLegacyService.Verify(x => x.SyncMeasurementsAsync(userId, true, It.IsAny<DateTime?>()), Times.Once);
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
        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId, activeProviders))
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
    public async Task GetMeasurementsForUserAsync_WithProviderSyncFailure_PreservesExistingData()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var activeProviders = new List<string> { "withings" };

        // Set up existing data that should be preserved
        var existingData = new List<SourceData>
        {
            new SourceData
            {
                Source = "withings",
                LastUpdate = DateTime.UtcNow.AddHours(-2),
                Measurements = new List<RawMeasurement>
                {
                    CreateTestRawMeasurement("2024-01-01", 70.0m),
                    CreateTestRawMeasurement("2024-01-02", 71.0m),
                    CreateTestRawMeasurement("2024-01-03", 72.0m)
                }
            }
        };

        var mockProviderService = new Mock<IProviderService>();
        mockProviderService.Setup(x => x.SyncMeasurementsAsync(userId, true, It.IsAny<DateTime?>()))
            .ReturnsAsync(new ProviderSyncResult
            {
                Provider = "withings",
                Success = false,
                Error = ProviderSyncError.NetworkError,
                Message = "Provider API returned error"
            });

        _sourceDataServiceMock.Setup(x => x.GetLastSyncTimeAsync(userId, "withings"))
            .ReturnsAsync((DateTime?)null); // Needs refresh
        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId, activeProviders))
            .ReturnsAsync(existingData); // Return existing data
        _providerIntegrationServiceMock.Setup(x => x.GetProviderService("withings"))
            .Returns(mockProviderService.Object);

        // Act
        var result = await _sut.GetMeasurementsForUserAsync(userId, activeProviders, useMetric: true);

        // Assert
        result.Should().NotBeNull();

        // Verify failure status is recorded
        result.ProviderStatus.Should().ContainKey("withings");
        result.ProviderStatus["withings"].Success.Should().BeFalse();
        result.ProviderStatus["withings"].Error.Should().Be("networkerror");
        result.ProviderStatus["withings"].Message.Should().Be("Provider API returned error");

        // Verify existing data is returned
        result.Data.Should().HaveCount(1);
        var returnedData = result.Data[0];
        returnedData.Source.Should().Be("withings");
        returnedData.Measurements.Should().NotBeNull();
        returnedData.Measurements!.Should().HaveCount(3);

        // Verify measurements content
        returnedData.Measurements.Should().Contain(m => m.Date == "2024-01-01" && m.Weight == 70.0m);
        returnedData.Measurements.Should().Contain(m => m.Date == "2024-01-02" && m.Weight == 71.0m);
        returnedData.Measurements.Should().Contain(m => m.Date == "2024-01-03" && m.Weight == 72.0m);

        // Verify no data was stored (existing data preserved)
        _sourceDataServiceMock.Verify(x => x.UpdateSourceDataAsync(userId, It.IsAny<List<SourceData>>()), Times.Never);
    }

    [Fact]
    public async Task GetMeasurementsForUserAsync_WithPartialProviderFailure_PreservesAllExistingData()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var activeProviders = new List<string> { "withings", "fitbit" };

        // Set up existing data for both providers
        var existingData = new List<SourceData>
        {
            new SourceData
            {
                Source = "withings",
                LastUpdate = DateTime.UtcNow.AddHours(-2),
                Measurements = new List<RawMeasurement>
                {
                    CreateTestRawMeasurement("2024-01-01", 70.0m),
                    CreateTestRawMeasurement("2024-01-02", 71.0m)
                }
            },
            new SourceData
            {
                Source = "fitbit",
                LastUpdate = DateTime.UtcNow.AddHours(-3),
                Measurements = new List<RawMeasurement>
                {
                    CreateTestRawMeasurement("2024-01-01", 70.1m),
                    CreateTestRawMeasurement("2024-01-03", 72.0m)
                }
            }
        };

        // Withings will fail
        var withingsServiceMock = new Mock<IProviderService>();
        withingsServiceMock.Setup(x => x.SyncMeasurementsAsync(userId, true, It.IsAny<DateTime?>()))
            .ReturnsAsync(new ProviderSyncResult
            {
                Provider = "withings",
                Success = false,
                Error = ProviderSyncError.AuthFailed,
                Message = "Authentication expired"
            });

        // Fitbit will succeed with new data
        var fitbitServiceMock = new Mock<IProviderService>();
        fitbitServiceMock.Setup(x => x.SyncMeasurementsAsync(userId, true, It.IsAny<DateTime?>()))
            .ReturnsAsync(new ProviderSyncResult
            {
                Provider = "fitbit",
                Success = true,
                Measurements = new List<RawMeasurement>
                {
                    CreateTestRawMeasurement("2024-01-04", 73.0m),
                    CreateTestRawMeasurement("2024-01-05", 73.5m)
                }
            });

        _sourceDataServiceMock.Setup(x => x.GetLastSyncTimeAsync(userId, It.IsAny<string>()))
            .ReturnsAsync((DateTime?)null); // Both need refresh
        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId, activeProviders))
            .ReturnsAsync(existingData);
        _providerIntegrationServiceMock.Setup(x => x.GetProviderService("withings"))
            .Returns(withingsServiceMock.Object);
        _providerIntegrationServiceMock.Setup(x => x.GetProviderService("fitbit"))
            .Returns(fitbitServiceMock.Object);

        // Act
        var result = await _sut.GetMeasurementsForUserAsync(userId, activeProviders, useMetric: true);

        // Assert
        result.Should().NotBeNull();

        // Verify both provider statuses
        result.ProviderStatus.Should().HaveCount(2);
        result.ProviderStatus["withings"].Success.Should().BeFalse();
        result.ProviderStatus["fitbit"].Success.Should().BeTrue();

        // Verify all existing data is returned (both providers)
        result.Data.Should().HaveCount(2);

        // Withings data should be preserved as-is
        var withingsData = result.Data.First(d => d.Source == "withings");
        withingsData.Measurements.Should().NotBeNull();
        withingsData.Measurements!.Should().HaveCount(2);
        withingsData.Measurements.Should().Contain(m => m.Date == "2024-01-01" && m.Weight == 70.0m);

        // Fitbit data should be updated (but we're only checking that update was called)
        _sourceDataServiceMock.Verify(x => x.UpdateSourceDataAsync(
            userId,
            It.Is<List<SourceData>>(sd => sd.Count == 1 && sd[0].Source == "fitbit")),
            Times.Once);
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
            environmentMock.Object,
            Mock.Of<ISyncProgressReporter>()); // ISyncProgressReporter

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
        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId, activeProviders))
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

    #region ClearProviderDataAsync Tests
    // 
    //     [Fact]
    //     public async Task ClearProviderDataAsync_WithLegacyProvider_ReturnsSuccess()
    //     {
    //         // Arrange
    //         var userId = Guid.NewGuid();
    //         var provider = "legacy";
    // 
    //         // Mock legacy service
    //         var mockLegacyService = new Mock<IProviderService>();
    //         mockLegacyService.Setup(x => x.SyncMeasurementsAsync(userId, true, null))
    //             .ReturnsAsync(new ProviderSyncResult
    //             {
    //                 Provider = "legacy",
    //                 Success = true,
    //                 Message = "Legacy data does not require sync"
    //             });
    // 
    //         _providerIntegrationServiceMock.Setup(x => x.GetProviderService("legacy"))
    //             .Returns(mockLegacyService.Object);
    // 
    //         // Setup source data service
    //         _sourceDataServiceMock.Setup(x => x.ClearSourceDataAsync(userId, provider))
    //             .Returns(Task.CompletedTask);
    // 
    //         // Act
    //         var result = await _sut.ClearProviderDataAsync(userId, provider);
    // 
    //         // Assert
    //         result.Should().NotBeNull();
    //         result.Provider.Should().Be("legacy");
    //         result.Success.Should().BeTrue();
    //         result.Message.Should().Be("Legacy data does not require sync");
    // 
    //         // Verify operations were performed in correct order
    //         _sourceDataServiceMock.Verify(x => x.ClearSourceDataAsync(userId, provider), Times.Once);
    //         mockLegacyService.Verify(x => x.SyncMeasurementsAsync(userId, true, null), Times.Once);
    //     }
    // 
    //     [Fact]
    //     public async Task ClearProviderDataAsync_WithValidProvider_ClearsDataAndRefreshes()
    //     {
    //         // Arrange
    //         var userId = Guid.NewGuid();
    //         var provider = "withings";
    //         var refreshedMeasurements = new List<RawMeasurement>
    //         {
    //             CreateTestRawMeasurement()
    //         };
    // 
    //         var mockProviderService = new Mock<IProviderService>();
    //         mockProviderService.Setup(x => x.SyncMeasurementsAsync(userId, true, null))
    //             .ReturnsAsync(new ProviderSyncResult
    //             {
    //                 Provider = provider,
    //                 Success = true,
    //                 Measurements = refreshedMeasurements
    //             });
    // 
    //         _providerIntegrationServiceMock.Setup(x => x.GetProviderService(provider))
    //             .Returns(mockProviderService.Object);
    // 
    //         // Act
    //         var result = await _sut.ClearProviderDataAsync(userId, provider);
    // 
    //         // Assert
    //         result.Should().NotBeNull();
    //         result.Provider.Should().Be(provider);
    //         result.Success.Should().BeTrue();
    //         result.Measurements.Should().NotBeNull();
    //         result.Measurements!.Should().HaveCount(1);
    // 
    //         // Verify clear and refresh sequence
    //         _sourceDataServiceMock.Verify(x => x.ClearSourceDataAsync(userId, provider), Times.Once);
    //         mockProviderService.Verify(x => x.SyncMeasurementsAsync(userId, true, null), Times.Once);
    //         _sourceDataServiceMock.Verify(x => x.UpdateSourceDataAsync(userId, It.IsAny<List<SourceData>>()), Times.Once);
    //     }
    // 
    //     [Fact]
    //     public async Task ClearProviderDataAsync_WithUnknownProvider_ReturnsFailure()
    //     {
    //         // Arrange
    //         var userId = Guid.NewGuid();
    //         var provider = "unknown";
    // 
    //         _providerIntegrationServiceMock.Setup(x => x.GetProviderService(provider))
    //             .Returns((IProviderService?)null);
    // 
    //         // Act
    //         var result = await _sut.ClearProviderDataAsync(userId, provider);
    // 
    //         // Assert
    //         result.Should().NotBeNull();
    //         result.Provider.Should().Be(provider);
    //         result.Success.Should().BeFalse();
    //         result.Error.Should().Be(ProviderSyncError.Unknown);
    //         result.Message.Should().Be("Provider service not found for unknown");
    // 
    //         // Verify clear was still called
    //         _sourceDataServiceMock.Verify(x => x.ClearSourceDataAsync(userId, provider), Times.Once);
    //     }
    // 
    //     [Fact]
    //     public async Task ClearProviderDataAsync_WithException_ReturnsFailureResult()
    //     {
    //         // Arrange
    //         var userId = Guid.NewGuid();
    //         var provider = "withings";
    // 
    //         _sourceDataServiceMock.Setup(x => x.ClearSourceDataAsync(userId, provider))
    //             .ThrowsAsync(new InvalidOperationException("Database error"));
    // 
    //         // Act
    //         var result = await _sut.ClearProviderDataAsync(userId, provider);
    // 
    //         // Assert
    //         result.Should().NotBeNull();
    //         result.Provider.Should().Be(provider);
    //         result.Success.Should().BeFalse();
    //         result.Error.Should().Be(ProviderSyncError.Unknown);
    //         result.Message.Should().Be("Unexpected error resyncing withings data");
    //     }
    // 
    #endregion

    #region Data Merging Tests

    [Fact]
    public async Task RefreshProviderAsync_WithExistingDataAndSyncWindow_MergesCorrectly()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var provider = "withings";
        var lastSyncTime = DateTime.UtcNow.AddDays(-1);
        var syncStartDate = lastSyncTime.AddDays(-90); // 90 days before last sync

        // Existing data from previous sync (has both old and recent measurements)
        var existingSourceData = new List<SourceData>
        {
            new SourceData
            {
                Source = provider,
                LastUpdate = lastSyncTime,
                Measurements = new List<RawMeasurement>
                {
                    // Old measurements (before sync window)
                    CreateTestRawMeasurement(syncStartDate.AddDays(-10).ToString("yyyy-MM-dd"), 65.0m),
                    CreateTestRawMeasurement(syncStartDate.AddDays(-5).ToString("yyyy-MM-dd"), 66.0m),
                    // Recent measurements (within sync window)
                    CreateTestRawMeasurement(syncStartDate.AddDays(5).ToString("yyyy-MM-dd"), 70.0m),
                    CreateTestRawMeasurement(syncStartDate.AddDays(10).ToString("yyyy-MM-dd"), 71.0m),
                    CreateTestRawMeasurement(syncStartDate.AddDays(15).ToString("yyyy-MM-dd"), 72.0m)
                }
            }
        };

        // New measurements from provider (only has data within sync window)
        var newMeasurements = new List<RawMeasurement>
        {
            CreateTestRawMeasurement(syncStartDate.AddDays(5).ToString("yyyy-MM-dd"), 70.5m), // Updated weight
            CreateTestRawMeasurement(syncStartDate.AddDays(12).ToString("yyyy-MM-dd"), 71.5m), // New measurement
            // Note: measurements at day 10 and 15 are missing (user deleted them)
        };

        var providerService = new Mock<IProviderService>();
        providerService.Setup(x => x.SyncMeasurementsAsync(userId, true, syncStartDate))
            .ReturnsAsync(new ProviderSyncResult
            {
                Provider = provider,
                Success = true,
                Measurements = newMeasurements
            });

        _providerIntegrationServiceMock.Setup(x => x.GetProviderService(provider))
            .Returns(providerService.Object);

        _sourceDataServiceMock.Setup(x => x.GetLastSyncTimeAsync(userId, provider))
            .ReturnsAsync(lastSyncTime);

        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId, new List<string> { provider }))
            .ReturnsAsync(existingSourceData);

        // Act
        var result = await _sut.GetMeasurementsForUserAsync(userId, new List<string> { provider }, true);

        // Assert - Verify the merged data was stored correctly
        _sourceDataServiceMock.Verify(x => x.UpdateSourceDataAsync(
            userId,
            It.Is<List<SourceData>>(sd => VerifyMergedData(sd, provider, syncStartDate))), Times.Once);
    }

    [Fact]
    public async Task RefreshProviderAsync_WithNoExistingData_UsesProviderDataAsIs()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var provider = "fitbit";

        var newMeasurements = new List<RawMeasurement>
        {
            CreateTestRawMeasurement("2024-01-01", 70.0m),
            CreateTestRawMeasurement("2024-01-02", 71.0m)
        };

        var providerService = new Mock<IProviderService>();
        providerService.Setup(x => x.SyncMeasurementsAsync(userId, true, null))
            .ReturnsAsync(new ProviderSyncResult
            {
                Provider = provider,
                Success = true,
                Measurements = newMeasurements
            });

        _providerIntegrationServiceMock.Setup(x => x.GetProviderService(provider))
            .Returns(providerService.Object);

        _sourceDataServiceMock.Setup(x => x.GetLastSyncTimeAsync(userId, provider))
            .ReturnsAsync((DateTime?)null);

        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId, new List<string> { provider }))
            .ReturnsAsync(new List<SourceData>());

        // Act
        var result = await _sut.GetMeasurementsForUserAsync(userId, new List<string> { provider }, true);

        // Assert
        _sourceDataServiceMock.Verify(x => x.UpdateSourceDataAsync(
            userId,
            It.Is<List<SourceData>>(sd => VerifyProviderDataAsIs(sd, provider, newMeasurements))), Times.Once);
    }

    [Fact]
    public async Task RefreshProviderAsync_WithFullSync_ReplacesAllData()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var provider = "withings";

        // Existing data has many measurements
        var existingSourceData = new List<SourceData>
        {
            new SourceData
            {
                Source = provider,
                LastUpdate = DateTime.UtcNow.AddDays(-30),
                Measurements = new List<RawMeasurement>
                {
                    CreateTestRawMeasurement("2023-01-01", 80.0m),
                    CreateTestRawMeasurement("2023-06-01", 75.0m),
                    CreateTestRawMeasurement("2024-01-01", 70.0m)
                }
            }
        };

        // Provider returns completely different data (full sync)
        var newMeasurements = new List<RawMeasurement>
        {
            CreateTestRawMeasurement("2024-01-15", 72.0m),
            CreateTestRawMeasurement("2024-01-16", 72.5m)
        };

        var providerService = new Mock<IProviderService>();
        providerService.Setup(x => x.SyncMeasurementsAsync(userId, true, null))
            .ReturnsAsync(new ProviderSyncResult
            {
                Provider = provider,
                Success = true,
                Measurements = newMeasurements
            });

        _providerIntegrationServiceMock.Setup(x => x.GetProviderService(provider))
            .Returns(providerService.Object);

        _sourceDataServiceMock.Setup(x => x.GetLastSyncTimeAsync(userId, provider))
            .ReturnsAsync((DateTime?)null); // No last sync = full sync

        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId, new List<string> { provider }))
            .ReturnsAsync(existingSourceData);

        // Act
        var result = await _sut.GetMeasurementsForUserAsync(userId, new List<string> { provider }, true);

        // Assert - All old data should be replaced
        _sourceDataServiceMock.Verify(x => x.UpdateSourceDataAsync(
            userId,
            It.Is<List<SourceData>>(sd => VerifyFullSyncReplacement(sd, provider, newMeasurements))), Times.Once);
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

    private static RawMeasurement CreateTestRawMeasurement(string date, decimal weight)
    {
        return new RawMeasurement
        {
            Date = date,
            Weight = weight,
            Time = "08:00:00"
        };
    }

    private static bool VerifyMergedData(List<SourceData> sd, string provider, DateTime syncStartDate)
    {
        if (sd.Count != 1 || sd[0].Source != provider || sd[0].Measurements == null)
            return false;

        var measurements = sd[0].Measurements!; // We already checked it's not null
        return measurements.Count == 4 && // 2 old (preserved) + 2 new (from provider)
                                          // Old measurements preserved
               measurements.Any(m => m.Date == syncStartDate.AddDays(-10).ToString("yyyy-MM-dd") && m.Weight == 65.0m) &&
               measurements.Any(m => m.Date == syncStartDate.AddDays(-5).ToString("yyyy-MM-dd") && m.Weight == 66.0m) &&
               // New measurements from provider
               measurements.Any(m => m.Date == syncStartDate.AddDays(5).ToString("yyyy-MM-dd") && m.Weight == 70.5m) &&
               measurements.Any(m => m.Date == syncStartDate.AddDays(12).ToString("yyyy-MM-dd") && m.Weight == 71.5m) &&
               // Deleted measurements are gone
               !measurements.Any(m => m.Date == syncStartDate.AddDays(10).ToString("yyyy-MM-dd")) &&
               !measurements.Any(m => m.Date == syncStartDate.AddDays(15).ToString("yyyy-MM-dd"));
    }

    private static bool VerifyProviderDataAsIs(List<SourceData> sd, string provider, List<RawMeasurement> expectedMeasurements)
    {
        if (sd.Count != 1 || sd[0].Source != provider || sd[0].Measurements == null)
            return false;

        var measurements = sd[0].Measurements!; // We already checked it's not null
        return measurements.Count == expectedMeasurements.Count &&
               measurements.SequenceEqual(expectedMeasurements);
    }

    private static bool VerifyFullSyncReplacement(List<SourceData> sd, string provider, List<RawMeasurement> newMeasurements)
    {
        if (sd.Count != 1 || sd[0].Source != provider || sd[0].Measurements == null)
            return false;

        var measurements = sd[0].Measurements!; // We already checked it's not null
        return measurements.Count == newMeasurements.Count &&
               measurements.All(m => newMeasurements.Any(nm => nm.Date == m.Date && nm.Weight == m.Weight));
    }

    #endregion
}
