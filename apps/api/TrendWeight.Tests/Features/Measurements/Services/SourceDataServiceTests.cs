using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using Supabase.Interfaces;
using Supabase.Realtime;
using System.Globalization;
using TrendWeight.Features.Measurements;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Infrastructure.DataAccess;
using TrendWeight.Infrastructure.DataAccess.Models;
using TrendWeight.Tests.Fixtures;
using Xunit;

namespace TrendWeight.Tests.Features.Measurements.Services;

public class SourceDataServiceTests : TestBase
{
    private readonly Mock<ISupabaseService> _supabaseServiceMock;
    private readonly Mock<ILogger<SourceDataService>> _loggerMock;
    private readonly SourceDataService _sut;

    public SourceDataServiceTests()
    {
        _supabaseServiceMock = new Mock<ISupabaseService>();
        _loggerMock = new Mock<ILogger<SourceDataService>>();

        _sut = new SourceDataService(
            _supabaseServiceMock.Object,
            _loggerMock.Object);
    }

    #region UpdateSourceDataAsync Tests - Basic Scenarios

    [Fact]
    public async Task UpdateSourceDataAsync_WithNewProvider_CreatesNewRecord()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var sourceData = CreateTestSourceData("withings");
        var dataList = new List<SourceData> { sourceData };

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbSourceData>(It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ReturnsAsync(new List<DbSourceData>()); // No existing data

        // Act
        await _sut.UpdateSourceDataAsync(userId, dataList);

        // Assert
        _supabaseServiceMock.Verify(x => x.InsertAsync(It.Is<DbSourceData>(d =>
            d.Uid == userId &&
            d.Provider == "withings" &&
            d.Measurements.Count == 1 &&
            !string.IsNullOrEmpty(d.LastSync))), Times.Once);
    }

    [Fact]
    public async Task UpdateSourceDataAsync_WithExistingProviderAndNoChanges_UpdatesTimestampOnly()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var lastSync = DateTime.UtcNow.AddDays(-1);
        var existingMeasurement = CreateTestRawMeasurement("2024-01-15", 70.5m);
        var newMeasurement = CreateTestRawMeasurement("2024-01-15", 70.5m); // Same measurement

        var existingDbData = new DbSourceData
        {
            Uid = userId,
            Provider = "withings",
            Measurements = new List<RawMeasurement> { existingMeasurement },
            LastSync = lastSync.ToString("o"),
            UpdatedAt = DateTime.UtcNow.AddDays(-1).ToString("o")
        };

        var sourceData = new SourceData
        {
            Source = "withings",
            LastUpdate = DateTime.UtcNow,
            Measurements = new List<RawMeasurement> { newMeasurement }
        };

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbSourceData>(It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ReturnsAsync(new List<DbSourceData> { existingDbData });

        // Act
        await _sut.UpdateSourceDataAsync(userId, new List<SourceData> { sourceData });

        // Assert
        _supabaseServiceMock.Verify(x => x.UpdateAsync(It.IsAny<DbSourceData>()), Times.Once);
    }

    [Fact]
    public async Task UpdateSourceDataAsync_WithNewMeasurementsInRefreshWindow_MergesCorrectly()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var lastSync = DateTime.UtcNow.AddDays(-1);
        var cutoffDate = lastSync.AddDays(-90);

        // Existing data has measurements from different time periods
        var oldMeasurement = CreateTestRawMeasurement(cutoffDate.AddDays(-5).ToString("yyyy-MM-dd"), 65.0m); // Before cutoff - should keep
        var recentMeasurement = CreateTestRawMeasurement(cutoffDate.AddDays(5).ToString("yyyy-MM-dd"), 70.0m); // After cutoff - should replace

        var existingDbData = new DbSourceData
        {
            Uid = userId,
            Provider = "withings",
            Measurements = new List<RawMeasurement> { oldMeasurement, recentMeasurement },
            LastSync = lastSync.ToString("o"),
            UpdatedAt = DateTime.UtcNow.AddDays(-1).ToString("o")
        };

