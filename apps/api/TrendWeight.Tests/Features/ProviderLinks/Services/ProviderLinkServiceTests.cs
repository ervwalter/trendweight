using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using Supabase.Interfaces;
using Supabase.Realtime;
using TrendWeight.Features.ProviderLinks.Services;
using TrendWeight.Infrastructure.DataAccess;
using TrendWeight.Infrastructure.DataAccess.Models;
using TrendWeight.Tests.Fixtures;

namespace TrendWeight.Tests.Features.ProviderLinks.Services;

public class ProviderLinkServiceTests : TestBase
{
    private readonly Mock<ISupabaseService> _supabaseServiceMock;
    private readonly Mock<ILogger<ProviderLinkService>> _loggerMock;
    private readonly ProviderLinkService _sut;

    public ProviderLinkServiceTests()
    {
        _supabaseServiceMock = new Mock<ISupabaseService>();
        _loggerMock = new Mock<ILogger<ProviderLinkService>>();
        _sut = new ProviderLinkService(_supabaseServiceMock.Object, _loggerMock.Object);
    }

    [Fact]
    public async Task GetProviderLinkAsync_ReturnsProviderLink_WhenExists()
    {
        // Arrange
        var uid = Guid.NewGuid();
        var provider = "fitbit";
        var expectedLink = CreateTestProviderLink(uid, provider);
        
        _supabaseServiceMock.Setup(x => x.QueryAsync<DbProviderLink>(It.IsAny<Action<ISupabaseTable<DbProviderLink, RealtimeChannel>>>()))
            .ReturnsAsync(new List<DbProviderLink> { expectedLink });

        // Act
        var result = await _sut.GetProviderLinkAsync(uid, provider);

        // Assert
        result.Should().NotBeNull();
        result!.Uid.Should().Be(uid);
        result.Provider.Should().Be(provider);
    }

