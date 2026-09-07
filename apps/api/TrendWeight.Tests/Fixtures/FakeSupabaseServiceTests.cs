using System.Net;
using FluentAssertions;
using Supabase.Postgrest.Exceptions;
using TrendWeight.Features.Profile.Models;
using TrendWeight.Infrastructure.DataAccess.Models;
using static Supabase.Postgrest.Constants;

namespace TrendWeight.Tests.Fixtures;

public class FakeSupabaseServiceTests
{
    private static readonly Guid Me = Guid.NewGuid();
    private static readonly Guid Other = Guid.NewGuid();

    private readonly FakeSupabaseService _sut = new();

    [Fact]
    public async Task QueryAsync_Where_EvaluatesACapturedClosureAgainstEveryRow()
    {
        var mine = new DbUserAccount { Uid = Me, ExternalId = "clerk_123", Provider = "clerk" };
        _sut.Seed(
            mine,
            new DbUserAccount { Uid = Other, ExternalId = "clerk_123", Provider = "google" },
            new DbUserAccount { Uid = Guid.NewGuid(), ExternalId = "clerk_999", Provider = "clerk" });
        var externalId = "clerk_123";
        var provider = "clerk";

        var result = await _sut.QueryAsync<DbUserAccount>(q =>
            q.Where(x => x.ExternalId == externalId).Where(x => x.Provider == provider));

        result.Should().ContainSingle().Which.Should().BeSameAs(mine);
    }

    [Fact]
    public async Task QueryAsync_FilterEquals_MatchesAGuidColumnAgainstItsStringForm()
    {
        var mine = new DbProviderLink { Uid = Me, Provider = "withings" };
        _sut.Seed(mine, new DbProviderLink { Uid = Other, Provider = "withings" });

        var result = await _sut.QueryAsync<DbProviderLink>(q =>
            q.Filter("uid", Operator.Equals, Me.ToString()));

        result.Should().ContainSingle().Which.Should().BeSameAs(mine);
    }

    [Fact]
    public async Task QueryAsync_FilterIn_AcceptsAListOfObjects()
    {
        var withings = new DbSourceData { Uid = Me, Provider = "withings" };
        var legacy = new DbSourceData { Uid = Me, Provider = "legacy" };
        _sut.Seed(
            withings,
            legacy,
            new DbSourceData { Uid = Me, Provider = "fitbit" },
            new DbSourceData { Uid = Other, Provider = "withings" });

        var result = await _sut.QueryAsync<DbSourceData>(q =>
            q.Filter("uid", Operator.Equals, Me.ToString())
             .Filter("provider", Operator.In, new List<object> { "withings", "legacy" }));

        result.Should().BeEquivalentTo(new[] { withings, legacy }, options => options.WithStrictOrdering());
        result.Should().OnlyContain(row => row.Uid == Me);
    }

    [Fact]
    public async Task QueryAsync_FilterEquals_ResolvesAJsonPathIntoProfileData()
    {
        var shared = new DbProfile { Uid = Me, Profile = new ProfileData { SharingToken = "abc123" } };
        _sut.Seed(shared, new DbProfile { Uid = Other, Profile = new ProfileData { SharingToken = "xyz789" } });

        var result = await _sut.QueryAsync<DbProfile>(q =>
            q.Filter("profile->>SharingToken", Operator.Equals, "abc123"));

        result.Should().ContainSingle().Which.Should().BeSameAs(shared);
    }

    [Fact]
    public async Task QueryAsync_FilterEquals_ComparesOrdinally()
    {
        _sut.Seed(new DbProfile { Uid = Me, Profile = new ProfileData { ApiKeyHash = "ABC" } });

        var result = await _sut.QueryAsync<DbProfile>(q =>
            q.Filter("profile->>ApiKeyHash", Operator.Equals, "abc"));

        result.Should().BeEmpty();
    }

    [Fact]
    public async Task QueryAsync_Limit_TakesTheFirstMatchingRows()
    {
        _sut.Seed(
            new DbProfile { Uid = Guid.NewGuid(), Email = "dup@example.com" },
            new DbProfile { Uid = Guid.NewGuid(), Email = "dup@example.com" },
            new DbProfile { Uid = Guid.NewGuid(), Email = "other@example.com" });

        var result = await _sut.QueryAsync<DbProfile>(q => q.Where(x => x.Email == "dup@example.com").Limit(1));

        result.Should().ContainSingle().Which.Email.Should().Be("dup@example.com");
    }

    [Fact]
    public async Task UpdateAsync_ReplacesOnlyTheRowWithTheSameCompositeKey()
    {
        var decoy = new DbSourceData { Uid = Me, Provider = "legacy", LastSync = "old" };
        _sut.Seed(new DbSourceData { Uid = Me, Provider = "withings", LastSync = "old" }, decoy);
        var replacement = new DbSourceData { Uid = Me, Provider = "withings", LastSync = "new" };

        var returned = await _sut.UpdateAsync(replacement);

        returned.Should().BeSameAs(replacement);
        var rows = _sut.Rows<DbSourceData>();
        rows.Should().HaveCount(2);
        rows.Single(r => r.Provider == "withings").Should().BeSameAs(replacement);
        rows.Single(r => r.Provider == "legacy").Should().BeSameAs(decoy);
        decoy.LastSync.Should().Be("old");
    }