        // New data replaces recent measurements
        var newMeasurement = CreateTestRawMeasurement(cutoffDate.AddDays(5).ToString("yyyy-MM-dd"), 71.0m); // Different weight
        var sourceData = new SourceData
        {
            Source = "withings",
            LastUpdate = DateTime.UtcNow,
            Measurements = new List<RawMeasurement> { newMeasurement }
        };

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbSourceData>(It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ReturnsAsync(new List<DbSourceData> { existingDbData });

        // Act
        await _sut.UpdateSourceDataAsync(userId, new List<SourceData> { sourceData });

        // Assert
        _supabaseServiceMock.Verify(x => x.UpdateAsync(It.Is<DbSourceData>(d =>
            d.Uid == userId &&
            d.Provider == "withings" &&
            d.Measurements.Count == 2 && // Old + new measurement
            d.Measurements.Any(m => m.Weight == 65.0m) && // Old measurement kept
            d.Measurements.Any(m => m.Weight == 71.0m) && // New measurement added
            !d.Measurements.Any(m => m.Weight == 70.0m))), Times.Once); // Old recent measurement replaced
    }

    [Fact]
    public async Task UpdateSourceDataAsync_WithMultipleProviders_ProcessesAllProviders()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var withingsData = CreateTestSourceData("withings");
        var fitbitData = CreateTestSourceData("fitbit");
        var dataList = new List<SourceData> { withingsData, fitbitData };

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbSourceData>(It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ReturnsAsync(new List<DbSourceData>()); // No existing data

        // Act
        await _sut.UpdateSourceDataAsync(userId, dataList);

        // Assert
        _supabaseServiceMock.Verify(x => x.InsertAsync(It.Is<DbSourceData>(d => d.Provider == "withings")), Times.Once);
        _supabaseServiceMock.Verify(x => x.InsertAsync(It.Is<DbSourceData>(d => d.Provider == "fitbit")), Times.Once);
    }

    [Fact]
    public async Task UpdateSourceDataAsync_WithEmptyMeasurements_HandlesGracefully()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var sourceData = new SourceData
        {
            Source = "withings",
            LastUpdate = DateTime.UtcNow,
            Measurements = null // Null measurements
        };

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbSourceData>(It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ReturnsAsync(new List<DbSourceData>());

        // Act
        await _sut.UpdateSourceDataAsync(userId, new List<SourceData> { sourceData });

        // Assert
        _supabaseServiceMock.Verify(x => x.InsertAsync(It.Is<DbSourceData>(d =>
            d.Uid == userId &&
            d.Provider == "withings" &&
            d.Measurements.Count == 0)), Times.Once);
    }

    [Fact]
    public async Task UpdateSourceDataAsync_WithDatabaseError_RethrowsException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var sourceData = CreateTestSourceData("withings");

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbSourceData>(It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ThrowsAsync(new InvalidOperationException("Database error"));

        // Act & Assert
        await _sut.Invoking(x => x.UpdateSourceDataAsync(userId, new List<SourceData> { sourceData }))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Database error");
    }

    #endregion

    #region UpdateSourceDataAsync Tests - Data Merging Scenarios

    [Fact]
    public async Task UpdateSourceDataAsync_WhenProviderRemovesMeasurements_RemovesFromDatabase()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var lastSync = DateTime.UtcNow.AddDays(-1);
        var syncCutoff = lastSync.AddDays(-90); // 90 days before last sync

        // Existing DB has 3 measurements within sync window (all after cutoff)
        var withinWindowDate1 = syncCutoff.AddDays(10).ToString("yyyy-MM-dd");
        var withinWindowDate2 = syncCutoff.AddDays(20).ToString("yyyy-MM-dd"); // This will be deleted
        var withinWindowDate3 = syncCutoff.AddDays(30).ToString("yyyy-MM-dd");

        var existingMeasurements = new List<RawMeasurement>
        {
            CreateTestRawMeasurement(withinWindowDate1, 70.0m), // Within window
            CreateTestRawMeasurement(withinWindowDate2, 71.0m), // Within window - will be removed
            CreateTestRawMeasurement(withinWindowDate3, 72.0m)  // Within window
        };

        var existingDbData = new DbSourceData
        {
            Uid = userId,
            Provider = "withings",
            Measurements = existingMeasurements,
            LastSync = lastSync.ToString("o"),
            UpdatedAt = DateTime.UtcNow.AddDays(-1).ToString("o")
        };

