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
    public async Task UpdateSourceDataAsync_WithExistingData_ReplacesCompletely()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var lastSync = DateTime.UtcNow.AddDays(-1);

        // Existing data will be completely replaced (merging is done in MeasurementSyncService)
        var existingMeasurements = new List<RawMeasurement>
        {
            CreateTestRawMeasurement("2024-01-01", 70.0m),
            CreateTestRawMeasurement("2024-01-02", 71.0m),
            CreateTestRawMeasurement("2024-01-03", 72.0m)
        };

        var existingDbData = new DbSourceData
        {
            Uid = userId,
            Provider = "withings",
            Measurements = existingMeasurements,
            LastSync = lastSync.ToString("o"),
            UpdatedAt = DateTime.UtcNow.AddDays(-1).ToString("o")
        };

        // New measurements will completely replace the old ones
        var newMeasurements = new List<RawMeasurement>
        {
            CreateTestRawMeasurement("2024-01-01", 70.0m),
            CreateTestRawMeasurement("2024-01-03", 72.5m) // Updated weight
            // 2024-01-02 is missing - this is fine, merging logic handles this upstream
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

        // Assert - Should have exactly the new measurements
        _supabaseServiceMock.Verify(x => x.UpdateAsync(It.Is<DbSourceData>(d =>
            d.Uid == userId &&
            d.Provider == "withings" &&
            d.Measurements.Count == 2 &&
            d.Measurements.Any(m => m.Date == "2024-01-01" && m.Weight == 70.0m) &&
            d.Measurements.Any(m => m.Date == "2024-01-03" && m.Weight == 72.5m))), Times.Once);
    }

    [Fact]
    public async Task UpdateSourceDataAsync_WithMultipleProviders_UpdatesEachSeparately()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Setup multiple source data updates
        var sourceDataList = new List<SourceData>
        {
            new SourceData
            {
                Source = "withings",
                LastUpdate = DateTime.UtcNow,
                Measurements = new List<RawMeasurement>
                {
                    CreateTestRawMeasurement("2024-01-01", 70.0m),
                    CreateTestRawMeasurement("2024-01-02", 71.0m)
                }
            },
            new SourceData
            {
                Source = "fitbit",
                LastUpdate = DateTime.UtcNow,
                Measurements = new List<RawMeasurement>
                {
                    CreateTestRawMeasurement("2024-01-01", 70.2m),
                    CreateTestRawMeasurement("2024-01-03", 72.0m)
                }
            }
        };

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbSourceData>(It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ReturnsAsync(new List<DbSourceData>());

        // Act
        await _sut.UpdateSourceDataAsync(userId, sourceDataList);

        // Assert - Should create both provider records
        _supabaseServiceMock.Verify(x => x.InsertAsync(It.Is<DbSourceData>(d =>
            d.Uid == userId &&
            d.Provider == "withings" &&
            d.Measurements.Count == 2)), Times.Once);

        _supabaseServiceMock.Verify(x => x.InsertAsync(It.Is<DbSourceData>(d =>
            d.Uid == userId &&
            d.Provider == "fitbit" &&
            d.Measurements.Count == 2)), Times.Once);
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
        var result = await _sut.GetSourceDataAsync(userId, new List<string> { "withings" });

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
        var result = await _sut.GetSourceDataAsync(userId, new List<string> { "withings", "fitbit" });

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
        var result = await _sut.GetSourceDataAsync(userId, new List<string> { "withings", "fitbit" });

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
        var result = await _sut.GetSourceDataAsync(userId, new List<string> { "withings" });

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
        await _sut.Invoking(x => x.GetSourceDataAsync(userId, new List<string> { "withings" }))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Database error");
    }

    [Fact]
    public async Task GetSourceDataAsync_WithActiveProvidersFilter_ReturnsOnlyRequestedProviders()
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
                Measurements = new List<RawMeasurement> { CreateTestRawMeasurement("2024-01-01", 70.0m) },
                LastSync = lastSync.ToString("o"),
                UpdatedAt = DateTime.UtcNow.ToString("o")
            },
            new()
            {
                Uid = userId,
                Provider = "fitbit",
                Measurements = new List<RawMeasurement> { CreateTestRawMeasurement("2024-01-02", 71.0m) },
                LastSync = lastSync.ToString("o"),
                UpdatedAt = DateTime.UtcNow.ToString("o")
            },
            new()
            {
                Uid = userId,
                Provider = "legacy",
                Measurements = new List<RawMeasurement> { CreateTestRawMeasurement("2024-01-03", 72.0m) },
                LastSync = lastSync.ToString("o"),
                UpdatedAt = DateTime.UtcNow.ToString("o")
            }
        };

        // Return only the requested providers
        _supabaseServiceMock.Setup(x => x.QueryAsync<DbSourceData>(It.IsAny<Action<ISupabaseTable<DbSourceData, RealtimeChannel>>>()))
            .ReturnsAsync((Action<ISupabaseTable<DbSourceData, RealtimeChannel>> queryBuilder) =>
            {
                // Simulate filtering - only return withings and fitbit, not legacy
                return dbData.Where(d => d.Provider == "withings" || d.Provider == "fitbit").ToList();
            });

        // Act - Request only withings and fitbit (legacy is disabled)
        var result = await _sut.GetSourceDataAsync(userId, new List<string> { "withings", "fitbit" });

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(2);
        result!.Should().Contain(s => s.Source == "withings");
        result.Should().Contain(s => s.Source == "fitbit");
        result.Should().NotContain(s => s.Source == "legacy"); // Legacy should not be included
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
