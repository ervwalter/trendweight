using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using TrendWeight.Features.Profile.Models;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Features.ProviderLinks.Services;
using TrendWeight.Infrastructure.DataAccess.Models;
using TrendWeight.Tests.Fixtures;
using Xunit;

namespace TrendWeight.Tests.Features.Profile.Services;

public class LegacyMigrationServiceTests : TestBase
{
    private readonly Mock<IProfileService> _profileServiceMock;
    private readonly Mock<ILegacyDbService> _legacyDbServiceMock;
    private readonly Mock<IProviderLinkService> _providerLinkServiceMock;
    private readonly Mock<ILogger<LegacyMigrationService>> _loggerMock;
    private readonly LegacyMigrationService _sut;

    public LegacyMigrationServiceTests()
    {
        _profileServiceMock = new Mock<IProfileService>();
        _legacyDbServiceMock = new Mock<ILegacyDbService>();
        _providerLinkServiceMock = new Mock<IProviderLinkService>();
        _loggerMock = new Mock<ILogger<LegacyMigrationService>>();

        _sut = new LegacyMigrationService(
            _profileServiceMock.Object,
            _legacyDbServiceMock.Object,
            _providerLinkServiceMock.Object,
            _loggerMock.Object);
    }

    #region CheckAndMigrateIfNeededAsync Tests

    [Fact]
    public async Task CheckAndMigrateIfNeededAsync_WithNullEmail_ReturnsNull()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();

        // Act
        var result = await _sut.CheckAndMigrateIfNeededAsync(userId, null);

        // Assert
        result.Should().BeNull();
        _legacyDbServiceMock.Verify(x => x.FindProfileByEmailAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task CheckAndMigrateIfNeededAsync_WithEmptyEmail_ReturnsNull()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();

        // Act
        var result = await _sut.CheckAndMigrateIfNeededAsync(userId, string.Empty);

        // Assert
        result.Should().BeNull();
        _legacyDbServiceMock.Verify(x => x.FindProfileByEmailAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task CheckAndMigrateIfNeededAsync_WithNoLegacyProfile_ReturnsNull()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var email = "test@example.com";

        _legacyDbServiceMock.Setup(x => x.FindProfileByEmailAsync(email))
            .ReturnsAsync((LegacyProfile?)null);

        // Act
        var result = await _sut.CheckAndMigrateIfNeededAsync(userId, email);

        // Assert
        result.Should().BeNull();
        _legacyDbServiceMock.Verify(x => x.FindProfileByEmailAsync(email), Times.Once);
        _profileServiceMock.Verify(x => x.CreateAsync(It.IsAny<DbProfile>()), Times.Never);
    }

    [Fact]
    public async Task CheckAndMigrateIfNeededAsync_WithLegacyProfile_MigratesAndReturnsProfile()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var email = "test@example.com";
        var legacyProfile = CreateTestLegacyProfile(email);
        var expectedProfile = CreateTestDbProfile(Guid.Parse(userId), email);

        _legacyDbServiceMock.Setup(x => x.FindProfileByEmailAsync(email))
            .ReturnsAsync(legacyProfile);
        _profileServiceMock.Setup(x => x.CreateAsync(It.IsAny<DbProfile>()))
            .ReturnsAsync(expectedProfile);

        // Act
        var result = await _sut.CheckAndMigrateIfNeededAsync(userId, email);

        // Assert
        result.Should().NotBeNull();
        result!.Uid.Should().Be(expectedProfile.Uid);
        result.Email.Should().Be(email);
        _legacyDbServiceMock.Verify(x => x.FindProfileByEmailAsync(email), Times.Once);
        _profileServiceMock.Verify(x => x.CreateAsync(It.IsAny<DbProfile>()), Times.Once);
    }

    #endregion

    #region MigrateLegacyProfileAsync Tests

    [Fact]
    public async Task MigrateLegacyProfileAsync_WithBasicProfile_CreatesCorrectProfile()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var email = "test@example.com";
        var legacyProfile = new LegacyProfile
        {
            UserId = Guid.NewGuid(),
            Email = email,
            FirstName = "Test User",
            UseMetric = true,
            StartDate = new DateTime(2024, 1, 1),
            GoalWeight = 70.5m,
            PlannedPoundsPerWeek = 1.0m,
            DayStartOffset = -4,
            PrivateUrlKey = "test-sharing-key",
            DeviceType = null,
            FitbitRefreshToken = null
        };

