using System.Globalization;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using Newtonsoft.Json;
using Supabase.Postgrest;
using TrendWeight.Features.ApiKeys;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Features.Profile.Models;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Infrastructure.Auth;
using TrendWeight.Infrastructure.DataAccess.Models;
using TrendWeight.Infrastructure.Services;
using TrendWeight.Tests.Fixtures;

namespace TrendWeight.Tests.Features.Profile.Services;

public class ProfileServiceTests
{
    private const string OldTimestamp = "2020-01-01T00:00:00.0000000Z";

    private readonly FakeSupabaseService _supabase = new();
    private readonly CapturingLoggerProvider _logs = new();
    private readonly Mock<IUserAccountMappingService> _userAccountMappingServiceMock = new();
    private readonly Mock<IClerkService> _clerkServiceMock = new();
    private readonly ProfileService _sut;

    public ProfileServiceTests()
    {
        _sut = new ProfileService(
            _supabase,
            _logs.CreateLogger<ProfileService>(),
            _userAccountMappingServiceMock.Object,
            _clerkServiceMock.Object);
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsTheProfileWithThatUid()
    {
        var mine = CreateTestProfile(Guid.NewGuid());
        _supabase.Seed(mine, CreateTestProfile(Guid.NewGuid()));

        var result = await _sut.GetByIdAsync(mine.Uid);

        result.Should().BeSameAs(mine);
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsNull_WhenNoProfileHasThatUid()
    {
        _supabase.Seed(CreateTestProfile(Guid.NewGuid()));

        var result = await _sut.GetByIdAsync(Guid.NewGuid());

        result.Should().BeNull();
    }

    [Fact]
    public async Task CreateAsync_PersistsTheProfile()
    {
        var profile = CreateTestProfile(Guid.NewGuid());

        var result = await _sut.CreateAsync(profile);

        result.Should().BeSameAs(profile);
        _supabase.Rows<DbProfile>().Should().ContainSingle().Which.Should().BeSameAs(profile);
    }

    [Fact]
    public async Task UpdateAsync_ReplacesTheStoredRowWithTheSameUid()
    {
        var uid = Guid.NewGuid();
        var decoy = CreateTestProfile(Guid.NewGuid());
        _supabase.Seed(CreateTestProfile(uid), decoy);
        var replacement = CreateTestProfile(uid);
        replacement.Profile.FirstName = "Replaced";

        var result = await _sut.UpdateAsync(replacement);

        result.Should().BeSameAs(replacement);
        var rows = _supabase.Rows<DbProfile>();
        rows.Should().HaveCount(2);
        rows.Single(r => r.Uid == uid).Should().BeSameAs(replacement);
        rows.Should().Contain(decoy);
    }

    [Fact]
    public async Task UpdateOrCreateProfileAsync_WhenProfileDoesNotExist_CreatesNewProfile()
    {
        var userId = Guid.NewGuid();
        var email = "test@example.com";
        var decoy = CreateTestProfile(Guid.NewGuid());
        _supabase.Seed(decoy);
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

        var result = await _sut.UpdateOrCreateProfileAsync(userId, email, request);

        result.Uid.Should().Be(userId);
        result.Email.Should().Be(email);
        result.Profile.FirstName.Should().Be("Test");
        result.Profile.UseMetric.Should().BeTrue();
        result.Profile.GoalStart.Should().Be(DateTime.UtcNow.Date);
        result.Profile.GoalWeight.Should().Be(70.0m);
        result.Profile.PlannedPoundsPerWeek.Should().Be(1.0m);
        result.Profile.DayStartOffset.Should().Be(0);
        result.Profile.ShowCalories.Should().BeFalse();
        result.Profile.HideDataBeforeStart.Should().BeFalse();
        result.Profile.TrendAlgorithm.Should().BeNull();
        result.Profile.SharingToken.Should().MatchRegex("^[0-9a-z]{25}$");
        result.Profile.SharingToken.Should().NotBe(decoy.Profile.SharingToken);
        Parse(result.CreatedAt).Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));

        var rows = _supabase.Rows<DbProfile>();
        rows.Should().HaveCount(2);
        rows.Single(r => r.Uid == userId).Should().BeSameAs(result);
        _logs.ShouldHaveLogged(LogLevel.Information, "Creating new profile");
    }

