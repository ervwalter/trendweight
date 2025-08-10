using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using TrendWeight.Features.Common;
using TrendWeight.Features.SyncProgress;
using TrendWeight.Features.SyncProgress.Models;
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
    public async Task StartAsync_WithProgressId_CreatesRow()
    {
        // Act
        await _sut.StartAsync("all", "running");

        // Assert
        _supabaseServiceMock.Verify(x => x.InsertAsync(It.Is<SyncProgressRow>(row =>
            row.Id == _progressId &&
            row.Uid == _userId &&
            row.ExternalId == ExternalId &&
            row.Provider == "all" &&
            row.Status == "running" &&
            row.Providers != null &&
            row.Providers.Count == 0)), Times.Once);
    }

    [Fact]
    public async Task StartAsync_WithoutProgressId_DoesNothing()
    {
        // Arrange
        _requestContextMock.Setup(x => x.ProgressId).Returns((Guid?)null);
        var sut = new SyncProgressService(
            _supabaseServiceMock.Object,
            _requestContextMock.Object,
            _loggerMock.Object);

        // Act
        await sut.StartAsync();

        // Assert
        _supabaseServiceMock.Verify(x => x.InsertAsync(It.IsAny<SyncProgressRow>()), Times.Never);
    }

    [Fact]
    public async Task StartAsync_WhenCalledTwice_OnlyCreatesOnce()
    {
        // Act
        await _sut.StartAsync();
        await _sut.StartAsync();

        // Assert
        _supabaseServiceMock.Verify(x => x.InsertAsync(It.IsAny<SyncProgressRow>()), Times.Once);
    }

    [Fact]
    public async Task UpdateProviderProgressAsync_WithExistingRow_UpdatesProvider()
    {
        // Arrange
        await _sut.StartAsync();

        // Act
        await _sut.UpdateProviderProgressAsync("fitbit", "fetching", 2, 8, 25, "Fetching chunk 2");

        // Assert
        _supabaseServiceMock.Verify(x => x.UpdateAsync(It.Is<SyncProgressRow>(row =>
            row.Providers != null &&
            row.Providers.Count == 1 &&
            row.Providers[0].Provider == "fitbit" &&
            row.Providers[0].Stage == "fetching" &&
            row.Providers[0].Current == 2 &&
            row.Providers[0].Total == 8 &&
            row.Providers[0].Percent == 25 &&
            row.Providers[0].Message == "Fetching chunk 2")), Times.Once);
    }

    [Fact]
    public async Task UpdateProviderProgressAsync_WithoutProgressId_DoesNothing()
    {
        // Arrange
        _requestContextMock.Setup(x => x.ProgressId).Returns((Guid?)null);
        var sut = new SyncProgressService(
            _supabaseServiceMock.Object,
            _requestContextMock.Object,
            _loggerMock.Object);

        // Act
        await sut.UpdateProviderProgressAsync("fitbit", "fetching");

        // Assert
        _supabaseServiceMock.Verify(x => x.UpdateAsync(It.IsAny<SyncProgressRow>()), Times.Never);
    }

    [Fact]
    public async Task UpdateProviderProgressAsync_AutoCreatesRowIfNeeded()
    {
        // Act
        await _sut.UpdateProviderProgressAsync("fitbit", "fetching");

        // Assert
        _supabaseServiceMock.Verify(x => x.InsertAsync(It.IsAny<SyncProgressRow>()), Times.Once);
        _supabaseServiceMock.Verify(x => x.UpdateAsync(It.IsAny<SyncProgressRow>()), Times.Once);
    }

    [Fact]
    public async Task UpdateProviderProgressAsync_UpdatesExistingProvider()
    {
        // Arrange
        await _sut.StartAsync();
        await _sut.UpdateProviderProgressAsync("fitbit", "init");

        // Act
        await _sut.UpdateProviderProgressAsync("fitbit", "fetching", 3, 10);

        // Assert
        _supabaseServiceMock.Verify(x => x.UpdateAsync(It.Is<SyncProgressRow>(row =>
            row.Providers != null &&
            row.Providers.Count == 1 &&
            row.Providers[0].Provider == "fitbit" &&
            row.Providers[0].Stage == "fetching" &&
            row.Providers[0].Current == 3 &&
            row.Providers[0].Total == 10)), Times.Exactly(2));
    }

    [Fact]
    public async Task UpdateProviderProgressAsync_HandlesMultipleProviders()
    {
        // Arrange
        await _sut.StartAsync();

        // Act - Add two providers
        await _sut.UpdateProviderProgressAsync("fitbit", "fetching", 2, 8);
        await _sut.UpdateProviderProgressAsync("withings", "fetching", 3, null, null, "Page 3");

        // Assert - Should have called UpdateAsync twice total (once per provider update)
        _supabaseServiceMock.Verify(x => x.UpdateAsync(It.IsAny<SyncProgressRow>()), Times.Exactly(2));
    }

    [Fact]
    public async Task UpdateProviderProgressAsync_ClearsFieldsWhenNullProvided()
    {
        // Arrange
        await _sut.StartAsync();
        await _sut.UpdateProviderProgressAsync("fitbit", "fetching", 2, 8, 25, "Message");

        // Act - Clear message and percent
        await _sut.UpdateProviderProgressAsync("fitbit", "done", 8, 8, null, null);

        // Assert
        _supabaseServiceMock.Verify(x => x.UpdateAsync(It.Is<SyncProgressRow>(row =>
            row.Providers != null &&
            row.Providers[0].Stage == "done" &&
            row.Providers[0].Current == 8 &&
            row.Providers[0].Total == 8 &&
            row.Providers[0].Percent == null &&
            row.Providers[0].Message == null)), Times.Exactly(2));
    }

    [Fact]
    public async Task UpdateStatusAsync_UpdatesRowStatus()
    {
        // Arrange
        await _sut.StartAsync();

        // Act
        await _sut.UpdateStatusAsync("failed", "Auth error");

        // Assert
        _supabaseServiceMock.Verify(x => x.UpdateAsync(It.Is<SyncProgressRow>(row =>
            row.Status == "failed" &&
            row.Message == "Auth error")), Times.Once);
    }

    [Fact]
    public async Task UpdateStatusAsync_WithoutRow_DoesNothing()
    {
        // Act
        await _sut.UpdateStatusAsync("failed", "Auth error");

        // Assert
        _supabaseServiceMock.Verify(x => x.UpdateAsync(It.IsAny<SyncProgressRow>()), Times.Never);
    }

    [Fact]
    public async Task DisposeAsync_DeletesRow()
    {
        // Arrange
        await _sut.StartAsync();

        // Act
        await _sut.DisposeAsync();

        // Assert
        _supabaseServiceMock.Verify(x => x.DeleteAsync(It.Is<SyncProgressRow>(row =>
            row.Id == _progressId)), Times.Once);
    }

    [Fact]
    public async Task DisposeAsync_WithoutRow_DoesNothing()
    {
        // Act
        await _sut.DisposeAsync();

        // Assert
        _supabaseServiceMock.Verify(x => x.DeleteAsync(It.IsAny<SyncProgressRow>()), Times.Never);
    }

    [Fact]
    public async Task DisposeAsync_WithoutProgressId_DoesNothing()
    {
        // Arrange
        _requestContextMock.Setup(x => x.ProgressId).Returns((Guid?)null);
        var sut = new SyncProgressService(
            _supabaseServiceMock.Object,
            _requestContextMock.Object,
            _loggerMock.Object);

        // Act
        await sut.DisposeAsync();

        // Assert
        _supabaseServiceMock.Verify(x => x.DeleteAsync(It.IsAny<SyncProgressRow>()), Times.Never);
    }
}
