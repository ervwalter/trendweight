using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using TrendWeight.Features.Measurements;
using TrendWeight.Features.Measurements.Models;
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
    private readonly Mock<ISourceDataService> _sourceDataServiceMock;
    private readonly Mock<ILogger<LegacyMigrationService>> _loggerMock;
    private readonly LegacyMigrationService _sut;

    public LegacyMigrationServiceTests()
    {
        _profileServiceMock = new Mock<IProfileService>();
        _legacyDbServiceMock = new Mock<ILegacyDbService>();
        _providerLinkServiceMock = new Mock<IProviderLinkService>();
        _sourceDataServiceMock = new Mock<ISourceDataService>();
        _loggerMock = new Mock<ILogger<LegacyMigrationService>>();

        _sut = new LegacyMigrationService(
            _profileServiceMock.Object,
            _legacyDbServiceMock.Object,
            _providerLinkServiceMock.Object,
            _sourceDataServiceMock.Object,
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
    public async Task CheckAndMigrateIfNeededAsync_WithLegacyProfile_MigratesProfileAndMeasurements()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var email = "test@example.com";
        var legacyProfile = CreateTestLegacyProfileWithMeasurements(email);
        var expectedProfile = CreateTestDbProfile(Guid.Parse(userId), email);

        _legacyDbServiceMock.Setup(x => x.FindProfileByEmailAsync(email))
            .ReturnsAsync(legacyProfile);
        _profileServiceMock.Setup(x => x.CreateAsync(It.IsAny<DbProfile>()))
            .ReturnsAsync(expectedProfile);

        // Act
        var result = await _sut.CheckAndMigrateIfNeededAsync(userId, email);

        // Assert
        result.Should().NotBeNull();
        result!.Profile.Should().BeEquivalentTo(expectedProfile.Profile);

        // Should only call FindProfileByEmailAsync once (performance optimization)
        _legacyDbServiceMock.Verify(x => x.FindProfileByEmailAsync(email), Times.Once);
        _profileServiceMock.Verify(x => x.CreateAsync(It.IsAny<DbProfile>()), Times.Once);

        // Should migrate measurements
#pragma warning disable CS8602 // Dereference of a possibly null reference.
        _sourceDataServiceMock.Verify(x => x.UpdateSourceDataAsync(
            It.Is<Guid>(g => g == Guid.Parse(userId)),
            It.Is<List<SourceData>>(sd =>
                sd != null &&
                sd.Count == 1 &&
                sd[0].Source == "legacy" &&
                sd[0].Measurements != null &&
                sd[0].Measurements.Count == 2)),
            Times.Once);
#pragma warning restore CS8602
    }

    #endregion

    #region MigrateLegacyProfileAsync Tests

    [Fact]
    public async Task MigrateLegacyProfileAsync_WithFitbitDevice_CreatesProviderLink()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var email = "test@example.com";
        var legacyProfile = new LegacyProfile
        {
            Email = email,
            FirstName = "Test User",
            UseMetric = false,
            StartDate = new DateTime(2024, 1, 1),
            GoalWeight = 180.0m,
            PlannedPoundsPerWeek = 1.0m,
            DayStartOffset = -4,
            PrivateUrlKey = "test-private-key",
            DeviceType = "fitbit",
            RefreshToken = "test-refresh-token-123",
            Measurements = new List<RawMeasurement>()
        };
        var expectedProfile = CreateTestDbProfile(Guid.Parse(userId), email);

        _profileServiceMock.Setup(x => x.CreateAsync(It.IsAny<DbProfile>()))
            .ReturnsAsync(expectedProfile);

        // Act
        var result = await _sut.MigrateLegacyProfileAsync(userId, email, legacyProfile);

        // Assert
        result.Should().BeEquivalentTo(expectedProfile);
        _providerLinkServiceMock.Verify(x => x.StoreProviderLinkAsync(
            It.Is<Guid>(g => g == Guid.Parse(userId)),
            "fitbit",
            It.Is<Dictionary<string, object>>(d =>
                d.ContainsKey("refresh_token") &&
                d["refresh_token"].ToString() == "test-refresh-token-123"),
            It.IsAny<string>()),
            Times.Once);
    }

    [Fact]
    public async Task MigrateLegacyProfileAsync_WithWithingsDevice_CreatesProviderLink()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var email = "test@example.com";
        var legacyProfile = new LegacyProfile
        {
            Email = email,
            FirstName = "Test User",
            UseMetric = true,
            StartDate = new DateTime(2024, 1, 1),
            GoalWeight = 70.0m,
            PlannedPoundsPerWeek = 0.5m,
            DayStartOffset = 0,
            PrivateUrlKey = "test-private-key",
            DeviceType = "withings",
            RefreshToken = "withings-refresh-token-456",
            Measurements = new List<RawMeasurement>()
        };
        var expectedProfile = CreateTestDbProfile(Guid.Parse(userId), email);

        _profileServiceMock.Setup(x => x.CreateAsync(It.IsAny<DbProfile>()))
            .ReturnsAsync(expectedProfile);

        // Act
        var result = await _sut.MigrateLegacyProfileAsync(userId, email, legacyProfile);

        // Assert
        result.Should().BeEquivalentTo(expectedProfile);
        _providerLinkServiceMock.Verify(x => x.StoreProviderLinkAsync(
            It.Is<Guid>(g => g == Guid.Parse(userId)),
            "withings",
            It.Is<Dictionary<string, object>>(d =>
                d.ContainsKey("refresh_token") &&
                d["refresh_token"].ToString() == "withings-refresh-token-456"),
            It.IsAny<string>()),
            Times.Once);
    }

    [Fact]
    public async Task MigrateLegacyProfileAsync_WithNoDevice_DoesNotCreateProviderLink()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var email = "test@example.com";
        var legacyProfile = new LegacyProfile
        {
            Email = email,
            FirstName = "Test User",
            UseMetric = false,
            StartDate = new DateTime(2024, 1, 1),
            GoalWeight = 180.0m,
            PlannedPoundsPerWeek = 1.0m,
            DayStartOffset = -4,
            PrivateUrlKey = "test-private-key",
            DeviceType = null,
            RefreshToken = null,
            Measurements = new List<RawMeasurement>()
        };
        var expectedProfile = CreateTestDbProfile(Guid.Parse(userId), email);

        _profileServiceMock.Setup(x => x.CreateAsync(It.IsAny<DbProfile>()))
            .ReturnsAsync(expectedProfile);

        // Act
        var result = await _sut.MigrateLegacyProfileAsync(userId, email, legacyProfile);

        // Assert
        result.Should().BeEquivalentTo(expectedProfile);
        _providerLinkServiceMock.Verify(x => x.StoreProviderLinkAsync(
            It.IsAny<Guid>(),
            It.IsAny<string>(),
            It.IsAny<Dictionary<string, object>>(),
            It.IsAny<string>()),
            Times.Never);
    }

    #endregion

    #region MigrateLegacyMeasurementsAsync Tests

    [Fact]
    public async Task MigrateLegacyMeasurementsAsync_WhenNoLegacyProfileFound_ReturnsFalse()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var email = "test@example.com";

        _legacyDbServiceMock.Setup(x => x.FindProfileByEmailAsync(email))
            .ReturnsAsync((LegacyProfile?)null);

        // Act
        var result = await _sut.MigrateLegacyMeasurementsAsync(userId, email);

        // Assert
        result.Should().BeFalse();
        _legacyDbServiceMock.Verify(x => x.FindProfileByEmailAsync(email), Times.Once);
        _sourceDataServiceMock.Verify(x => x.UpdateSourceDataAsync(It.IsAny<Guid>(), It.IsAny<List<SourceData>>()), Times.Never);
    }

    [Fact]
    public async Task MigrateLegacyMeasurementsAsync_WhenNoMeasurementsFound_ReturnsFalse()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var email = "test@example.com";
        var legacyProfile = CreateTestLegacyProfile(email);
        legacyProfile.Measurements = new List<RawMeasurement>(); // Empty measurements

        _legacyDbServiceMock.Setup(x => x.FindProfileByEmailAsync(email))
            .ReturnsAsync(legacyProfile);

        // Act
        var result = await _sut.MigrateLegacyMeasurementsAsync(userId, email);

        // Assert
        result.Should().BeFalse();
        _sourceDataServiceMock.Verify(x => x.UpdateSourceDataAsync(It.IsAny<Guid>(), It.IsAny<List<SourceData>>()), Times.Never);
    }

    [Fact]
    public async Task MigrateLegacyMeasurementsAsync_WithMeasurements_MigratesCorrectly()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var email = "test@example.com";
        var legacyProfile = CreateTestLegacyProfileWithMeasurements(email);

        _legacyDbServiceMock.Setup(x => x.FindProfileByEmailAsync(email))
            .ReturnsAsync(legacyProfile);

        // Act
        var result = await _sut.MigrateLegacyMeasurementsAsync(userId, email);

        // Assert
        result.Should().BeTrue();

        // Verify measurements were transferred directly (no conversion needed as they're already in kg)
