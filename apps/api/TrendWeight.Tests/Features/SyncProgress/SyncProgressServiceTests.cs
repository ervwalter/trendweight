using System;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using TrendWeight.Features.Common;
using TrendWeight.Features.SyncProgress;
using TrendWeight.Infrastructure.DataAccess;
using Xunit;

namespace TrendWeight.Tests.Features.SyncProgress;

public class SyncProgressServiceTests
{
    private readonly Mock<ISupabaseService> _supabaseServiceMock;
    private readonly Mock<ICurrentRequestContext> _requestContextMock;
    private readonly Mock<ILogger<SyncProgressService>> _loggerMock;
    private readonly SyncProgressService _sut;
    private readonly Guid _progressId = Guid.NewGuid();
    private readonly Guid _userId = Guid.NewGuid();
    private const string ExternalId = "clerk_user_123";

    public SyncProgressServiceTests()
    {
        _supabaseServiceMock = new Mock<ISupabaseService>();
        _requestContextMock = new Mock<ICurrentRequestContext>();
        _loggerMock = new Mock<ILogger<SyncProgressService>>();

        _requestContextMock.Setup(x => x.ProgressId).Returns(_progressId);
        _requestContextMock.Setup(x => x.UserId).Returns(_userId);
        _requestContextMock.Setup(x => x.ExternalId).Returns(ExternalId);

        _sut = new SyncProgressService(
            _supabaseServiceMock.Object,
            _requestContextMock.Object,
            _loggerMock.Object);
    }

    [Fact]
    public async Task ReportSyncProgressAsync_WithProgressId_BroadcastsMessage()
    {
        // Act
        await _sut.ReportSyncProgressAsync("running", "Sync in progress");

        // Assert - Should broadcast to user-specific channel
        var expectedTopic = $"sync-progress:{_progressId}";
        _supabaseServiceMock.Verify(x => x.BroadcastAsync(
            expectedTopic,
            "progress_update",
            It.Is<SyncProgressMessage>(msg =>
                msg.Id == _progressId &&
                msg.Status == "running" &&
                msg.Message == "Sync in progress" &&
                msg.Providers != null)), Times.Once);
    }

    [Fact]
    public async Task ReportSyncProgressAsync_WithoutProgressId_DoesNothing()
    {
        // Arrange
        _requestContextMock.Setup(x => x.ProgressId).Returns((Guid?)null);
        var sut = new SyncProgressService(
            _supabaseServiceMock.Object,
            _requestContextMock.Object,
            _loggerMock.Object);

        // Act
        await sut.ReportSyncProgressAsync("running", "Test message");

        // Assert
        _supabaseServiceMock.Verify(x => x.BroadcastAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object>()), Times.Never);
    }

    [Fact]
    public async Task ReportSyncProgressAsync_MultipleCalls_BroadcastsEachTime()
    {
        // Act
        await _sut.ReportSyncProgressAsync("running", "First message");
        await _sut.ReportSyncProgressAsync("succeeded", "Second message");

        // Assert - Should broadcast twice
        var expectedTopic = $"sync-progress:{_progressId}";
        _supabaseServiceMock.Verify(x => x.BroadcastAsync(expectedTopic, "progress_update", It.IsAny<SyncProgressMessage>()), Times.Exactly(2));
    }

    [Fact]
    public async Task ReportProviderProgressAsync_WithProgressId_BroadcastsMessage()
    {
        // Act
        await _sut.ReportProviderProgressAsync("fitbit", "fetching", "Fetching chunk 2", 2, 8);

        // Assert
        var expectedTopic = $"sync-progress:{_progressId}";
        _supabaseServiceMock.Verify(x => x.BroadcastAsync(
            expectedTopic,
            "progress_update",
            It.Is<SyncProgressMessage>(msg =>
                msg.Id == _progressId &&
                msg.Providers != null &&
                msg.Providers.Count == 1 &&
                msg.Providers[0].Provider == "fitbit" &&
                msg.Providers[0].Stage == "fetching" &&
                msg.Providers[0].Message == "Fetching chunk 2" &&
                msg.Providers[0].Current == 2 &&
                msg.Providers[0].Total == 8)), Times.Once);
    }

    [Fact]
    public async Task ReportProviderProgressAsync_WithoutProgressId_DoesNothing()
    {
        // Arrange
        _requestContextMock.Setup(x => x.ProgressId).Returns((Guid?)null);
        var sut = new SyncProgressService(
            _supabaseServiceMock.Object,
            _requestContextMock.Object,
            _loggerMock.Object);

        // Act
        await sut.ReportProviderProgressAsync("fitbit", "fetching");

        // Assert
        _supabaseServiceMock.Verify(x => x.BroadcastAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object>()), Times.Never);
    }

    [Fact]
    public async Task ReportProviderProgressAsync_MultipleCalls_BroadcastsEachTime()
    {
        // Act
        await _sut.ReportProviderProgressAsync("fitbit", "init", "Initializing");
        await _sut.ReportProviderProgressAsync("fitbit", "fetching", "Fetching data", 3, 10);

        // Assert - Should broadcast twice
        var expectedTopic = $"sync-progress:{_progressId}";
        _supabaseServiceMock.Verify(x => x.BroadcastAsync(expectedTopic, "progress_update", It.IsAny<SyncProgressMessage>()), Times.Exactly(2));
    }

    [Fact]
    public async Task ReportProviderProgressAsync_HandlesMultipleProviders()
    {
        // Act - Add two different providers
        await _sut.ReportProviderProgressAsync("fitbit", "fetching", "Fitbit data", 2, 8);
        await _sut.ReportProviderProgressAsync("withings", "fetching", "Page 3", 3, null);

        // Assert - Should have both providers in the final message
        var expectedTopic = $"sync-progress:{_progressId}";
        _supabaseServiceMock.Verify(x => x.BroadcastAsync(
            expectedTopic,
            "progress_update",
            It.Is<SyncProgressMessage>(msg =>
                msg.Providers != null &&
                msg.Providers.Count == 2 &&
                msg.Providers.Any(p => p.Provider == "fitbit" && p.Current == 2 && p.Total == 8) &&
                msg.Providers.Any(p => p.Provider == "withings" && p.Current == 3 && p.Total == null))), Times.AtLeast(1));
    }

    [Fact]
    public async Task ReportProviderProgressAsync_UpdatesSingleProviderCorrectly()
    {
        // Act - Single provider update to verify final state
        await _sut.ReportProviderProgressAsync("fitbit", "done", "Complete", 10, 10);

        // Assert
        var expectedTopic = $"sync-progress:{_progressId}";
        _supabaseServiceMock.Verify(x => x.BroadcastAsync(
            expectedTopic,
            "progress_update",
            It.Is<SyncProgressMessage>(msg =>
                msg.Providers != null &&
                msg.Providers.Count == 1 &&
                msg.Providers[0].Provider == "fitbit" &&
                msg.Providers[0].Stage == "done" &&
                msg.Providers[0].Message == "Complete" &&
                msg.Providers[0].Current == 10 &&
                msg.Providers[0].Total == 10)), Times.Once);
    }
}
