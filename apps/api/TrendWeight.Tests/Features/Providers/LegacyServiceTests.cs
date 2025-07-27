using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Moq;
using TrendWeight.Features.Providers;
using TrendWeight.Features.Providers.Models;
using TrendWeight.Features.ProviderLinks.Services;
using Xunit;

namespace TrendWeight.Tests.Features.Providers;

public class LegacyServiceTests
{
    private readonly Mock<IProviderLinkService> _mockProviderLinkService;
    private readonly Mock<ILogger<LegacyService>> _mockLogger;
    private readonly LegacyService _service;

    public LegacyServiceTests()
    {
        _mockProviderLinkService = new Mock<IProviderLinkService>();
        _mockLogger = new Mock<ILogger<LegacyService>>();
        _service = new LegacyService(_mockProviderLinkService.Object, _mockLogger.Object);
    }

    [Fact]
    public void ProviderName_Returns_Legacy()
    {
        // Assert
        Assert.Equal("legacy", _service.ProviderName);
    }

    [Fact]
    public void GetAuthorizationUrl_Throws_NotSupportedException()
    {
        // Act & Assert
        Assert.Throws<NotSupportedException>(() =>
            _service.GetAuthorizationUrl("state", "https://callback.url"));
    }

    [Fact]
    public async Task ExchangeAuthorizationCodeAsync_Returns_False()
    {
        // Act
        var result = await _service.ExchangeAuthorizationCodeAsync("code", "https://callback.url", Guid.NewGuid());

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task GetMeasurementsAsync_Always_Throws_NotSupportedException()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act & Assert
        await Assert.ThrowsAsync<NotSupportedException>(() =>
            _service.GetMeasurementsAsync(userId, true));

        await Assert.ThrowsAsync<NotSupportedException>(() =>
            _service.GetMeasurementsAsync(userId, false, DateTime.Now));
    }

    [Fact]
    public async Task SyncMeasurementsAsync_Always_ReturnsSuccess()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var result = await _service.SyncMeasurementsAsync(userId, true);

        // Assert
        Assert.True(result.Success);
        Assert.Equal("Legacy data does not require sync", result.Message);
        Assert.Equal("legacy", result.Provider);
    }

    [Fact]
    public async Task HasActiveProviderLinkAsync_WhenLinkDoesNotExist_ReturnsFalse()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _mockProviderLinkService.Setup(x => x.GetProviderLinkAsync(userId, "legacy"))
            .ReturnsAsync((TrendWeight.Infrastructure.DataAccess.Models.DbProviderLink?)null);

        // Act
        var result = await _service.HasActiveProviderLinkAsync(userId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task HasActiveProviderLinkAsync_WhenLinkIsDisabled_ReturnsFalse()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var disabledLink = new TrendWeight.Infrastructure.DataAccess.Models.DbProviderLink
        {
            Provider = "legacy",
            Token = new Dictionary<string, object> { ["disabled"] = true }
        };
        _mockProviderLinkService.Setup(x => x.GetProviderLinkAsync(userId, "legacy"))
            .ReturnsAsync(disabledLink);

        // Act
        var result = await _service.HasActiveProviderLinkAsync(userId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task HasActiveProviderLinkAsync_WhenLinkIsEnabled_ReturnsTrue()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var enabledLink = new TrendWeight.Infrastructure.DataAccess.Models.DbProviderLink
        {
            Provider = "legacy",
            Token = new Dictionary<string, object>() // No disabled flag means enabled
        };
        _mockProviderLinkService.Setup(x => x.GetProviderLinkAsync(userId, "legacy"))
            .ReturnsAsync(enabledLink);

        // Act
        var result = await _service.HasActiveProviderLinkAsync(userId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task RemoveProviderLinkAsync_WhenLinkExists_SetsDisabledFlagAndReturnsTrue()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var existingLink = new TrendWeight.Infrastructure.DataAccess.Models.DbProviderLink
        {
            Provider = "legacy",
            Token = new Dictionary<string, object> { ["someData"] = "value" }
        };

        _mockProviderLinkService.Setup(x => x.GetProviderLinkAsync(userId, "legacy"))
            .ReturnsAsync(existingLink);

        Dictionary<string, object>? capturedToken = null;
        _mockProviderLinkService.Setup(x => x.StoreProviderLinkAsync(userId, "legacy", It.IsAny<Dictionary<string, object>>(), It.IsAny<string>()))
            .Callback<Guid, string, Dictionary<string, object>, string>((_, _, token, _) => capturedToken = token)
            .Returns(Task.CompletedTask);

        // Act
        var result = await _service.RemoveProviderLinkAsync(userId);

        // Assert
        Assert.True(result);
        Assert.NotNull(capturedToken);
        Assert.True(capturedToken.ContainsKey("disabled"));
        Assert.Equal(true, capturedToken["disabled"]);
        Assert.Equal("value", capturedToken["someData"]); // Existing data preserved
    }

    [Fact]
    public async Task RemoveProviderLinkAsync_WhenLinkDoesNotExist_ReturnsFalse()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _mockProviderLinkService.Setup(x => x.GetProviderLinkAsync(userId, "legacy"))
            .ReturnsAsync((TrendWeight.Infrastructure.DataAccess.Models.DbProviderLink?)null);

        // Act
        var result = await _service.RemoveProviderLinkAsync(userId);

        // Assert
        Assert.False(result);
        _mockProviderLinkService.Verify(x => x.StoreProviderLinkAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<string>()), Times.Never);
    }
}
