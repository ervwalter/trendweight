using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using TrendWeight.Features.Measurements;
using TrendWeight.Features.Profile.Models;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Features.ProviderLinks.Services;
using TrendWeight.Infrastructure.DataAccess;
using TrendWeight.Infrastructure.DataAccess.Models;
using TrendWeight.Tests.Fixtures;

namespace TrendWeight.Tests.Features.Profile.Services;

public class ProfileServiceTests : TestBase
{
    private readonly Mock<ISupabaseService> _supabaseServiceMock;
    private readonly Mock<ILogger<ProfileService>> _loggerMock;
    private readonly Mock<ISourceDataService> _sourceDataServiceMock;
    private readonly Mock<IProviderLinkService> _providerLinkServiceMock;
    private readonly ProfileService _sut;

    public ProfileServiceTests()
    {
        _supabaseServiceMock = new Mock<ISupabaseService>();
        _loggerMock = new Mock<ILogger<ProfileService>>();
        _sourceDataServiceMock = new Mock<ISourceDataService>();
        _providerLinkServiceMock = new Mock<IProviderLinkService>();

        _sut = new ProfileService(
            _supabaseServiceMock.Object,
            _loggerMock.Object,
            _sourceDataServiceMock.Object,
            _providerLinkServiceMock.Object);
    }

    [Fact]
    public async Task GetByIdAsync_WithValidGuid_ReturnsProfile()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var expectedProfile = CreateTestProfile(userId);
        _supabaseServiceMock.Setup(x => x.GetByIdAsync<DbProfile>(userId))
            .ReturnsAsync(expectedProfile);