        var expectedProfile = CreateTestDbProfile(Guid.Parse(userId), email);
        _profileServiceMock.Setup(x => x.CreateAsync(It.IsAny<DbProfile>()))
            .ReturnsAsync(expectedProfile);

        // Act
        var result = await _sut.MigrateLegacyProfileAsync(userId, email, legacyProfile);

        // Assert
        result.Should().NotBeNull();
        result.Should().Be(expectedProfile);

        // Verify the profile creation call
        var userGuid = Guid.Parse(userId);
        _profileServiceMock.Verify(x => x.CreateAsync(It.Is<DbProfile>(p =>
            p.Uid == userGuid &&
            p.Email == email &&
            p.Profile.FirstName == legacyProfile.FirstName &&
            p.Profile.UseMetric == legacyProfile.UseMetric &&
            p.Profile.GoalStart == legacyProfile.StartDate &&
            p.Profile.GoalWeight == legacyProfile.GoalWeight &&
            p.Profile.PlannedPoundsPerWeek == legacyProfile.PlannedPoundsPerWeek &&
            p.Profile.DayStartOffset == legacyProfile.DayStartOffset &&
            p.Profile.SharingToken == legacyProfile.PrivateUrlKey &&
            p.Profile.SharingEnabled == true &&
            p.Profile.IsMigrated == true &&
            p.Profile.IsNewlyMigrated == true &&
            p.Profile.ShowCalories == false
        )), Times.Once);

