using System.Globalization;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Supabase.Postgrest.Exceptions;
using TrendWeight.Infrastructure.Auth;
using TrendWeight.Infrastructure.DataAccess.Models;
using TrendWeight.Tests.Fixtures;

namespace TrendWeight.Tests.Infrastructure.Auth;

public class UserAccountMappingServiceTests
{
    private readonly FakeSupabaseService _supabase = new();
    private readonly CapturingLoggerProvider _logs = new();
    private readonly UserAccountMappingService _sut;

    public UserAccountMappingServiceTests()
    {
        _sut = new UserAccountMappingService(_supabase, _logs.CreateLogger<UserAccountMappingService>());
    }

    [Fact]
    public async Task GetByExternalIdAsync_ReturnsOnlyTheRowMatchingBothExternalIdAndProvider()
    {
        var mine = new DbUserAccount { Uid = Guid.NewGuid(), ExternalId = "clerk_123", Provider = "clerk" };
        // Decoys come first so a missing filter cannot be hidden by Limit(1).
        _supabase.Seed(
            new DbUserAccount { Uid = Guid.NewGuid(), ExternalId = "clerk_123", Provider = "google" },
            new DbUserAccount { Uid = Guid.NewGuid(), ExternalId = "clerk_999", Provider = "clerk" },
            mine);

        var result = await _sut.GetByExternalIdAsync("clerk_123", "clerk");

        result.Should().BeSameAs(mine);
    }

