using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using System.Net;
using System.Text;
using System.Text.Json;
using TrendWeight.Features.Measurements;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Features.Providers.Withings;
using TrendWeight.Features.Providers.Withings.Models;
using TrendWeight.Features.ProviderLinks.Services;
using TrendWeight.Infrastructure.Configuration;
using TrendWeight.Infrastructure.DataAccess.Models;
using TrendWeight.Tests.Fixtures;
using Xunit;

namespace TrendWeight.Tests.Features.Providers.Withings;

public class WithingsTimezoneTests : TestBase
{
    private readonly Mock<HttpMessageHandler> _httpMessageHandlerMock;
    private readonly HttpClient _httpClient;
    private readonly Mock<IOptions<AppOptions>> _appOptionsMock;
    private readonly Mock<IProviderLinkService> _providerLinkServiceMock;
    private readonly Mock<IProfileService> _profileServiceMock;
    private readonly Mock<ILogger<WithingsService>> _loggerMock;
    private readonly WithingsService _sut;

    public WithingsTimezoneTests()
    {
        _httpMessageHandlerMock = new Mock<HttpMessageHandler>();
        _httpClient = new HttpClient(_httpMessageHandlerMock.Object)
        {
            BaseAddress = new Uri("https://api.withings.com")
        };

        var appOptions = new AppOptions
        {
            Withings = new WithingsConfig
            {
                ClientId = "test-client-id",
                ClientSecret = "test-client-secret"
            }
        };

        _appOptionsMock = new Mock<IOptions<AppOptions>>();
        _appOptionsMock.Setup(x => x.Value).Returns(appOptions);
        _providerLinkServiceMock = new Mock<IProviderLinkService>();
        _profileServiceMock = new Mock<IProfileService>();
        _loggerMock = new Mock<ILogger<WithingsService>>();

        _sut = new WithingsService(
            _httpClient,
            _appOptionsMock.Object,
            _providerLinkServiceMock.Object,
            _profileServiceMock.Object,
            null,
            _loggerMock.Object);
    }

    [Fact]
    public async Task GetMeasurementsAsync_WithWindowsTimezoneId_UsesTZConvertMapping()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var providerLink = new DbProviderLink
        {
            Provider = "withings",
            Token = new Dictionary<string, object>
            {
                ["access_token"] = "test-access-token",
                ["refresh_token"] = "test-refresh-token",
                ["received_at"] = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                ["expires_in"] = 10800
            }
        };

        _providerLinkServiceMock.Setup(x => x.GetProviderLinkAsync(userId, "withings")).ReturnsAsync(providerLink);

        // Use a UTC timestamp that falls on previous local day in Pacific during DST
        var utcTimestamp = new DateTimeOffset(2024, 7, 1, 1, 30, 0, TimeSpan.Zero).ToUnixTimeSeconds(); // 2024-07-01 01:30:00Z

        var response = new WithingsResponse<WithingsGetMeasuresResponse>
        {
            Status = 0,
            Body = new WithingsGetMeasuresResponse
            {
                UpdateTime = utcTimestamp,
                More = 0,
                Offset = 0,
                Timezone = "Pacific Standard Time", // Windows ID; should resolve via TZConvert
                MeasureGroups = new List<WithingsMeasureGroup>
                {
                    new WithingsMeasureGroup
                    {
                        GroupId = 1,
                        Attribute = 0,
                        Date = utcTimestamp,
                        Created = utcTimestamp,
                        Category = 1,
                        Measures = new List<WithingsMeasure>
                        {
                            new WithingsMeasure { Value = 70000, Unit = -3, Type = 1 } // 70.0 kg
                        }
                    }
                }
            }
        };

        SetupHttpResponse("wbsapi.withings.net/measure", response);

        // Act
        var result = await _sut.GetMeasurementsAsync(userId, true);

        // Assert
        result.Should().NotBeNull();
        result!.Should().HaveCount(1);

        // Pacific Daylight Time is UTC-7 on July 1, so local is previous day 2024-06-30 18:30:00
        result[0].Date.Should().Be("2024-06-30");
        result[0].Time.Should().Be("18:30:00");

        // Ensure no UTC fallback message was logged
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Withings timezone fallback to UTC")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Never);
    }

    [Fact]
    public async Task GetMeasurementsAsync_WithUnknownTimezone_FallsBackToUtc_AndLogsWarning()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var providerLink = new DbProviderLink
        {
            Provider = "withings",
            Token = new Dictionary<string, object>
            {
                ["access_token"] = "test-access-token",
                ["refresh_token"] = "test-refresh-token",
                ["received_at"] = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                ["expires_in"] = 10800
            }
        };

        _providerLinkServiceMock.Setup(x => x.GetProviderLinkAsync(userId, "withings")).ReturnsAsync(providerLink);

        var utcTimestamp = new DateTimeOffset(2024, 12, 1, 10, 5, 0, TimeSpan.Zero).ToUnixTimeSeconds();

        var response = new WithingsResponse<WithingsGetMeasuresResponse>
        {
            Status = 0,
            Body = new WithingsGetMeasuresResponse
            {
                UpdateTime = utcTimestamp,
                More = 0,
                Offset = 0,
                Timezone = "Mars/Phobos", // Unresolvable ID forces UTC fallback
                MeasureGroups = new List<WithingsMeasureGroup>
                {
                    new WithingsMeasureGroup
                    {
                        GroupId = 1,
                        Attribute = 0,
                        Date = utcTimestamp,
                        Created = utcTimestamp,
                        Category = 1,
                        Measures = new List<WithingsMeasure>
                        {
                            new WithingsMeasure { Value = 70000, Unit = -3, Type = 1 }
                        }
                    }
                }
            }
        };

        SetupHttpResponse("wbsapi.withings.net/measure", response);

        // Act
        var result = await _sut.GetMeasurementsAsync(userId, true);

        // Assert
        result.Should().NotBeNull();
        result!.Should().HaveCount(1);

        // UTC fallback means the date/time equals UTC
        result[0].Date.Should().Be("2024-12-01");
        result[0].Time.Should().Be("10:05:00");

        // Verify a warning about UTC fallback was logged
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Withings timezone fallback to UTC")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    private void SetupHttpResponse<T>(string urlContains, T responseContent, HttpStatusCode statusCode = HttpStatusCode.OK)
    {
        var json = JsonSerializer.Serialize(responseContent);
        var response = new HttpResponseMessage(statusCode)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };

        _httpMessageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(req => req.RequestUri!.ToString().Contains(urlContains)),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(response);
    }
}