    [Fact]
    public async Task GetProviderLinkAsync_ReturnsNull_WhenNotExists()
    {
        // Arrange
        var uid = Guid.NewGuid();
        var provider = "fitbit";
        
        _supabaseServiceMock.Setup(x => x.QueryAsync<DbProviderLink>(It.IsAny<Action<ISupabaseTable<DbProviderLink, RealtimeChannel>>>()))
            .ReturnsAsync(new List<DbProviderLink>());

        // Act
        var result = await _sut.GetProviderLinkAsync(uid, provider);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetProviderLinkAsync_ReturnsNull_OnException()
    {
        // Arrange
        var uid = Guid.NewGuid();
        var provider = "fitbit";
        
        _supabaseServiceMock.Setup(x => x.QueryAsync<DbProviderLink>(It.IsAny<Action<ISupabaseTable<DbProviderLink, RealtimeChannel>>>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.GetProviderLinkAsync(uid, provider);

        // Assert
        result.Should().BeNull();
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Error getting provider link")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task GetAllForUserAsync_ReturnsAllUserLinks()
    {
        // Arrange
        var uid = Guid.NewGuid();
        var links = new List<DbProviderLink>
        {
            CreateTestProviderLink(uid, "fitbit"),
            CreateTestProviderLink(uid, "withings")
        };
        
        _supabaseServiceMock.Setup(x => x.QueryAsync<DbProviderLink>(It.IsAny<Action<ISupabaseTable<DbProviderLink, RealtimeChannel>>>()))
            .ReturnsAsync(links);

        // Act
        var result = await _sut.GetAllForUserAsync(uid);

        // Assert
        result.Should().HaveCount(2);
        result.Should().OnlyContain(x => x.Uid == uid);
    }

    [Fact]
    public async Task CreateAsync_SetsUpdatedAt()
    {
        // Arrange
        var link = CreateTestProviderLink(Guid.NewGuid(), "fitbit");
        link.UpdatedAt = null!;
        
        _supabaseServiceMock.Setup(x => x.InsertAsync(It.IsAny<DbProviderLink>()))
            .ReturnsAsync((DbProviderLink l) => l);

        // Act
        var result = await _sut.CreateAsync(link);

        // Assert
        result.UpdatedAt.Should().NotBeNullOrEmpty();
        DateTime.Parse(result.UpdatedAt!, null, System.Globalization.DateTimeStyles.RoundtripKind)
            .ToUniversalTime()
            .Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task UpdateAsync_SetsUpdatedAt()
    {
        // Arrange
        var link = CreateTestProviderLink(Guid.NewGuid(), "fitbit");
        var oldUpdatedAt = DateTime.UtcNow.AddDays(-1).ToString("o");
        link.UpdatedAt = oldUpdatedAt;
        
        _supabaseServiceMock.Setup(x => x.UpdateAsync(It.IsAny<DbProviderLink>()))
            .ReturnsAsync((DbProviderLink l) => l);

        // Act
        var result = await _sut.UpdateAsync(link);

        // Assert
        result.UpdatedAt.Should().NotBe(oldUpdatedAt);
        DateTime.Parse(result.UpdatedAt!, null, System.Globalization.DateTimeStyles.RoundtripKind)
            .ToUniversalTime()
            .Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task RemoveProviderLinkAsync_DeletesLink_WhenExists()
    {
        // Arrange
        var uid = Guid.NewGuid();
        var provider = "fitbit";
        var link = CreateTestProviderLink(uid, provider);
        
        _supabaseServiceMock.Setup(x => x.QueryAsync<DbProviderLink>(It.IsAny<Action<ISupabaseTable<DbProviderLink, RealtimeChannel>>>()))
            .ReturnsAsync(new List<DbProviderLink> { link });

        // Act
        await _sut.RemoveProviderLinkAsync(uid, provider);

        // Assert
        _supabaseServiceMock.Verify(x => x.DeleteAsync(link), Times.Once);
    }

    [Fact]
    public async Task RemoveProviderLinkAsync_DoesNothing_WhenNotExists()
    {
        // Arrange
        var uid = Guid.NewGuid();
        var provider = "fitbit";
        
        _supabaseServiceMock.Setup(x => x.QueryAsync<DbProviderLink>(It.IsAny<Action<ISupabaseTable<DbProviderLink, RealtimeChannel>>>()))
            .ReturnsAsync(new List<DbProviderLink>());

        // Act
        await _sut.RemoveProviderLinkAsync(uid, provider);

        // Assert
        _supabaseServiceMock.Verify(x => x.DeleteAsync(It.IsAny<DbProviderLink>()), Times.Never);
    }

    [Fact]
    public async Task StoreProviderLinkAsync_UpdatesExistingLink()
    {
        // Arrange
        var uid = Guid.NewGuid();
        var provider = "fitbit";
        var existingLink = CreateTestProviderLink(uid, provider);
        var newToken = new Dictionary<string, object> { { "access_token", "new_token" } };
        var updateReason = "Token refresh";
        
        _supabaseServiceMock.Setup(x => x.QueryAsync<DbProviderLink>(It.IsAny<Action<ISupabaseTable<DbProviderLink, RealtimeChannel>>>()))
            .ReturnsAsync(new List<DbProviderLink> { existingLink });
        _supabaseServiceMock.Setup(x => x.UpdateAsync(It.IsAny<DbProviderLink>()))
            .ReturnsAsync((DbProviderLink l) => l);

        // Act
        await _sut.StoreProviderLinkAsync(uid, provider, newToken, updateReason);

        // Assert
        _supabaseServiceMock.Verify(x => x.UpdateAsync(It.Is<DbProviderLink>(l => 
            l.Token == newToken && 
            l.UpdateReason == updateReason)), Times.Once);
    }

    [Fact]
    public async Task StoreProviderLinkAsync_CreatesNewLink_WhenNotExists()
    {
        // Arrange
        var uid = Guid.NewGuid();
        var provider = "fitbit";
        var token = new Dictionary<string, object> { { "access_token", "new_token" } };
        var updateReason = "Initial auth";
        
        _supabaseServiceMock.Setup(x => x.QueryAsync<DbProviderLink>(It.IsAny<Action<ISupabaseTable<DbProviderLink, RealtimeChannel>>>()))
            .ReturnsAsync(new List<DbProviderLink>());
        _supabaseServiceMock.Setup(x => x.InsertAsync(It.IsAny<DbProviderLink>()))
            .ReturnsAsync((DbProviderLink l) => l);

        // Act
        await _sut.StoreProviderLinkAsync(uid, provider, token, updateReason);

        // Assert
        _supabaseServiceMock.Verify(x => x.InsertAsync(It.Is<DbProviderLink>(l => 
            l.Uid == uid &&
            l.Provider == provider &&
            l.Token == token && 
            l.UpdateReason == updateReason)), Times.Once);
    }

    [Fact]
    public async Task DeleteAllProviderLinksAsync_DeletesAllUserLinks()
    {
        // Arrange
        var uid = Guid.NewGuid();
        var links = new List<DbProviderLink>
        {
            CreateTestProviderLink(uid, "fitbit"),
            CreateTestProviderLink(uid, "withings")
        };
        
        _supabaseServiceMock.Setup(x => x.QueryAsync<DbProviderLink>(It.IsAny<Action<ISupabaseTable<DbProviderLink, RealtimeChannel>>>()))
            .ReturnsAsync(links);

        // Act
        await _sut.DeleteAllProviderLinksAsync(uid);

        // Assert
        _supabaseServiceMock.Verify(x => x.DeleteAsync(It.IsAny<DbProviderLink>()), Times.Exactly(2));
    }

    private static DbProviderLink CreateTestProviderLink(Guid uid, string provider)
    {
        return new DbProviderLink
        {
            Uid = uid,
            Provider = provider,
            Token = new Dictionary<string, object> 
            { 
                { "access_token", "test_token" },
                { "refresh_token", "test_refresh" }
            },
            UpdatedAt = DateTime.UtcNow.ToString("o")
        };
    }
}