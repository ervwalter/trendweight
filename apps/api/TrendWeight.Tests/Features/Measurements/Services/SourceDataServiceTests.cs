using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using System.Globalization;
using TrendWeight.Features.Measurements;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Infrastructure.DataAccess.Models;
using TrendWeight.Tests.Fixtures;
using Xunit;

namespace TrendWeight.Tests.Features.Measurements.Services;

public class SourceDataServiceTests
{
    private static readonly Guid Me = Guid.NewGuid();
    private static readonly Guid Other = Guid.NewGuid();
    private static readonly DateTime FixedLastSync = new(2024, 1, 15, 9, 30, 0, DateTimeKind.Utc);
    private const string OldUpdatedAt = "2024-01-01T00:00:00.0000000Z";

    private readonly FakeSupabaseService _database = new();
    private readonly SourceDataService _sut;

    public SourceDataServiceTests()
    {
        _sut = new SourceDataService(_database, NullLogger<SourceDataService>.Instance);
    }

    #region UpdateSourceDataAsync

    [Fact]
    public async Task UpdateSourceDataAsync_WithNewProvider_CreatesNewRecord()
    {
        var sourceData = CreateTestSourceData("withings");

        await _sut.UpdateSourceDataAsync(Me, new List<SourceData> { sourceData });

        var row = _database.Rows<DbSourceData>().Should().ContainSingle().Subject;
        row.Uid.Should().Be(Me);
        row.Provider.Should().Be("withings");
        row.Measurements.Should().Equal(sourceData.Measurements!);
        row.LastSync.Should().Be(sourceData.LastUpdate.ToString("o"));
        row.ForceFullSync.Should().BeFalse();
        DateTime.Parse(row.UpdatedAt, null, DateTimeStyles.RoundtripKind)
            .Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
    }

    [Fact]
    public async Task UpdateSourceDataAsync_ReplacementClearsFullSyncFlagInSameWrite()
    {
        var existing = Row(Me, "withings", forceFullSync: true);
        _database.Seed(existing);
        var replacement = CreateTestSourceData("withings");

        await _sut.UpdateSourceDataAsync(Me, new() { replacement });

        var row = _database.Rows<DbSourceData>().Should().ContainSingle().Subject;
        row.Should().BeSameAs(existing);
        row.ForceFullSync.Should().BeFalse();
        row.Measurements.Should().Equal(replacement.Measurements!);
    }

    [Fact]
    public async Task UpdateSourceDataAsync_WithExistingRow_ReplacesMeasurementsLastSyncAndTimestamp()
    {
        var existing = Row(Me, "withings",
            measurements: new List<RawMeasurement> { CreateTestRawMeasurement("2024-01-15", 70.5m) },
            lastSync: FixedLastSync.AddDays(-1).ToString("o"),
            updatedAt: OldUpdatedAt);
        _database.Seed(existing);
        var newMeasurements = new List<RawMeasurement>
        {
            CreateTestRawMeasurement("2024-01-16", 70.1m),
            CreateTestRawMeasurement("2024-01-15", 70.5m)
        };
        var sourceData = new SourceData
        {
            Source = "withings",
            LastUpdate = FixedLastSync,
            Measurements = newMeasurements
        };

        await _sut.UpdateSourceDataAsync(Me, new List<SourceData> { sourceData });

        var row = _database.Rows<DbSourceData>().Should().ContainSingle("the existing row is updated, not duplicated").Subject;
        row.Should().BeSameAs(existing);
        row.Measurements.Should().Equal(newMeasurements);
        row.LastSync.Should().Be(FixedLastSync.ToString("o"));
        row.ForceFullSync.Should().BeFalse();
        row.UpdatedAt.Should().NotBe(OldUpdatedAt);
        DateTime.Parse(row.UpdatedAt, null, DateTimeStyles.RoundtripKind)
            .Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
    }