    [Fact]
    public async Task UpdateOrCreateProfileAsync_WhenProfileExists_UpdatesItInPlace()
    {
        var userId = Guid.NewGuid();
        var existing = CreateTestProfile(userId);
        existing.UpdatedAt = OldTimestamp;
        var decoy = CreateTestProfile(Guid.NewGuid());
        _supabase.Seed(existing, decoy);
        var request = new UpdateProfileRequest
        {
            FirstName = "Updated",
            UseMetric = false,
            GoalStart = DateTime.UtcNow.Date.AddDays(-7),
            GoalWeight = 80.0m,
            PlannedPoundsPerWeek = 2.0m,
            DayStartOffset = 1,
            ShowCalories = true,
            HideDataBeforeStart = true
        };

        var result = await _sut.UpdateOrCreateProfileAsync(userId, "test@example.com", request);

        result.Should().BeSameAs(existing);
        result.Profile.FirstName.Should().Be("Updated");
        result.Profile.UseMetric.Should().BeFalse();
        result.Profile.GoalStart.Should().Be(DateTime.UtcNow.Date.AddDays(-7));
        result.Profile.GoalWeight.Should().Be(80.0m);
        result.Profile.PlannedPoundsPerWeek.Should().Be(2.0m);
        result.Profile.DayStartOffset.Should().Be(1);
        result.Profile.ShowCalories.Should().BeTrue();
        result.Profile.HideDataBeforeStart.Should().BeTrue();
        Parse(result.UpdatedAt).Should().BeAfter(Parse(OldTimestamp));

        _supabase.Rows<DbProfile>().Should().HaveCount(2);
        decoy.Profile.FirstName.Should().Be("Test");
        _logs.ShouldHaveLogged(LogLevel.Information, "Updating existing profile");
    }

    [Fact]
    public async Task UpdateOrCreateProfileAsync_WhenEmailChanged_StoresTheNewEmail()
    {
        var userId = Guid.NewGuid();
        var existing = CreateTestProfile(userId);
        _supabase.Seed(existing);

        var result = await _sut.UpdateOrCreateProfileAsync(userId, "renamed@example.com", new UpdateProfileRequest());

        result.Email.Should().Be("renamed@example.com");
        _logs.ShouldHaveLogged(LogLevel.Information, "Updating profile email");
    }

    [Fact]
    public async Task UpdateOrCreateProfileAsync_WithTrendAlgorithm_StoresValue()
    {
        var userId = Guid.NewGuid();
        _supabase.Seed(CreateTestProfile(userId));

        var result = await _sut.UpdateOrCreateProfileAsync(userId, "test@example.com", new UpdateProfileRequest { TrendAlgorithm = "holt" });

        result.Profile.TrendAlgorithm.Should().Be("holt");
    }

    [Fact]
    public async Task UpdateOrCreateProfileAsync_WithNullTrendAlgorithm_PreservesExistingValue()
    {
        var userId = Guid.NewGuid();
        var existing = CreateTestProfile(userId);
        existing.Profile.TrendAlgorithm = "holt-gentle";
        _supabase.Seed(existing);

        var result = await _sut.UpdateOrCreateProfileAsync(userId, "test@example.com", new UpdateProfileRequest { FirstName = "Updated" });

        result.Profile.TrendAlgorithm.Should().Be("holt-gentle");
    }

