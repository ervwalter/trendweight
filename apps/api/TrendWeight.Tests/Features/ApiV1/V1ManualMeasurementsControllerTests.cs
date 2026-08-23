using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using TrendWeight.Features.ApiV1;
using TrendWeight.Features.ApiV1.Models;
using TrendWeight.Features.Measurements.Manual;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Infrastructure.Middleware;
using Xunit;

namespace TrendWeight.Tests.Features.ApiV1;

public class V1ManualMeasurementsControllerTests
{
    private readonly Mock<IManualDataService> _manualDataServiceMock;
    private readonly V1ManualMeasurementsController _sut;
    private readonly Guid _userId = Guid.NewGuid();

    public V1ManualMeasurementsControllerTests()
    {
        _manualDataServiceMock = new Mock<IManualDataService>();
        _sut = new V1ManualMeasurementsController(
            _manualDataServiceMock.Object,
            Mock.Of<ILogger<V1ManualMeasurementsController>>());

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, _userId.ToString()),
            new(RateLimitPartitionResolver.ApiKeyAuthMethodClaim, RateLimitPartitionResolver.ApiKeyAuthMethodValue)
        };
        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(claims, "ApiKey"))
            }
        };
    }

    private static RawMeasurement Reading(string date, decimal weight = 80m, decimal? fatRatio = null)
    {
        return new RawMeasurement { Date = date, Time = "23:59:59", Weight = weight, FatRatio = fatRatio };
    }

    [Fact]
    public async Task GetReadings_ReturnsMappedReadings()
    {
        _manualDataServiceMock.Setup(x => x.GetReadingsAsync(_userId))
            .ReturnsAsync(new List<RawMeasurement> { Reading("2024-05-02"), Reading("2024-05-01", fatRatio: 0.22m) });

        var result = await _sut.GetReadings();

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var readings = ok.Value.Should().BeAssignableTo<List<V1ManualReading>>().Subject;
        readings.Select(r => r.Date).Should().Equal("2024-05-02", "2024-05-01");
        readings[1].FatRatio.Should().Be(0.22m);
    }

    [Fact]
    public async Task UpsertReading_StoresRoundedValuesWithPlaceholderTime()
    {
        RawMeasurement? storedReading = null;
        _manualDataServiceMock.Setup(x => x.UpsertReadingAsync(_userId, It.IsAny<RawMeasurement>()))
            .Callback<Guid, RawMeasurement>((_, r) => storedReading = r)
            .ReturnsAsync((Guid _, RawMeasurement r) => r);

        var result = await _sut.UpsertReading("2024-05-01", new V1ManualUpsertRequest { Weight = 80.12345m, FatRatio = 0.223456m });

        result.Result.Should().BeOfType<OkObjectResult>();
        storedReading!.Date.Should().Be("2024-05-01");
        storedReading.Time.Should().Be("23:59:59");
        storedReading.Weight.Should().Be(80.123m);
        storedReading.FatRatio.Should().Be(0.2235m);
    }

    [Theory]
    [InlineData("bad-date", 80, null)]
    [InlineData("2024-05-01", 0, null)]
    [InlineData("2024-05-01", 80, 22.5)] // percentage instead of ratio
    public async Task UpsertReading_RejectsInvalidInput(string date, decimal weight, double? fatRatio)
    {
        var request = new V1ManualUpsertRequest { Weight = weight, FatRatio = (decimal?)fatRatio };

        var result = await _sut.UpsertReading(date, request);

        result.Result.Should().BeOfType<BadRequestObjectResult>();
        _manualDataServiceMock.Verify(x => x.UpsertReadingAsync(It.IsAny<Guid>(), It.IsAny<RawMeasurement>()), Times.Never);
    }

    [Fact]
    public async Task UpsertReadings_StoresValidBatch()
    {
        List<RawMeasurement>? storedBatch = null;
        _manualDataServiceMock.Setup(x => x.UpsertReadingsAsync(_userId, It.IsAny<List<RawMeasurement>>()))
            .Callback<Guid, List<RawMeasurement>>((_, batch) => storedBatch = batch)
            .ReturnsAsync((Guid _, List<RawMeasurement> batch) => batch);

        var entries = new List<V1ManualBatchEntry>
        {
            new() { Date = "2024-05-01", Weight = 80m },
            new() { Date = "2024-05-02", Weight = 79.5m, FatRatio = 0.22m }
        };

        var result = await _sut.UpsertReadings(entries);

        result.Result.Should().BeOfType<OkObjectResult>();
        storedBatch.Should().HaveCount(2);
        storedBatch![0].Time.Should().Be("23:59:59");
    }

    [Fact]
    public async Task UpsertReadings_ReportsPerEntryErrorsWithoutStoring()
    {
        var entries = new List<V1ManualBatchEntry>
        {
            new() { Date = "2024-05-01", Weight = 80m },
            new() { Date = "not-a-date", Weight = 80m },
            new() { Date = "2024-05-03", Weight = -1m }
        };

        var result = await _sut.UpsertReadings(entries);

        var badRequest = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var error = badRequest.Value.Should().BeOfType<V1ErrorResponse>().Subject;
        error.Errors.Should().HaveCount(2);
        error.Errors!.Select(e => e.Index).Should().Equal(1, 2);
        _manualDataServiceMock.Verify(x => x.UpsertReadingsAsync(It.IsAny<Guid>(), It.IsAny<List<RawMeasurement>>()), Times.Never);
    }

    [Fact]
    public async Task UpsertReadings_RejectsDuplicateDates()
    {
        var entries = new List<V1ManualBatchEntry>
        {
            new() { Date = "2024-05-01", Weight = 80m },
            new() { Date = "2024-05-01", Weight = 81m }
        };

        var result = await _sut.UpsertReadings(entries);

        var badRequest = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var error = badRequest.Value.Should().BeOfType<V1ErrorResponse>().Subject;
        error.Errors!.Single().Index.Should().Be(1);
        error.Errors!.Single().Error.Should().Contain("Duplicate date");
    }

    [Fact]
    public async Task UpsertReadings_RejectsEmptyAndOversizedBatches()
    {
        var empty = await _sut.UpsertReadings(new List<V1ManualBatchEntry>());
        empty.Result.Should().BeOfType<BadRequestObjectResult>();

        var oversized = Enumerable.Range(0, V1ManualMeasurementsController.MaxBatchSize + 1)
            .Select(i => new V1ManualBatchEntry { Date = "2024-05-01", Weight = 80m })
            .ToList();
        var tooBig = await _sut.UpsertReadings(oversized);
        tooBig.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task DeleteReading_ReturnsNoContentOnSuccess()
    {
        _manualDataServiceMock.Setup(x => x.DeleteReadingAsync(_userId, "2024-05-01")).ReturnsAsync(true);

        var result = await _sut.DeleteReading("2024-05-01");

        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task DeleteReading_ReturnsNotFoundWhenMissing()
    {
        _manualDataServiceMock.Setup(x => x.DeleteReadingAsync(_userId, "2024-05-01")).ReturnsAsync(false);

        var result = await _sut.DeleteReading("2024-05-01");

        result.Should().BeOfType<NotFoundObjectResult>();
    }
}