    [Fact]
    public async Task UpdateSourceDataAsync_WritesLastSyncInRoundTripFormat()
    {
        var lastUpdate = new DateTime(2024, 3, 5, 6, 7, 8, DateTimeKind.Utc).AddTicks(1234567);
        var sourceData = new SourceData
        {
            Source = "withings",
            LastUpdate = lastUpdate,
            Measurements = new List<RawMeasurement> { CreateTestRawMeasurement() }
        };

        await _sut.UpdateSourceDataAsync(Me, new List<SourceData> { sourceData });

        _database.Rows<DbSourceData>().Single().LastSync.Should().Be("2024-03-05T06:07:08.1234567Z");

        // A later request gets a fresh, empty per-request cache and must read the instant back exactly
        var laterRequest = new SourceDataService(_database, NullLogger<SourceDataService>.Instance);
        var readBack = await laterRequest.GetLastSyncTimeAsync(Me, "withings");

        readBack.Should().Be(lastUpdate);
        readBack!.Value.Kind.Should().Be(DateTimeKind.Utc);
    }

    [Fact]
    public async Task UpdateSourceDataAsync_WithExistingData_ReplacesCompletely()
    {
        // Merging is the sync service's job; this layer stores whatever it is handed
        _database.Seed(Row(Me, "withings", measurements: new List<RawMeasurement>
        {
            CreateTestRawMeasurement("2024-01-01", 70.0m),
            CreateTestRawMeasurement("2024-01-02", 71.0m),
            CreateTestRawMeasurement("2024-01-03", 72.0m)
        }));
        var newMeasurements = new List<RawMeasurement>
        {
            CreateTestRawMeasurement("2024-01-03", 72.5m),
            CreateTestRawMeasurement("2024-01-01", 70.0m)
        };

        await _sut.UpdateSourceDataAsync(Me, new List<SourceData>
        {
            new() { Source = "withings", LastUpdate = FixedLastSync, Measurements = newMeasurements }
        });

        var row = _database.Rows<DbSourceData>().Single();
        row.Measurements.Should().Equal(newMeasurements);
        row.Measurements.Should().NotContain(m => m.Date == "2024-01-02", "dropped readings are not merged back in");
    }

    [Fact]
    public async Task UpdateSourceDataAsync_WithTwoProviders_WritesOneRowPerProvider()
    {
        var withings = new SourceData
        {
            Source = "withings",
            LastUpdate = FixedLastSync,
            Measurements = new List<RawMeasurement> { CreateTestRawMeasurement("2024-01-15", 70.0m) }
        };
        var legacy = new SourceData
        {
            Source = "legacy",
            LastUpdate = FixedLastSync.AddHours(-1),
            Measurements = new List<RawMeasurement> { CreateTestRawMeasurement("2024-01-15", 70.1m) }
        };

        await _sut.UpdateSourceDataAsync(Me, new List<SourceData> { withings, legacy });

        var rows = _database.Rows<DbSourceData>();
        rows.Should().HaveCount(2);
        rows.Should().AllSatisfy(row => row.Uid.Should().Be(Me));
        rows.Single(r => r.Provider == "withings").Measurements.Should().Equal(withings.Measurements!);
        rows.Single(r => r.Provider == "withings").LastSync.Should().Be(FixedLastSync.ToString("o"));
        rows.Single(r => r.Provider == "legacy").Measurements.Should().Equal(legacy.Measurements!);
        rows.Single(r => r.Provider == "legacy").LastSync.Should().Be(FixedLastSync.AddHours(-1).ToString("o"));
    }

    [Fact]
    public async Task UpdateSourceDataAsync_WithNullMeasurements_StoresEmptyList()
    {
        var sourceData = new SourceData { Source = "withings", LastUpdate = FixedLastSync, Measurements = null };

        await _sut.UpdateSourceDataAsync(Me, new List<SourceData> { sourceData });

        var row = _database.Rows<DbSourceData>().Single();
        row.Measurements.Should().NotBeNull();
        row.Measurements.Should().BeEmpty();
    }