#pragma warning disable CS8602 // Dereference of a possibly null reference.
        _sourceDataServiceMock.Verify(x => x.UpdateSourceDataAsync(
            userId,
            It.Is<List<SourceData>>(sd =>
                sd != null &&
                sd.Count == 1 &&
                sd[0].Source == "legacy" &&
                sd[0].Measurements != null &&
                sd[0].Measurements.Count == 2 &&
                sd[0].Measurements[0].Weight == 75.5m &&
                sd[0].Measurements[1].Weight == 75.3m)),
            Times.Once);
#pragma warning restore CS8602

        // Verify legacy provider link was created
        _providerLinkServiceMock.Verify(x => x.StoreProviderLinkAsync(
            userId,
            "legacy",
            It.IsAny<Dictionary<string, object>>(),
            It.IsAny<string>()),
            Times.Once);
    }

    [Fact]
    public async Task MigrateLegacyMeasurementsAsync_WithProvidedProfile_DoesNotQueryDatabase()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var email = "test@example.com";
        var legacyProfile = CreateTestLegacyProfileWithMeasurements(email);

        // Act - Pass the profile directly to avoid duplicate query
        var result = await _sut.MigrateLegacyMeasurementsAsync(userId, email, legacyProfile);

        // Assert
        result.Should().BeTrue();

        // Should NOT call FindProfileByEmailAsync since we provided the profile
        _legacyDbServiceMock.Verify(x => x.FindProfileByEmailAsync(It.IsAny<string>()), Times.Never);

        // Should still migrate the measurements
