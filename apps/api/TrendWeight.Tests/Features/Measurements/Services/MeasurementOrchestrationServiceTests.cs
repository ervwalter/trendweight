using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using TrendWeight.Features.Common;
using TrendWeight.Features.Measurements;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Features.Profile.Models;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Features.Providers;
using TrendWeight.Infrastructure.DataAccess.Models;
using Xunit;

namespace TrendWeight.Tests.Features.Measurements.Services;

public class MeasurementOrchestrationServiceTests
{
    private readonly Mock<IProfileService> _profileServiceMock;
    private readonly Mock<IProviderIntegrationService> _providerIntegrationServiceMock;
    private readonly Mock<IMeasurementSyncService> _measurementSyncServiceMock;
    private readonly Mock<IMeasurementComputationService> _measurementComputationServiceMock;
    private readonly CurrentRequestContext _requestContext;
    private readonly MeasurementOrchestrationService _sut;

    public MeasurementOrchestrationServiceTests()
    {
        _profileServiceMock = new Mock<IProfileService>();
        _providerIntegrationServiceMock = new Mock<IProviderIntegrationService>();
        _measurementSyncServiceMock = new Mock<IMeasurementSyncService>();
        _measurementComputationServiceMock = new Mock<IMeasurementComputationService>();
        _requestContext = new CurrentRequestContext();

        _sut = new MeasurementOrchestrationService(
            _profileServiceMock.Object,
            _providerIntegrationServiceMock.Object,
            _measurementSyncServiceMock.Object,
            _measurementComputationServiceMock.Object,
            _requestContext,
            Mock.Of<ILogger<MeasurementOrchestrationService>>());
    }

    private (DbProfile User, List<SourceData> SourceData, List<ComputedMeasurement> Computed) SetupUser(Guid userId)
    {
        var user = new DbProfile
        {
            Uid = userId,
            Email = "test@example.com",
            Profile = new ProfileData { FirstName = "Test", UseMetric = false }
        };
        var sourceData = new List<SourceData>
        {
            new SourceData { Source = "withings", LastUpdate = DateTime.UtcNow, Measurements = new List<RawMeasurement>() }
        };
        var computed = new List<ComputedMeasurement>();

        _profileServiceMock.Setup(x => x.GetByIdAsync(userId)).ReturnsAsync(user);
        _providerIntegrationServiceMock.Setup(x => x.GetActiveProvidersAsync(userId))
            .ReturnsAsync(new List<string> { "withings" });
        _measurementSyncServiceMock.Setup(x => x.GetMeasurementsForUserAsync(userId, It.IsAny<List<string>>(), user.Profile.UseMetric))
            .ReturnsAsync(new MeasurementsResult
            {
                Data = sourceData,
                ProviderStatus = new Dictionary<string, ProviderSyncStatus>
                {
                    { "withings", new ProviderSyncStatus { Success = true } }
                }
            });
        _measurementComputationServiceMock.Setup(x => x.ComputeMeasurements(sourceData, user.Profile))
            .Returns(computed);

        return (user, sourceData, computed);
    }

    [Fact]
    public async Task GetForUserAsync_WithValidUser_ReturnsAssembledResult()
    {
        var userId = Guid.NewGuid();
        var (user, sourceData, computed) = SetupUser(userId);

        var result = await _sut.GetForUserAsync(userId, "clerk_123", null);

        result.Should().NotBeNull();
        result!.Profile.Should().Be(user);
        result.ComputedMeasurements.Should().BeSameAs(computed);
        result.SourceData.Should().BeSameAs(sourceData);
        result.ProviderStatus.Should().ContainKey("withings");
    }

    [Fact]
    public async Task GetForUserAsync_PopulatesRequestContext()
    {
        var userId = Guid.NewGuid();
        var progressId = Guid.NewGuid();
        SetupUser(userId);

        await _sut.GetForUserAsync(userId, "clerk_123", progressId);

        _requestContext.UserId.Should().Be(userId);
        _requestContext.ExternalId.Should().Be("clerk_123");
        _requestContext.ProgressId.Should().Be(progressId);
    }

    [Fact]
    public async Task GetForUserAsync_WithoutProgressIdOrExternalId_LeavesProgressUnsetAndExternalIdEmpty()
    {
        var userId = Guid.NewGuid();
        SetupUser(userId);

        await _sut.GetForUserAsync(userId, null, null);

        _requestContext.ExternalId.Should().Be(string.Empty);
        _requestContext.ProgressId.Should().BeNull();
    }

    [Fact]
    public async Task GetForUserAsync_WhenProfileMissing_ReturnsNull()
    {
        var userId = Guid.NewGuid();
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId)).ReturnsAsync((DbProfile?)null);

        var result = await _sut.GetForUserAsync(userId, null, null);

        result.Should().BeNull();
        _measurementSyncServiceMock.Verify(
            x => x.GetMeasurementsForUserAsync(It.IsAny<Guid>(), It.IsAny<List<string>>(), It.IsAny<bool>()),
            Times.Never);
    }

    [Fact]
    public async Task GetForUserAsync_PassesFailedProviderStatusThrough()
    {
        var userId = Guid.NewGuid();
        var (user, sourceData, _) = SetupUser(userId);
        _measurementSyncServiceMock.Setup(x => x.GetMeasurementsForUserAsync(userId, It.IsAny<List<string>>(), user.Profile.UseMetric))
            .ReturnsAsync(new MeasurementsResult
            {
                Data = sourceData,
                ProviderStatus = new Dictionary<string, ProviderSyncStatus>
                {
                    { "withings", new ProviderSyncStatus { Success = false, Error = "authfailed", Message = "Authentication expired" } }
                }
            });
        _measurementComputationServiceMock.Setup(x => x.ComputeMeasurements(sourceData, user.Profile))
            .Returns(new List<ComputedMeasurement>());

        var result = await _sut.GetForUserAsync(userId, null, null);

        result!.ProviderStatus["withings"].Success.Should().BeFalse();
        result.ProviderStatus["withings"].Error.Should().Be("authfailed");
        result.ProviderStatus["withings"].Message.Should().Be("Authentication expired");
    }

    [Fact]
    public async Task GetForProfileAsync_UsesProfileDirectlyWithoutLookup()
    {
        var userId = Guid.NewGuid();
        var (user, _, computed) = SetupUser(userId);

        var result = await _sut.GetForProfileAsync(user);

        result.Profile.Should().Be(user);
        result.ComputedMeasurements.Should().BeSameAs(computed);
        _profileServiceMock.Verify(x => x.GetByIdAsync(It.IsAny<Guid>()), Times.Never);
    }
}
