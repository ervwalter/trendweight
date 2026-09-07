using System.Net;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Features.ProviderLinks.Services;
using TrendWeight.Features.Providers.Exceptions;
using TrendWeight.Infrastructure.DataAccess.Models;
using TrendWeight.Tests.Fixtures;
using Xunit;

namespace TrendWeight.Tests.Features.Providers;

public class ProviderServiceBaseTests
{
    private readonly Mock<IProviderLinkService> _providerLinkServiceMock = new();
    private readonly TestProviderService _sut;

    public ProviderServiceBaseTests()
    {
        _sut = new TestProviderService(_providerLinkServiceMock.Object, Mock.Of<IProfileService>(), Mock.Of<ILogger>());
    }

    #region IsTokenExpired

    public static TheoryData<string, Dictionary<string, object>, bool> TokenExpiryCases()
    {
        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var data = new TheoryData<string, Dictionary<string, object>, bool>
        {
            { "missing received_at", new() { ["expires_in"] = 3600 }, true },
            { "missing expires_in", new() { ["received_at"] = now }, true },
            { "unparseable received_at", new() { ["received_at"] = "yesterday", ["expires_in"] = 3600 }, true },
            { "lifetime already over", new() { ["received_at"] = now - 7200, ["expires_in"] = 3600 }, true },
            { "inside the 300s refresh buffer", new() { ["received_at"] = now, ["expires_in"] = 120 }, true },
            { "exactly at the buffer boundary", new() { ["received_at"] = now, ["expires_in"] = 300 }, true },
            { "comfortably outside the buffer", new() { ["received_at"] = now, ["expires_in"] = 3600 }, false },
            { "string-typed fields (as read back from JSON)", new() { ["received_at"] = now.ToString(), ["expires_in"] = "3600" }, false },
            { "legacy migration marker (epoch 0)", new() { ["received_at"] = 0L, ["expires_in"] = 3600 }, true }
        };
        return data;
    }

    [Theory]
    [MemberData(nameof(TokenExpiryCases))]
    public void IsTokenExpired_TreatsMissingFieldsAndBufferAsExpired(string scenario, Dictionary<string, object> token, bool expected)
    {
        _sut.IsExpired(token).Should().Be(expected, scenario);
    }

    #endregion

    #region DUPLICATE_REQUEST recovery

    private static ProviderException DuplicateRequest() =>
        new("Request was already processed", HttpStatusCode.Conflict, "DUPLICATE_REQUEST", isRetryable: false);

    [Fact]
    public async Task ExchangeAuthorizationCodeAsync_OnDuplicateRequestWithStoredLink_ReportsSuccessWithoutStoring()
    {
        // React Strict Mode exchanges the same code twice; the first exchange stored the
        // token, so the provider's duplicate rejection is not a failure for the user
        var userId = Guid.NewGuid();
        _sut.ExchangeCode = (_, _) => throw DuplicateRequest();
        _providerLinkServiceMock.Setup(x => x.GetProviderLinkAsync(userId, "test"))
            .ReturnsAsync(new DbProviderLink { Uid = userId, Provider = "test", Token = ProviderTokens.Valid() });

        var result = await _sut.ExchangeAuthorizationCodeAsync("code", "https://example.test/callback", userId);

        result.Should().BeTrue();
        _providerLinkServiceMock.Verify(x => x.StoreProviderLinkAsync(It.IsAny<Guid>(), It.IsAny<string>(),
            It.IsAny<Dictionary<string, object>>(), It.IsAny<string?>()), Times.Never);
    }

    [Fact]
    public async Task ExchangeAuthorizationCodeAsync_OnDuplicateRequestWithoutStoredLink_Rethrows()
    {
        var userId = Guid.NewGuid();
        _sut.ExchangeCode = (_, _) => throw DuplicateRequest();
        _providerLinkServiceMock.Setup(x => x.GetProviderLinkAsync(userId, "test"))
            .ReturnsAsync((DbProviderLink?)null);

        var act = () => _sut.ExchangeAuthorizationCodeAsync("code", "https://example.test/callback", userId);

        (await act.Should().ThrowAsync<ProviderException>()).Which.ErrorCode.Should().Be("DUPLICATE_REQUEST");
    }

    [Fact]
    public async Task ExchangeAuthorizationCodeAsync_OnOtherProviderError_DoesNotConsultStoredLink()
    {
        var userId = Guid.NewGuid();
        _sut.ExchangeCode = (_, _) => throw new ProviderException("bad code", HttpStatusCode.BadRequest, "INVALID_CODE", isRetryable: false);

        var act = () => _sut.ExchangeAuthorizationCodeAsync("code", "https://example.test/callback", userId);

        await act.Should().ThrowAsync<ProviderException>();
        _providerLinkServiceMock.Verify(x => x.GetProviderLinkAsync(It.IsAny<Guid>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task ExchangeAuthorizationCodeAsync_OnSuccess_StoresTheToken()
    {
        var userId = Guid.NewGuid();
        var token = ProviderTokens.Valid("fresh");
        _sut.ExchangeCode = (_, _) => Task.FromResult(token);

        var result = await _sut.ExchangeAuthorizationCodeAsync("code", "https://example.test/callback", userId);

        result.Should().BeTrue();
        _providerLinkServiceMock.Verify(x => x.StoreProviderLinkAsync(userId, "test", token, null), Times.Once);
    }

    #endregion
}