        // Act
        var result = await _sut.GetByIdAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result!.Uid.Should().Be(userId);
        _supabaseServiceMock.Verify(x => x.GetByIdAsync<DbProfile>(userId), Times.Once);
    }

    [Fact]
    public async Task GetByIdAsync_WithStringGuid_ParsesAndReturnsProfile()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var userIdString = userId.ToString();
        var expectedProfile = CreateTestProfile(userId);
        _supabaseServiceMock.Setup(x => x.GetByIdAsync<DbProfile>(userId))
            .ReturnsAsync(expectedProfile);

        // Act
        var result = await _sut.GetByIdAsync(userIdString);

        // Assert
        result.Should().NotBeNull();
        result!.Uid.Should().Be(userId);
    }

    [Fact]
    public async Task GetByIdAsync_WithInvalidStringGuid_ReturnsNull()
    {
        // Arrange
        var invalidId = "not-a-guid";

        // Act
        var result = await _sut.GetByIdAsync(invalidId);

        // Assert
        result.Should().BeNull();
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Invalid user ID format")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task CreateAsync_CallsSupabaseService()
    {
        // Arrange
        var profile = CreateTestProfile(Guid.NewGuid());
        _supabaseServiceMock.Setup(x => x.InsertAsync(profile))
            .ReturnsAsync(profile);

        // Act
        var result = await _sut.CreateAsync(profile);

        // Assert
        result.Should().Be(profile);
        _supabaseServiceMock.Verify(x => x.InsertAsync(profile), Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_CallsSupabaseService()
    {
        // Arrange
        var profile = CreateTestProfile(Guid.NewGuid());
        _supabaseServiceMock.Setup(x => x.UpdateAsync(profile))
            .ReturnsAsync(profile);

        // Act
        var result = await _sut.UpdateAsync(profile);

        // Assert
        result.Should().Be(profile);
        _supabaseServiceMock.Verify(x => x.UpdateAsync(profile), Times.Once);
    }

    [Fact]
    public async Task UpdateOrCreateProfileAsync_WhenProfileDoesNotExist_CreatesNewProfile()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var email = "test@example.com";
        var request = new UpdateProfileRequest
        {
            FirstName = "Test",
            UseMetric = true,
            GoalStart = DateTime.UtcNow.Date,
            GoalWeight = 70.0m,
            PlannedPoundsPerWeek = 1.0m,
            DayStartOffset = 0,
            ShowCalories = false
        };

        _supabaseServiceMock.Setup(x => x.GetByIdAsync<DbProfile>(It.IsAny<Guid>()))
            .ReturnsAsync((DbProfile?)null);
        _supabaseServiceMock.Setup(x => x.InsertAsync(It.IsAny<DbProfile>()))
            .ReturnsAsync((DbProfile p) => p);
        _supabaseServiceMock.Setup(x => x.GetAllAsync<DbProfile>())
            .ReturnsAsync(new List<DbProfile>());

        // Act
        var result = await _sut.UpdateOrCreateProfileAsync(userId, email, request);

        // Assert
        result.Should().NotBeNull();
        result.Email.Should().Be(email);
        result.Profile.FirstName.Should().Be("Test");
        result.Profile.UseMetric.Should().BeTrue();
        result.Profile.GoalStart.Should().Be(DateTime.UtcNow.Date);
        result.Profile.GoalWeight.Should().Be(70.0m);
        result.Profile.SharingToken.Should().NotBeNullOrEmpty();
        result.Profile.SharingToken.Should().HaveLength(25);

        _supabaseServiceMock.Verify(x => x.InsertAsync(It.IsAny<DbProfile>()), Times.Once);
    }

    [Fact]
    public async Task UpdateOrCreateProfileAsync_WhenProfileExists_UpdatesProfile()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var email = "test@example.com";
        var existingProfile = CreateTestProfile(userId);
        var request = new UpdateProfileRequest
        {
            FirstName = "Updated",
            UseMetric = false,
            GoalStart = DateTime.UtcNow.Date.AddDays(-7),
            GoalWeight = 80.0m,
            PlannedPoundsPerWeek = 2.0m,
            DayStartOffset = 1,
            ShowCalories = true
        };

        _supabaseServiceMock.Setup(x => x.GetByIdAsync<DbProfile>(userId))
            .ReturnsAsync(existingProfile);
        _supabaseServiceMock.Setup(x => x.UpdateAsync(It.IsAny<DbProfile>()))
            .ReturnsAsync((DbProfile p) => p);

        // Act
        var result = await _sut.UpdateOrCreateProfileAsync(userId.ToString(), email, request);

        // Assert
        result.Should().NotBeNull();
        result.Profile.FirstName.Should().Be("Updated");
        result.Profile.UseMetric.Should().BeFalse();
        result.Profile.GoalStart.Should().Be(DateTime.UtcNow.Date.AddDays(-7));
        result.Profile.GoalWeight.Should().Be(80.0m);
        result.Profile.PlannedPoundsPerWeek.Should().Be(2.0m);
        result.Profile.DayStartOffset.Should().Be(1);
        result.Profile.ShowCalories.Should().BeTrue();

        _supabaseServiceMock.Verify(x => x.UpdateAsync(It.IsAny<DbProfile>()), Times.Once);
    }

    [Fact]
    public async Task GetBySharingTokenAsync_ReturnsMatchingProfile()
    {
        // Arrange
        var token = "test-token-12345678901234567890";
        var profiles = new List<DbProfile>
        {
            CreateTestProfile(Guid.NewGuid()),
            CreateTestProfile(Guid.NewGuid(), token),
            CreateTestProfile(Guid.NewGuid())
        };

        _supabaseServiceMock.Setup(x => x.GetAllAsync<DbProfile>())
            .ReturnsAsync(profiles);

        // Act
        var result = await _sut.GetBySharingTokenAsync(token);

        // Assert
        result.Should().NotBeNull();
        result!.Profile.SharingToken.Should().Be(token);
    }

    [Fact]
    public void GenerateShareToken_GeneratesValidToken()
    {
        // Act
        var token = _sut.GenerateShareToken();

        // Assert
        token.Should().NotBeNullOrEmpty();
        token.Should().HaveLength(25);
        token.Should().MatchRegex("^[0-9a-z]+$"); // Base36 characters only
    }

    [Fact]
    public async Task GenerateUniqueShareTokenAsync_GeneratesUniqueToken()
    {
        // Arrange
        var existingTokens = new List<string>();
        var existingProfiles = new List<DbProfile>();

        // Setup mock to track generated tokens and simulate collision on first try
        _supabaseServiceMock.Setup(x => x.GetAllAsync<DbProfile>())
            .ReturnsAsync(() =>
            {
                // First call - return existing profiles to force collision
                if (existingTokens.Count == 0)
                {
                    existingTokens.Add("will-be-different");
                    return existingProfiles;
                }
                // Subsequent calls - return empty to allow success
                return new List<DbProfile>();
            });

        // Act
        var token = await _sut.GenerateUniqueShareTokenAsync();

        // Assert
        token.Should().NotBeNullOrEmpty();
        token.Should().HaveLength(25);
        token.Should().MatchRegex("^[0-9a-z]+$");
        _supabaseServiceMock.Verify(x => x.GetAllAsync<DbProfile>(), Times.AtLeastOnce);
    }

    [Fact]
    public async Task GenerateNewSharingTokenAsync_UpdatesProfileWithNewToken()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var profile = CreateTestProfile(userId, "old-token");

        _supabaseServiceMock.Setup(x => x.GetByIdAsync<DbProfile>(userId))
            .ReturnsAsync(profile);
        _supabaseServiceMock.Setup(x => x.GetAllAsync<DbProfile>())
            .ReturnsAsync(new List<DbProfile>());
        _supabaseServiceMock.Setup(x => x.UpdateAsync(It.IsAny<DbProfile>()))
            .ReturnsAsync((DbProfile p) => p);

        // Act
        var result = await _sut.GenerateNewSharingTokenAsync(userId.ToString());

        // Assert
        result.Should().NotBeNull();
        result!.Profile.SharingToken.Should().NotBe("old-token");
        result.Profile.SharingToken.Should().HaveLength(25);
        _supabaseServiceMock.Verify(x => x.UpdateAsync(It.IsAny<DbProfile>()), Times.Once);
    }

    [Fact]
    public async Task CompleteMigrationAsync_ClearsIsNewlyMigratedFlag()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var profile = CreateTestProfile(userId);
        profile.Profile.IsNewlyMigrated = true;

        _supabaseServiceMock.Setup(x => x.GetByIdAsync<DbProfile>(userId))
            .ReturnsAsync(profile);
        _supabaseServiceMock.Setup(x => x.UpdateAsync(It.IsAny<DbProfile>()))
            .ReturnsAsync((DbProfile p) => p);

        // Act
        var result = await _sut.CompleteMigrationAsync(userId.ToString());

        // Assert
        result.Should().BeTrue();
        profile.Profile.IsNewlyMigrated.Should().BeFalse();
        _supabaseServiceMock.Verify(x => x.UpdateAsync(It.IsAny<DbProfile>()), Times.Once);
    }

    [Fact]
    public async Task DeleteAccountAsync_DeletesAllUserData()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var profile = CreateTestProfile(userId);

        _supabaseServiceMock.Setup(x => x.GetByIdAsync<DbProfile>(userId))
            .ReturnsAsync(profile);
        _supabaseServiceMock.Setup(x => x.DeleteAsync(profile))
            .Returns(Task.CompletedTask);
        _supabaseServiceMock.Setup(x => x.DeleteAuthUserAsync(userId))
            .ReturnsAsync(true);
        _sourceDataServiceMock.Setup(x => x.DeleteAllSourceDataAsync(userId))
            .Returns(Task.CompletedTask);
        _providerLinkServiceMock.Setup(x => x.DeleteAllProviderLinksAsync(userId))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _sut.DeleteAccountAsync(userId);

        // Assert
        result.Should().BeTrue();
        _sourceDataServiceMock.Verify(x => x.DeleteAllSourceDataAsync(userId), Times.Once);
        _providerLinkServiceMock.Verify(x => x.DeleteAllProviderLinksAsync(userId), Times.Once);
        _supabaseServiceMock.Verify(x => x.DeleteAsync(profile), Times.Once);
        _supabaseServiceMock.Verify(x => x.DeleteAuthUserAsync(userId), Times.Once);
    }

    [Fact]
    public async Task DeleteAccountAsync_WhenAuthDeletionFails_ReturnsFalse()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var profile = CreateTestProfile(userId);

        _supabaseServiceMock.Setup(x => x.GetByIdAsync<DbProfile>(userId))
            .ReturnsAsync(profile);
        _supabaseServiceMock.Setup(x => x.DeleteAuthUserAsync(userId))
            .ReturnsAsync(false);

        // Act
        var result = await _sut.DeleteAccountAsync(userId);

        // Assert
        result.Should().BeFalse();
    }

    private static DbProfile CreateTestProfile(Guid userId, string? sharingToken = null)
    {
        return new DbProfile
        {
            Uid = userId,
            Email = "test@example.com",
            Profile = new ProfileData
            {
                FirstName = "Test",
                UseMetric = false,
                GoalStart = DateTime.UtcNow.Date.AddDays(-14),
                GoalWeight = 75.0m,
                PlannedPoundsPerWeek = 1.5m,
                DayStartOffset = 0,
                ShowCalories = false,
                SharingToken = sharingToken ?? "default-token-12345678901",
                IsNewlyMigrated = false
            },
            CreatedAt = DateTime.UtcNow.ToString("o"),
            UpdatedAt = DateTime.UtcNow.ToString("o")
        };
    }
}