        // Verify no provider link was created
        _providerLinkServiceMock.Verify(x => x.StoreProviderLinkAsync(
            It.IsAny<Guid>(),
            It.IsAny<string>(),
            It.IsAny<Dictionary<string, object>>(),
            It.IsAny<string>()),
            Times.Never);
    }

    [Fact]
    public async Task MigrateLegacyProfileAsync_WithFitbitTokens_CreatesProfileAndMigratesTokens()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var email = "test@example.com";
        var legacyProfile = new LegacyProfile
        {
            UserId = Guid.NewGuid(),
            Email = email,
            FirstName = "Test User",
            UseMetric = false,
            StartDate = new DateTime(2024, 1, 1),
            GoalWeight = 155.0m,
            PlannedPoundsPerWeek = 1.5m,
            DayStartOffset = 0,
            PrivateUrlKey = "test-sharing-key",
            DeviceType = "Fitbit",
            FitbitRefreshToken = "test-refresh-token-123"
        };

        var expectedProfile = CreateTestDbProfile(Guid.Parse(userId), email);
        _profileServiceMock.Setup(x => x.CreateAsync(It.IsAny<DbProfile>()))
            .ReturnsAsync(expectedProfile);

        // Act
        var result = await _sut.MigrateLegacyProfileAsync(userId, email, legacyProfile);

        // Assert
        result.Should().NotBeNull();
        result.Should().Be(expectedProfile);

        // Verify provider link was created
        _providerLinkServiceMock.Verify(x => x.StoreProviderLinkAsync(
            It.IsAny<Guid>(),
            It.Is<string>(s => s == "fitbit"),
            It.IsAny<Dictionary<string, object>>(),
            It.IsAny<string>()),
            Times.Once());
    }

    [Fact]
    public async Task MigrateLegacyProfileAsync_WithWithingsTokens_CreatesProfileAndMigratesTokens()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var email = "test@example.com";
        var legacyProfile = new LegacyProfile
        {
            UserId = Guid.NewGuid(),
            Email = email,
            FirstName = "Test User",
            UseMetric = true,
            StartDate = new DateTime(2024, 1, 1),
            GoalWeight = 70.0m,
            PlannedPoundsPerWeek = 0.5m,
            DayStartOffset = -8,
            PrivateUrlKey = "test-sharing-key",
            DeviceType = "Withings",
            FitbitRefreshToken = "withings-refresh-token-456"
        };

        var expectedProfile = CreateTestDbProfile(Guid.Parse(userId), email);
        _profileServiceMock.Setup(x => x.CreateAsync(It.IsAny<DbProfile>()))
            .ReturnsAsync(expectedProfile);

        // Act
        var result = await _sut.MigrateLegacyProfileAsync(userId, email, legacyProfile);

        // Assert
        result.Should().NotBeNull();

        // Verify provider link was created with correct provider name
        _providerLinkServiceMock.Verify(x => x.StoreProviderLinkAsync(
            It.IsAny<Guid>(),
            It.Is<string>(s => s == "withings"),
            It.IsAny<Dictionary<string, object>>(),
            It.IsAny<string>()),
            Times.Once());
    }

    [Fact]
    public async Task MigrateLegacyProfileAsync_WithEmptyDeviceType_DoesNotMigrateTokens()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var email = "test@example.com";
        var legacyProfile = new LegacyProfile
        {
            UserId = Guid.NewGuid(),
            Email = email,
            FirstName = "Test User",
            UseMetric = false,
            StartDate = new DateTime(2024, 1, 1),
            GoalWeight = 180.0m,
            PlannedPoundsPerWeek = 2.0m,
            DayStartOffset = 0,
            PrivateUrlKey = "test-sharing-key",
            DeviceType = "",
            FitbitRefreshToken = "some-token"
        };

        var expectedProfile = CreateTestDbProfile(Guid.Parse(userId), email);
        _profileServiceMock.Setup(x => x.CreateAsync(It.IsAny<DbProfile>()))
            .ReturnsAsync(expectedProfile);

        // Act
        var result = await _sut.MigrateLegacyProfileAsync(userId, email, legacyProfile);

        // Assert
        result.Should().NotBeNull();
        _providerLinkServiceMock.Verify(x => x.StoreProviderLinkAsync(
            It.IsAny<Guid>(),
            It.IsAny<string>(),
            It.IsAny<Dictionary<string, object>>(),
            It.IsAny<string>()),
            Times.Never);
    }

    [Fact]
    public async Task MigrateLegacyProfileAsync_WithEmptyRefreshToken_DoesNotMigrateTokens()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var email = "test@example.com";
        var legacyProfile = new LegacyProfile
        {
            UserId = Guid.NewGuid(),
            Email = email,
            FirstName = "Test User",
            UseMetric = false,
            StartDate = new DateTime(2024, 1, 1),
            GoalWeight = 180.0m,
            PlannedPoundsPerWeek = 2.0m,
            DayStartOffset = 0,
            PrivateUrlKey = "test-sharing-key",
            DeviceType = "Fitbit",
            FitbitRefreshToken = ""
        };

        var expectedProfile = CreateTestDbProfile(Guid.Parse(userId), email);
        _profileServiceMock.Setup(x => x.CreateAsync(It.IsAny<DbProfile>()))
            .ReturnsAsync(expectedProfile);

        // Act
        var result = await _sut.MigrateLegacyProfileAsync(userId, email, legacyProfile);

        // Assert
        result.Should().NotBeNull();
        _providerLinkServiceMock.Verify(x => x.StoreProviderLinkAsync(
            It.IsAny<Guid>(),
            It.IsAny<string>(),
            It.IsAny<Dictionary<string, object>>(),
            It.IsAny<string>()),
            Times.Never);
    }

    [Fact]
    public async Task MigrateLegacyProfileAsync_PreservesAllLegacyValues()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var email = "preserve@example.com";
        var legacyProfile = new LegacyProfile
        {
            UserId = Guid.NewGuid(),
            Email = email,
            FirstName = "Preserve Test",
            UseMetric = true,
            StartDate = new DateTime(2020, 6, 15),
            GoalWeight = 65.7m,
            PlannedPoundsPerWeek = 0.75m,
            DayStartOffset = -12,
            PrivateUrlKey = "unique-sharing-key-123",
            DeviceType = null,
            FitbitRefreshToken = null
        };

        DbProfile? capturedProfile = null;
        _profileServiceMock.Setup(x => x.CreateAsync(It.IsAny<DbProfile>()))
            .Callback<DbProfile>(p => capturedProfile = p)
            .ReturnsAsync((DbProfile p) => p);

        // Act
        var result = await _sut.MigrateLegacyProfileAsync(userId, email, legacyProfile);

        // Assert
        capturedProfile.Should().NotBeNull();
        capturedProfile!.Profile.FirstName.Should().Be("Preserve Test");
        capturedProfile.Profile.UseMetric.Should().BeTrue();
        capturedProfile.Profile.GoalStart.Should().Be(new DateTime(2020, 6, 15));
        capturedProfile.Profile.GoalWeight.Should().Be(65.7m);
        capturedProfile.Profile.PlannedPoundsPerWeek.Should().Be(0.75m);
        capturedProfile.Profile.DayStartOffset.Should().Be(-12);
        capturedProfile.Profile.SharingToken.Should().Be("unique-sharing-key-123");
        capturedProfile.Profile.SharingEnabled.Should().BeTrue();
        capturedProfile.Profile.IsMigrated.Should().BeTrue();
        capturedProfile.Profile.IsNewlyMigrated.Should().BeTrue();
        capturedProfile.Profile.ShowCalories.Should().BeFalse();
    }

    #endregion

    #region Exception Handling Tests

    [Fact]
    public async Task CheckAndMigrateIfNeededAsync_WhenLegacyDbThrows_PropagatesException()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var email = "test@example.com";

        _legacyDbServiceMock.Setup(x => x.FindProfileByEmailAsync(email))
            .ThrowsAsync(new InvalidOperationException("Database error"));

        // Act & Assert
        await _sut.Invoking(x => x.CheckAndMigrateIfNeededAsync(userId, email))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Database error");
    }

    [Fact]
    public async Task MigrateLegacyProfileAsync_WhenProfileServiceThrows_PropagatesException()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var email = "test@example.com";
        var legacyProfile = CreateTestLegacyProfile(email);

        _profileServiceMock.Setup(x => x.CreateAsync(It.IsAny<DbProfile>()))
            .ThrowsAsync(new InvalidOperationException("Create failed"));

        // Act & Assert
        await _sut.Invoking(x => x.MigrateLegacyProfileAsync(userId, email, legacyProfile))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Create failed");
    }

    [Fact]
    public async Task MigrateLegacyProfileAsync_WhenProviderLinkServiceThrows_PropagatesException()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var email = "test@example.com";
        var legacyProfile = new LegacyProfile
        {
            UserId = Guid.NewGuid(),
            Email = email,
            FirstName = "Test User",
            UseMetric = false,
            StartDate = new DateTime(2024, 1, 1),
            GoalWeight = 155.0m,
            PlannedPoundsPerWeek = 1.5m,
            DayStartOffset = 0,
            PrivateUrlKey = "test-sharing-key",
            DeviceType = "Fitbit",
            FitbitRefreshToken = "test-refresh-token"
        };

        var expectedProfile = CreateTestDbProfile(Guid.Parse(userId), email);
        _profileServiceMock.Setup(x => x.CreateAsync(It.IsAny<DbProfile>()))
            .ReturnsAsync(expectedProfile);
        _providerLinkServiceMock.Setup(x => x.StoreProviderLinkAsync(
            It.IsAny<Guid>(),
            It.IsAny<string>(),
            It.IsAny<Dictionary<string, object>>(),
            It.IsAny<string>()))
            .ThrowsAsync(new InvalidOperationException("Token storage failed"));

        // Act & Assert
        await _sut.Invoking(x => x.MigrateLegacyProfileAsync(userId, email, legacyProfile))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Token storage failed");
    }

    #endregion

    #region Helper Methods

    private static LegacyProfile CreateTestLegacyProfile(string email)
    {
        return new LegacyProfile
        {
            UserId = Guid.NewGuid(),
            Email = email,
            FirstName = "Test User",
            UseMetric = false,
            StartDate = new DateTime(2024, 1, 1),
            GoalWeight = 180.0m,
            PlannedPoundsPerWeek = 1.0m,
            DayStartOffset = -4,
            PrivateUrlKey = "test-private-key",
            DeviceType = null,
            FitbitRefreshToken = null
        };
    }

    private static DbProfile CreateTestDbProfile(Guid userId, string email)
    {
        return new DbProfile
        {
            Uid = userId,
            Email = email,
            Profile = new ProfileData
            {
                FirstName = "Test User",
                UseMetric = false,
                GoalStart = new DateTime(2024, 1, 1),
                GoalWeight = 180.0m,
                PlannedPoundsPerWeek = 1.0m,
                DayStartOffset = -4,
                ShowCalories = false,
                SharingToken = "test-private-key",
                SharingEnabled = true,
                IsMigrated = true,
                IsNewlyMigrated = true
            },
            CreatedAt = DateTime.UtcNow.ToString("o"),
            UpdatedAt = DateTime.UtcNow.ToString("o")
        };
    }

    #endregion
}
