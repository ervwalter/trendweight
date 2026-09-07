using System.Net;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Features.ProviderLinks.Services;
using TrendWeight.Features.Providers.Withings;
using TrendWeight.Infrastructure.Configuration;
using TrendWeight.Infrastructure.DataAccess.Models;
using TrendWeight.Tests.Fixtures;
using Xunit;
using static TrendWeight.Tests.Fixtures.WithingsPayloads;

namespace TrendWeight.Tests.Features.Providers.Withings;

/// <summary>
/// How WithingsService resolves the <c>timezone</c> field: Windows ids map through
/// TZConvert, and an id nobody can resolve falls back to UTC with a warning.
/// </summary>
public class WithingsTimezoneTests
{
    private const string MeasureUrl = "wbsapi.withings.net/measure";

    private readonly RecordingHttpHandler _http = new();
    private readonly CapturingLoggerProvider _logs = new();
    private readonly Mock<IProviderLinkService> _providerLinkServiceMock = new();
    private readonly WithingsService _sut;

    public WithingsTimezoneTests()
    {
        var options = Options.Create(new AppOptions
        {
            Withings = new WithingsConfig { ClientId = "test-client-id", ClientSecret = "test-client-secret" }
        });

        _sut = new WithingsService(
            new HttpClient(_http),
            options,
            _providerLinkServiceMock.Object,
            Mock.Of<IProfileService>(),
            null,
            _logs.CreateLogger<WithingsService>());
    }

    [Fact]
    public async Task GetMeasurementsAsync_WithWindowsTimezoneId_UsesTZConvertMapping()
    {
        var userId = LinkUser();
        // 01:30Z on 1 July is still the previous evening in Pacific Daylight Time (UTC-7)
        var utcTimestamp = new DateTimeOffset(2024, 7, 1, 1, 30, 0, TimeSpan.Zero).ToUnixTimeSeconds();
        _http.WhenUrlContains(MeasureUrl, HttpStatusCode.OK,
            GetMeas("Pacific Standard Time", [Group(1, utcTimestamp, Measure(70000, 1, -3))]));

        var result = await _sut.GetMeasurementsAsync(userId, true);

        var measurement = result.Should().ContainSingle().Subject;
        measurement.Date.Should().Be("2024-06-30");
        measurement.Time.Should().Be("18:30:00");
        measurement.Weight.Should().Be(70m);
        _logs.ShouldNotHaveLogged(LogLevel.Warning);
    }

    [Fact]
    public async Task GetMeasurementsAsync_WithUnknownTimezone_FallsBackToUtc_AndLogsWarning()
    {
        var userId = LinkUser();
        var utcTimestamp = new DateTimeOffset(2024, 12, 1, 10, 5, 0, TimeSpan.Zero).ToUnixTimeSeconds();
        _http.WhenUrlContains(MeasureUrl, HttpStatusCode.OK,
            GetMeas("Mars/Phobos", [Group(1, utcTimestamp, Measure(70000, 1, -3))]));

        var result = await _sut.GetMeasurementsAsync(userId, true);

        var measurement = result.Should().ContainSingle().Subject;
        measurement.Date.Should().Be("2024-12-01");
        measurement.Time.Should().Be("10:05:00");
        _logs.ShouldHaveLogged(LogLevel.Warning, "Withings timezone fallback to UTC");
    }

    private Guid LinkUser()
    {
        var userId = Guid.NewGuid();
        _providerLinkServiceMock.Setup(x => x.GetProviderLinkAsync(userId, "withings"))
            .ReturnsAsync(new DbProviderLink { Uid = userId, Provider = "withings", Token = ProviderTokens.Valid() });
        return userId;
    }
}