#pragma warning disable CS8602 // Dereference of a possibly null reference.
        _sourceDataServiceMock.Verify(x => x.UpdateSourceDataAsync(
            userId,
            It.Is<List<SourceData>>(sd =>
                sd != null &&
                sd.Count == 1 &&
                sd[0].Source == "legacy" &&
                sd[0].Measurements != null &&
                sd[0].Measurements.Count == 2)),
            Times.Once);
#pragma warning restore CS8602
    }

    #endregion

    #region CheckAndMigrateLegacyDataIfNeededAsync Tests

    [Fact]
    public async Task CheckAndMigrateLegacyDataIfNeededAsync_WhenLegacyLinkExists_DoesNotMigrate()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var email = "test@example.com";

        _providerLinkServiceMock.Setup(x => x.GetProviderLinkAsync(userId, "legacy"))
            .ReturnsAsync(new DbProviderLink { Provider = "legacy" });

        // Act
        await _sut.CheckAndMigrateLegacyDataIfNeededAsync(userId, email);

        // Assert
        _legacyDbServiceMock.Verify(x => x.FindProfileByEmailAsync(It.IsAny<string>()), Times.Never);
        _sourceDataServiceMock.Verify(x => x.UpdateSourceDataAsync(It.IsAny<Guid>(), It.IsAny<List<SourceData>>()), Times.Never);
    }

    [Fact]
    public async Task CheckAndMigrateLegacyDataIfNeededAsync_WhenNoLegacyLink_MigratesMeasurements()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var email = "test@example.com";
        var legacyProfile = CreateTestLegacyProfileWithMeasurements(email);

        _providerLinkServiceMock.Setup(x => x.GetProviderLinkAsync(userId, "legacy"))
            .ReturnsAsync((DbProviderLink?)null);
        _legacyDbServiceMock.Setup(x => x.FindProfileByEmailAsync(email))
            .ReturnsAsync(legacyProfile);

        // Act
        await _sut.CheckAndMigrateLegacyDataIfNeededAsync(userId, email);

        // Assert
        _legacyDbServiceMock.Verify(x => x.FindProfileByEmailAsync(email), Times.Once);
