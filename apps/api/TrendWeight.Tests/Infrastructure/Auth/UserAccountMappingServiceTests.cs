using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using Supabase.Interfaces;
using Supabase.Realtime;
using TrendWeight.Infrastructure.Auth;
using TrendWeight.Infrastructure.DataAccess;
using TrendWeight.Infrastructure.DataAccess.Models;

namespace TrendWeight.Tests.Infrastructure.Auth;

public class UserAccountMappingServiceTests
{
    private readonly Mock<ISupabaseService> _supabaseServiceMock = new();
    private readonly Mock<ILogger<UserAccountMappingService>> _loggerMock = new();
    private readonly UserAccountMappingService _sut;

    public UserAccountMappingServiceTests()
    {
        _sut = new UserAccountMappingService(_supabaseServiceMock.Object, _loggerMock.Object);
    }

    [Fact]
    public async Task GetByExternalIdAsync_ReturnsUserAccount_WhenFound()
    {
        // Arrange
        var expectedAccount = new DbUserAccount
        {
            Uid = Guid.NewGuid(),
            ExternalId = "clerk_123",
            Provider = "clerk"
        };

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbUserAccount>(It.IsAny<Action<ISupabaseTable<DbUserAccount, RealtimeChannel>>>()))
            .ReturnsAsync(new List<DbUserAccount> { expectedAccount });

        // Act
        var result = await _sut.GetByExternalIdAsync("clerk_123", "clerk");