    [Fact]
    public async Task GetByExternalIdAsync_ReturnsNull_WhenOnlyOtherProvidersOrIdsMatch()
    {
        _supabase.Seed(
            new DbUserAccount { Uid = Guid.NewGuid(), ExternalId = "clerk_123", Provider = "google" },
            new DbUserAccount { Uid = Guid.NewGuid(), ExternalId = "clerk_999", Provider = "clerk" });

        var result = await _sut.GetByExternalIdAsync("clerk_123", "clerk");

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByInternalIdAsync_ReturnsTheRowWithThatUid()
    {
        var mine = new DbUserAccount { Uid = Guid.NewGuid(), ExternalId = "clerk_123", Provider = "clerk" };
        _supabase.Seed(mine, new DbUserAccount { Uid = Guid.NewGuid(), ExternalId = "clerk_999", Provider = "clerk" });

        var result = await _sut.GetByInternalIdAsync(mine.Uid);

        result.Should().BeSameAs(mine);
    }

    [Fact]
    public async Task CreateMappingAsync_CreatesAFreshUid_WhenNoProfileHasThatEmail()
    {
        var otherProfile = new DbProfile { Uid = Guid.NewGuid(), Email = "someone-else@example.com" };
        _supabase.Seed(otherProfile);

        var result = await _sut.CreateMappingAsync("clerk_123", "test@example.com", "clerk");

        var stored = _supabase.Rows<DbUserAccount>().Should().ContainSingle().Which;
        stored.Should().BeSameAs(result);
        stored.ExternalId.Should().Be("clerk_123");
        stored.Provider.Should().Be("clerk");
        stored.Uid.Should().NotBeEmpty();
        stored.Uid.Should().NotBe(otherProfile.Uid);
        stored.CreatedAt.Should().MatchRegex(@"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$");
        stored.UpdatedAt.Should().Be(stored.CreatedAt);
        DateTime.Parse(stored.CreatedAt, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal)
            .Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        _logs.ShouldHaveLogged(LogLevel.Information, "Created user account mapping");
    }

    [Fact]
    public async Task CreateMappingAsync_AdoptsTheUidOfTheProfileWhoseEmailMatches()
    {
        var matching = new DbProfile { Uid = Guid.NewGuid(), Email = "test@example.com" };
        var other = new DbProfile { Uid = Guid.NewGuid(), Email = "other@example.com" };
        _supabase.Seed(other, matching);

        var result = await _sut.CreateMappingAsync("clerk_123", "test@example.com", "clerk");

        result.Uid.Should().Be(matching.Uid);
        result.ExternalId.Should().Be("clerk_123");
        result.Provider.Should().Be("clerk");
        _supabase.Rows<DbUserAccount>().Should().ContainSingle().Which.Should().BeSameAs(result);
    }

    [Fact]
    public async Task CreateMappingAsync_CreatesNewUid_WhenTheProfileBelongsToADifferentExternalUser()
    {
        var existingProfile = new DbProfile { Uid = Guid.NewGuid(), Email = "test@example.com" };
        var existingAccount = new DbUserAccount { Uid = existingProfile.Uid, ExternalId = "different_clerk_456", Provider = "clerk" };
        _supabase.Seed(existingProfile);
        _supabase.Seed(existingAccount);

        var result = await _sut.CreateMappingAsync("clerk_123", "test@example.com", "clerk");

        result.Uid.Should().NotBe(existingProfile.Uid);
        result.ExternalId.Should().Be("clerk_123");
        result.Provider.Should().Be("clerk");

        // The other user's mapping must not be hijacked.
        var rows = _supabase.Rows<DbUserAccount>();
        rows.Should().HaveCount(2);
        rows.Should().Contain(existingAccount);
        existingAccount.ExternalId.Should().Be("different_clerk_456");

        _logs.ShouldHaveLogged(LogLevel.Warning, "already associated with a different user account");
    }

    [Fact]
    public async Task CreateMappingAsync_CreatesNewUid_WhenTheProfileIsMappedThroughAnotherProvider()
    {
        var existingProfile = new DbProfile { Uid = Guid.NewGuid(), Email = "test@example.com" };
        _supabase.Seed(existingProfile);
        _supabase.Seed(new DbUserAccount { Uid = existingProfile.Uid, ExternalId = "clerk_123", Provider = "google" });

        var result = await _sut.CreateMappingAsync("clerk_123", "test@example.com", "clerk");

        result.Uid.Should().NotBe(existingProfile.Uid);
        _supabase.Rows<DbUserAccount>().Should().HaveCount(2);
        _logs.ShouldHaveLogged(LogLevel.Warning, "already associated with a different user account");
    }

    [Fact]
    public async Task CreateMappingAsync_ReturnsTheExistingMapping_WhenItAlreadyBelongsToThisUser()
    {
        var existingProfile = new DbProfile { Uid = Guid.NewGuid(), Email = "test@example.com" };
        var existingAccount = new DbUserAccount { Uid = existingProfile.Uid, ExternalId = "clerk_123", Provider = "clerk" };
        _supabase.Seed(existingProfile);
        _supabase.Seed(existingAccount);

        var result = await _sut.CreateMappingAsync("clerk_123", "test@example.com", "clerk");

        result.Should().BeSameAs(existingAccount);
        _supabase.Rows<DbUserAccount>().Should().ContainSingle();
        _logs.ShouldNotHaveLogged(LogLevel.Warning);
    }

    [Fact]
    public async Task CreateMappingAsync_AdoptsTheWinningRow_WhenAConcurrentSignInInsertedFirst()
    {
        // A parallel first request won the (external_id, provider) unique constraint;
        // by the time this insert fails, its row is already in the table.
        var winner = new DbUserAccount { Uid = Guid.NewGuid(), ExternalId = "clerk_123", Provider = "clerk" };
        _supabase.Seed(new DbUserAccount { Uid = Guid.NewGuid(), ExternalId = "clerk_123", Provider = "google" }, winner);
        _supabase.ThrowOnInsert = FakeSupabaseService.UniqueViolation();

        var result = await _sut.CreateMappingAsync("clerk_123", "test@example.com", "clerk");

        result.Should().BeSameAs(winner);
        _supabase.Rows<DbUserAccount>().Should().HaveCount(2);
        _logs.ShouldHaveLogged(LogLevel.Information, "Concurrent sign-in already created the user account mapping");
    }

    [Fact]
    public async Task CreateMappingAsync_Rethrows_WhenAUniqueViolationHasNoMatchingMapping()
    {
        // Only a different provider's row exists, so there is nothing to adopt.
        _supabase.Seed(new DbUserAccount { Uid = Guid.NewGuid(), ExternalId = "clerk_123", Provider = "google" });
        _supabase.ThrowOnInsert = FakeSupabaseService.UniqueViolation();

        var act = () => _sut.CreateMappingAsync("clerk_123", "test@example.com", "clerk");

        await act.Should().ThrowAsync<PostgrestException>();
    }

    [Fact]
    public async Task CreateMappingAsync_Rethrows_WhenTheInsertFailsForAnotherReason()
    {
        _supabase.Seed(new DbUserAccount { Uid = Guid.NewGuid(), ExternalId = "clerk_123", Provider = "clerk" });
        _supabase.ThrowOnInsert = new HttpRequestException("Database unavailable");

        var act = () => _sut.CreateMappingAsync("clerk_123", "test@example.com", "clerk");

        await act.Should().ThrowAsync<HttpRequestException>();
    }

    [Fact]
    public async Task GetOrCreateMappingAsync_ReturnsExisting_WithoutInserting()
    {
        var existing = new DbUserAccount { Uid = Guid.NewGuid(), ExternalId = "clerk_123", Provider = "clerk" };
        _supabase.Seed(new DbUserAccount { Uid = Guid.NewGuid(), ExternalId = "clerk_123", Provider = "google" }, existing);

        var result = await _sut.GetOrCreateMappingAsync("clerk_123", "test@example.com", "clerk");

        result.Should().BeSameAs(existing);
        _supabase.Rows<DbUserAccount>().Should().HaveCount(2);
    }

    [Fact]
    public async Task GetOrCreateMappingAsync_Creates_WhenOnlyAnotherProviderHasThatExternalId()
    {
        var google = new DbUserAccount { Uid = Guid.NewGuid(), ExternalId = "clerk_123", Provider = "google" };
        _supabase.Seed(google);

        var result = await _sut.GetOrCreateMappingAsync("clerk_123", "test@example.com", "clerk");

        result.Should().NotBeSameAs(google);
        result.Provider.Should().Be("clerk");
        _supabase.Rows<DbUserAccount>().Should().HaveCount(2).And.Contain(result);
    }

    [Fact]
    public async Task DeleteByInternalIdAsync_DeletesOnlyThatUserAccount()
    {
        var mine = new DbUserAccount { Uid = Guid.NewGuid(), ExternalId = "clerk_123", Provider = "clerk" };
        var other = new DbUserAccount { Uid = Guid.NewGuid(), ExternalId = "clerk_999", Provider = "clerk" };
        _supabase.Seed(mine, other);

        var result = await _sut.DeleteByInternalIdAsync(mine.Uid);

        result.Should().BeTrue();
        _supabase.Rows<DbUserAccount>().Should().ContainSingle().Which.Should().BeSameAs(other);
        _logs.ShouldHaveLogged(LogLevel.Information, "Deleted user account");
    }

    [Fact]
    public async Task DeleteByInternalIdAsync_ReturnsFalse_WhenNotFound()
    {
        var other = new DbUserAccount { Uid = Guid.NewGuid(), ExternalId = "clerk_999", Provider = "clerk" };
        _supabase.Seed(other);

        var result = await _sut.DeleteByInternalIdAsync(Guid.NewGuid());

        result.Should().BeFalse();
        _supabase.Rows<DbUserAccount>().Should().ContainSingle().Which.Should().BeSameAs(other);
        _logs.ShouldHaveLogged(LogLevel.Warning, "No user account found to delete");
    }

    [Fact]
    public async Task DeleteByInternalIdAsync_LogsAndRethrows_WhenTheDeleteFails()
    {
        var mine = new DbUserAccount { Uid = Guid.NewGuid(), ExternalId = "clerk_123", Provider = "clerk" };
        _supabase.Seed(mine);
        var failure = new HttpRequestException("Database unavailable");
        _supabase.ThrowOnDelete = failure;

        var act = () => _sut.DeleteByInternalIdAsync(mine.Uid);

        await act.Should().ThrowAsync<HttpRequestException>();
        _supabase.Rows<DbUserAccount>().Should().ContainSingle();
        _logs.Entries.Should().Contain(e => e.Level == LogLevel.Error && e.Exception == failure && e.Message.Contains("Error deleting user account"));
    }
}