    [Fact]
    public async Task UpdateSourceDataAsync_WhenOnlyDecoyRowsExist_InsertsWithoutTouchingThem()
    {
        var otherUsersWithings = Row(Other, "withings",
            measurements: new List<RawMeasurement> { CreateTestRawMeasurement("2024-01-01", 90.0m) },
            lastSync: FixedLastSync.AddDays(-3).ToString("o"),
            updatedAt: OldUpdatedAt);
        var myLegacy = Row(Me, "legacy",
            measurements: new List<RawMeasurement> { CreateTestRawMeasurement("2023-06-01", 95.0m) },
            lastSync: FixedLastSync.AddDays(-30).ToString("o"),
            updatedAt: OldUpdatedAt);
        _database.Seed(otherUsersWithings, myLegacy);
        var otherSnapshot = Snapshot(otherUsersWithings);
        var legacySnapshot = Snapshot(myLegacy);
        var mine = CreateTestSourceData("withings");

        await _sut.UpdateSourceDataAsync(Me, new List<SourceData> { mine });

        var rows = _database.Rows<DbSourceData>();
        rows.Should().HaveCount(3, "a new row is inserted rather than overwriting a decoy");
        var inserted = rows.Single(r => r.Uid == Me && r.Provider == "withings");
        inserted.Measurements.Should().Equal(mine.Measurements!);
        Snapshot(otherUsersWithings).Should().Be(otherSnapshot);
        Snapshot(myLegacy).Should().Be(legacySnapshot);
    }

    [Fact]
    public async Task UpdateSourceDataAsync_WithDatabaseError_RethrowsException()
    {
        _database.ThrowOnQuery = new InvalidOperationException("Database error");

        await _sut.Invoking(x => x.UpdateSourceDataAsync(Me, new List<SourceData> { CreateTestSourceData("withings") }))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Database error");
        _database.Rows<DbSourceData>().Should().BeEmpty();
    }

    #endregion

    #region GetSourceDataAsync

    [Fact]
    public async Task GetSourceDataAsync_WithExistingData_ReturnsCorrectData()
    {
        var measurement = CreateTestRawMeasurement("2024-01-15", 70.5m);
        _database.Seed(Row(Me, "withings",
            measurements: new List<RawMeasurement> { measurement },
            lastSync: FixedLastSync.ToString("o")));

        var result = await _sut.GetSourceDataAsync(Me, new List<string> { "withings" });

        var data = result.Should().ContainSingle().Subject;
        data.Source.Should().Be("withings");
        data.LastUpdate.Should().Be(FixedLastSync);
        data.LastUpdate.Kind.Should().Be(DateTimeKind.Utc);
        data.Measurements.Should().Equal(measurement);
    }

    [Fact]
    public async Task GetSourceDataAsync_SecondCallInSameRequest_IsServedFromCacheWithoutQuerying()
    {
        // The service is request-scoped; the sync service reads the same providers several
        // times per request and only the first read may hit the database
        var row = Row(Me, "withings",
            measurements: new List<RawMeasurement> { CreateTestRawMeasurement("2024-01-15", 70.5m) },
            lastSync: FixedLastSync.ToString("o"));
        _database.Seed(row);
        var providers = new List<string> { "withings" };

        var first = await _sut.GetSourceDataAsync(Me, providers);
        await _database.DeleteAsync(row); // Anything read after this point must have come from the cache
        var second = await _sut.GetSourceDataAsync(Me, providers);
        var lastSyncTime = await _sut.GetLastSyncTimeAsync(Me, "withings");

        _database.Rows<DbSourceData>().Should().BeEmpty();
        second.Should().BeEquivalentTo(first);
        second![0].Measurements![0].Weight.Should().Be(70.5m);
        lastSyncTime.Should().Be(FixedLastSync, "the last-sync lookup reuses the cached row");
    }

    [Fact]
    public async Task GetSourceDataAsync_WithNoData_ReturnsEmptyList()
    {
        var result = await _sut.GetSourceDataAsync(Me, new List<string> { "withings", "legacy" });

        result.Should().NotBeNull();
        result!.Should().BeEmpty();
    }