        // Assert
        result.Should().NotBeNull();
        result!.ExternalId.Should().Be("clerk_123");
        result.Provider.Should().Be("clerk");
    }

    [Fact]
    public async Task GetByExternalIdAsync_ReturnsNull_WhenNotFound()
    {
        // Arrange
        _supabaseServiceMock.Setup(x => x.QueryAsync<DbUserAccount>(It.IsAny<Action<ISupabaseTable<DbUserAccount, RealtimeChannel>>>()))
            .ReturnsAsync(new List<DbUserAccount>());

        // Act
        var result = await _sut.GetByExternalIdAsync("clerk_123", "clerk");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task CreateMappingAsync_CreatesNewUser_WhenNoExistingProfileFound()
    {
        // Arrange
        _supabaseServiceMock.Setup(x => x.QueryAsync<DbProfile>(It.IsAny<Action<ISupabaseTable<DbProfile, RealtimeChannel>>>()))
            .ReturnsAsync(new List<DbProfile>());

        var createdAccount = new DbUserAccount();
        _supabaseServiceMock.Setup(x => x.InsertAsync(It.IsAny<DbUserAccount>()))
            .ReturnsAsync((DbUserAccount account) =>
            {
                createdAccount = account;
                return account;
            });

        // Act
        var result = await _sut.CreateMappingAsync("clerk_123", "test@example.com", "clerk");

        // Assert
        result.Should().NotBeNull();
        createdAccount.ExternalId.Should().Be("clerk_123");
        createdAccount.Provider.Should().Be("clerk");
        createdAccount.Uid.Should().NotBeEmpty();
    }

    [Fact]
    public async Task CreateMappingAsync_UsesExistingProfileUid_WhenProfileExistsButNoUserAccount()
    {
        // Arrange
        var existingProfileUid = Guid.NewGuid();
        var existingProfile = new DbProfile
        {
            Uid = existingProfileUid,
            Email = "test@example.com"
        };

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbProfile>(It.IsAny<Action<ISupabaseTable<DbProfile, RealtimeChannel>>>()))
            .ReturnsAsync(new List<DbProfile> { existingProfile });

        _supabaseServiceMock.Setup(x => x.GetByIdAsync<DbUserAccount>(existingProfileUid))
            .ReturnsAsync((DbUserAccount?)null);

        var createdAccount = new DbUserAccount();
        _supabaseServiceMock.Setup(x => x.InsertAsync(It.IsAny<DbUserAccount>()))
            .ReturnsAsync((DbUserAccount account) =>
            {
                createdAccount = account;
                return account;
            });

        // Act
        var result = await _sut.CreateMappingAsync("clerk_123", "test@example.com", "clerk");

        // Assert
        result.Should().NotBeNull();
        createdAccount.Uid.Should().Be(existingProfileUid);
        createdAccount.ExternalId.Should().Be("clerk_123");
        createdAccount.Provider.Should().Be("clerk");
    }

    [Fact]
    public async Task CreateMappingAsync_CreatesNewUid_WhenProfileExistsWithDifferentUserAccount()
    {
        // Arrange
        var existingProfileUid = Guid.NewGuid();
        var existingProfile = new DbProfile
        {
            Uid = existingProfileUid,
            Email = "test@example.com"
        };

        var existingUserAccount = new DbUserAccount
        {
            Uid = existingProfileUid,
            ExternalId = "different_clerk_456",
            Provider = "clerk"
        };

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbProfile>(It.IsAny<Action<ISupabaseTable<DbProfile, RealtimeChannel>>>()))
            .ReturnsAsync(new List<DbProfile> { existingProfile });

        _supabaseServiceMock.Setup(x => x.GetByIdAsync<DbUserAccount>(existingProfileUid))
            .ReturnsAsync(existingUserAccount);

        var createdAccount = new DbUserAccount();
        _supabaseServiceMock.Setup(x => x.InsertAsync(It.IsAny<DbUserAccount>()))
            .ReturnsAsync((DbUserAccount account) =>
            {
                createdAccount = account;
                return account;
            });

        // Act
        var result = await _sut.CreateMappingAsync("clerk_123", "test@example.com", "clerk");

        // Assert
        result.Should().NotBeNull();
        createdAccount.Uid.Should().NotBe(existingProfileUid); // Should have generated a new UID
        createdAccount.ExternalId.Should().Be("clerk_123");
        createdAccount.Provider.Should().Be("clerk");

        // Verify warning was logged
        _loggerMock.Verify(x => x.Log(
            LogLevel.Warning,
            It.IsAny<EventId>(),
            It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Email") && v.ToString()!.Contains("already associated")),
            It.IsAny<Exception>(),
            It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task CreateMappingAsync_ReturnsSameUserAccount_WhenExactMatchExists()
    {
        // Arrange
        var existingProfileUid = Guid.NewGuid();
        var existingProfile = new DbProfile
        {
            Uid = existingProfileUid,
            Email = "test@example.com"
        };

        var existingUserAccount = new DbUserAccount
        {
            Uid = existingProfileUid,
            ExternalId = "clerk_123",
            Provider = "clerk"
        };

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbProfile>(It.IsAny<Action<ISupabaseTable<DbProfile, RealtimeChannel>>>()))
            .ReturnsAsync(new List<DbProfile> { existingProfile });

        _supabaseServiceMock.Setup(x => x.GetByIdAsync<DbUserAccount>(existingProfileUid))
            .ReturnsAsync(existingUserAccount);

        // Act
        var result = await _sut.CreateMappingAsync("clerk_123", "test@example.com", "clerk");

        // Assert
        result.Should().Be(existingUserAccount);
        _supabaseServiceMock.Verify(x => x.InsertAsync(It.IsAny<DbUserAccount>()), Times.Never);
    }

    [Fact]
    public async Task GetOrCreateMappingAsync_ReturnsExisting_WhenUserAccountExists()
    {
        // Arrange
        var existingAccount = new DbUserAccount
        {
            Uid = Guid.NewGuid(),
            ExternalId = "clerk_123",
            Provider = "clerk"
        };

        _supabaseServiceMock.Setup(x => x.QueryAsync<DbUserAccount>(It.IsAny<Action<ISupabaseTable<DbUserAccount, RealtimeChannel>>>()))
            .ReturnsAsync(new List<DbUserAccount> { existingAccount });

        // Act
        var result = await _sut.GetOrCreateMappingAsync("clerk_123", "test@example.com", "clerk");

        // Assert
        result.Should().Be(existingAccount);
        _supabaseServiceMock.Verify(x => x.InsertAsync(It.IsAny<DbUserAccount>()), Times.Never);
    }

    [Fact]
    public async Task DeleteByInternalIdAsync_DeletesUserAccount_WhenFound()
    {
        // Arrange
        var uid = Guid.NewGuid();
        var userAccount = new DbUserAccount
        {
            Uid = uid,
            ExternalId = "clerk_123",
            Provider = "clerk"
        };

        _supabaseServiceMock.Setup(x => x.GetByIdAsync<DbUserAccount>(uid))
            .ReturnsAsync(userAccount);

        _supabaseServiceMock.Setup(x => x.DeleteAsync(userAccount))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _sut.DeleteByInternalIdAsync(uid);

        // Assert
        result.Should().BeTrue();
        _supabaseServiceMock.Verify(x => x.DeleteAsync(userAccount), Times.Once);
    }

    [Fact]
    public async Task DeleteByInternalIdAsync_ReturnsFalse_WhenNotFound()
    {
        // Arrange
        var uid = Guid.NewGuid();
        _supabaseServiceMock.Setup(x => x.GetByIdAsync<DbUserAccount>(uid))
            .ReturnsAsync((DbUserAccount?)null);

        // Act
        var result = await _sut.DeleteByInternalIdAsync(uid);

        // Assert
        result.Should().BeFalse();
        _supabaseServiceMock.Verify(x => x.DeleteAsync(It.IsAny<DbUserAccount>()), Times.Never);
    }
}
