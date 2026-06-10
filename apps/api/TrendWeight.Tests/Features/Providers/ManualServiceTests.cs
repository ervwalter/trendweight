using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Moq;
using TrendWeight.Features.Measurements;
using TrendWeight.Features.Providers;
using Xunit;

namespace TrendWeight.Tests.Features.Providers;

public class ManualServiceTests
{
    private readonly Mock<ISourceDataService> _mockSourceDataService;
    private readonly Mock<ILogger<ManualService>> _mockLogger;
    private readonly ManualService _service;

    public ManualServiceTests()
    {
        _mockSourceDataService = new Mock<ISourceDataService>();
        _mockLogger = new Mock<ILogger<ManualService>>();
        _service = new ManualService(_mockSourceDataService.Object, _mockLogger.Object);
    }

    [Fact]
    public void ProviderName_Returns_Manual()
    {
        // Assert
        Assert.Equal("manual", _service.ProviderName);
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
    public async Task SyncMeasurementsAsync_Always_ReturnsSuccessWithNoMeasurements()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var result = await _service.SyncMeasurementsAsync(userId, true);

        // Assert
        Assert.True(result.Success);
        Assert.Equal("manual", result.Provider);
        Assert.Null(result.Measurements);
    }

    [Fact]
    public async Task HasActiveProviderLinkAsync_WhenNoMeasurementsExist_ReturnsFalse()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _mockSourceDataService.Setup(x => x.HasMeasurementsAsync(userId, "manual"))
            .ReturnsAsync(false);

        // Act
        var result = await _service.HasActiveProviderLinkAsync(userId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task HasActiveProviderLinkAsync_WhenMeasurementsExist_ReturnsTrue()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _mockSourceDataService.Setup(x => x.HasMeasurementsAsync(userId, "manual"))
            .ReturnsAsync(true);

        // Act
        var result = await _service.HasActiveProviderLinkAsync(userId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task RemoveProviderLinkAsync_Returns_False()
    {
        // Act
        var result = await _service.RemoveProviderLinkAsync(Guid.NewGuid());

        // Assert
        Assert.False(result);
    }
}