    [Fact]
    public async Task GetSourceDataAsync_ReturnsOnlyRequestedProvidersOfThisUser()
    {
        var myWithings = Row(Me, "withings", measurements: new List<RawMeasurement> { CreateTestRawMeasurement("2024-01-01", 70.0m) });
        var myLegacy = Row(Me, "legacy", measurements: new List<RawMeasurement> { CreateTestRawMeasurement("2023-01-01", 80.0m) });
        var myManual = Row(Me, "manual", measurements: new List<RawMeasurement> { CreateTestRawMeasurement("2024-01-02", 71.0m) });
        var otherUsersWithings = Row(Other, "withings", measurements: new List<RawMeasurement> { CreateTestRawMeasurement("2024-01-01", 90.0m) });
        _database.Seed(myWithings, myLegacy, myManual, otherUsersWithings);

        var result = await _sut.GetSourceDataAsync(Me, new List<string> { "withings", "legacy" });

        result.Should().NotBeNull();
        result!.Select(s => s.Source).Should().BeEquivalentTo("withings", "legacy");
        result.Single(s => s.Source == "withings").Measurements.Should().BeSameAs(myWithings.Measurements);
        result.Single(s => s.Source == "legacy").Measurements.Should().BeSameAs(myLegacy.Measurements);
        result.SelectMany(s => s.Measurements!).Should().NotContain(m => m.Weight == 90.0m, "another user's readings must never leak");
        result.Should().NotContain(s => s.Source == "manual", "unrequested providers are not returned");
    }

    [Fact]
    public async Task GetSourceDataAsync_WithNullLastSync_UsesCurrentTime()
    {
        _database.Seed(Row(Me, "withings", lastSync: null));

        var result = await _sut.GetSourceDataAsync(Me, new List<string> { "withings" });

        result.Should().ContainSingle().Which.LastUpdate.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
    }

    [Fact]
    public async Task GetSourceDataAsync_WithDatabaseError_RethrowsException()
    {
        _database.ThrowOnQuery = new InvalidOperationException("Database error");

        await _sut.Invoking(x => x.GetSourceDataAsync(Me, new List<string> { "withings" }))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Database error");
    }

    #endregion

    #region GetLastSyncTimeAsync

    [Fact]
    public async Task GetLastSyncTimeAsync_WithExistingData_ReturnsLastSyncTime()
    {
        _database.Seed(Row(Me, "withings", lastSync: FixedLastSync.ToString("o")));

        var result = await _sut.GetLastSyncTimeAsync(Me, "withings");

        result.Should().Be(FixedLastSync);
        result!.Value.Kind.Should().Be(DateTimeKind.Utc);
    }

