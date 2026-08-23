using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using TrendWeight.Features.Measurements;
using TrendWeight.Features.Measurements.Manual;
using TrendWeight.Features.Measurements.Models;
using Xunit;

namespace TrendWeight.Tests.Features.Measurements.Manual;

public class ManualDataServiceTests
{
    private readonly Mock<ISourceDataService> _sourceDataServiceMock;
    private readonly ManualDataService _sut;

    private List<SourceData>? _storedData;

    public ManualDataServiceTests()
    {
        _sourceDataServiceMock = new Mock<ISourceDataService>();
        _sourceDataServiceMock
            .Setup(x => x.UpdateSourceDataAsync(It.IsAny<Guid>(), It.IsAny<List<SourceData>>()))
            .Callback<Guid, List<SourceData>>((_, data) => _storedData = data)
            .Returns(Task.CompletedTask);

        _sut = new ManualDataService(
            _sourceDataServiceMock.Object,
            new Mock<ILogger<ManualDataService>>().Object);
    }

    private void SetupExistingMeasurements(Guid userId, List<RawMeasurement>? measurements)
    {
        var sourceData = measurements == null
            ? new List<SourceData>()
            : new List<SourceData>
            {
                new SourceData { Source = "manual", LastUpdate = DateTime.UtcNow, Measurements = measurements }
            };

        _sourceDataServiceMock
            .Setup(x => x.GetSourceDataAsync(userId, It.Is<List<string>>(p => p.Contains("manual"))))
            .ReturnsAsync(sourceData);
    }

    private static RawMeasurement Reading(string date, string time = "07:00:00", decimal weight = 80m, decimal? fatRatio = null)
    {
        return new RawMeasurement { Date = date, Time = time, Weight = weight, FatRatio = fatRatio };
    }

    [Fact]
    public async Task GetReadingsAsync_WhenNoRowExists_ReturnsEmptyList()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupExistingMeasurements(userId, null);

        // Act
        var result = await _sut.GetReadingsAsync(userId);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetReadingsAsync_ReturnsReadingsSortedDescending()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupExistingMeasurements(userId, new List<RawMeasurement>
        {
            Reading("2024-01-01"),
            Reading("2024-03-15"),
            Reading("2024-02-10")
        });

        // Act
        var result = await _sut.GetReadingsAsync(userId);

        // Assert
        result.Select(m => m.Date).Should().ContainInOrder("2024-03-15", "2024-02-10", "2024-01-01");
    }

    [Fact]
    public async Task UpsertReadingAsync_FirstReading_CreatesManualSourceData()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupExistingMeasurements(userId, null);
        var reading = Reading("2024-05-01", "06:30:00", 81.5m, 0.22m);

        // Act
        var result = await _sut.UpsertReadingAsync(userId, reading);

        // Assert
        result.Should().Be(reading);
        _storedData.Should().NotBeNull();
        var stored = _storedData!.Single();
        stored.Source.Should().Be("manual");
        stored.LastUpdate.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        stored.Measurements.Should().ContainSingle().Which.Should().Be(reading);
    }

    [Fact]
    public async Task UpsertReadingAsync_SameDate_ReplacesExistingReading()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupExistingMeasurements(userId, new List<RawMeasurement>
        {
            Reading("2024-05-01", "06:30:00", 81.5m),
            Reading("2024-04-30", "07:00:00", 82.0m)
        });
        var replacement = Reading("2024-05-01", "08:15:00", 80.9m, 0.21m);

        // Act
        await _sut.UpsertReadingAsync(userId, replacement);

        // Assert
        var stored = _storedData!.Single().Measurements!;
        stored.Should().HaveCount(2);
        var may1 = stored.Single(m => m.Date == "2024-05-01");
        may1.Weight.Should().Be(80.9m);
        may1.Time.Should().Be("08:15:00");
        may1.FatRatio.Should().Be(0.21m);
    }

    [Fact]
    public async Task UpsertReadingAsync_KeepsDescendingSortOrder()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupExistingMeasurements(userId, new List<RawMeasurement>
        {
            Reading("2024-05-03"),
            Reading("2024-05-01")
        });

        // Act
        await _sut.UpsertReadingAsync(userId, Reading("2024-05-02"));

        // Assert
        var stored = _storedData!.Single().Measurements!;
        stored.Select(m => m.Date).Should().ContainInOrder("2024-05-03", "2024-05-02", "2024-05-01");
    }

    [Fact]
    public async Task DeleteReadingAsync_ExistingDate_RemovesReadingAndReturnsTrue()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupExistingMeasurements(userId, new List<RawMeasurement>
        {
            Reading("2024-05-01"),
            Reading("2024-04-30")
        });

        // Act
        var result = await _sut.DeleteReadingAsync(userId, "2024-05-01");

        // Assert
        result.Should().BeTrue();
        var stored = _storedData!.Single().Measurements!;
        stored.Should().ContainSingle().Which.Date.Should().Be("2024-04-30");
    }

    [Fact]
    public async Task DeleteReadingAsync_MissingDate_ReturnsFalseWithoutStoring()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupExistingMeasurements(userId, new List<RawMeasurement> { Reading("2024-04-30") });

        // Act
        var result = await _sut.DeleteReadingAsync(userId, "2024-05-01");

        // Assert
        result.Should().BeFalse();
        _sourceDataServiceMock.Verify(
            x => x.UpdateSourceDataAsync(It.IsAny<Guid>(), It.IsAny<List<SourceData>>()),
            Times.Never);
    }

    [Fact]
    public async Task UpsertReadingsAsync_MergesBatchOverExistingInOneWrite()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupExistingMeasurements(userId, new List<RawMeasurement>
        {
            Reading("2024-05-01", weight: 81m),
            Reading("2024-04-30", weight: 82m)
        });

        // Act
        var result = await _sut.UpsertReadingsAsync(userId, new List<RawMeasurement>
        {
            Reading("2024-05-01", weight: 80m), // replaces existing entry for the date
            Reading("2024-05-02", weight: 79.5m)
        });

        // Assert - returned readings are the upserted ones, newest first
        result.Select(m => m.Date).Should().Equal("2024-05-02", "2024-05-01");

        // Stored array holds the merged set, one write, newest first
        var stored = _storedData!.Single();
        stored.Source.Should().Be("manual");
        stored.Measurements!.Select(m => m.Date).Should().Equal("2024-05-02", "2024-05-01", "2024-04-30");
        stored.Measurements!.First(m => m.Date == "2024-05-01").Weight.Should().Be(80m);
        _sourceDataServiceMock.Verify(
            x => x.UpdateSourceDataAsync(It.IsAny<Guid>(), It.IsAny<List<SourceData>>()),
            Times.Once);
    }

    [Fact]
    public async Task UpsertReadingsAsync_WhenNoRowExists_StoresBatch()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupExistingMeasurements(userId, null);

        // Act
        var result = await _sut.UpsertReadingsAsync(userId, new List<RawMeasurement> { Reading("2024-05-01") });

        // Assert
        result.Should().HaveCount(1);
        _storedData!.Single().Measurements.Should().HaveCount(1);
    }

    [Fact]
    public async Task DeleteAllReadingsAsync_StoresEmptyMeasurementsList()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupExistingMeasurements(userId, new List<RawMeasurement> { Reading("2024-04-30") });

        // Act
        await _sut.DeleteAllReadingsAsync(userId);

        // Assert
        var stored = _storedData!.Single();
        stored.Source.Should().Be("manual");
        stored.Measurements.Should().BeEmpty();
    }
}
