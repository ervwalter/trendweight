using System.Net;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Features.ProviderLinks.Services;
using TrendWeight.Features.Providers;
using TrendWeight.Features.Providers.Fitbit;
using TrendWeight.Features.Providers.Models;
using TrendWeight.Infrastructure.Configuration;
using TrendWeight.Infrastructure.DataAccess.Models;
using TrendWeight.Tests.Fixtures;
using Xunit;

namespace TrendWeight.Tests.Features.Providers.Fitbit;

/// <summary>
/// The token-rotation path of FitbitService: an expired stored token is refreshed,
/// the refreshed token is persisted, and the data fetch uses the new bearer.
/// </summary>
public class FitbitTokenRefreshTests
{
    private const string TokenUrl = "/oauth2/token";
    private const string WeightUrl = "/body/log/weight/date";

    private readonly RecordingHttpHandler _http = new();
    private readonly Mock<IProviderLinkService> _providerLinkServiceMock = new();
    private readonly FitbitService _sut;

    public FitbitTokenRefreshTests()
    {
        var options = Options.Create(new AppOptions
        {
            Fitbit = new FitbitConfig { ClientId = "client-id", ClientSecret = "client-secret" }
        });

        _sut = new FitbitService(
            new HttpClient(_http) { BaseAddress = new Uri("https://api.fitbit.com") },
            options,
            _providerLinkServiceMock.Object,
            Mock.Of<IProfileService>(),
            null,
            Mock.Of<ILogger<FitbitService>>());
    }

    private void StoreLink(Guid userId, Dictionary<string, object> token)
    {
        _providerLinkServiceMock.Setup(x => x.GetProviderLinkAsync(userId, "fitbit"))
            .ReturnsAsync(new DbProviderLink { Uid = userId, Provider = "fitbit", Token = token });
    }

    [Fact]
    public async Task SyncMeasurementsAsync_WithExpiredToken_RefreshesStoresAndUsesNewBearer()
    {
        var userId = Guid.NewGuid();
        StoreLink(userId, ProviderTokens.Expired("old-access"));
        _http.WhenUrlContains(TokenUrl, HttpStatusCode.OK,
                "{\"access_token\":\"new-access\",\"refresh_token\":\"new-refresh\",\"expires_in\":28800,\"token_type\":\"Bearer\",\"scope\":\"weight\",\"user_id\":\"ABC123\"}")
            .WhenUrlContains(WeightUrl, HttpStatusCode.OK, "{\"weight\":[]}");
        var before = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

        var result = await _sut.SyncMeasurementsAsync(userId, true, DateTime.UtcNow.AddDays(-5));

        result.Success.Should().BeTrue();
        result.Measurements.Should().NotBeNull();

        // The refresh spent the stored refresh token
        var refresh = _http.Requests.Should().ContainSingle(r => r.Uri.ToString().Contains(TokenUrl)).Subject;
        refresh.Method.Should().Be(HttpMethod.Post);
        refresh.Body.Should().Contain("grant_type=refresh_token").And.Contain("refresh_token=test-refresh-token");

        // The rotated token is persisted with a fresh received_at
        _providerLinkServiceMock.Verify(x => x.StoreProviderLinkAsync(userId, "fitbit",
            It.Is<Dictionary<string, object>>(t =>
                (string)t["access_token"] == "new-access" &&
                (string)t["refresh_token"] == "new-refresh" &&
                (int)t["expires_in"] == 28800 &&
                (long)t["received_at"] >= before),
            It.IsAny<string?>()), Times.Once);

        // ...and the measurement fetch already uses it
        var fetches = _http.Requests.Where(r => r.Uri.ToString().Contains(WeightUrl)).ToList();
        fetches.Should().NotBeEmpty();
        fetches.Should().OnlyContain(r => r.AuthScheme == "Bearer" && r.AuthParameter == "new-access");
        ProviderServiceBase.HasRefreshLock(userId, "fitbit").Should().BeFalse();
    }

    [Fact]
    public async Task SyncMeasurementsAsync_WithValidToken_DoesNotRefresh()
    {
        var userId = Guid.NewGuid();
        StoreLink(userId, ProviderTokens.Valid("still-good"));
        _http.WhenUrlContains(WeightUrl, HttpStatusCode.OK, "{\"weight\":[]}");

        var result = await _sut.SyncMeasurementsAsync(userId, true, DateTime.UtcNow.AddDays(-5));

        result.Success.Should().BeTrue();
        _http.Requests.Should().NotContain(r => r.Uri.ToString().Contains(TokenUrl));
        _http.Requests.Should().OnlyContain(r => r.AuthParameter == "still-good");
        _providerLinkServiceMock.Verify(x => x.StoreProviderLinkAsync(It.IsAny<Guid>(), It.IsAny<string>(),
            It.IsAny<Dictionary<string, object>>(), It.IsAny<string?>()), Times.Never);
    }

    [Fact]
    public async Task SyncMeasurementsAsync_WithExpiredTokenAndNoRefreshToken_ReportsUnknownWithoutCalling()
    {
        var userId = Guid.NewGuid();
        StoreLink(userId, ProviderTokens.ExpiredWithoutRefreshToken());

        var result = await _sut.SyncMeasurementsAsync(userId, true, DateTime.UtcNow.AddDays(-5));

        result.Success.Should().BeFalse();
        result.Error.Should().Be(ProviderSyncError.Unknown);
        result.Measurements.Should().BeNull();
        _http.Requests.Should().BeEmpty("nothing can be fetched or refreshed without a refresh token");
        _providerLinkServiceMock.Verify(x => x.StoreProviderLinkAsync(It.IsAny<Guid>(), It.IsAny<string>(),
            It.IsAny<Dictionary<string, object>>(), It.IsAny<string?>()), Times.Never);
        ProviderServiceBase.HasRefreshLock(userId, "fitbit").Should().BeFalse();
    }

    [Fact]
    public async Task SyncMeasurementsAsync_WhenRefreshIsRejected_ReportsAuthFailureAndKeepsStoredToken()
    {
        var userId = Guid.NewGuid();
        StoreLink(userId, ProviderTokens.Expired());
        _http.WhenUrlContains(TokenUrl, HttpStatusCode.BadRequest, "{\"errors\":[{\"errorType\":\"invalid_grant\"}]}");

        var result = await _sut.SyncMeasurementsAsync(userId, true, DateTime.UtcNow.AddDays(-5));

        result.Success.Should().BeFalse();
        result.Error.Should().Be(ProviderSyncError.AuthFailed);
        _http.Requests.Should().NotContain(r => r.Uri.ToString().Contains(WeightUrl));
        _providerLinkServiceMock.Verify(x => x.StoreProviderLinkAsync(It.IsAny<Guid>(), It.IsAny<string>(),
            It.IsAny<Dictionary<string, object>>(), It.IsAny<string?>()), Times.Never);
    }
}
