using System.Globalization;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using TrendWeight.Features.ProviderLinks.Services;
using TrendWeight.Infrastructure.DataAccess.Models;
using TrendWeight.Tests.Fixtures;

namespace TrendWeight.Tests.Features.ProviderLinks.Services;

public class ProviderLinkServiceTests
{
    private static readonly Guid Me = Guid.NewGuid();
    private static readonly Guid Other = Guid.NewGuid();

    private readonly FakeSupabaseService _supabase = new();
    private readonly CapturingLoggerProvider _logs = new();
    private readonly ProviderLinkService _sut;

    public ProviderLinkServiceTests()
    {
        _sut = new ProviderLinkService(_supabase, _logs.CreateLogger<ProviderLinkService>());
    }

    [Fact]
    public async Task StoreProviderLinkAsync_WhenReadFails_DoesNotInsertDuplicateLink()
    {
        _supabase.Seed(CreateTestProviderLink(Me, "withings"));
        _supabase.ThrowOnQuery = new HttpRequestException("Database unavailable");

        var act = () => _sut.StoreProviderLinkAsync(Me, "withings", new Dictionary<string, object>());

        await act.Should().ThrowAsync<HttpRequestException>();
        _supabase.Rows<DbProviderLink>().Should().ContainSingle();
    }

    [Fact]
    public async Task GetProviderLinkAsync_ReturnsOnlyTheRowForThatUserAndProvider()
    {
        var mine = CreateTestProviderLink(Me, "withings");
        _supabase.Seed(CreateTestProviderLink(Me, "legacy"), CreateTestProviderLink(Other, "withings"), mine);

        var result = await _sut.GetProviderLinkAsync(Me, "withings");

        result.Should().BeSameAs(mine);
    }

