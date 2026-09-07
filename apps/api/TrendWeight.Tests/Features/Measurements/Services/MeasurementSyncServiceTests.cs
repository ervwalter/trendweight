using Supabase.Interfaces;
using Supabase.Realtime;
using TrendWeight.Infrastructure.DataAccess;
using TrendWeight.Infrastructure.DataAccess.Models;
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
    public async Task GetMeasurementsForUserAsync_WithStaleLegacyProvider_SkipsRefreshAndReportsSuccess()
    {
        // Legacy data is imported once and its last_sync is never rewritten, so it would
        // look stale forever; it must never be scheduled as a refresh or trigger the
        // "Downloading data from providers..." broadcast
        var userId = Guid.NewGuid();
        var activeProviders = new List<string> { "legacy" };
        var existingData = new List<SourceData>
        {
            CreateTestSourceData("legacy")
        };

        _sourceDataServiceMock.Setup(x => x.GetLastSyncTimeAsync(userId, "legacy"))
            .ReturnsAsync(DateTime.UtcNow.AddDays(-400));
        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId, activeProviders))
            .ReturnsAsync(existingData);

        var progressReporterMock = new Mock<ISyncProgressReporter>();
        var sut = new MeasurementSyncService(
            _providerIntegrationServiceMock.Object,
            _sourceDataServiceMock.Object,
            _loggerMock.Object,
            _environmentMock.Object,
            progressReporterMock.Object);

        var result = await sut.GetMeasurementsForUserAsync(userId, activeProviders, useMetric: true);

        result.Data.Should().HaveCount(1);
        result.ProviderStatus.Should().ContainKey("legacy");
        result.ProviderStatus["legacy"].Success.Should().BeTrue();
        result.ProviderStatus["legacy"].Error.Should().BeNull();

        _providerIntegrationServiceMock.Verify(x => x.GetProviderService(It.IsAny<string>()), Times.Never);
        _sourceDataServiceMock.Verify(x => x.GetLastSyncTimeAsync(userId, "legacy"), Times.Never);
        _sourceDataServiceMock.Verify(x => x.GetForceFullSyncAsync(userId, "legacy"), Times.Never);
        _sourceDataServiceMock.Verify(x => x.UpdateSourceDataAsync(userId, It.IsAny<List<SourceData>>()), Times.Never);
        progressReporterMock.Verify(
            x => x.ReportSyncProgressAsync(It.IsAny<string>(), It.Is<string>(m => m.Contains("Downloading"))),
            Times.Never);
        progressReporterMock.Verify(
            x => x.ReportProviderProgressAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<int?>(), It.IsAny<int?>()),
            Times.Never);
    }

    [Fact]
    public async Task GetMeasurementsForUserAsync_WithMixedProviders_RefreshesOnlySyncingProviders()
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

        _sourceDataServiceMock.Setup(x => x.GetLastSyncTimeAsync(userId, It.IsAny<string>()))
            .ReturnsAsync(lastSync);
        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId, activeProviders))
            .ReturnsAsync(existingData);
        _providerIntegrationServiceMock.Setup(x => x.GetProviderService("withings"))
            .Returns(mockProviderService.Object);

        var progressReporterMock = new Mock<ISyncProgressReporter>();
        var sut = new MeasurementSyncService(
            _providerIntegrationServiceMock.Object,
            _sourceDataServiceMock.Object,
            _loggerMock.Object,
            _environmentMock.Object,
            progressReporterMock.Object);

        // Act
        var result = await sut.GetMeasurementsForUserAsync(userId, activeProviders, useMetric: true);

        // Assert
        result.Should().NotBeNull();
        result.ProviderStatus.Should().HaveCount(2);
        result.ProviderStatus["withings"].Success.Should().BeTrue();
        result.ProviderStatus["legacy"].Success.Should().BeTrue();

        // Only withings goes through the refresh flow; the download broadcast is for it alone
        _providerIntegrationServiceMock.Verify(x => x.GetProviderService("withings"), Times.Once);
        _providerIntegrationServiceMock.Verify(x => x.GetProviderService("legacy"), Times.Never);
        mockProviderService.Verify(x => x.SyncMeasurementsAsync(userId, true, It.IsAny<DateTime?>()), Times.Once);
        progressReporterMock.Verify(
            x => x.ReportSyncProgressAsync("running", It.Is<string>(m => m.Contains("Downloading"))),
            Times.Once);
        progressReporterMock.Verify(
            x => x.ReportProviderProgressAsync("legacy", It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<int?>(), It.IsAny<int?>()),
            Times.Never);
    }

    [Fact]
    public async Task GetMeasurementsForUserAsync_WithStaleManualProvider_SkipsRefreshWithoutStoreOrProgress()
    {
        // Manual readings are stale whenever the user has not edited the log recently;
        // they are already stored, so no refresh, store, or progress message is warranted
        var userId = Guid.NewGuid();
        var activeProviders = new List<string> { "manual" };
        var existingData = new List<SourceData>
        {
            CreateTestSourceData("manual")
        };

        _sourceDataServiceMock.Setup(x => x.GetLastSyncTimeAsync(userId, "manual"))
            .ReturnsAsync(DateTime.UtcNow.AddMinutes(-60));
        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId, activeProviders))
            .ReturnsAsync(existingData);

        var progressReporterMock = new Mock<ISyncProgressReporter>();
        var sut = new MeasurementSyncService(
            _providerIntegrationServiceMock.Object,
            _sourceDataServiceMock.Object,
            _loggerMock.Object,
            _environmentMock.Object,
            progressReporterMock.Object);

        // Act
        var result = await sut.GetMeasurementsForUserAsync(userId, activeProviders, useMetric: true);

        // Assert
        result.Should().NotBeNull();
        result.Data.Should().HaveCount(1);
        result.ProviderStatus.Should().ContainKey("manual");
        result.ProviderStatus["manual"].Success.Should().BeTrue();

        _providerIntegrationServiceMock.Verify(x => x.GetProviderService(It.IsAny<string>()), Times.Never);
        _sourceDataServiceMock.Verify(x => x.UpdateSourceDataAsync(userId, It.IsAny<List<SourceData>>()), Times.Never);
        progressReporterMock.Verify(
            x => x.ReportSyncProgressAsync(It.IsAny<string>(), It.Is<string>(m => m.Contains("Downloading"))),
            Times.Never);
        progressReporterMock.Verify(
            x => x.ReportProviderProgressAsync("manual", It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<int?>(), It.IsAny<int?>()),
            Times.Never);
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

    #region RequestFullSyncAsync Tests

    [Fact]
    public async Task RequestFullSyncAsync_QueuesOnlyRequestedProvider()
    {
        var userId = Guid.NewGuid();

        var result = await _sut.RequestFullSyncAsync(userId, "withings");

        result.Success.Should().BeTrue();
        result.Provider.Should().Be("withings");
        _sourceDataServiceMock.Verify(x => x.RequestFullSyncAsync(userId, "withings"), Times.Once);
        _providerIntegrationServiceMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task RequestedResync_ThenFailedProviderFetch_RetainsReadingsAndLastSync()
    {
        var userId = Guid.NewGuid();
        var lastSync = DateTime.UtcNow.ToString("o");
        var readings = new List<RawMeasurement> { CreateTestRawMeasurement("2024-01-01", 80m) };
        var cachedRow = new DbSourceData
        {
            Uid = userId,
            Provider = "withings",
            LastSync = lastSync,
            Measurements = readings
        };
        var storedRow = new DbSourceData
        {
            Uid = userId,
            Provider = "withings",
            LastSync = lastSync,
            Measurements = readings
        };
        var database = new Mock<ISupabaseService>();
        database.SetupSequence(x => x.QueryAsync<DbSourceData>(
                It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ReturnsAsync(new List<DbSourceData> { cachedRow })
            .ReturnsAsync(new List<DbSourceData> { storedRow })
            .ReturnsAsync(new List<DbSourceData> { storedRow });
        var sourceData = new SourceDataService(database.Object, Mock.Of<ILogger<SourceDataService>>());
        var sync = new MeasurementSyncService(_providerIntegrationServiceMock.Object, sourceData,
            _loggerMock.Object, _environmentMock.Object, Mock.Of<ISyncProgressReporter>());
        var provider = new Mock<IProviderService>();
        provider.Setup(x => x.SyncMeasurementsAsync(userId, true, null))
            .ReturnsAsync(new ProviderSyncResult { Provider = "withings", Success = false });
        _providerIntegrationServiceMock.Setup(x => x.GetProviderService("withings")).Returns(provider.Object);
        await sourceData.GetLastSyncTimeAsync(userId, "withings"); // Prime the request-scoped cache.

        var queued = await sync.RequestFullSyncAsync(userId, "withings");
        var result = await sync.GetMeasurementsForUserAsync(userId, new() { "withings" }, true);

        queued.Success.Should().BeTrue();
        result.ProviderStatus["withings"].Success.Should().BeFalse();
        result.Data.Single().Measurements.Should().BeEquivalentTo(readings);
        storedRow.LastSync.Should().Be(lastSync);
        storedRow.ForceFullSync.Should().BeTrue("failed refreshes must remain retryable");
        database.Verify(x => x.UpdateAsync(It.Is<DbSourceData>(row =>
            row.Measurements == readings && row.LastSync == lastSync && row.ForceFullSync)), Times.Once);
        database.Verify(x => x.QueryAsync<DbSourceData>(
            It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()), Times.Exactly(3));
        provider.Verify(x => x.SyncMeasurementsAsync(userId, true, null), Times.Once);
    }

    [Fact]
    public async Task RequestFullSyncAsync_DatabaseFailureReturnsFailure()
    {
        var userId = Guid.NewGuid();
        _sourceDataServiceMock.Setup(x => x.RequestFullSyncAsync(userId, "withings"))
            .ThrowsAsync(new InvalidOperationException("Database error"));

        var result = await _sut.RequestFullSyncAsync(userId, "withings");

        result.Success.Should().BeFalse();
        result.Error.Should().Be(ProviderSyncError.Unknown);
    }

    #endregion

    #region Data Merging Tests

    [Fact]
    public async Task RefreshProviderAsync_WithExistingDataAndSyncWindow_MergesCorrectly()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var provider = "withings";
        var lastSyncTime = DateTime.UtcNow.AddDays(-1);
        var syncStartDate = lastSyncTime.AddDays(-90); // Fetch starts 90 days before last sync
        var cutoffDate = syncStartDate.AddDays(2); // Splice at 88 days before last sync (2-day buffer)

        // Existing data from previous sync (has both old and recent measurements)
        var existingSourceData = new List<SourceData>
        {
            new SourceData
            {
                Source = provider,
                LastUpdate = lastSyncTime,
                Measurements = new List<RawMeasurement>
                {
                    // Old measurements (before cutoff at day -88, should be preserved)
                    CreateTestRawMeasurement(syncStartDate.AddDays(-10).ToString("yyyy-MM-dd"), 65.0m), // day -100
                    CreateTestRawMeasurement(syncStartDate.AddDays(-5).ToString("yyyy-MM-dd"), 66.0m),  // day -95
                    // Recent measurements (after cutoff, should be replaced by provider data)
                    CreateTestRawMeasurement(syncStartDate.AddDays(5).ToString("yyyy-MM-dd"), 70.0m),   // day -85
                    CreateTestRawMeasurement(syncStartDate.AddDays(10).ToString("yyyy-MM-dd"), 71.0m),  // day -80
                    CreateTestRawMeasurement(syncStartDate.AddDays(15).ToString("yyyy-MM-dd"), 72.0m)   // day -75
                }
            }
        };

        // New measurements from provider (fetched from day -90, truncated to day -88 onwards)
        var newMeasurements = new List<RawMeasurement>
        {
            CreateTestRawMeasurement(syncStartDate.AddDays(5).ToString("yyyy-MM-dd"), 70.5m),  // day -85, updated weight
            CreateTestRawMeasurement(syncStartDate.AddDays(12).ToString("yyyy-MM-dd"), 71.5m), // day -78, new measurement
            // Note: measurements at days -80 and -75 are missing (user deleted them upstream)
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

    [Fact]
    public async Task GetMeasurementsForUserAsync_WithForceFullSyncFlag_ReplacesDataOnlyAfterSuccessfulFullSync()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var provider = "fitbit";

        // Existing data exists
        var existingSourceData = new List<SourceData>
        {
            new SourceData
            {
                Source = provider,
                LastUpdate = DateTime.UtcNow.AddDays(-30),
                Measurements = new List<RawMeasurement>
                {
                    CreateTestRawMeasurement("2024-01-01", 70.0m),
                    CreateTestRawMeasurement("2024-01-02", 71.0m)
                }
            }
        };

        // New measurements from full sync
        var newMeasurements = new List<RawMeasurement>
        {
            CreateTestRawMeasurement("2024-01-01", 70.5m), // Updated
            CreateTestRawMeasurement("2024-01-02", 71.5m), // Updated
            CreateTestRawMeasurement("2024-01-03", 72.0m)  // New
        };

        var providerService = new Mock<IProviderService>();
        // A full sync must ignore the last-sync timestamp without clearing stored data.
        providerService.Setup(x => x.SyncMeasurementsAsync(userId, true, null))
            .ReturnsAsync(new ProviderSyncResult
            {
                Provider = provider,
                Success = true,
                Measurements = newMeasurements
            });

        _providerIntegrationServiceMock.Setup(x => x.GetProviderService(provider))
            .Returns(providerService.Object);

        // Mock force_full_sync flag to return true
        _sourceDataServiceMock.Setup(x => x.GetForceFullSyncAsync(userId, provider))
            .ReturnsAsync(true);

        // Even freshly synced data must refresh when the full-sync flag is set.
        _sourceDataServiceMock.Setup(x => x.GetLastSyncTimeAsync(userId, provider))
            .ReturnsAsync(DateTime.UtcNow);

        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId, new List<string> { provider }))
            .ReturnsAsync(existingSourceData);

        // Act
        var result = await _sut.GetMeasurementsForUserAsync(userId, new List<string> { provider }, true);

        // Assert
        providerService.Verify(x => x.SyncMeasurementsAsync(userId, true, null), Times.Once,
            "Should perform full sync (startDate = null) after force_full_sync flag is detected");

        // The fetched array replaces the old array, without retaining deleted provider readings.
        _sourceDataServiceMock.Verify(x => x.UpdateSourceDataAsync(
            userId,
            It.Is<List<SourceData>>(sd => VerifyFullSyncReplacement(sd, provider, newMeasurements))), Times.Once);
    }

    [Fact]
    public async Task GetMeasurementsForUserAsync_FailedForcedSyncPreservesLastGoodData()
    {
        var userId = Guid.NewGuid();
        var readings = new List<SourceData>
        {
            new() { Source = "fitbit", Measurements = new() { CreateTestRawMeasurement("2024-01-01", 80m) } }
        };
        var providerService = new Mock<IProviderService>();
        providerService.Setup(x => x.SyncMeasurementsAsync(userId, true, null))
            .ReturnsAsync(new ProviderSyncResult { Provider = "fitbit", Success = false });
        _providerIntegrationServiceMock.Setup(x => x.GetProviderService("fitbit")).Returns(providerService.Object);
        _sourceDataServiceMock.Setup(x => x.GetForceFullSyncAsync(userId, "fitbit")).ReturnsAsync(true);
        _sourceDataServiceMock.Setup(x => x.GetLastSyncTimeAsync(userId, "fitbit")).ReturnsAsync(DateTime.UtcNow);
        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId, It.IsAny<List<string>>())).ReturnsAsync(readings);

        var result = await _sut.GetMeasurementsForUserAsync(userId, new() { "fitbit" }, true);

        result.Data.Should().BeSameAs(readings);
        result.ProviderStatus["fitbit"].Success.Should().BeFalse();
        providerService.Verify(x => x.SyncMeasurementsAsync(userId, true, null), Times.Once);
        _sourceDataServiceMock.Verify(x => x.UpdateSourceDataAsync(It.IsAny<Guid>(), It.IsAny<List<SourceData>>()), Times.Never);
    }

    [Fact]
    public async Task RefreshProviderAsync_WithBoundaryMeasurements_HandlesBufferZoneCorrectly()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var provider = "fitbit";
        var lastSyncTime = DateTime.UtcNow.AddDays(-1);
        var syncStartDate = lastSyncTime.AddDays(-90); // Fetch starts at day -90
        var cutoffDate = syncStartDate.AddDays(2);     // Cutoff at day -88 (2-day buffer)

        // Existing data includes measurements in the buffer zone (days -90, -89)
        var existingSourceData = new List<SourceData>
        {
            new SourceData
            {
                Source = provider,
                LastUpdate = lastSyncTime,
                Measurements = new List<RawMeasurement>
                {
                    // Well before buffer zone (should be preserved)
                    CreateTestRawMeasurement(syncStartDate.AddDays(-5).ToString("yyyy-MM-dd"), 64.0m),  // day -95
                    CreateTestRawMeasurement(syncStartDate.AddDays(-3).ToString("yyyy-MM-dd"), 65.0m),  // day -93

                    // In buffer zone (should be DISCARDED)
                    CreateTestRawMeasurement(syncStartDate.AddDays(0).ToString("yyyy-MM-dd"), 66.0m),   // day -90 (boundary!)
                    CreateTestRawMeasurement(syncStartDate.AddDays(1).ToString("yyyy-MM-dd"), 67.0m),   // day -89

                    // At cutoff and after (should be REPLACED by provider data)
                    CreateTestRawMeasurement(cutoffDate.ToString("yyyy-MM-dd"), 68.0m),                 // day -88 (cutoff)
                    CreateTestRawMeasurement(syncStartDate.AddDays(5).ToString("yyyy-MM-dd"), 69.0m)    // day -85
                }
            }
        };

        // Provider returns measurements from day -90 onwards (but we truncate to day -88)
        var newMeasurements = new List<RawMeasurement>
        {
            // These are in buffer zone (days -90, -89) - will be truncated out
            CreateTestRawMeasurement(syncStartDate.AddDays(0).ToString("yyyy-MM-dd"), 66.5m),  // day -90
            CreateTestRawMeasurement(syncStartDate.AddDays(1).ToString("yyyy-MM-dd"), 67.5m),  // day -89

            // These are at/after cutoff (day -88+) - will be used
            CreateTestRawMeasurement(cutoffDate.ToString("yyyy-MM-dd"), 68.5m),                // day -88 (updated)
            CreateTestRawMeasurement(syncStartDate.AddDays(5).ToString("yyyy-MM-dd"), 70.0m),  // day -85 (updated)
            CreateTestRawMeasurement(syncStartDate.AddDays(10).ToString("yyyy-MM-dd"), 71.0m)  // day -80 (new)
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

        _sourceDataServiceMock.Setup(x => x.GetForceFullSyncAsync(userId, provider))
            .ReturnsAsync(false);

        _sourceDataServiceMock.Setup(x => x.GetLastSyncTimeAsync(userId, provider))
            .ReturnsAsync(lastSyncTime);

        _sourceDataServiceMock.Setup(x => x.GetSourceDataAsync(userId, new List<string> { provider }))
            .ReturnsAsync(existingSourceData);

        // Act
        var result = await _sut.GetMeasurementsForUserAsync(userId, new List<string> { provider }, true);

        // Assert
        // Verify UpdateSourceDataAsync was called
        _sourceDataServiceMock.Verify(x => x.UpdateSourceDataAsync(userId, It.IsAny<List<SourceData>>()), Times.Once);

        // Capture what was actually passed to verify the boundary handling
        List<SourceData>? capturedData = null;
        _sourceDataServiceMock.Verify(x => x.UpdateSourceDataAsync(userId, It.IsAny<List<SourceData>>()), Times.Once);
        _sourceDataServiceMock.Invocations
            .Where(i => i.Method.Name == "UpdateSourceDataAsync")
            .Select(i => i.Arguments[1] as List<SourceData>)
            .FirstOrDefault().Should().NotBeNull();

        capturedData = _sourceDataServiceMock.Invocations
            .Where(i => i.Method.Name == "UpdateSourceDataAsync")
            .Select(i => i.Arguments[1] as List<SourceData>)
            .First();

        // Verify the boundary handling
        capturedData.Should().NotBeNull();
        capturedData!.Count.Should().Be(1);
        capturedData[0].Source.Should().Be(provider);
        capturedData[0].Measurements.Should().NotBeNull();

        var measurements = capturedData[0].Measurements!;
        measurements.Count.Should().Be(7, "Expected 4 preserved (days -95, -93, -90, -89) + 3 from provider (days -88, -85, -80). Old data before cutoff is preserved, provider data from cutoff forward.");

        // Verify specific measurements - old data preserved
        measurements.Should().Contain(m => m.Date == syncStartDate.AddDays(-5).ToString("yyyy-MM-dd") && m.Weight == 64.0m, "day -95 from existing");
        measurements.Should().Contain(m => m.Date == syncStartDate.AddDays(-3).ToString("yyyy-MM-dd") && m.Weight == 65.0m, "day -93 from existing");
        measurements.Should().Contain(m => m.Date == syncStartDate.AddDays(0).ToString("yyyy-MM-dd") && m.Weight == 66.0m, "day -90 from existing");
        measurements.Should().Contain(m => m.Date == syncStartDate.AddDays(1).ToString("yyyy-MM-dd") && m.Weight == 67.0m, "day -89 from existing");

        // Verify provider data from cutoff forward (replaces old data at cutoff and after)
        measurements.Should().Contain(m => m.Date == cutoffDate.ToString("yyyy-MM-dd") && m.Weight == 68.5m, "day -88 from provider (updated from 68.0)");
        measurements.Should().Contain(m => m.Date == syncStartDate.AddDays(5).ToString("yyyy-MM-dd") && m.Weight == 70.0m, "day -85 from provider (updated from 69.0)");
        measurements.Should().Contain(m => m.Date == syncStartDate.AddDays(10).ToString("yyyy-MM-dd") && m.Weight == 71.0m, "day -80 from provider (new)");

        // Verify buffer zone measurements from provider were discarded (only existing data kept)
        measurements.Should().NotContain(m => m.Date == syncStartDate.AddDays(0).ToString("yyyy-MM-dd") && m.Weight == 66.5m, "day -90 from provider should be discarded");
        measurements.Should().NotContain(m => m.Date == syncStartDate.AddDays(1).ToString("yyyy-MM-dd") && m.Weight == 67.5m, "day -89 from provider should be discarded");
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
            Date = DateTime.UtcNow.ToString("yyyy-MM-dd"),
            Time = "08:00:00",
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
        // Cutoff is at syncStartDate + 2 days (88 days before last sync)
        // Old measurements (before cutoff): preserved
        // New measurements (after cutoff): from provider
        return measurements.Count == 4 && // 2 old (preserved before day -88) + 2 new (from provider after day -88)
                                          // Old measurements preserved (days -100, -95 are before cutoff at day -88)
               measurements.Any(m => m.Date == syncStartDate.AddDays(-10).ToString("yyyy-MM-dd") && m.Weight == 65.0m) &&
               measurements.Any(m => m.Date == syncStartDate.AddDays(-5).ToString("yyyy-MM-dd") && m.Weight == 66.0m) &&
               // New measurements from provider (days -85, -78 are after cutoff at day -88)
               measurements.Any(m => m.Date == syncStartDate.AddDays(5).ToString("yyyy-MM-dd") && m.Weight == 70.5m) &&
               measurements.Any(m => m.Date == syncStartDate.AddDays(12).ToString("yyyy-MM-dd") && m.Weight == 71.5m) &&
               // Deleted measurements are gone (days -80, -75 were in old data but not in provider data)
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