    [Fact]
    public async Task UpdateOrCreateProfileAsync_WithNullOptionalFields_ClearsThemButKeepsRequiredOnes()
    {
        var userId = Guid.NewGuid();
        var existing = CreateTestProfile(userId);
        existing.Profile.FirstName = "Keep";
        existing.Profile.UseMetric = true;
        existing.Profile.HideDataBeforeStart = true;
        existing.Profile.TrendAlgorithm = "holt";
        existing.Profile.GoalStart = new DateTime(2024, 1, 15, 0, 0, 0, DateTimeKind.Utc);
        existing.Profile.GoalWeight = 72.5m;
        existing.Profile.PlannedPoundsPerWeek = 1.0m;
        existing.Profile.DayStartOffset = 3;
        existing.Profile.ShowCalories = true;
        existing.UpdatedAt = OldTimestamp;
        _supabase.Seed(existing);

        var result = await _sut.UpdateOrCreateProfileAsync(userId, "test@example.com", new UpdateProfileRequest());

        // Nullable settings are cleared when the request omits them.
        result.Profile.GoalStart.Should().BeNull();
        result.Profile.GoalWeight.Should().BeNull();
        result.Profile.PlannedPoundsPerWeek.Should().BeNull();
        result.Profile.DayStartOffset.Should().BeNull();
        result.Profile.ShowCalories.Should().BeNull();

        // Fields with a required value fall back to what was stored.
        result.Profile.FirstName.Should().Be("Keep");
        result.Profile.UseMetric.Should().BeTrue();
        result.Profile.HideDataBeforeStart.Should().BeTrue();
        result.Profile.TrendAlgorithm.Should().Be("holt");

        Parse(result.UpdatedAt).Should().BeAfter(Parse(OldTimestamp));
        result.Should().BeSameAs(existing);
        _supabase.Rows<DbProfile>().Should().ContainSingle().Which.Should().BeSameAs(existing);
    }

    [Fact]
    public void DbProfile_DeserialisedLikePostgrest_DefaultsMissingProfileFieldsAndIgnoresUnknownKeys()
    {
        // Profile JSONB written before newer fields existed, plus a key this build does not know.
        var uid = Guid.NewGuid();
        var json = $$"""
            {
              "uid": "{{uid}}",
              "email": "test@example.com",
              "profile": {"FirstName":"Test","UseMetric":false,"SomethingNew":1},
              "created_at": "2024-01-01T00:00:00+00:00",
              "updated_at": "2024-01-02T00:00:00+00:00"
            }
            """;

        var result = DeserialiseLikePostgrest(json);

        result.Uid.Should().Be(uid);
        result.Email.Should().Be("test@example.com");
        result.CreatedAt.Should().Be("2024-01-01T00:00:00+00:00");
        result.UpdatedAt.Should().Be("2024-01-02T00:00:00+00:00");
        result.Profile.FirstName.Should().Be("Test");
        result.Profile.UseMetric.Should().BeFalse();
        result.Profile.TrendAlgorithm.Should().BeNull();
        result.Profile.HideDataBeforeStart.Should().BeFalse();
        result.Profile.ShowCalories.Should().BeNull();
        result.Profile.DayStartOffset.Should().BeNull();
        result.Profile.GoalStart.Should().BeNull();
        result.Profile.GoalWeight.Should().BeNull();
        result.Profile.PlannedPoundsPerWeek.Should().BeNull();
        result.Profile.SharingToken.Should().BeNull();
        result.Profile.SharingEnabled.Should().BeFalse();
        result.Profile.IsMigrated.Should().BeFalse();
        result.Profile.IsNewlyMigrated.Should().BeFalse();
        result.Profile.ApiKeyHash.Should().BeNull();
        result.Profile.ApiKeySuffix.Should().BeNull();
        result.Profile.ApiKeyCreatedAt.Should().BeNull();
    }

