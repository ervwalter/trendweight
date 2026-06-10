using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using TrendWeight.Common.Models;
using TrendWeight.Features.Measurements.Manual;
using TrendWeight.Features.Measurements.Manual.Models;
using TrendWeight.Features.Measurements.Models;
using Xunit;

namespace TrendWeight.Tests.Features.Measurements.Manual;

public class ManualMeasurementsControllerTests
{
    private readonly Mock<IManualDataService> _manualDataServiceMock;
    private readonly ManualMeasurementsController _sut;
    private readonly Guid _userId = Guid.NewGuid();

    public ManualMeasurementsControllerTests()
    {
        _manualDataServiceMock = new Mock<IManualDataService>();
        _sut = new ManualMeasurementsController(_manualDataServiceMock.Object);

        var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, _userId.ToString()) };
        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"))
            }
        };
    }

    private static ManualMeasurementRequest ValidRequest(decimal weight = 80.5m, decimal? fatRatio = null)
    {
        return new ManualMeasurementRequest { Weight = weight, FatRatio = fatRatio };
    }

    [Fact]
    public async Task GetReadings_ReturnsReadingsFromService()
    {
        // Arrange
        _manualDataServiceMock.Setup(x => x.GetReadingsAsync(_userId))
            .ReturnsAsync(new List<RawMeasurement>
            {
                new() { Date = "2024-05-01", Time = "07:00:00", Weight = 81m, FatRatio = 0.22m }
            });

        // Act
        var result = await _sut.GetReadings();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var readings = okResult.Value.Should().BeOfType<List<ManualMeasurementResponse>>().Subject;
        readings.Should().ContainSingle();
        readings[0].Date.Should().Be("2024-05-01");
        readings[0].Weight.Should().Be(81m);
        readings[0].FatRatio.Should().Be(0.22m);
    }

    [Fact]
    public async Task UpsertReading_WithValidRequest_StoresAndReturnsReading()
    {
        // Arrange
        RawMeasurement? captured = null;
        _manualDataServiceMock
            .Setup(x => x.UpsertReadingAsync(_userId, It.IsAny<RawMeasurement>()))
            .Callback<Guid, RawMeasurement>((_, r) => captured = r)
            .ReturnsAsync((Guid _, RawMeasurement r) => r);

        // Act
        var result = await _sut.UpsertReading("2024-05-01", ValidRequest(weight: 80.5m, fatRatio: 0.225m));

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ManualMeasurementResponse>().Subject;
        response.Date.Should().Be("2024-05-01");
        response.Weight.Should().Be(80.5m);
        response.FatRatio.Should().Be(0.225m);

        // Stored with end-of-day time so the reading stays on the chosen date for any dayStartOffset
        captured.Should().NotBeNull();
        captured!.Time.Should().Be("23:59:59");
    }

    [Theory]
    [InlineData("not-a-date")]
    [InlineData("2024-13-01")]
    [InlineData("05/01/2024")]
    [InlineData("1899-12-31")]
    public async Task UpsertReading_WithInvalidDate_ReturnsBadRequest(string date)
    {
        // Act
        var result = await _sut.UpsertReading(date, ValidRequest());

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
        _manualDataServiceMock.Verify(x => x.UpsertReadingAsync(It.IsAny<Guid>(), It.IsAny<RawMeasurement>()), Times.Never);
    }

    [Fact]
    public async Task UpsertReading_WithFarFutureDate_ReturnsBadRequest()
    {
        // Arrange
        var futureDate = DateTime.UtcNow.Date.AddDays(30).ToString("yyyy-MM-dd");

        // Act
        var result = await _sut.UpsertReading(futureDate, ValidRequest());

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    [InlineData(700)]
    public async Task UpsertReading_WithInvalidWeight_ReturnsBadRequest(double weight)
    {
        // Act
        var result = await _sut.UpsertReading("2024-05-01", ValidRequest(weight: (decimal)weight));

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(22.5)] // a percentage instead of a ratio
    public async Task UpsertReading_WithInvalidFatRatio_ReturnsBadRequest(double fatRatio)
    {
        // Act
        var result = await _sut.UpsertReading("2024-05-01", ValidRequest(fatRatio: (decimal)fatRatio));

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task DeleteReading_ExistingDate_ReturnsOk()
    {
        // Arrange
        _manualDataServiceMock.Setup(x => x.DeleteReadingAsync(_userId, "2024-05-01"))
            .ReturnsAsync(true);

        // Act
        var result = await _sut.DeleteReading("2024-05-01");

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task DeleteReading_MissingDate_ReturnsNotFound()
    {
        // Arrange
        _manualDataServiceMock.Setup(x => x.DeleteReadingAsync(_userId, "2024-05-01"))
            .ReturnsAsync(false);

        // Act
        var result = await _sut.DeleteReading("2024-05-01");

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task DeleteReading_InvalidDate_ReturnsBadRequest()
    {
        // Act
        var result = await _sut.DeleteReading("not-a-date");

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
        _manualDataServiceMock.Verify(x => x.DeleteReadingAsync(It.IsAny<Guid>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task DeleteAllReadings_CallsServiceAndReturnsOk()
    {
        // Act
        var result = await _sut.DeleteAllReadings();

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>()
            .Which.Value.Should().BeOfType<MessageResponse>();
        _manualDataServiceMock.Verify(x => x.DeleteAllReadingsAsync(_userId), Times.Once);
    }
}
