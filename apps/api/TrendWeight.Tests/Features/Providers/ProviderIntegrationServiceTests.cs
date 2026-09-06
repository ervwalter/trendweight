using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using TrendWeight.Features.Providers;
using TrendWeight.Tests.Fixtures;
using Xunit;

namespace TrendWeight.Tests.Features.Providers;

public class ProviderIntegrationServiceTests : TestBase
{
    private readonly Mock<IProviderService> _withingsServiceMock;
    private readonly Mock<IProviderService> _fitbitServiceMock;
    private readonly Mock<ILogger<ProviderIntegrationService>> _loggerMock;
    private readonly ProviderIntegrationService _sut;

    public ProviderIntegrationServiceTests()
    {
        _withingsServiceMock = new Mock<IProviderService>();
        _withingsServiceMock.Setup(x => x.ProviderName).Returns("withings");

        _fitbitServiceMock = new Mock<IProviderService>();
        _fitbitServiceMock.Setup(x => x.ProviderName).Returns("fitbit");

        _loggerMock = new Mock<ILogger<ProviderIntegrationService>>();

        var providerServices = new List<IProviderService>
        {
            _withingsServiceMock.Object,
            _fitbitServiceMock.Object
        };

        _sut = new ProviderIntegrationService(providerServices, _loggerMock.Object);
    }

    #region GetProviderService Tests

    [Fact]
    public void GetProviderService_WithValidProviderName_ReturnsService()
    {
        // Act
        var result = _sut.GetProviderService("withings");

        // Assert
        result.Should().NotBeNull();
        result!.ProviderName.Should().Be("withings");
    }

    [Fact]
    public void GetProviderService_WithUppercaseProviderName_ReturnsService()
    {
        // Act
        var result = _sut.GetProviderService("FITBIT");

        // Assert
        result.Should().NotBeNull();
        result!.ProviderName.Should().Be("fitbit");
    }

    [Fact]
    public void GetProviderService_WithInvalidProviderName_ReturnsNull()
    {
        // Act
        var result = _sut.GetProviderService("invalid");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void GetProviderService_WithEmptyProviderName_ReturnsNull()
    {
        // Act
        var result = _sut.GetProviderService("");

        // Assert
        result.Should().BeNull();
    }

    #endregion

    #region GetActiveProvidersAsync Tests

    [Fact]
    public async Task GetActiveProvidersAsync_WithAllActiveProviders_ReturnsAll()
    {
        // Arrange
        var userId = Guid.NewGuid();

        _withingsServiceMock.Setup(x => x.HasActiveProviderLinkAsync(userId))
            .ReturnsAsync(true);
        _fitbitServiceMock.Setup(x => x.HasActiveProviderLinkAsync(userId))
            .ReturnsAsync(true);

        // Act
        var result = await _sut.GetActiveProvidersAsync(userId);

        // Assert
        result.Should().HaveCount(2);
        result.Should().Contain("withings");
        result.Should().Contain("fitbit");
    }

    [Fact]
    public async Task GetActiveProvidersAsync_WithNoActiveProviders_ReturnsEmpty()
    {
        // Arrange
        var userId = Guid.NewGuid();

        _withingsServiceMock.Setup(x => x.HasActiveProviderLinkAsync(userId))
            .ReturnsAsync(false);
        _fitbitServiceMock.Setup(x => x.HasActiveProviderLinkAsync(userId))
            .ReturnsAsync(false);

        // Act
        var result = await _sut.GetActiveProvidersAsync(userId);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetActiveProvidersAsync_WithPartialActiveProviders_ReturnsOnlyActive()
    {
        // Arrange
        var userId = Guid.NewGuid();

        _withingsServiceMock.Setup(x => x.HasActiveProviderLinkAsync(userId))
            .ReturnsAsync(false);
        _fitbitServiceMock.Setup(x => x.HasActiveProviderLinkAsync(userId))
            .ReturnsAsync(true);

        // Act
        var result = await _sut.GetActiveProvidersAsync(userId);

        // Assert
        result.Should().HaveCount(1);
        result.Should().Contain("fitbit");
        result.Should().NotContain("withings");
    }

    [Fact]
    public async Task GetActiveProvidersAsync_WithManualService_IncludesManualOnlyWhenDataExists()
    {
        // Arrange - use a real ManualService so the implicit-activation rule is exercised end-to-end
        var userId = Guid.NewGuid();
        var sourceDataServiceMock = new Mock<TrendWeight.Features.Measurements.ISourceDataService>();
        var manualService = new ManualService(
            sourceDataServiceMock.Object,
            new Mock<ILogger<ManualService>>().Object);

        var service = new ProviderIntegrationService(
            new List<IProviderService> { _withingsServiceMock.Object, manualService },
            _loggerMock.Object);

        _withingsServiceMock.Setup(x => x.HasActiveProviderLinkAsync(userId)).ReturnsAsync(true);

        // No manual data yet
        sourceDataServiceMock.Setup(x => x.HasMeasurementsAsync(userId, "manual")).ReturnsAsync(false);

        // Act & Assert - manual absent without data
        var withoutData = await service.GetActiveProvidersAsync(userId);
        withoutData.Should().BeEquivalentTo(new[] { "withings" });

        // Manual data now exists
        sourceDataServiceMock.Setup(x => x.HasMeasurementsAsync(userId, "manual")).ReturnsAsync(true);

        // Act & Assert - manual included once data exists
        var withData = await service.GetActiveProvidersAsync(userId);
        withData.Should().BeEquivalentTo(new[] { "withings", "manual" });
    }

    #endregion
}