    [Fact]
    public void DbProfile_DeserialisedLikePostgrest_RoundTripsEveryProfileField()
    {
        var uid = Guid.NewGuid();
        var json = $$"""
            {
              "uid": "{{uid}}",
              "email": "full@example.com",
              "profile": {
                "FirstName": "Full",
                "GoalStart": "2024-01-15T00:00:00",
                "GoalWeight": 72.5,
                "PlannedPoundsPerWeek": 1.25,
                "DayStartOffset": -3,
                "UseMetric": true,
                "ShowCalories": true,
                "SharingToken": "abcdefghijklmnopqrstuvwxy",
                "SharingEnabled": true,
                "IsMigrated": true,
                "IsNewlyMigrated": true,
                "HideDataBeforeStart": true,
                "TrendAlgorithm": "holt-gentle",
                "ApiKeyHash": "0123abcd",
                "ApiKeySuffix": "wxyz",
                "ApiKeyCreatedAt": "2024-02-01T12:00:00.0000000Z"
              },
              "created_at": "2024-01-01T00:00:00+00:00",
              "updated_at": "2024-01-02T00:00:00+00:00"
            }
            """;

        var result = DeserialiseLikePostgrest(json);

        result.Uid.Should().Be(uid);
        result.Email.Should().Be("full@example.com");
        result.Profile.Should().BeEquivalentTo(new ProfileData
        {
            FirstName = "Full",
            GoalStart = new DateTime(2024, 1, 15, 0, 0, 0),
            GoalWeight = 72.5m,
            PlannedPoundsPerWeek = 1.25m,
            DayStartOffset = -3,
            UseMetric = true,
            ShowCalories = true,
            SharingToken = "abcdefghijklmnopqrstuvwxy",
            SharingEnabled = true,
            IsMigrated = true,
            IsNewlyMigrated = true,
            HideDataBeforeStart = true,
            TrendAlgorithm = "holt-gentle",
            ApiKeyHash = "0123abcd",
            ApiKeySuffix = "wxyz",
            ApiKeyCreatedAt = "2024-02-01T12:00:00.0000000Z"
        });
    }

    [Fact]
    public async Task GetBySharingTokenAsync_ReturnsOnlyTheProfileWithThatToken()
    {
        var shared = CreateTestProfile(Guid.NewGuid(), "abcdefghijklmnopqrstuvwxy");
        _supabase.Seed(CreateTestProfile(Guid.NewGuid(), "zyxwvutsrqponmlkjihgfedcb"), shared);

        var result = await _sut.GetBySharingTokenAsync("abcdefghijklmnopqrstuvwxy");

        result.Should().BeSameAs(shared);
    }

