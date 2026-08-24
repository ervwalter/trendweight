using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using TrendWeight.Features.ApiV1;
using TrendWeight.Features.ApiV1.Models;
using TrendWeight.Features.Measurements;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Features.Profile.Models;
using TrendWeight.Infrastructure.DataAccess.Models;
using Xunit;

namespace TrendWeight.Tests.Features.ApiV1;

public class V1MeasurementsControllerTests
{
    private readonly Mock<IMeasurementOrchestrationService> _orchestrationServiceMock;
    private readonly V1MeasurementsController _sut;
    private readonly Guid _userId = Guid.NewGuid();

    public V1MeasurementsControllerTests()
    {
        _orchestrationServiceMock = new Mock<IMeasurementOrchestrationService>();
        _sut = new V1MeasurementsController(
            _orchestrationServiceMock.Object,
            Mock.Of<ILogger<V1MeasurementsController>>());

        var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, _userId.ToString()) };
        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(claims, "ApiKey"))
            }
        };
    }

    private MeasurementDataResult CreateDataResult()
    {
        var profile = new DbProfile
        {
            Uid = _userId,
            Email = "test@example.com",
            Profile = new ProfileData { FirstName = "Test" }
        };
        var computed = new List<ComputedMeasurement>
        {
            Computed("2024-01-01"),
            Computed("2024-06-15"),
            Computed("2024-12-31")
        };
        var sourceData = new List<SourceData>
        {
            new SourceData
            {
                Source = "withings",
                LastUpdate = DateTime.UtcNow,
                Measurements = new List<RawMeasurement>
                {
                    new RawMeasurement { Date = "2024-01-01", Time = "08:00:00", Weight = 80m, FatRatio = 0.22m },
                    new RawMeasurement { Date = "2024-12-31", Time = "08:00:00", Weight = 78m }
                }
            },
            new SourceData
            {
                Source = "fitbit",
                LastUpdate = DateTime.UtcNow,
                Measurements = new List<RawMeasurement>
                {
                    new RawMeasurement { Date = "2024-03-01", Time = "07:00:00", Weight = 79m }
                }
            },
            new SourceData
            {
                Source = "manual",
                LastUpdate = DateTime.UtcNow,
                Measurements = new List<RawMeasurement>
                {
                    new RawMeasurement { Date = "2024-02-01", Time = "23:59:59", Weight = 81m }
                }
            }
        };
        return new MeasurementDataResult(profile, computed, sourceData, new Dictionary<string, ProviderSyncStatus>());
    }

    private static ComputedMeasurement Computed(string date)
    {
        return new ComputedMeasurement
        {
            Date = date,
            ActualWeight = 80m,
            TrendWeight = 80.1m,
            WeightIsInterpolated = false,
            FatIsInterpolated = false
        };
    }

    #region GetMeasurements

    [Fact]
    public async Task GetMeasurements_ReturnsMappedTrendMeasurements()
    {
        _orchestrationServiceMock.Setup(x => x.GetForUserAsync(_userId, null, null)).ReturnsAsync(CreateDataResult());

        var result = await _sut.GetMeasurements();

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var measurements = ok.Value.Should().BeAssignableTo<List<V1Measurement>>().Subject;
        measurements.Should().HaveCount(3);
        measurements[0].TrendWeight.Should().Be(80.1m);
    }

    [Fact]
    public async Task GetMeasurements_DisablesProgressReporting()
    {
        _orchestrationServiceMock.Setup(x => x.GetForUserAsync(_userId, null, null)).ReturnsAsync(CreateDataResult());

        await _sut.GetMeasurements();

        // externalId and progressId must both be null for API-key callers
        _orchestrationServiceMock.Verify(x => x.GetForUserAsync(_userId, null, null), Times.Once);
    }

    [Fact]
    public async Task GetMeasurements_WithSince_FiltersMeasurements()
    {
        _orchestrationServiceMock.Setup(x => x.GetForUserAsync(_userId, null, null)).ReturnsAsync(CreateDataResult());

        var result = await _sut.GetMeasurements(since: "2024-06-15");

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var measurements = ok.Value.Should().BeAssignableTo<List<V1Measurement>>().Subject;
        measurements.Select(m => m.Date).Should().Equal("2024-06-15", "2024-12-31");
    }

    [Fact]
    public async Task GetMeasurements_WithInvalidSince_ReturnsBadRequest()
    {
        var result = await _sut.GetMeasurements(since: "not-a-date");

        result.Result.Should().BeOfType<BadRequestObjectResult>();
        _orchestrationServiceMock.Verify(
            x => x.GetForUserAsync(It.IsAny<Guid>(), It.IsAny<string?>(), It.IsAny<Guid?>()),
            Times.Never);
    }

    [Fact]
    public async Task GetMeasurements_WhenUserNotFound_ReturnsNotFound()
    {
        _orchestrationServiceMock.Setup(x => x.GetForUserAsync(_userId, null, null))
            .ReturnsAsync((MeasurementDataResult?)null);

        var result = await _sut.GetMeasurements();

        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion

    #region GetSourceReadings

    [Fact]
    public async Task GetSourceReadings_ReturnsScaleSourcesExcludingManual()
    {
        _orchestrationServiceMock.Setup(x => x.GetForUserAsync(_userId, null, null)).ReturnsAsync(CreateDataResult());

        var result = await _sut.GetSourceReadings();

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var sources = ok.Value.Should().BeAssignableTo<List<V1SourceData>>().Subject;
        sources.Select(s => s.Provider).Should().Equal("withings", "fitbit");
        sources[0].Measurements.Should().HaveCount(2);
        sources[0].Measurements[0].FatRatio.Should().Be(0.22m);
    }

    [Fact]
    public async Task GetSourceReadings_WithProviderFilter_ReturnsOnlyThatSource()
    {
        _orchestrationServiceMock.Setup(x => x.GetForUserAsync(_userId, null, null)).ReturnsAsync(CreateDataResult());

        var result = await _sut.GetSourceReadings(provider: "fitbit");

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var sources = ok.Value.Should().BeAssignableTo<List<V1SourceData>>().Subject;
        sources.Select(s => s.Provider).Should().Equal("fitbit");
    }

    [Fact]
    public async Task GetSourceReadings_WithSince_FiltersReadings()
    {
        _orchestrationServiceMock.Setup(x => x.GetForUserAsync(_userId, null, null)).ReturnsAsync(CreateDataResult());

        var result = await _sut.GetSourceReadings(since: "2024-06-15");

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var sources = ok.Value.Should().BeAssignableTo<List<V1SourceData>>().Subject;
        sources.First(s => s.Provider == "withings").Measurements.Select(m => m.Date).Should().Equal("2024-12-31");
        sources.First(s => s.Provider == "fitbit").Measurements.Should().BeEmpty();
    }

    [Theory]
    [InlineData("manual")]
    [InlineData("garmin")]
    public async Task GetSourceReadings_WithInvalidProvider_ReturnsBadRequest(string provider)
    {
        var result = await _sut.GetSourceReadings(provider: provider);

        result.Result.Should().BeOfType<BadRequestObjectResult>();
        _orchestrationServiceMock.Verify(
            x => x.GetForUserAsync(It.IsAny<Guid>(), It.IsAny<string?>(), It.IsAny<Guid?>()),
            Times.Never);
    }

    [Fact]
    public async Task GetSourceReadings_WithInvalidSince_ReturnsBadRequest()
    {
        var result = await _sut.GetSourceReadings(since: "not-a-date");

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task GetSourceReadings_WhenUserNotFound_ReturnsNotFound()
    {
        _orchestrationServiceMock.Setup(x => x.GetForUserAsync(_userId, null, null))
            .ReturnsAsync((MeasurementDataResult?)null);

        var result = await _sut.GetSourceReadings();

        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion
}