    [Fact]
    public async Task GetLastSyncTimeAsync_WithNoData_ReturnsNull()
    {
        var result = await _sut.GetLastSyncTimeAsync(Me, "withings");

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetLastSyncTimeAsync_WithNullLastSync_ReturnsNull()
    {
        _database.Seed(Row(Me, "withings", lastSync: null));

        var result = await _sut.GetLastSyncTimeAsync(Me, "withings");

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetLastSyncTimeAsync_WithOnlyDecoyRows_ReturnsNull()
    {
        _database.Seed(
            Row(Other, "withings", lastSync: FixedLastSync.ToString("o")),
            Row(Me, "legacy", lastSync: FixedLastSync.ToString("o")));

        var result = await _sut.GetLastSyncTimeAsync(Me, "withings");

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetLastSyncTimeAsync_WithDatabaseError_ReturnsNull()
    {
        _database.ThrowOnQuery = new InvalidOperationException("Database error");

        var result = await _sut.GetLastSyncTimeAsync(Me, "withings");

        result.Should().BeNull();
    }

    #endregion

    #region HasMeasurementsAsync

    [Fact]
    public async Task HasMeasurementsAsync_WithMeasurements_ReturnsTrue()
    {
        _database.Seed(Row(Me, "withings", measurements: new List<RawMeasurement> { CreateTestRawMeasurement() }));

        (await _sut.HasMeasurementsAsync(Me, "withings")).Should().BeTrue();
    }

    [Fact]
    public async Task HasMeasurementsAsync_WithEmptyMeasurements_ReturnsFalse()
    {
        _database.Seed(Row(Me, "withings", measurements: new List<RawMeasurement>()));

        (await _sut.HasMeasurementsAsync(Me, "withings")).Should().BeFalse();
    }

    [Fact]
    public async Task HasMeasurementsAsync_WithOnlyDecoyRows_ReturnsFalse()
    {
        _database.Seed(
            Row(Other, "withings", measurements: new List<RawMeasurement> { CreateTestRawMeasurement() }),
            Row(Me, "legacy", measurements: new List<RawMeasurement> { CreateTestRawMeasurement() }));

        (await _sut.HasMeasurementsAsync(Me, "withings")).Should().BeFalse();
    }

    [Fact]
    public async Task HasMeasurementsAsync_WithDatabaseError_ReturnsFalse()
    {
        _database.ThrowOnQuery = new InvalidOperationException("Database error");

        (await _sut.HasMeasurementsAsync(Me, "withings")).Should().BeFalse();
    }

    #endregion

    #region GetForceFullSyncAsync

    [Fact]
    public async Task GetForceFullSyncAsync_WithFlagSet_ReturnsTrue()
    {
        _database.Seed(Row(Me, "withings", forceFullSync: true));

        (await _sut.GetForceFullSyncAsync(Me, "withings")).Should().BeTrue();
    }

    [Fact]
    public async Task GetForceFullSyncAsync_WithNoRow_ReturnsFalse()
    {
        (await _sut.GetForceFullSyncAsync(Me, "withings")).Should().BeFalse();
    }

    [Fact]
    public async Task GetForceFullSyncAsync_WithOnlyFlaggedDecoyRows_ReturnsFalse()
    {
        _database.Seed(
            Row(Other, "withings", forceFullSync: true),
            Row(Me, "legacy", forceFullSync: true));

        (await _sut.GetForceFullSyncAsync(Me, "withings")).Should().BeFalse();
    }

    [Fact]
    public async Task GetForceFullSyncAsync_WithDatabaseError_ReturnsFalse()
    {
        _database.ThrowOnQuery = new InvalidOperationException("Database error");

        (await _sut.GetForceFullSyncAsync(Me, "withings")).Should().BeFalse();
    }

    #endregion

    #region RequestFullSyncAsync

    [Fact]
    public async Task RequestFullSyncAsync_WithoutSourceRow_DoesNotCreateEmptyDocument()
    {
        await _sut.RequestFullSyncAsync(Me, "withings");

        _database.Rows<DbSourceData>().Should().BeEmpty();
    }

    [Fact]
    public async Task RequestFullSyncAsync_WithExistingRow_SetsFlagAndKeepsReadings()
    {
        var readings = new List<RawMeasurement> { CreateTestRawMeasurement("2024-01-01", 80m) };
        var row = Row(Me, "withings", measurements: readings, lastSync: FixedLastSync.ToString("o"), updatedAt: OldUpdatedAt);
        _database.Seed(row);

        await _sut.RequestFullSyncAsync(Me, "withings");

        var stored = _database.Rows<DbSourceData>().Should().ContainSingle().Subject;
        stored.Should().BeSameAs(row);
        stored.ForceFullSync.Should().BeTrue();
        stored.Measurements.Should().BeSameAs(readings, "the last good readings stay until the full fetch succeeds");
        stored.LastSync.Should().Be(FixedLastSync.ToString("o"));
        stored.UpdatedAt.Should().NotBe(OldUpdatedAt);
    }

    [Fact]
    public async Task RequestFullSyncAsync_InvalidatesCachedRowSoTheFlagIsVisible()
    {
        _database.Seed(Row(Me, "withings"));
        (await _sut.GetForceFullSyncAsync(Me, "withings")).Should().BeFalse("this call primes the request cache");

        await _sut.RequestFullSyncAsync(Me, "withings");

        (await _sut.GetForceFullSyncAsync(Me, "withings")).Should().BeTrue();
    }

    [Fact]
    public async Task RequestFullSyncAsync_WithOnlyDecoyRows_FlagsNothing()
    {
        var otherUsersWithings = Row(Other, "withings", updatedAt: OldUpdatedAt);
        var myLegacy = Row(Me, "legacy", updatedAt: OldUpdatedAt);
        _database.Seed(otherUsersWithings, myLegacy);
        var otherSnapshot = Snapshot(otherUsersWithings);
        var legacySnapshot = Snapshot(myLegacy);

        await _sut.RequestFullSyncAsync(Me, "withings");

        _database.Rows<DbSourceData>().Should().HaveCount(2);
        Snapshot(otherUsersWithings).Should().Be(otherSnapshot);
        Snapshot(myLegacy).Should().Be(legacySnapshot);
    }

    #endregion

    #region DeleteSourceDataAsync

    [Fact]
    public async Task DeleteSourceDataAsync_WithExistingProvider_DeletesRecord()
    {
        _database.Seed(Row(Me, "withings", measurements: new List<RawMeasurement> { CreateTestRawMeasurement() }));

        await _sut.DeleteSourceDataAsync(Me, "withings");

        _database.Rows<DbSourceData>().Should().BeEmpty();
    }

    [Fact]
    public async Task DeleteSourceDataAsync_ClearsCachedRow()
    {
        _database.Seed(Row(Me, "withings", measurements: new List<RawMeasurement> { CreateTestRawMeasurement() }));
        (await _sut.HasMeasurementsAsync(Me, "withings")).Should().BeTrue("this call primes the request cache");

        await _sut.DeleteSourceDataAsync(Me, "withings");

        (await _sut.HasMeasurementsAsync(Me, "withings")).Should().BeFalse();
    }

    [Fact]
    public async Task DeleteSourceDataAsync_WithNonExistentProvider_DoesNothing()
    {
        var row = Row(Me, "withings");
        _database.Seed(row);

        await _sut.DeleteSourceDataAsync(Me, "nonexistent");

        _database.Rows<DbSourceData>().Should().ContainSingle().Which.Should().BeSameAs(row);
    }

    [Fact]
    public async Task DeleteSourceDataAsync_WithOnlyDecoyRows_DeletesNothing()
    {
        var otherUsersWithings = Row(Other, "withings");
        var myLegacy = Row(Me, "legacy");
        _database.Seed(otherUsersWithings, myLegacy);

        await _sut.DeleteSourceDataAsync(Me, "withings");

        _database.Rows<DbSourceData>().Should().BeEquivalentTo(
            new[] { otherUsersWithings, myLegacy },
            options => options.WithStrictOrdering());
    }

    [Fact]
    public async Task DeleteSourceDataAsync_WithDatabaseError_RethrowsException()
    {
        _database.Seed(Row(Me, "withings"));
        _database.ThrowOnQuery = new InvalidOperationException("Database error");

        await _sut.Invoking(x => x.DeleteSourceDataAsync(Me, "withings"))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Database error");
        _database.Rows<DbSourceData>().Should().HaveCount(1);
    }

    #endregion

    #region Private Helper Methods

    private static DbSourceData Row(
        Guid uid,
        string provider,
        List<RawMeasurement>? measurements = null,
        string? lastSync = "2024-01-10T00:00:00.0000000Z",
        bool forceFullSync = false,
        string updatedAt = "2024-01-10T00:00:00.0000000Z")
    {
        return new DbSourceData
        {
            Uid = uid,
            Provider = provider,
            Measurements = measurements ?? new List<RawMeasurement>(),
            LastSync = lastSync,
            ForceFullSync = forceFullSync,
            UpdatedAt = updatedAt
        };
    }

    /// <summary>Value snapshot of a row so a test can prove a decoy was not written to.</summary>
    private static (Guid Uid, string Provider, List<RawMeasurement> Measurements, string? LastSync, bool ForceFullSync, string UpdatedAt) Snapshot(DbSourceData row)
    {
        return (row.Uid, row.Provider, row.Measurements, row.LastSync, row.ForceFullSync, row.UpdatedAt);
    }

    private static SourceData CreateTestSourceData(string provider)
    {
        return new SourceData
        {
            Source = provider,
            LastUpdate = FixedLastSync,
            Measurements = new List<RawMeasurement>
            {
                CreateTestRawMeasurement()
            }
        };
    }

    private static RawMeasurement CreateTestRawMeasurement(string? date = null, decimal? weight = null)
    {
        return new RawMeasurement
        {
            Date = date ?? "2024-01-15",
            Time = "10:30:00",
            Weight = weight ?? 70.5m,
            FatRatio = 0.152m
        };
    }

    #endregion
}