    [Fact]
    public async Task GetBySharingTokenAsync_ReturnsNull_WhenNoProfileHasThatToken()
    {
        _supabase.Seed(CreateTestProfile(Guid.NewGuid(), "abcdefghijklmnopqrstuvwxy"), CreateTestProfile(Guid.NewGuid(), "zyxwvutsrqponmlkjihgfedcb"));

        var result = await _sut.GetBySharingTokenAsync("0000000000000000000000000");

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByApiKeyHashAsync_ReturnsOnlyTheProfileWithThatHash()
    {
        var mine = CreateTestProfile(Guid.NewGuid());
        mine.Profile.ApiKeyHash = ApiKeyService.HashKey("sk-abc");
        var other = CreateTestProfile(Guid.NewGuid());
        other.Profile.ApiKeyHash = ApiKeyService.HashKey("sk-other");
        _supabase.Seed(other, mine);

        var result = await _sut.GetByApiKeyHashAsync(ApiKeyService.HashKey("sk-abc"));

        result.Should().BeSameAs(mine);
    }

    [Fact]
    public async Task GetByApiKeyHashAsync_ReturnsNull_WhenNoProfileHasThatHash()
    {
        var mine = CreateTestProfile(Guid.NewGuid());
        mine.Profile.ApiKeyHash = ApiKeyService.HashKey("sk-abc");
        _supabase.Seed(mine, CreateTestProfile(Guid.NewGuid()));

        var result = await _sut.GetByApiKeyHashAsync(ApiKeyService.HashKey("sk-unknown"));

        result.Should().BeNull();
    }

    [Fact]
    public void GenerateShareToken_GeneratesValidToken()
    {
        var token = _sut.GenerateShareToken();

        token.Should().MatchRegex("^[0-9a-z]{25}$"); // Base36 characters only
    }

    [Fact]
    public async Task GenerateUniqueShareTokenAsync_ReturnsATokenNoStoredProfileUses()
    {
        var taken = CreateTestProfile(Guid.NewGuid(), "abcdefghijklmnopqrstuvwxy");
        _supabase.Seed(taken);

        var token = await _sut.GenerateUniqueShareTokenAsync();

        token.Should().MatchRegex("^[0-9a-z]{25}$");
        token.Should().NotBe(taken.Profile.SharingToken);
        (await _sut.GetBySharingTokenAsync(token)).Should().BeNull();
    }

    [Fact]
    public async Task GenerateNewSharingTokenAsync_ReplacesOnlyThatProfilesToken()
    {
        var userId = Guid.NewGuid();
        var profile = CreateTestProfile(userId, "abcdefghijklmnopqrstuvwxy");
        profile.UpdatedAt = OldTimestamp;
        var decoy = CreateTestProfile(Guid.NewGuid(), "zyxwvutsrqponmlkjihgfedcb");
        _supabase.Seed(profile, decoy);

        var result = await _sut.GenerateNewSharingTokenAsync(userId);

        result.Should().BeSameAs(profile);
        result!.Profile.SharingToken.Should().MatchRegex("^[0-9a-z]{25}$");
        result.Profile.SharingToken.Should().NotBe("abcdefghijklmnopqrstuvwxy");
        Parse(result.UpdatedAt).Should().BeAfter(Parse(OldTimestamp));
        decoy.Profile.SharingToken.Should().Be("zyxwvutsrqponmlkjihgfedcb");
    }

    [Fact]
    public async Task GenerateNewSharingTokenAsync_ReturnsNull_WhenTheProfileDoesNotExist()
    {
        _supabase.Seed(CreateTestProfile(Guid.NewGuid()));

        var result = await _sut.GenerateNewSharingTokenAsync(Guid.NewGuid());

        result.Should().BeNull();
        _logs.ShouldHaveLogged(LogLevel.Warning, "User document not found");
    }

    [Fact]
    public async Task CompleteMigrationAsync_ClearsIsNewlyMigratedFlag()
    {
        var userId = Guid.NewGuid();
        var profile = CreateTestProfile(userId);
        profile.Profile.IsNewlyMigrated = true;
        profile.UpdatedAt = OldTimestamp;
        _supabase.Seed(profile);

        var result = await _sut.CompleteMigrationAsync(userId);

        result.Should().BeTrue();
        profile.Profile.IsNewlyMigrated.Should().BeFalse();
        Parse(profile.UpdatedAt).Should().BeAfter(Parse(OldTimestamp));
        _logs.ShouldHaveLogged(LogLevel.Information, "Completed migration");
    }

    [Fact]
    public async Task CompleteMigrationAsync_ReturnsFalse_WhenTheProfileDoesNotExist()
    {
        var result = await _sut.CompleteMigrationAsync(Guid.NewGuid());

        result.Should().BeFalse();
        _logs.ShouldHaveLogged(LogLevel.Warning, "User document not found");
    }

    [Fact]
    public async Task DeleteAccountAsync_DeletesAllComponents()
    {
        var userId = Guid.NewGuid();
        var profile = CreateTestProfile(userId);
        var decoy = CreateTestProfile(Guid.NewGuid());
        _supabase.Seed(profile, decoy);
        _userAccountMappingServiceMock.Setup(x => x.GetByInternalIdAsync(userId))
            .ReturnsAsync(new DbUserAccount { Uid = userId, ExternalId = "clerk_123", Provider = "clerk" });
        _clerkServiceMock.Setup(x => x.DeleteUserAsync("clerk_123")).ReturnsAsync(true);
        _userAccountMappingServiceMock.Setup(x => x.DeleteByInternalIdAsync(userId)).ReturnsAsync(true);

        var result = await _sut.DeleteAccountAsync(userId);

        result.Should().BeTrue();
        _supabase.Rows<DbProfile>().Should().ContainSingle().Which.Should().BeSameAs(decoy);
        _supabase.DeletedAuthUsers.Should().Equal(userId);
        _clerkServiceMock.Verify(x => x.DeleteUserAsync("clerk_123"), Times.Once);
        _userAccountMappingServiceMock.Verify(x => x.DeleteByInternalIdAsync(userId), Times.Once);
        _logs.ShouldHaveLogged(LogLevel.Information, "Successfully completed account deletion");
    }

    [Fact]
    public async Task DeleteAccountAsync_WhenAuthDeletionFails_ContinuesWithOtherDeletions()
    {
        var userId = Guid.NewGuid();
        _supabase.Seed(CreateTestProfile(userId));
        _supabase.DeleteAuthUserResult = false;
        _userAccountMappingServiceMock.Setup(x => x.GetByInternalIdAsync(userId))
            .ReturnsAsync(new DbUserAccount { Uid = userId, ExternalId = "clerk_123", Provider = "clerk" });
        _clerkServiceMock.Setup(x => x.DeleteUserAsync("clerk_123")).ReturnsAsync(true);
        _userAccountMappingServiceMock.Setup(x => x.DeleteByInternalIdAsync(userId)).ReturnsAsync(true);

        var result = await _sut.DeleteAccountAsync(userId);

        result.Should().BeTrue();
        _supabase.DeletedAuthUsers.Should().Equal(userId);
        _supabase.Rows<DbProfile>().Should().BeEmpty();
        _clerkServiceMock.Verify(x => x.DeleteUserAsync("clerk_123"), Times.Once);
        _userAccountMappingServiceMock.Verify(x => x.DeleteByInternalIdAsync(userId), Times.Once);
        _logs.ShouldHaveLogged(LogLevel.Warning, "Could not delete legacy Supabase auth user");
    }

    [Fact]
    public async Task DeleteAccountAsync_DeletesOnlyTheLegacyRowWhoseEmailMatches()
    {
        var userId = Guid.NewGuid();
        var email = "legacy@example.com";
        var profile = CreateTestProfile(userId);
        profile.Email = email;
        _supabase.Seed(profile);
        var otherLegacy = new DbLegacyProfile { Email = "other@example.com", FirstName = "Other" };
        _supabase.Seed(
            new DbLegacyProfile
            {
                Email = email,
                FirstName = "Legacy User",
                UseMetric = true,
                Measurements = [new RawMeasurement { Date = "2024-01-01", Time = "07:00:00", Weight = 80.5m, FatRatio = 0.25m }]
            },
            otherLegacy);
        _userAccountMappingServiceMock.Setup(x => x.GetByInternalIdAsync(userId))
            .ReturnsAsync(new DbUserAccount { Uid = userId, ExternalId = "clerk_123", Provider = "clerk" });
        _clerkServiceMock.Setup(x => x.DeleteUserAsync("clerk_123")).ReturnsAsync(true);
        _userAccountMappingServiceMock.Setup(x => x.DeleteByInternalIdAsync(userId)).ReturnsAsync(true);

        var result = await _sut.DeleteAccountAsync(userId);

        result.Should().BeTrue();
        _supabase.Rows<DbLegacyProfile>().Should().ContainSingle().Which.Should().BeSameAs(otherLegacy);
        _supabase.Rows<DbProfile>().Should().BeEmpty();
        _logs.ShouldHaveLogged(LogLevel.Information, $"Deleted legacy profile for email {email}");
    }

    [Fact]
    public async Task DeleteAccountAsync_ContinuesWhenNoLegacyProfileExists()
    {
        var userId = Guid.NewGuid();
        var profile = CreateTestProfile(userId);
        profile.Email = "nolegacy@example.com";
        _supabase.Seed(profile);
        var otherLegacy = new DbLegacyProfile { Email = "other@example.com" };
        _supabase.Seed(otherLegacy);
        _userAccountMappingServiceMock.Setup(x => x.GetByInternalIdAsync(userId))
            .ReturnsAsync(new DbUserAccount { Uid = userId, ExternalId = "clerk_123", Provider = "clerk" });
        _clerkServiceMock.Setup(x => x.DeleteUserAsync("clerk_123")).ReturnsAsync(true);
        _userAccountMappingServiceMock.Setup(x => x.DeleteByInternalIdAsync(userId)).ReturnsAsync(true);

        var result = await _sut.DeleteAccountAsync(userId);

        result.Should().BeTrue();
        _supabase.Rows<DbLegacyProfile>().Should().ContainSingle().Which.Should().BeSameAs(otherLegacy);
        _supabase.Rows<DbProfile>().Should().BeEmpty();
        _logs.Entries.Should().NotContain(e => e.Message.Contains("Deleted legacy profile"));
    }

    [Fact]
    public async Task DeleteAccountAsync_PreservesProfileAndLoginWhenLegacyDeletionFails()
    {
        var userId = Guid.NewGuid();
        var email = "legacy@example.com";
        var profile = CreateTestProfile(userId);
        profile.Email = email;
        _supabase.Seed(profile);
        _supabase.Seed(new DbLegacyProfile { Email = email, FirstName = "Legacy User" });
        var failure = new Exception("Failed to delete legacy profile");
        _supabase.ThrowOnDelete = failure;
        _userAccountMappingServiceMock.Setup(x => x.GetByInternalIdAsync(userId))
            .ReturnsAsync(new DbUserAccount { Uid = userId, ExternalId = "clerk_123", Provider = "clerk" });
        _clerkServiceMock.Setup(x => x.DeleteUserAsync("clerk_123")).ReturnsAsync(true);
        _userAccountMappingServiceMock.Setup(x => x.DeleteByInternalIdAsync(userId)).ReturnsAsync(true);

        var result = await _sut.DeleteAccountAsync(userId);

        result.Should().BeFalse();
        _supabase.Rows<DbLegacyProfile>().Should().ContainSingle();
        _supabase.Rows<DbProfile>().Should().ContainSingle().Which.Should().BeSameAs(profile);
        _supabase.DeletedAuthUsers.Should().BeEmpty();
        _clerkServiceMock.Verify(x => x.DeleteUserAsync(It.IsAny<string>()), Times.Never);
        _userAccountMappingServiceMock.Verify(x => x.DeleteByInternalIdAsync(userId), Times.Never);
        _logs.Entries.Should().Contain(e =>
            e.Level == LogLevel.Error
            && e.Exception == failure
            && e.Message.Contains($"Failed to delete legacy profile for email {email}"));
    }

    [Fact]
    public async Task DeleteAccountAsync_ProfileDeletionFailurePreservesLoginAndMapping()
    {
        var userId = Guid.NewGuid();
        var profile = CreateTestProfile(userId);
        _supabase.Seed(profile);
        _supabase.Seed(new DbLegacyProfile { Email = "other@example.com" }); // no legacy row for this user
        _supabase.ThrowOnDelete = new Exception("Database unavailable");
        _userAccountMappingServiceMock.Setup(x => x.GetByInternalIdAsync(userId))
            .ReturnsAsync(new DbUserAccount { Uid = userId, ExternalId = "clerk_123", Provider = "clerk" });

        var result = await _sut.DeleteAccountAsync(userId);

        result.Should().BeFalse();
        _supabase.Rows<DbProfile>().Should().ContainSingle().Which.Should().BeSameAs(profile);
        _supabase.DeletedAuthUsers.Should().BeEmpty();
        _clerkServiceMock.Verify(x => x.DeleteUserAsync(It.IsAny<string>()), Times.Never);
        _userAccountMappingServiceMock.Verify(x => x.DeleteByInternalIdAsync(userId), Times.Never);
        _logs.ShouldHaveLogged(LogLevel.Error, "Error deleting account");
    }

    [Fact]
    public async Task DeleteAccountAsync_ClerkFailureReturnsFalseAndRetainsMappingForRetry()
    {
        var userId = Guid.NewGuid();
        _supabase.Seed(CreateTestProfile(userId));
        _userAccountMappingServiceMock.Setup(x => x.GetByInternalIdAsync(userId))
            .ReturnsAsync(new DbUserAccount { Uid = userId, ExternalId = "clerk_123", Provider = "clerk" });
        _clerkServiceMock.Setup(x => x.DeleteUserAsync("clerk_123")).ReturnsAsync(false);

        var result = await _sut.DeleteAccountAsync(userId);

        result.Should().BeFalse();
        _supabase.Rows<DbProfile>().Should().BeEmpty();
        _supabase.DeletedAuthUsers.Should().BeEmpty();
        _userAccountMappingServiceMock.Verify(x => x.DeleteByInternalIdAsync(userId), Times.Never);
        _logs.ShouldHaveLogged(LogLevel.Error, "Failed to delete Clerk user");
    }

    [Fact]
    public async Task DeleteAccountAsync_MappingDeletionFailureReturnsFalse()
    {
        var userId = Guid.NewGuid();
        _supabase.Seed(CreateTestProfile(userId));
        _userAccountMappingServiceMock.Setup(x => x.GetByInternalIdAsync(userId))
            .ReturnsAsync(new DbUserAccount { Uid = userId, ExternalId = "clerk_123", Provider = "clerk" });
        _clerkServiceMock.Setup(x => x.DeleteUserAsync("clerk_123")).ReturnsAsync(true);
        _userAccountMappingServiceMock.Setup(x => x.DeleteByInternalIdAsync(userId)).ReturnsAsync(false);

        var result = await _sut.DeleteAccountAsync(userId);

        result.Should().BeFalse();
        _logs.ShouldHaveLogged(LogLevel.Error, "Failed to delete user_accounts record");
    }

    [Fact]
    public async Task DeleteAccountAsync_WithoutAMapping_StillDeletesProfileAndAuthUser()
    {
        var userId = Guid.NewGuid();
        _supabase.Seed(CreateTestProfile(userId));
        _userAccountMappingServiceMock.Setup(x => x.GetByInternalIdAsync(userId)).ReturnsAsync((DbUserAccount?)null);

        var result = await _sut.DeleteAccountAsync(userId);

        result.Should().BeTrue();
        _supabase.Rows<DbProfile>().Should().BeEmpty();
        _supabase.DeletedAuthUsers.Should().Equal(userId);
        _clerkServiceMock.Verify(x => x.DeleteUserAsync(It.IsAny<string>()), Times.Never);
        _userAccountMappingServiceMock.Verify(x => x.DeleteByInternalIdAsync(It.IsAny<Guid>()), Times.Never);
        _logs.ShouldHaveLogged(LogLevel.Information, "No user_accounts record found");
    }

    /// <summary>
    /// Deserialises a row the way the Postgrest client does: Newtonsoft.Json with the
    /// <see cref="PostgrestContractResolver"/> that maps <c>[Column]</c> names.
    /// </summary>
    private static DbProfile DeserialiseLikePostgrest(string json)
    {
        var settings = Client.SerializerSettings(new ClientOptions());
        return JsonConvert.DeserializeObject<DbProfile>(json, settings)!;
    }

    private static DateTime Parse(string timestamp)
    {
        return DateTime.Parse(timestamp, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind).ToUniversalTime();
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