        // Provider now only reports 2 measurements (user deleted the middle one upstream)
        var newMeasurements = new List<RawMeasurement>
        {
            CreateTestRawMeasurement(withinWindowDate1, 70.0m), // Same
            CreateTestRawMeasurement(withinWindowDate3, 72.0m)  // Same
            // withinWindowDate2 is missing - should be removed
        };

        var sourceData = new SourceData
        {
            Source = "withings",
            LastUpdate = DateTime.UtcNow,
            Measurements = newMeasurements
        };

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbSourceData>(It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ReturnsAsync(new List<DbSourceData> { existingDbData });

        // Act
        await _sut.UpdateSourceDataAsync(userId, new List<SourceData> { sourceData });

        // Assert - Should replace measurements in sync window with provider data
        _supabaseServiceMock.Verify(x => x.UpdateAsync(It.Is<DbSourceData>(d =>
            d.Uid == userId &&
            d.Provider == "withings" &&
            d.Measurements.Count == 2 && // Only 2 measurements now
            d.Measurements.Any(m => m.Date == withinWindowDate1) &&
            d.Measurements.Any(m => m.Date == withinWindowDate3) &&
            !d.Measurements.Any(m => m.Date == withinWindowDate2))), Times.Once); // Deleted measurement should be gone
    }

    [Fact]
    public async Task UpdateSourceDataAsync_WithOldDataOutsideSyncWindow_PreservesOldData()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var lastSync = DateTime.UtcNow.AddDays(-1);
        var syncCutoff = lastSync.AddDays(-90); // 90 days before last sync

        // Existing DB has measurements both inside and outside sync window
        var existingMeasurements = new List<RawMeasurement>
        {
            CreateTestRawMeasurement(syncCutoff.AddDays(-10).ToString("yyyy-MM-dd"), 65.0m), // OUTSIDE window - should keep
            CreateTestRawMeasurement(syncCutoff.AddDays(-5).ToString("yyyy-MM-dd"), 66.0m),  // OUTSIDE window - should keep  
            CreateTestRawMeasurement(syncCutoff.AddDays(5).ToString("yyyy-MM-dd"), 70.0m),   // INSIDE window - will be replaced
            CreateTestRawMeasurement(syncCutoff.AddDays(10).ToString("yyyy-MM-dd"), 71.0m)   // INSIDE window - will be replaced
        };

        var existingDbData = new DbSourceData
        {
            Uid = userId,
            Provider = "withings",
            Measurements = existingMeasurements,
            LastSync = lastSync.ToString("o"),
            UpdatedAt = DateTime.UtcNow.AddDays(-1).ToString("o")
        };

        // Provider reports new data for sync window (replaces measurements within window)
        var newMeasurements = new List<RawMeasurement>
        {
            CreateTestRawMeasurement(syncCutoff.AddDays(5).ToString("yyyy-MM-dd"), 70.5m),  // Updated weight
            CreateTestRawMeasurement(syncCutoff.AddDays(12).ToString("yyyy-MM-dd"), 72.0m)  // New measurement
            // Note: measurement at +10 days is gone (user deleted upstream)
        };

        var sourceData = new SourceData
        {
            Source = "withings",
            LastUpdate = DateTime.UtcNow,
            Measurements = newMeasurements
        };

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbSourceData>(It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ReturnsAsync(new List<DbSourceData> { existingDbData });

        // Act
        await _sut.UpdateSourceDataAsync(userId, new List<SourceData> { sourceData });

        // Assert - Should keep old measurements outside window + new measurements inside window
        _supabaseServiceMock.Verify(x => x.UpdateAsync(It.Is<DbSourceData>(d =>
            d.Uid == userId &&
            d.Provider == "withings" &&
            d.Measurements.Count == 4 && // 2 old + 2 new
                                         // Old measurements outside sync window should be preserved
            d.Measurements.Any(m => m.Weight == 65.0m) && // Old data kept
            d.Measurements.Any(m => m.Weight == 66.0m) && // Old data kept
                                                          // New measurements in sync window
            d.Measurements.Any(m => m.Weight == 70.5m) && // Updated
            d.Measurements.Any(m => m.Weight == 72.0m) && // New
                                                          // Old measurements in sync window should be gone
            !d.Measurements.Any(m => m.Weight == 70.0m) && // Original 70.0 replaced with 70.5
            !d.Measurements.Any(m => m.Weight == 71.0m))), Times.Once); // Deleted upstream
    }

