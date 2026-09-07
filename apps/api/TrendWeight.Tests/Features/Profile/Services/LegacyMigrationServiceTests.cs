using System.Globalization;
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

public class LegacyMigrationServiceTests
{
    private readonly Mock<IProfileService> _profileServiceMock;
    private readonly Mock<ILegacyDbService> _legacyDbServiceMock;
    private readonly Mock<IProviderLinkService> _providerLinkServiceMock;
    private readonly Mock<ISourceDataService> _sourceDataServiceMock;
    private readonly CapturingLoggerProvider _logs = new();
    private readonly LegacyMigrationService _sut;

    public LegacyMigrationServiceTests()
    {
        _profileServiceMock = new Mock<IProfileService>();
        _legacyDbServiceMock = new Mock<ILegacyDbService>();
        _providerLinkServiceMock = new Mock<IProviderLinkService>();
        _sourceDataServiceMock = new Mock<ISourceDataService>();

        _sut = new LegacyMigrationService(
            _profileServiceMock.Object,
            _legacyDbServiceMock.Object,
            _providerLinkServiceMock.Object,
            _sourceDataServiceMock.Object,
            _logs.CreateLogger<LegacyMigrationService>());
    }

    #region CheckAndMigrateIfNeededAsync Tests

    [Fact]
    public async Task CheckAndMigrateIfNeededAsync_WithNullEmail_ReturnsNull()
    {
        // Arrange
        var userId = Guid.NewGuid();

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
        var userId = Guid.NewGuid();
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
        var userId = Guid.NewGuid();
        var email = "test@example.com";
        var legacyProfile = CreateTestLegacyProfileWithMeasurements(email);

        _legacyDbServiceMock.Setup(x => x.FindProfileByEmailAsync(email))
            .ReturnsAsync(legacyProfile);
        var created = CaptureCreatedProfile();
        var stored = CaptureStoredSourceData();

        // Act
        var result = await _sut.CheckAndMigrateIfNeededAsync(userId, email);

        // Assert
        result.Should().NotBeNull();
        result.Should().BeSameAs(created.Value);
        created.Value!.Uid.Should().Be(userId);
        created.Value.Email.Should().Be(email);
        created.Value.Profile.FirstName.Should().Be("Test User");
        created.Value.Profile.SharingToken.Should().Be("test-private-key");
        created.Value.Profile.IsMigrated.Should().BeTrue();

        // Should only call FindProfileByEmailAsync once (performance optimization)
        _legacyDbServiceMock.Verify(x => x.FindProfileByEmailAsync(email), Times.Once);
        _profileServiceMock.Verify(x => x.CreateAsync(It.IsAny<DbProfile>()), Times.Once);

        // Should migrate measurements as-is under the legacy source
        stored.UserId.Should().Be(userId);
        var sourceData = stored.Value.Should().ContainSingle().Subject;
        sourceData.Source.Should().Be("legacy");
        sourceData.Measurements.Should().Equal(legacyProfile.Measurements);
    }

    #endregion

    #region MigrateLegacyProfileAsync Tests

    [Fact]
    public async Task MigrateLegacyProfileAsync_MapsEveryProfileField()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var email = "test@example.com";
        var legacyProfile = new LegacyProfile
        {
            Email = "old-address@example.com",
            Username = "olduser",
            FirstName = "Erin",
            UseMetric = true,
            StartDate = new DateTime(2023, 6, 15),
            GoalWeight = 68.5m,
            PlannedPoundsPerWeek = 0.5m,
            DayStartOffset = -4,
            PrivateUrlKey = "legacy-key",
            DeviceType = null,
            RefreshToken = null,
            Measurements = new List<RawMeasurement>()
        };
        _profileServiceMock.Setup(x => x.GetBySharingTokenAsync("legacy-key")).ReturnsAsync((DbProfile?)null);
        _profileServiceMock.Setup(x => x.CreateAsync(It.IsAny<DbProfile>())).ReturnsAsync((DbProfile p) => p);
        var before = DateTime.UtcNow.AddSeconds(-1);

        // Act
        var result = await _sut.MigrateLegacyProfileAsync(userId, email, legacyProfile);