    [Fact]
    public async Task UpdateAsync_Throws_WhenNoRowHasThatKey()
    {
        _sut.Seed(new DbSourceData { Uid = Me, Provider = "withings" });

        var act = () => _sut.UpdateAsync(new DbSourceData { Uid = Me, Provider = "fitbit" });

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task DeleteAsync_RemovesOnlyTheRowWithTheSameCompositeKey()
    {
        var decoy = new DbSourceData { Uid = Me, Provider = "legacy" };
        var otherUser = new DbSourceData { Uid = Other, Provider = "withings" };
        _sut.Seed(new DbSourceData { Uid = Me, Provider = "withings" }, decoy, otherUser);

        await _sut.DeleteAsync(new DbSourceData { Uid = Me, Provider = "withings" });
        await _sut.DeleteAsync(new DbSourceData { Uid = Me, Provider = "missing" });

        _sut.Rows<DbSourceData>().Should().BeEquivalentTo(new[] { decoy, otherUser });
    }

    [Fact]
    public async Task InsertAsync_AddsTheInstanceAndReturnsIt()
    {
        var row = new DbUserAccount { Uid = Me, ExternalId = "clerk_123", Provider = "clerk" };

        var returned = await _sut.InsertAsync(row);

        returned.Should().BeSameAs(row);
        _sut.Rows<DbUserAccount>().Should().ContainSingle().Which.Should().BeSameAs(row);
    }

    [Fact]
    public async Task InsertAsync_ThrowsAUniqueViolation_WhenThePrimaryKeyAlreadyExists()
    {
        _sut.Seed(new DbUserAccount { Uid = Me, ExternalId = "clerk_123", Provider = "clerk" });

        var act = () => _sut.InsertAsync(new DbUserAccount { Uid = Me, ExternalId = "clerk_999", Provider = "google" });

        // Same check as UserAccountMappingService.IsUniqueViolation.
        var thrown = await act.Should().ThrowAsync<PostgrestException>();
        var exception = thrown.Which;
        (exception.Reason == FailureHint.Reason.UniquenessViolation || exception.StatusCode == (int)HttpStatusCode.Conflict)
            .Should().BeTrue();
        _sut.Rows<DbUserAccount>().Should().ContainSingle().Which.ExternalId.Should().Be("clerk_123");
    }

    [Fact]
    public async Task QueryAsync_Throws_ForAnUnsupportedTableMember()
    {
        var act = () => _sut.QueryAsync<DbProfile>(q => q.Order("uid", Ordering.Ascending));

        await act.Should().ThrowAsync<NotSupportedException>().WithMessage("*Order*");
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsTheRow_WhenExactlyOneMatches()
    {
        var mine = new DbProfile { Uid = Me, Email = "me@example.com" };
        _sut.Seed(mine, new DbProfile { Uid = Other, Email = "other@example.com" });

        var result = await _sut.GetByIdAsync<DbProfile>(Me);

        result.Should().BeSameAs(mine);
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsNull_WhenNoRowMatches()
    {
        _sut.Seed(new DbProfile { Uid = Other });

        var result = await _sut.GetByIdAsync<DbProfile>(Me);

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsNull_WhenTheUidIsAmbiguous()
    {
        // Composite-key tables can hold several rows per uid; production treats that as an error.
        _sut.Seed(new DbSourceData { Uid = Me, Provider = "withings" }, new DbSourceData { Uid = Me, Provider = "legacy" });

        var result = await _sut.GetByIdAsync<DbSourceData>(Me);

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByIdAsync_Throws_ForATableWithoutAUidColumn()
    {
        var act = () => _sut.GetByIdAsync<DbLegacyProfile>(Me);

        await act.Should().ThrowAsync<NotSupportedException>();
    }

    [Fact]
    public async Task ThrowOnQuery_SurfacesFromQueryAsync()
    {
        _sut.ThrowOnQuery = new TimeoutException("db down");

        var act = () => _sut.QueryAsync<DbProfile>(q => q.Where(x => x.Email == "x"));

        await act.Should().ThrowAsync<TimeoutException>().WithMessage("db down");
    }

    [Fact]
    public async Task DeleteAuthUserAsync_RecordsTheIdAndReturnsTheConfiguredResult()
    {
        _sut.DeleteAuthUserResult = false;

        var result = await _sut.DeleteAuthUserAsync(Me);

        result.Should().BeFalse();
        _sut.DeletedAuthUsers.Should().Equal(Me);
    }

    [Fact]
    public async Task BroadcastAsync_RecordsTheMessage()
    {
        var payload = new { Hello = "world" };

        var result = await _sut.BroadcastAsync("topic", "event", payload);

        result.Should().BeTrue();
        _sut.Broadcasts.Should().ContainSingle().Which.Should().Be(("topic", "event", (object)payload));
    }

    [Fact]
    public void Seed_Throws_OnADuplicatePrimaryKey()
    {
        var act = () => _sut.Seed(
            new DbProviderLink { Uid = Me, Provider = "withings" },
            new DbProviderLink { Uid = Me, Provider = "withings" });

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public async Task ConcurrentInserts_LetExactlyOneRowThrough()
    {
        var attempts = Enumerable.Range(0, 20)
            .Select(_ => Task.Run(async () =>
            {
                try
                {
                    await _sut.InsertAsync(new DbUserAccount { Uid = Me, ExternalId = "clerk_123", Provider = "clerk" });
                    return true;
                }
                catch (PostgrestException)
                {
                    return false;
                }
            }, TestContext.Current.CancellationToken));

        var outcomes = await Task.WhenAll(attempts);

        outcomes.Count(won => won).Should().Be(1);
        _sut.Rows<DbUserAccount>().Should().ContainSingle();
    }
}