    [Fact]
    public async Task UpdateSourceDataAsync_WithMultipleProvidersAndOverlappingData_KeepsBothProviders()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Simulate both Withings and Fitbit reporting the same measurement date
        var withingsData = new SourceData
        {
            Source = "withings",
            LastUpdate = DateTime.UtcNow,
            Measurements = new List<RawMeasurement>
            {
                CreateTestRawMeasurement("2024-01-15", 70.0m) // Same date as Fitbit
            }
        };

        var fitbitData = new SourceData
        {
            Source = "fitbit",
            LastUpdate = DateTime.UtcNow,
            Measurements = new List<RawMeasurement>
            {
                CreateTestRawMeasurement("2024-01-15", 70.1m) // Same date, slightly different weight
            }
        };

        // No existing data for either provider
        _supabaseServiceMock.Setup(x => x.QueryAsync<DbSourceData>(It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ReturnsAsync(new List<DbSourceData>());

        // Act
        await _sut.UpdateSourceDataAsync(userId, new List<SourceData> { withingsData, fitbitData });

        // Assert - Should create separate records for each provider, even with overlapping dates
        _supabaseServiceMock.Verify(x => x.InsertAsync(It.Is<DbSourceData>(d =>
            d.Provider == "withings" &&
            d.Measurements.Any(m => m.Date == "2024-01-15" && m.Weight == 70.0m))), Times.Once);

        _supabaseServiceMock.Verify(x => x.InsertAsync(It.Is<DbSourceData>(d =>
            d.Provider == "fitbit" &&
            d.Measurements.Any(m => m.Date == "2024-01-15" && m.Weight == 70.1m))), Times.Once);
    }

    [Fact]
    public async Task UpdateSourceDataAsync_WithProviderReportingFewerMeasurements_ReplacesRangeCompletely()
    {
        // Test the core principle: Provider data is truth for the time range it reports

        // Arrange
        var userId = Guid.NewGuid();
        var lastSync = DateTime.UtcNow.AddDays(-1);

        // Existing DB has daily measurements for a week
        var existingMeasurements = new List<RawMeasurement>
        {
            CreateTestRawMeasurement("2024-01-14", 70.0m),
            CreateTestRawMeasurement("2024-01-15", 70.1m),
            CreateTestRawMeasurement("2024-01-16", 70.2m),
            CreateTestRawMeasurement("2024-01-17", 70.3m),
            CreateTestRawMeasurement("2024-01-18", 70.4m),
            CreateTestRawMeasurement("2024-01-19", 70.5m),
            CreateTestRawMeasurement("2024-01-20", 70.6m)
        };

        var existingDbData = new DbSourceData
        {
            Uid = userId,
            Provider = "withings",
            Measurements = existingMeasurements,
            LastSync = lastSync.ToString("o"),
            UpdatedAt = DateTime.UtcNow.AddDays(-1).ToString("o")
        };

        // Provider now only reports 3 measurements (user deleted some upstream, or different sync range)
        var newMeasurements = new List<RawMeasurement>
        {
            CreateTestRawMeasurement("2024-01-15", 70.1m), // Same
            CreateTestRawMeasurement("2024-01-18", 70.4m), // Same
            CreateTestRawMeasurement("2024-01-20", 70.6m)  // Same
            // Missing: 2024-01-14, 2024-01-16, 2024-01-17, 2024-01-19
        };

        var sourceData = new SourceData
        {
            Source = "withings",
            LastUpdate = DateTime.UtcNow,
            Measurements = newMeasurements
        };

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbSourceData>(It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ReturnsAsync(new List<DbSourceData> { existingDbData });

        // Act
        await _sut.UpdateSourceDataAsync(userId, new List<SourceData> { sourceData });

        // Assert - Should ONLY have the 3 measurements provider reported (within sync window)
        _supabaseServiceMock.Verify(x => x.UpdateAsync(It.Is<DbSourceData>(d =>
            d.Uid == userId &&
            d.Provider == "withings" &&
            d.Measurements.Count == 3)), Times.Once); // Only what provider reported
    }

    #endregion

    #region GetSourceDataAsync Tests

    [Fact]
    public async Task GetSourceDataAsync_WithExistingData_ReturnsCorrectData()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var lastSync = DateTime.UtcNow.AddHours(-1);
        var measurement = CreateTestRawMeasurement("2024-01-15", 70.5m);

        var dbData = new List<DbSourceData>
        {
            new()
            {
                Uid = userId,
                Provider = "withings",
                Measurements = new List<RawMeasurement> { measurement },
                LastSync = lastSync.ToString("o"),
                UpdatedAt = DateTime.UtcNow.ToString("o")
            }
        };

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbSourceData>(It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ReturnsAsync(dbData);

        // Act
        var result = await _sut.GetSourceDataAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(1);
        result![0].Source.Should().Be("withings");
        result[0].LastUpdate.Should().BeCloseTo(lastSync, TimeSpan.FromSeconds(1));
        result[0].Measurements.Should().HaveCount(1);
        result[0].Measurements![0].Weight.Should().Be(70.5m);
    }

    [Fact]
    public async Task GetSourceDataAsync_WithNoData_ReturnsEmptyList()
    {
        // Arrange
        var userId = Guid.NewGuid();

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbSourceData>(It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ReturnsAsync(new List<DbSourceData>());

        // Act
        var result = await _sut.GetSourceDataAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result!.Should().BeEmpty();
    }

    [Fact]
    public async Task GetSourceDataAsync_WithMultipleProviders_ReturnsAllProviders()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var lastSync = DateTime.UtcNow;

        var dbData = new List<DbSourceData>
        {
            new()
            {
                Uid = userId,
                Provider = "withings",
                Measurements = new List<RawMeasurement> { CreateTestRawMeasurement() },
                LastSync = lastSync.ToString("o"),
                UpdatedAt = DateTime.UtcNow.ToString("o")
            },
            new()
            {
                Uid = userId,
                Provider = "fitbit",
                Measurements = new List<RawMeasurement> { CreateTestRawMeasurement() },
                LastSync = lastSync.AddMinutes(-5).ToString("o"),
                UpdatedAt = DateTime.UtcNow.ToString("o")
            }
        };

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbSourceData>(It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ReturnsAsync(dbData);

        // Act
        var result = await _sut.GetSourceDataAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(2);
        result!.Should().Contain(s => s.Source == "withings");
        result.Should().Contain(s => s.Source == "fitbit");
    }

    [Fact]
    public async Task GetSourceDataAsync_WithNullLastSync_UsesCurrentTime()
    {
        // Arrange
        var userId = Guid.NewGuid();

        var dbData = new List<DbSourceData>
        {
            new()
            {
                Uid = userId,
                Provider = "withings",
                Measurements = new List<RawMeasurement>(),
                LastSync = null, // Null last sync
                UpdatedAt = DateTime.UtcNow.ToString("o")
            }
        };

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbSourceData>(It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ReturnsAsync(dbData);

        // Act
        var result = await _sut.GetSourceDataAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(1);
        result![0].LastUpdate.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
    }

    [Fact]
    public async Task GetSourceDataAsync_WithDatabaseError_RethrowsException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbSourceData>(It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ThrowsAsync(new InvalidOperationException("Database error"));

        // Act & Assert
        await _sut.Invoking(x => x.GetSourceDataAsync(userId))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Database error");
    }

    #endregion

    #region GetLastSyncTimeAsync Tests

    [Fact]
    public async Task GetLastSyncTimeAsync_WithExistingData_ReturnsLastSyncTime()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var provider = "withings";
        var lastSync = DateTime.UtcNow.AddHours(-2);

        var dbData = new List<DbSourceData>
        {
            new()
            {
                Uid = userId,
                Provider = provider,
                LastSync = lastSync.ToString("o"),
                UpdatedAt = DateTime.UtcNow.ToString("o")
            }
        };

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbSourceData>(It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ReturnsAsync(dbData);

        // Act
        var result = await _sut.GetLastSyncTimeAsync(userId, provider);

        // Assert
        result.Should().NotBeNull();
        result!.Value.Should().BeCloseTo(lastSync, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task GetLastSyncTimeAsync_WithNoData_ReturnsNull()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var provider = "withings";

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbSourceData>(It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ReturnsAsync(new List<DbSourceData>());

        // Act
        var result = await _sut.GetLastSyncTimeAsync(userId, provider);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetLastSyncTimeAsync_WithNullLastSync_ReturnsNull()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var provider = "withings";

        var dbData = new List<DbSourceData>
        {
            new()
            {
                Uid = userId,
                Provider = provider,
                LastSync = null, // Null last sync
                UpdatedAt = DateTime.UtcNow.ToString("o")
            }
        };

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbSourceData>(It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ReturnsAsync(dbData);

        // Act
        var result = await _sut.GetLastSyncTimeAsync(userId, provider);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetLastSyncTimeAsync_WithDatabaseError_ReturnsNull()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var provider = "withings";

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbSourceData>(It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ThrowsAsync(new InvalidOperationException("Database error"));

        // Act
        var result = await _sut.GetLastSyncTimeAsync(userId, provider);

        // Assert
        result.Should().BeNull();
    }

    #endregion

    #region ClearSourceDataAsync Tests

    [Fact]
    public async Task ClearSourceDataAsync_WithSpecificProvider_ClearsOnlyThatProvider()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var provider = "withings";

        var dbData = new List<DbSourceData>
        {
            new()
            {
                Uid = userId,
                Provider = provider,
                Measurements = new List<RawMeasurement> { CreateTestRawMeasurement() },
                LastSync = DateTime.UtcNow.ToString("o"),
                UpdatedAt = DateTime.UtcNow.ToString("o")
            }
        };

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbSourceData>(It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ReturnsAsync(dbData);

        // Act
        await _sut.ClearSourceDataAsync(userId, provider);

        // Assert
        _supabaseServiceMock.Verify(x => x.UpdateAsync(It.Is<DbSourceData>(d =>
            d.Uid == userId &&
            d.Provider == provider &&
            d.Measurements.Count == 0 &&
            d.LastSync == null)), Times.Once);
    }

    [Fact]
    public async Task ClearSourceDataAsync_WithAllProviders_ClearsAllData()
    {
        // Arrange
        var userId = Guid.NewGuid();

        var dbData = new List<DbSourceData>
        {
            new()
            {
                Uid = userId,
                Provider = "withings",
                Measurements = new List<RawMeasurement> { CreateTestRawMeasurement() },
                LastSync = DateTime.UtcNow.ToString("o"),
                UpdatedAt = DateTime.UtcNow.ToString("o")
            },
            new()
            {
                Uid = userId,
                Provider = "fitbit",
                Measurements = new List<RawMeasurement> { CreateTestRawMeasurement() },
                LastSync = DateTime.UtcNow.ToString("o"),
                UpdatedAt = DateTime.UtcNow.ToString("o")
            }
        };

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbSourceData>(It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ReturnsAsync(dbData);

        // Act
        await _sut.ClearSourceDataAsync(userId, provider: null);

        // Assert
        _supabaseServiceMock.Verify(x => x.UpdateAsync(It.Is<DbSourceData>(d =>
            d.Uid == userId &&
            d.Measurements.Count == 0 &&
            d.LastSync == null)), Times.Exactly(2));
    }

    [Fact]
    public async Task ClearSourceDataAsync_WithNonExistentProvider_DoesNothing()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var provider = "nonexistent";

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbSourceData>(It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ReturnsAsync(new List<DbSourceData>());

        // Act
        await _sut.ClearSourceDataAsync(userId, provider);

        // Assert
        _supabaseServiceMock.Verify(x => x.UpdateAsync(It.IsAny<DbSourceData>()), Times.Never);
    }

    [Fact]
    public async Task ClearSourceDataAsync_WithDatabaseError_RethrowsException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var provider = "withings";

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbSourceData>(It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ThrowsAsync(new InvalidOperationException("Database error"));

        // Act & Assert
        await _sut.Invoking(x => x.ClearSourceDataAsync(userId, provider))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Database error");
    }

    #endregion

    #region DeleteSourceDataAsync Tests

    [Fact]
    public async Task DeleteSourceDataAsync_WithExistingProvider_DeletesRecord()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var provider = "withings";

        var dbData = new List<DbSourceData>
        {
            new()
            {
                Uid = userId,
                Provider = provider,
                Measurements = new List<RawMeasurement> { CreateTestRawMeasurement() },
                LastSync = DateTime.UtcNow.ToString("o"),
                UpdatedAt = DateTime.UtcNow.ToString("o")
            }
        };

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbSourceData>(It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ReturnsAsync(dbData);

        // Act
        await _sut.DeleteSourceDataAsync(userId, provider);

        // Assert
        _supabaseServiceMock.Verify(x => x.DeleteAsync<DbSourceData>(It.Is<DbSourceData>(d =>
            d.Uid == userId &&
            d.Provider == provider)), Times.Once);
    }

    [Fact]
    public async Task DeleteSourceDataAsync_WithNonExistentProvider_DoesNothing()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var provider = "nonexistent";

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbSourceData>(It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ReturnsAsync(new List<DbSourceData>());

        // Act
        await _sut.DeleteSourceDataAsync(userId, provider);

        // Assert
        _supabaseServiceMock.Verify(x => x.DeleteAsync<DbSourceData>(It.IsAny<DbSourceData>()), Times.Never);
    }

    [Fact]
    public async Task DeleteSourceDataAsync_WithDatabaseError_RethrowsException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var provider = "withings";

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbSourceData>(It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ThrowsAsync(new InvalidOperationException("Database error"));

        // Act & Assert
        await _sut.Invoking(x => x.DeleteSourceDataAsync(userId, provider))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Database error");
    }

    #endregion

    #region DeleteAllSourceDataAsync Tests

    [Fact]
    public async Task DeleteAllSourceDataAsync_WithMultipleProviders_DeletesAllRecords()
    {
        // Arrange
        var userId = Guid.NewGuid();

        var dbData = new List<DbSourceData>
        {
            new()
            {
                Uid = userId,
                Provider = "withings",
                Measurements = new List<RawMeasurement> { CreateTestRawMeasurement() },
                LastSync = DateTime.UtcNow.ToString("o"),
                UpdatedAt = DateTime.UtcNow.ToString("o")
            },
            new()
            {
                Uid = userId,
                Provider = "fitbit",
                Measurements = new List<RawMeasurement> { CreateTestRawMeasurement() },
                LastSync = DateTime.UtcNow.ToString("o"),
                UpdatedAt = DateTime.UtcNow.ToString("o")
            }
        };

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbSourceData>(It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ReturnsAsync(dbData);

        // Act
        await _sut.DeleteAllSourceDataAsync(userId);

        // Assert
        _supabaseServiceMock.Verify(x => x.DeleteAsync<DbSourceData>(It.IsAny<DbSourceData>()), Times.Exactly(2));
    }

    [Fact]
    public async Task DeleteAllSourceDataAsync_WithNoData_DoesNothing()
    {
        // Arrange
        var userId = Guid.NewGuid();

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbSourceData>(It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ReturnsAsync(new List<DbSourceData>());

        // Act
        await _sut.DeleteAllSourceDataAsync(userId);

        // Assert
        _supabaseServiceMock.Verify(x => x.DeleteAsync<DbSourceData>(It.IsAny<DbSourceData>()), Times.Never);
    }

    [Fact]
    public async Task DeleteAllSourceDataAsync_WithDatabaseError_RethrowsException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbSourceData>(It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ThrowsAsync(new InvalidOperationException("Database error"));

        // Act & Assert
        await _sut.Invoking(x => x.DeleteAllSourceDataAsync(userId))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Database error");
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

    private static RawMeasurement CreateTestRawMeasurement(string? date = null, decimal? weight = null)
    {
        return new RawMeasurement
        {
            Date = date ?? DateTime.UtcNow.ToString("yyyy-MM-dd"),
            Time = "10:30:00",
            Weight = weight ?? 70.5m,
            FatRatio = 15.2m
        };
    }

    #endregion
}