#pragma warning disable CS8602 // Dereference of a possibly null reference.
        _sourceDataServiceMock.Verify(x => x.UpdateSourceDataAsync(
            userId,
            It.Is<List<SourceData>>(sd =>
                sd != null &&
                sd.Count == 1 &&
                sd[0].Source == "legacy")),
            Times.Once);
#pragma warning restore CS8602
    }

    #endregion

    #region Error Scenario Tests

    [Fact]
    public async Task CheckAndMigrateIfNeededAsync_WhenLegacyDbServiceThrows_ThrowsException()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var email = "test@example.com";

        _legacyDbServiceMock.Setup(x => x.FindProfileByEmailAsync(email))
            .ThrowsAsync(new Exception("Database connection failed"));

        // Act & Assert
        await Assert.ThrowsAsync<Exception>(async () =>
            await _sut.CheckAndMigrateIfNeededAsync(userId, email));

        _profileServiceMock.Verify(x => x.CreateAsync(It.IsAny<DbProfile>()), Times.Never);
        _sourceDataServiceMock.Verify(x => x.UpdateSourceDataAsync(It.IsAny<Guid>(), It.IsAny<List<SourceData>>()), Times.Never);
    }

    [Fact]
    public async Task MigrateLegacyMeasurementsAsync_WithNullMeasurementsField_ReturnsFalse()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var email = "test@example.com";
        var legacyProfile = CreateTestLegacyProfile(email);
        legacyProfile.Measurements = null!; // Null measurements field

        _legacyDbServiceMock.Setup(x => x.FindProfileByEmailAsync(email))
            .ReturnsAsync(legacyProfile);

        // Act
        var result = await _sut.MigrateLegacyMeasurementsAsync(userId, email);

        // Assert
        result.Should().BeFalse();
        _sourceDataServiceMock.Verify(x => x.UpdateSourceDataAsync(It.IsAny<Guid>(), It.IsAny<List<SourceData>>()), Times.Never);
    }

    [Fact]
    public async Task MigrateLegacyMeasurementsAsync_WithMalformedMeasurementData_HandlesGracefully()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var email = "test@example.com";
        var legacyProfile = CreateTestLegacyProfile(email);
        legacyProfile.Measurements = new List<RawMeasurement>
        {
            new RawMeasurement
            {
                Date = null!, // Malformed: null date
                Time = "08:00:00",
                Weight = 75.5m,
                FatRatio = 0.25m
            },
            new RawMeasurement
            {
                Date = "2024-01-02",
                Time = null!, // Malformed: null time
                Weight = 75.3m,
                FatRatio = 0.24m
            },
            new RawMeasurement
            {
                Date = "2024-01-03",
                Time = "08:00:00",
                Weight = 0, // Edge case: zero weight
                FatRatio = null
            }
        };

        _legacyDbServiceMock.Setup(x => x.FindProfileByEmailAsync(email))
            .ReturnsAsync(legacyProfile);

        // Act
        var result = await _sut.MigrateLegacyMeasurementsAsync(userId, email);

        // Assert
        result.Should().BeTrue(); // Should still migrate, measurements are passed as-is
        _sourceDataServiceMock.Verify(x => x.UpdateSourceDataAsync(
            userId,
            It.Is<List<SourceData>>(sd =>
                sd != null &&
                sd.Count == 1 &&
                sd[0].Source == "legacy" &&
                sd[0].Measurements != null &&
                sd[0].Measurements.Count == 3)), // All measurements should be included, even malformed ones
            Times.Once);
    }

    [Fact]
    public async Task MigrateLegacyProfileAsync_WhenProfileServiceFails_ThrowsException()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var email = "test@example.com";
        var legacyProfile = CreateTestLegacyProfile(email);

        _profileServiceMock.Setup(x => x.CreateAsync(It.IsAny<DbProfile>()))
            .ThrowsAsync(new Exception("Profile creation failed"));

        // Act & Assert
        await Assert.ThrowsAsync<Exception>(async () =>
            await _sut.MigrateLegacyProfileAsync(userId, email, legacyProfile));

        _providerLinkServiceMock.Verify(x => x.StoreProviderLinkAsync(
            It.IsAny<Guid>(),
            It.IsAny<string>(),
            It.IsAny<Dictionary<string, object>>(),
            It.IsAny<string>()),
            Times.Never); // Provider link should not be created if profile creation fails
    }

    [Fact]
    public async Task MigrateLegacyMeasurementsAsync_WhenSourceDataServiceFails_ThrowsException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var email = "test@example.com";
        var legacyProfile = CreateTestLegacyProfileWithMeasurements(email);

        _legacyDbServiceMock.Setup(x => x.FindProfileByEmailAsync(email))
            .ReturnsAsync(legacyProfile);
        _sourceDataServiceMock.Setup(x => x.UpdateSourceDataAsync(It.IsAny<Guid>(), It.IsAny<List<SourceData>>()))
            .ThrowsAsync(new Exception("Failed to save measurements"));

        // Act & Assert
        await Assert.ThrowsAsync<Exception>(async () =>
            await _sut.MigrateLegacyMeasurementsAsync(userId, email));

        _providerLinkServiceMock.Verify(x => x.StoreProviderLinkAsync(
            It.IsAny<Guid>(),
            It.IsAny<string>(),
            It.IsAny<Dictionary<string, object>>(),
            It.IsAny<string>()),
            Times.Never); // Provider link should not be created if measurements fail to save
    }

    [Fact]
    public async Task CheckAndMigrateIfNeededAsync_WithPartiallyMigratedData_HandlesCorrectly()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var email = "test@example.com";
        var legacyProfile = CreateTestLegacyProfileWithMeasurements(email);
        legacyProfile.RefreshToken = null; // No token to migrate
        legacyProfile.DeviceType = null; // No device to migrate

        var expectedProfile = CreateTestDbProfile(Guid.Parse(userId), email);

        _legacyDbServiceMock.Setup(x => x.FindProfileByEmailAsync(email))
            .ReturnsAsync(legacyProfile);
        _profileServiceMock.Setup(x => x.CreateAsync(It.IsAny<DbProfile>()))
            .ReturnsAsync(expectedProfile);

        // Act
        var result = await _sut.CheckAndMigrateIfNeededAsync(userId, email);

        // Assert
        result.Should().NotBeNull();

        // Should create profile
        _profileServiceMock.Verify(x => x.CreateAsync(It.IsAny<DbProfile>()), Times.Once);

        // Should migrate measurements even without device/token
        _sourceDataServiceMock.Verify(x => x.UpdateSourceDataAsync(
            It.Is<Guid>(g => g == Guid.Parse(userId)),
            It.IsAny<List<SourceData>>()),
            Times.Once);

        // Should create legacy provider link for measurements (separate from device provider link)
        _providerLinkServiceMock.Verify(x => x.StoreProviderLinkAsync(
            It.Is<Guid>(g => g == Guid.Parse(userId)),
            "legacy",
            It.IsAny<Dictionary<string, object>>(),
            It.IsAny<string>()),
            Times.Once); // Legacy provider link is always created when measurements exist
    }

    [Fact]
    public async Task MigrateLegacyProfileAsync_WithEdgeCaseValues_MapsCorrectly()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var email = "test@example.com";
        var legacyProfile = new LegacyProfile
        {
            Email = email,
            FirstName = null, // Null first name
            UseMetric = true,
            StartDate = null, // Null start date
            GoalWeight = null, // Null goal weight
            PlannedPoundsPerWeek = null, // Null planned rate
            DayStartOffset = null, // Null day offset
            PrivateUrlKey = "", // Empty private key
            DeviceType = "unknown", // Unknown device type (should not create provider link)
            RefreshToken = "", // Empty refresh token
            Measurements = new List<RawMeasurement>()
        };
        var expectedProfile = CreateTestDbProfile(Guid.Parse(userId), email);

        _profileServiceMock.Setup(x => x.CreateAsync(It.IsAny<DbProfile>()))
            .ReturnsAsync(expectedProfile);

        // Act
        var result = await _sut.MigrateLegacyProfileAsync(userId, email, legacyProfile);

        // Assert
        result.Should().BeEquivalentTo(expectedProfile);

        // Should not create provider link for unknown device type or empty token
        _providerLinkServiceMock.Verify(x => x.StoreProviderLinkAsync(
            It.IsAny<Guid>(),
            It.IsAny<string>(),
            It.IsAny<Dictionary<string, object>>(),
            It.IsAny<string>()),
            Times.Never);
    }

    [Fact]
    public async Task MigrateLegacyMeasurementsAsync_WithVeryLargeMeasurementSet_HandlesEfficiently()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var email = "test@example.com";
        var legacyProfile = CreateTestLegacyProfile(email);

        // Create 10000 measurements to test performance/memory handling
        legacyProfile.Measurements = new List<RawMeasurement>();
        for (int i = 0; i < 10000; i++)
        {
            legacyProfile.Measurements.Add(new RawMeasurement
            {
                Date = $"2024-01-{(i % 30 + 1):D2}",
                Time = "08:00:00",
                Weight = 75.0m + (i % 10) * 0.1m,
                FatRatio = 0.25m + (i % 5) * 0.01m
            });
        }

        _legacyDbServiceMock.Setup(x => x.FindProfileByEmailAsync(email))
            .ReturnsAsync(legacyProfile);

        // Act
        var result = await _sut.MigrateLegacyMeasurementsAsync(userId, email);

        // Assert
        result.Should().BeTrue();
        _sourceDataServiceMock.Verify(x => x.UpdateSourceDataAsync(
            userId,
            It.Is<List<SourceData>>(sd =>
                sd != null &&
                sd.Count == 1 &&
                sd[0].Source == "legacy" &&
                sd[0].Measurements != null &&
                sd[0].Measurements.Count == 10000)), // All measurements should be migrated
            Times.Once);
    }

    #endregion

    #region Helper Methods

    private static LegacyProfile CreateTestLegacyProfile(string email)
    {
        return new LegacyProfile
        {
            Email = email,
            FirstName = "Test User",
            UseMetric = false,
            StartDate = new DateTime(2024, 1, 1),
            GoalWeight = 180.0m,
            PlannedPoundsPerWeek = 1.0m,
            DayStartOffset = -4,
            PrivateUrlKey = "test-private-key",
            DeviceType = null,
            RefreshToken = null,
            Measurements = new List<RawMeasurement>()
        };
    }

    private static LegacyProfile CreateTestLegacyProfileWithMeasurements(string email)
    {
        var profile = CreateTestLegacyProfile(email);
        profile.Measurements = new List<RawMeasurement>
        {
            new RawMeasurement
            {
                Date = "2024-01-01",
                Time = "08:00:00",
                Weight = 75.5m,
                FatRatio = 0.25m
            },
            new RawMeasurement
            {
                Date = "2024-01-02",
                Time = "08:00:00",
                Weight = 75.3m,
                FatRatio = 0.24m
            }
        };
        return profile;
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