        // Assert
        result.Uid.Should().Be(userId);
        result.Email.Should().Be(email, "the new account's email wins over the legacy record");
        result.Profile.FirstName.Should().Be("Erin");
        result.Profile.UseMetric.Should().BeTrue();
        result.Profile.GoalStart.Should().Be(new DateTime(2023, 6, 15));
        result.Profile.GoalWeight.Should().Be(68.5m);
        result.Profile.PlannedPoundsPerWeek.Should().Be(0.5m);
        result.Profile.DayStartOffset.Should().Be(-4);
        result.Profile.ShowCalories.Should().BeTrue();
        result.Profile.SharingToken.Should().Be("legacy-key");
        result.Profile.SharingEnabled.Should().BeTrue();
        result.Profile.IsMigrated.Should().BeTrue();
        result.Profile.IsNewlyMigrated.Should().BeTrue();
        result.Profile.HideDataBeforeStart.Should().BeFalse();
        result.Profile.TrendAlgorithm.Should().BeNull();

        foreach (var stamp in new[] { result.CreatedAt, result.UpdatedAt })
        {
            var parsed = DateTime.Parse(stamp, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind);
            parsed.Kind.Should().Be(DateTimeKind.Utc);
            parsed.Should().BeOnOrAfter(before).And.BeOnOrBefore(DateTime.UtcNow);
            parsed.ToString("o").Should().Be(stamp);
        }
    }

    [Fact]
    public async Task MigrateLegacyProfileAsync_WithAllNullLegacyFields_UsesDefaults()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var email = "test@example.com";
        var legacyProfile = new LegacyProfile
        {
            Email = email,
            FirstName = null,
            UseMetric = null,
            StartDate = null,
            GoalWeight = null,
            PlannedPoundsPerWeek = null,
            DayStartOffset = null,
            PrivateUrlKey = null,
            DeviceType = null,
            RefreshToken = null,
            Measurements = new List<RawMeasurement>()
        };
        _profileServiceMock.Setup(x => x.GenerateUniqueShareTokenAsync()).ReturnsAsync("generated-token");
        _profileServiceMock.Setup(x => x.CreateAsync(It.IsAny<DbProfile>())).ReturnsAsync((DbProfile p) => p);

        // Act
        var result = await _sut.MigrateLegacyProfileAsync(userId, email, legacyProfile);

        // Assert - unset legacy goals must stay unset; 0 means "maintain" in the settings contract
        result.Profile.FirstName.Should().BeEmpty();
        result.Profile.UseMetric.Should().BeFalse();
        result.Profile.GoalStart.Should().BeNull();
        result.Profile.GoalWeight.Should().BeNull();
        result.Profile.PlannedPoundsPerWeek.Should().BeNull();
        result.Profile.DayStartOffset.Should().Be(0);
        result.Profile.SharingToken.Should().Be("generated-token");
        result.Profile.ShowCalories.Should().BeTrue();
        result.Profile.SharingEnabled.Should().BeTrue();
        result.Profile.IsMigrated.Should().BeTrue();
        result.Profile.IsNewlyMigrated.Should().BeTrue();
        VerifyNoProviderLinkStored();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task MigrateLegacyProfileAsync_WithBlankPrivateUrlKey_GeneratesSharingToken(string? privateUrlKey)
    {
        // Arrange
        var userId = Guid.NewGuid();
        var email = "test@example.com";
        var legacyProfile = CreateTestLegacyProfile(email);
        legacyProfile.PrivateUrlKey = privateUrlKey;

        _profileServiceMock.Setup(x => x.GenerateUniqueShareTokenAsync()).ReturnsAsync("generated-token");
        _profileServiceMock.Setup(x => x.CreateAsync(It.IsAny<DbProfile>())).ReturnsAsync((DbProfile p) => p);

        // Act
        var result = await _sut.MigrateLegacyProfileAsync(userId, email, legacyProfile);

        // Assert - sharing is forced on, so a blank token must never be stored
        result.Profile.SharingEnabled.Should().BeTrue();
        result.Profile.SharingToken.Should().Be("generated-token");
        _profileServiceMock.Verify(x => x.GetBySharingTokenAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task MigrateLegacyProfileAsync_WhenPrivateUrlKeyAlreadyInUse_GeneratesSharingToken()
    {
        // Arrange - another profile already owns this token
        var userId = Guid.NewGuid();
        var email = "test@example.com";
        var legacyProfile = CreateTestLegacyProfile(email);
        legacyProfile.PrivateUrlKey = "taken-key";

        _profileServiceMock.Setup(x => x.GetBySharingTokenAsync("taken-key"))
            .ReturnsAsync(CreateTestDbProfile(Guid.NewGuid(), "someone-else@example.com"));
        _profileServiceMock.Setup(x => x.GenerateUniqueShareTokenAsync()).ReturnsAsync("generated-token");
        _profileServiceMock.Setup(x => x.CreateAsync(It.IsAny<DbProfile>())).ReturnsAsync((DbProfile p) => p);

        // Act
        var result = await _sut.MigrateLegacyProfileAsync(userId, email, legacyProfile);

        // Assert
        result.Profile.SharingToken.Should().Be("generated-token");
    }

    [Fact]
    public async Task MigrateLegacyProfileAsync_WithUnusedPrivateUrlKey_KeepsLegacyToken()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var email = "test@example.com";
        var legacyProfile = CreateTestLegacyProfile(email);
        legacyProfile.PrivateUrlKey = "legacy-key";

        _profileServiceMock.Setup(x => x.GetBySharingTokenAsync("legacy-key")).ReturnsAsync((DbProfile?)null);
        _profileServiceMock.Setup(x => x.CreateAsync(It.IsAny<DbProfile>())).ReturnsAsync((DbProfile p) => p);

        // Act
        var result = await _sut.MigrateLegacyProfileAsync(userId, email, legacyProfile);

        // Assert - existing private URLs keep working
        result.Profile.SharingToken.Should().Be("legacy-key");
        _profileServiceMock.Verify(x => x.GenerateUniqueShareTokenAsync(), Times.Never);
    }

    [Fact]
    public async Task MigrateLegacyProfileAsync_WithFitbitDevice_CreatesProviderLink()
    {
        // Arrange
        var userId = Guid.NewGuid();
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

        _profileServiceMock.Setup(x => x.CreateAsync(It.IsAny<DbProfile>())).ReturnsAsync((DbProfile p) => p);

        // Act
        var result = await _sut.MigrateLegacyProfileAsync(userId, email, legacyProfile);

        // Assert
        result.Uid.Should().Be(userId);
        _providerLinkServiceMock.Verify(x => x.StoreProviderLinkAsync(
            userId,
            "fitbit",
            It.Is<Dictionary<string, object>>(d =>
                d.ContainsKey("refresh_token") &&
                d["refresh_token"].ToString() == "test-refresh-token-123"),
            null),
            Times.Once);
    }

    [Fact]
    public async Task MigrateLegacyProfileAsync_WithWithingsDevice_StoresExpiredTokenMarker()
    {
        // Arrange - the legacy site only kept a refresh token; the new link must force a refresh on first use
        var userId = Guid.NewGuid();
        var email = "test@example.com";
        var legacyProfile = CreateTestLegacyProfile(email);
        legacyProfile.DeviceType = "Withings";
        legacyProfile.RefreshToken = "withings-refresh-token-456";

        _profileServiceMock.Setup(x => x.CreateAsync(It.IsAny<DbProfile>())).ReturnsAsync((DbProfile p) => p);
        Dictionary<string, object>? stored = null;
        _providerLinkServiceMock
            .Setup(x => x.StoreProviderLinkAsync(userId, "withings", It.IsAny<Dictionary<string, object>>(), null))
            .Callback<Guid, string, Dictionary<string, object>, string?>((_, _, token, _) => stored = token)
            .Returns(Task.CompletedTask);

        // Act
        await _sut.MigrateLegacyProfileAsync(userId, email, legacyProfile);

        // Assert
        _providerLinkServiceMock.Verify(x => x.StoreProviderLinkAsync(userId, "withings", It.IsAny<Dictionary<string, object>>(), null), Times.Once);
        stored.Should().NotBeNull();
        stored!.Keys.Should().BeEquivalentTo("refresh_token", "access_token", "token_type", "scope", "received_at", "expires_in");
        stored["refresh_token"].Should().Be("withings-refresh-token-456");
        stored["access_token"].Should().Be(string.Empty);
        stored["token_type"].Should().Be("Bearer");
        stored["scope"].Should().Be("user.metrics");
        stored["received_at"].Should().Be(0L);
        stored["expires_in"].Should().Be(3600);

        var provider = new TestProviderService(Mock.Of<IProviderLinkService>(), Mock.Of<IProfileService>(), Mock.Of<ILogger>());
        provider.IsExpired(stored).Should().BeTrue("the marker must trigger a refresh the first time the link is used");
    }

    [Fact]
    public async Task MigrateLegacyProfileAsync_WithNoDevice_DoesNotCreateProviderLink()
    {
        // Arrange
        var userId = Guid.NewGuid();
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

        _profileServiceMock.Setup(x => x.CreateAsync(It.IsAny<DbProfile>())).ReturnsAsync((DbProfile p) => p);

        // Act
        var result = await _sut.MigrateLegacyProfileAsync(userId, email, legacyProfile);

        // Assert
        result.Uid.Should().Be(userId);
        VerifyNoProviderLinkStored();
    }

    [Fact]
    public async Task MigrateLegacyProfileAsync_WithDeviceButNoRefreshToken_DoesNotCreateProviderLink()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var email = "test@example.com";
        var legacyProfile = CreateTestLegacyProfile(email);
        legacyProfile.DeviceType = "Withings";
        legacyProfile.RefreshToken = "";

        _profileServiceMock.Setup(x => x.CreateAsync(It.IsAny<DbProfile>())).ReturnsAsync((DbProfile p) => p);

        // Act
        await _sut.MigrateLegacyProfileAsync(userId, email, legacyProfile);

        // Assert
        VerifyNoProviderLinkStored();
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
        var stored = CaptureStoredSourceData();

        // Act
        var result = await _sut.MigrateLegacyMeasurementsAsync(userId, email);

        // Assert
        result.Should().BeTrue();

        // Measurements are transferred directly (no conversion needed as they are already in kg)
        stored.UserId.Should().Be(userId);
        var sourceData = stored.Value.Should().ContainSingle().Subject;
        sourceData.Source.Should().Be("legacy");
        sourceData.Measurements.Should().Equal(legacyProfile.Measurements);

        // Verify legacy provider link was created
        _providerLinkServiceMock.Verify(x => x.StoreProviderLinkAsync(
            userId,
            "legacy",
            It.Is<Dictionary<string, object>>(d => d.Count == 1 && Equals(d["disabled"], false)),
            null),
            Times.Once);
    }

    [Fact]
    public async Task MigrateLegacyMeasurementsAsync_WithProvidedProfile_DoesNotQueryDatabase()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var email = "test@example.com";
        var legacyProfile = CreateTestLegacyProfileWithMeasurements(email);
        var stored = CaptureStoredSourceData();

        // Act - Pass the profile directly to avoid duplicate query
        var result = await _sut.MigrateLegacyMeasurementsAsync(userId, email, legacyProfile);

        // Assert
        result.Should().BeTrue();

        // Should NOT call FindProfileByEmailAsync since we provided the profile
        _legacyDbServiceMock.Verify(x => x.FindProfileByEmailAsync(It.IsAny<string>()), Times.Never);

        // Should still migrate the measurements
        stored.UserId.Should().Be(userId);
        var sourceData = stored.Value.Should().ContainSingle().Subject;
        sourceData.Source.Should().Be("legacy");
        sourceData.Measurements.Should().Equal(legacyProfile.Measurements);
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
        var stored = CaptureStoredSourceData();

        // Act
        await _sut.CheckAndMigrateLegacyDataIfNeededAsync(userId, email);

        // Assert
        _legacyDbServiceMock.Verify(x => x.FindProfileByEmailAsync(email), Times.Once);
        stored.UserId.Should().Be(userId);
        var sourceData = stored.Value.Should().ContainSingle().Subject;
        sourceData.Source.Should().Be("legacy");
        sourceData.Measurements.Should().Equal(legacyProfile.Measurements);
    }

    [Fact]
    public async Task CheckAndMigrateLegacyDataIfNeededAsync_WhenLinkLookupThrows_LogsAndReturns()
    {
        // Arrange - a profile load must survive a failing legacy check
        var userId = Guid.NewGuid();
        var failure = new InvalidOperationException("provider_links unavailable");
        _providerLinkServiceMock.Setup(x => x.GetProviderLinkAsync(userId, "legacy")).ThrowsAsync(failure);

        // Act
        var act = () => _sut.CheckAndMigrateLegacyDataIfNeededAsync(userId, "test@example.com");

        // Assert
        await act.Should().NotThrowAsync();
        _logs.ShouldHaveLogged(LogLevel.Error, "Error checking/importing legacy data");
        _logs.Entries.Should().ContainSingle(e => e.Level == LogLevel.Error).Which.Exception.Should().BeSameAs(failure);
        _sourceDataServiceMock.Verify(x => x.UpdateSourceDataAsync(It.IsAny<Guid>(), It.IsAny<List<SourceData>>()), Times.Never);
    }

    [Fact]
    public async Task CheckAndMigrateLegacyDataIfNeededAsync_WhenImportThrows_LogsAndReturns()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var email = "test@example.com";
        var failure = new InvalidOperationException("source_data write failed");
        _providerLinkServiceMock.Setup(x => x.GetProviderLinkAsync(userId, "legacy")).ReturnsAsync((DbProviderLink?)null);
        _legacyDbServiceMock.Setup(x => x.FindProfileByEmailAsync(email)).ReturnsAsync(CreateTestLegacyProfileWithMeasurements(email));
        _sourceDataServiceMock.Setup(x => x.UpdateSourceDataAsync(userId, It.IsAny<List<SourceData>>())).ThrowsAsync(failure);

        // Act
        var act = () => _sut.CheckAndMigrateLegacyDataIfNeededAsync(userId, email);

        // Assert
        await act.Should().NotThrowAsync();
        _logs.ShouldHaveLogged(LogLevel.Error, "Error checking/importing legacy data");
        _logs.Entries.Should().ContainSingle(e => e.Level == LogLevel.Error).Which.Exception.Should().BeSameAs(failure);
        VerifyNoProviderLinkStored();
    }

    #endregion

    #region Error Scenario Tests

    [Fact]
    public async Task CheckAndMigrateIfNeededAsync_WhenLegacyDbServiceThrows_ThrowsException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var email = "test@example.com";

        _legacyDbServiceMock.Setup(x => x.FindProfileByEmailAsync(email))
            .ThrowsAsync(new Exception("Database connection failed"));

        // Act
        var act = () => _sut.CheckAndMigrateIfNeededAsync(userId, email);

        // Assert
        await act.Should().ThrowAsync<Exception>().WithMessage("Database connection failed");
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
    public async Task MigrateLegacyMeasurementsAsync_PassesMeasurementsThroughWithoutValidation()
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
        var stored = CaptureStoredSourceData();

        // Act
        var result = await _sut.MigrateLegacyMeasurementsAsync(userId, email);

        // Assert - every measurement is stored as-is, malformed ones included
        result.Should().BeTrue();
        stored.Value.Should().ContainSingle().Which.Measurements.Should().Equal(legacyProfile.Measurements);
    }

    [Fact]
    public async Task MigrateLegacyProfileAsync_WhenProfileServiceFails_ThrowsException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var email = "test@example.com";
        var legacyProfile = CreateTestLegacyProfile(email);

        _profileServiceMock.Setup(x => x.CreateAsync(It.IsAny<DbProfile>()))
            .ThrowsAsync(new Exception("Profile creation failed"));

        // Act
        var act = () => _sut.MigrateLegacyProfileAsync(userId, email, legacyProfile);

        // Assert - provider link should not be created if profile creation fails
        await act.Should().ThrowAsync<Exception>().WithMessage("Profile creation failed");
        VerifyNoProviderLinkStored();
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

        // Act
        var act = () => _sut.MigrateLegacyMeasurementsAsync(userId, email);

        // Assert - provider link should not be created if measurements fail to save
        await act.Should().ThrowAsync<Exception>().WithMessage("Failed to save measurements");
        VerifyNoProviderLinkStored();
    }

    [Fact]
    public async Task CheckAndMigrateIfNeededAsync_WithPartiallyMigratedData_HandlesCorrectly()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var email = "test@example.com";
        var legacyProfile = CreateTestLegacyProfileWithMeasurements(email);
        legacyProfile.RefreshToken = null; // No token to migrate
        legacyProfile.DeviceType = null; // No device to migrate

        _legacyDbServiceMock.Setup(x => x.FindProfileByEmailAsync(email))
            .ReturnsAsync(legacyProfile);
        _profileServiceMock.Setup(x => x.CreateAsync(It.IsAny<DbProfile>())).ReturnsAsync((DbProfile p) => p);

        // Act
        var result = await _sut.CheckAndMigrateIfNeededAsync(userId, email);

        // Assert
        result.Should().NotBeNull();

        // Should create profile
        _profileServiceMock.Verify(x => x.CreateAsync(It.IsAny<DbProfile>()), Times.Once);

        // Should migrate measurements even without device/token
        _sourceDataServiceMock.Verify(x => x.UpdateSourceDataAsync(userId, It.IsAny<List<SourceData>>()), Times.Once);

        // The legacy provider link is the only link created (separate from any device provider link)
        _providerLinkServiceMock.Verify(x => x.StoreProviderLinkAsync(userId, "legacy", It.IsAny<Dictionary<string, object>>(), null), Times.Once);
        _providerLinkServiceMock.Verify(x => x.StoreProviderLinkAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<string?>()), Times.Once);
    }

    [Fact]
    public async Task MigrateLegacyMeasurementsAsync_WithLargeSet_PassesEveryMeasurementThrough()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var email = "test@example.com";
        var legacyProfile = CreateTestLegacyProfile(email);

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
        var stored = CaptureStoredSourceData();

        // Act
        var result = await _sut.MigrateLegacyMeasurementsAsync(userId, email);

        // Assert
        result.Should().BeTrue();
        var measurements = stored.Value.Should().ContainSingle().Which.Measurements;
        measurements.Should().HaveCount(10000);
        measurements.First().Should().Be(new RawMeasurement { Date = "2024-01-01", Time = "08:00:00", Weight = 75.0m, FatRatio = 0.25m });
        measurements.Last().Should().Be(new RawMeasurement { Date = "2024-01-10", Time = "08:00:00", Weight = 75.9m, FatRatio = 0.29m });
        measurements.Should().Equal(legacyProfile.Measurements);
    }

    #endregion

    #region Helper Methods

    private sealed class Captured<T>
    {
        public Guid UserId { get; set; }
        public T? Value { get; set; }
    }

    /// <summary>Stubs CreateAsync to echo the profile it is given and records that profile.</summary>
    private Captured<DbProfile> CaptureCreatedProfile()
    {
        var captured = new Captured<DbProfile>();
        _profileServiceMock.Setup(x => x.CreateAsync(It.IsAny<DbProfile>()))
            .ReturnsAsync((DbProfile p) =>
            {
                captured.Value = p;
                return p;
            });
        return captured;
    }

    private Captured<List<SourceData>> CaptureStoredSourceData()
    {
        var captured = new Captured<List<SourceData>>();
        _sourceDataServiceMock.Setup(x => x.UpdateSourceDataAsync(It.IsAny<Guid>(), It.IsAny<List<SourceData>>()))
            .Callback<Guid, List<SourceData>>((uid, data) =>
            {
                captured.UserId = uid;
                captured.Value = data;
            })
            .Returns(Task.CompletedTask);
        return captured;
    }

    private void VerifyNoProviderLinkStored()
    {
        _providerLinkServiceMock.Verify(x => x.StoreProviderLinkAsync(
            It.IsAny<Guid>(),
            It.IsAny<string>(),
            It.IsAny<Dictionary<string, object>>(),
            It.IsAny<string?>()),
            Times.Never);
    }

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
                FirstName = "Someone Else",
                SharingToken = "taken-key",
                SharingEnabled = true
            },
            CreatedAt = DateTime.UtcNow.ToString("o"),
            UpdatedAt = DateTime.UtcNow.ToString("o")
        };
    }

    #endregion
}