    [Fact]
    public async Task GetProviderLinkAsync_ReturnsNull_WhenOnlyDecoysExist()
    {
        _supabase.Seed(CreateTestProviderLink(Me, "legacy"), CreateTestProviderLink(Other, "withings"));

        var result = await _sut.GetProviderLinkAsync(Me, "withings");

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetProviderLinkAsync_PropagatesDatabaseFailure()
    {
        var failure = new Exception("Database error");
        _supabase.ThrowOnQuery = failure;

        var act = () => _sut.GetProviderLinkAsync(Me, "withings");

        await act.Should().ThrowAsync<Exception>().WithMessage("Database error");
        _logs.Entries.Should().ContainSingle(e => e.Level == LogLevel.Error)
            .Which.Should().Match<CapturingLoggerProvider.LogEntry>(e =>
                e.Exception == failure && e.Message.Contains("Error getting provider link"));
    }

    [Fact]
    public async Task GetAllForUserAsync_ReturnsOnlyThatUsersLinks()
    {
        var withings = CreateTestProviderLink(Me, "withings");
        var legacy = CreateTestProviderLink(Me, "legacy");
        _supabase.Seed(withings, CreateTestProviderLink(Other, "withings"), legacy);

        var result = await _sut.GetAllForUserAsync(Me);

        result.Should().HaveCount(2);
        result.Should().Contain(withings).And.Contain(legacy);
        result.Should().OnlyContain(x => x.Uid == Me);
    }

    [Fact]
    public async Task GetAllForUserAsync_PropagatesDatabaseFailure()
    {
        var failure = new Exception("Database error");
        _supabase.ThrowOnQuery = failure;

        var act = () => _sut.GetAllForUserAsync(Me);

        await act.Should().ThrowAsync<Exception>().WithMessage("Database error");
        _logs.Entries.Should().ContainSingle(e => e.Level == LogLevel.Error)
            .Which.Should().Match<CapturingLoggerProvider.LogEntry>(e =>
                e.Exception == failure && e.Message.Contains("Error getting provider links"));
    }

    [Fact]
    public async Task CreateAsync_StampsUpdatedAtAndPersistsTheRow()
    {
        var link = CreateTestProviderLink(Me, "withings");
        link.UpdatedAt = null!;

        var result = await _sut.CreateAsync(link);

        result.Should().BeSameAs(link);
        _supabase.Rows<DbProviderLink>().Should().ContainSingle().Which.Should().BeSameAs(link);
        Parse(result.UpdatedAt).Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task CreateAsync_SetsCreatedAt_WhenMissing()
    {
        var link = CreateTestProviderLink(Me, "withings");
        link.CreatedAt = null;

        var result = await _sut.CreateAsync(link);

        Parse(result.CreatedAt!).Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task CreateAsync_KeepsAnExistingCreatedAt()
    {
        var link = CreateTestProviderLink(Me, "withings");
        var connectedAt = DateTime.UtcNow.AddDays(-30).ToString("o");
        link.CreatedAt = connectedAt;

        var result = await _sut.CreateAsync(link);

        result.CreatedAt.Should().Be(connectedAt);
    }

    [Fact]
    public async Task StoreProviderLinkAsync_OnTokenRefresh_AdvancesUpdatedAtAndPreservesCreatedAt()
    {
        // An existing link whose token is being replaced by a refresh
        var connectedAt = DateTime.UtcNow.AddDays(-30).ToString("o");
        var previousUpdatedAt = DateTime.UtcNow.AddHours(-3).ToString("o");
        var existing = CreateTestProviderLink(Me, "withings");
        existing.CreatedAt = connectedAt;
        existing.UpdatedAt = previousUpdatedAt;
        _supabase.Seed(existing, CreateTestProviderLink(Other, "withings"));

        await _sut.StoreProviderLinkAsync(Me, "withings", new Dictionary<string, object> { { "access_token", "rotated" } });

        existing.CreatedAt.Should().Be(connectedAt);
        Parse(existing.UpdatedAt).Should().BeAfter(Parse(previousUpdatedAt));
        Parse(existing.UpdatedAt).Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        _supabase.Rows<DbProviderLink>().Should().HaveCount(2);
    }

    [Fact]
    public async Task UpdateAsync_AdvancesUpdatedAtAndReplacesTheStoredRow()
    {
        var link = CreateTestProviderLink(Me, "withings");
        var previousUpdatedAt = DateTime.UtcNow.AddDays(-1).ToString("o");
        link.UpdatedAt = previousUpdatedAt;
        _supabase.Seed(link);

        var result = await _sut.UpdateAsync(link);

        Parse(result.UpdatedAt).Should().BeAfter(Parse(previousUpdatedAt));
        Parse(result.UpdatedAt).Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        _supabase.Rows<DbProviderLink>().Should().ContainSingle().Which.Should().BeSameAs(link);
    }

    [Fact]
    public async Task RemoveProviderLinkAsync_DeletesOnlyThatRow()
    {
        var myLegacy = CreateTestProviderLink(Me, "legacy");
        var otherWithings = CreateTestProviderLink(Other, "withings");
        _supabase.Seed(CreateTestProviderLink(Me, "withings"), myLegacy, otherWithings);

        await _sut.RemoveProviderLinkAsync(Me, "withings");

        _supabase.Rows<DbProviderLink>().Should().BeEquivalentTo(new[] { myLegacy, otherWithings });
    }

    [Fact]
    public async Task RemoveProviderLinkAsync_DoesNothing_WhenNoRowMatches()
    {
        var myLegacy = CreateTestProviderLink(Me, "legacy");
        var otherWithings = CreateTestProviderLink(Other, "withings");
        _supabase.Seed(myLegacy, otherWithings);

        await _sut.RemoveProviderLinkAsync(Me, "withings");

        _supabase.Rows<DbProviderLink>().Should().BeEquivalentTo(new[] { myLegacy, otherWithings });
    }

    [Fact]
    public async Task StoreProviderLinkAsync_UpdatesTheExistingRowInPlace()
    {
        var existing = CreateTestProviderLink(Me, "withings");
        var myLegacy = CreateTestProviderLink(Me, "legacy");
        var otherWithings = CreateTestProviderLink(Other, "withings");
        _supabase.Seed(existing, myLegacy, otherWithings);
        var newToken = new Dictionary<string, object> { { "access_token", "new_token" } };

        await _sut.StoreProviderLinkAsync(Me, "withings", newToken, "Token refresh");

        var rows = _supabase.Rows<DbProviderLink>();
        rows.Should().HaveCount(3);
        rows.Should().Contain(existing);
        existing.Token.Should().BeSameAs(newToken);
        existing.UpdateReason.Should().Be("Token refresh");
        myLegacy.Token.Should().ContainKey("refresh_token");
        otherWithings.Token.Should().ContainKey("refresh_token");
    }

    [Fact]
    public async Task StoreProviderLinkAsync_InsertsANewRow_WhenNoneExists()
    {
        _supabase.Seed(CreateTestProviderLink(Me, "legacy"), CreateTestProviderLink(Other, "withings"));
        var token = new Dictionary<string, object> { { "access_token", "new_token" } };

        await _sut.StoreProviderLinkAsync(Me, "withings", token, "Initial auth");

        var rows = _supabase.Rows<DbProviderLink>();
        rows.Should().HaveCount(3);
        var created = rows.Should().ContainSingle(r => r.Uid == Me && r.Provider == "withings").Which;
        created.Token.Should().BeSameAs(token);
        created.UpdateReason.Should().Be("Initial auth");
        Parse(created.CreatedAt!).Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        Parse(created.UpdatedAt).Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    private static DateTime Parse(string timestamp)
    {
        return DateTime.Parse(timestamp, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind).ToUniversalTime();
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
