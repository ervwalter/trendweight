using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Features.Profile.Models;
using TrendWeight.Infrastructure.Configuration;
using TrendWeight.Infrastructure.DataAccess;
using TrendWeight.Infrastructure.DataAccess.Models;
using TrendWeight.Tests.Fixtures;

namespace TrendWeight.Tests.Infrastructure.DataAccess;

/// <summary>
/// Pins how the Supabase SDK puts our models on the wire in both directions, using the real
/// client against <see cref="SupabaseReceiver"/>. <see cref="FakeSupabaseService"/> holds rows by
/// reference and never serialises, so these are the only tests that notice a change in the SDK's
/// JSON handling (column-name mapping, nested JSONB shapes, dates, decimals, token dictionaries).
/// </summary>
public class SupabaseSerializationTests
{
    private const string Key = "sb_secret_synthetic-test-key";
    private static readonly Guid Uid = Guid.Parse("11111111-2222-3333-4444-555555555555");

    private static SupabaseService CreateService(SupabaseReceiver receiver)
    {
        var factory = new Mock<IHttpClientFactory>();
        factory.Setup(x => x.CreateClient(It.IsAny<string>())).Returns(() => new HttpClient());
        var options = Options.Create(new AppOptions
        {
            Supabase = new SupabaseConfig { Url = receiver.Url, ServiceKey = Key }
        });
        return new SupabaseService(options, Mock.Of<ILogger<SupabaseService>>(), factory.Object);
    }

    /// <summary>Minimal but well-formed row for each table, so writes get a parseable response.</summary>
    private static string MinimalRow(SupabaseReceiver.CapturedRequest request) => request.Path switch
    {
        "/rest/v1/profiles" => $$"""[{"uid":"{{Uid}}","email":"row@example.com","profile":{},"created_at":"2024-01-01T00:00:00+00:00","updated_at":"2024-01-01T00:00:00+00:00"}]""",
        "/rest/v1/source_data" => $$"""[{"uid":"{{Uid}}","provider":"withings","measurements":[],"last_sync":null,"force_full_sync":false,"updated_at":"2024-01-01T00:00:00+00:00"}]""",
        "/rest/v1/provider_links" => $$"""[{"uid":"{{Uid}}","provider":"withings","token":{},"update_reason":null,"updated_at":"2024-01-01T00:00:00+00:00","created_at":null}]""",
        "/rest/v1/user_accounts" => $$"""[{"uid":"{{Uid}}","external_id":"user_123","provider":"clerk","created_at":"2024-01-01T00:00:00+00:00","updated_at":"2024-01-01T00:00:00+00:00"}]""",
        _ => "[]"
    };

    private static JsonElement ParseBody(SupabaseReceiver.CapturedRequest request)
    {
        return JsonDocument.Parse(request.Body).RootElement.Clone();
    }

    private static IEnumerable<string> Keys(JsonElement element)
    {
        return element.EnumerateObject().Select(property => property.Name);
    }

    // ----- Reads -----

    [Fact]
    public async Task Get_ReadsProfileRowsIncludingNestedProfileJson()
    {
        await using var receiver = await SupabaseReceiver.StartAsync(TestContext.Current.CancellationToken);
        receiver.Respond = _ => $$"""
            [{
              "uid": "{{Uid}}",
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
                "IsNewlyMigrated": false,
                "HideDataBeforeStart": true,
                "TrendAlgorithm": "holt-gentle",
                "ApiKeyHash": "0123abcd",
                "ApiKeySuffix": "wxyz",
                "ApiKeyCreatedAt": "2024-02-01T12:00:00.0000000Z",
                "SomethingNewer": {"nested": [1, 2]}
              },
              "created_at": "2024-01-01T00:00:00+00:00",
              "updated_at": "2024-01-02T03:04:05.678901+00:00"
            }]
            """;
        var service = CreateService(receiver);

        var row = await service.GetByIdAsync<DbProfile>(Uid);

        row.Should().NotBeNull();
        row!.Uid.Should().Be(Uid);
        row.Email.Should().Be("full@example.com");
        row.CreatedAt.Should().Be("2024-01-01T00:00:00+00:00", "timestamp columns are kept as the verbatim string");
        row.UpdatedAt.Should().Be("2024-01-02T03:04:05.678901+00:00");
        row.Profile.Should().BeEquivalentTo(new ProfileData
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
            IsNewlyMigrated = false,
            HideDataBeforeStart = true,
            TrendAlgorithm = "holt-gentle",
            ApiKeyHash = "0123abcd",
            ApiKeySuffix = "wxyz",
            ApiKeyCreatedAt = "2024-02-01T12:00:00.0000000Z"
        });
        row.Profile.GoalStart!.Value.Kind.Should().Be(DateTimeKind.Unspecified, "a stored date without an offset must not be shifted");
        receiver.Requests.Should().ContainSingle().Which.Query.Should().Be($"?uid=eq.{Uid}");
    }

    [Fact]
    public async Task Get_ReadsProfileJsonWrittenWithCamelCaseKeysAndMissingFields()
    {
        // Rows from the original TypeScript app use camelCase keys and predate newer fields.
        await using var receiver = await SupabaseReceiver.StartAsync(TestContext.Current.CancellationToken);
        receiver.Respond = _ => $$"""
            [{
              "uid": "{{Uid}}",
              "email": "camel@example.com",
              "profile": {"firstName": "Camel", "useMetric": true, "goalWeight": 70, "sharingToken": null},
              "created_at": "2020-01-01T00:00:00+00:00",
              "updated_at": "2020-01-01T00:00:00+00:00"
            }]
            """;
        var service = CreateService(receiver);

        var rows = await service.QueryAsync<DbProfile>(_ => { });

        var profile = rows.Should().ContainSingle().Subject.Profile;
        profile.FirstName.Should().Be("Camel");
        profile.UseMetric.Should().BeTrue();
        profile.GoalWeight.Should().Be(70m);
        profile.SharingToken.Should().BeNull();
        profile.GoalStart.Should().BeNull();
        profile.PlannedPoundsPerWeek.Should().BeNull();
        profile.DayStartOffset.Should().BeNull();
        profile.ShowCalories.Should().BeNull();
        profile.SharingEnabled.Should().BeFalse();
        profile.IsMigrated.Should().BeFalse();
        profile.HideDataBeforeStart.Should().BeFalse();
        profile.TrendAlgorithm.Should().BeNull();
        profile.ApiKeyHash.Should().BeNull();
    }

    [Fact]
    public async Task Get_ReadsMeasurementRowsIntoRawMeasurementRecords()
    {
        await using var receiver = await SupabaseReceiver.StartAsync(TestContext.Current.CancellationToken);
        receiver.Respond = _ => $$"""
            [{
              "uid": "{{Uid}}",
              "provider": "withings",
              "measurements": [
                {"Date": "2024-05-01", "Time": "07:30:00", "Weight": 81.25, "FatRatio": 0.215},
                {"Date": "2024-05-02", "Time": "07:31:00", "Weight": 80, "FatRatio": null},
                {"date": "2024-05-03", "time": "07:32:00", "weight": 79.9, "fatRatio": 0.2}
              ],
              "last_sync": "2024-05-03T06:07:08.1234567Z",
              "force_full_sync": true,
              "updated_at": "2024-05-03T06:07:08+00:00"
            }]
            """;
        var service = CreateService(receiver);

        var rows = await service.QueryAsync<DbSourceData>(_ => { });

        var row = rows.Should().ContainSingle().Subject;
        row.Uid.Should().Be(Uid);
        row.Provider.Should().Be("withings");
        row.LastSync.Should().Be("2024-05-03T06:07:08.1234567Z");
        row.ForceFullSync.Should().BeTrue();
        row.Measurements.Should().Equal(
            new RawMeasurement { Date = "2024-05-01", Time = "07:30:00", Weight = 81.25m, FatRatio = 0.215m },
            new RawMeasurement { Date = "2024-05-02", Time = "07:31:00", Weight = 80m, FatRatio = null },
            new RawMeasurement { Date = "2024-05-03", Time = "07:32:00", Weight = 79.9m, FatRatio = 0.2m });
    }

    [Fact]
    public async Task Get_ReadsProviderTokensAsPlainClrValues()
    {
        // Production reads token values with ToString() and `as bool?`, which only work when the
        // dictionary holds string/long/bool rather than a JSON document wrapper type.
        await using var receiver = await SupabaseReceiver.StartAsync(TestContext.Current.CancellationToken);
        receiver.Respond = _ => $$"""
            [{
              "uid": "{{Uid}}",
              "provider": "legacy",
              "token": {
                "access_token": "at-123",
                "refresh_token": "rt-456",
                "token_type": "Bearer",
                "expires_in": 10800,
                "received_at": 1717171717,
                "scope": "user.metrics",
                "disabled": true,
                "ratio": 0.5,
                "nested": {"n": 1},
                "list": ["a", 2]
              },
              "update_reason": null,
              "updated_at": "2024-01-01T00:00:00+00:00",
              "created_at": null
            }]
            """;
        var service = CreateService(receiver);

        var rows = await service.QueryAsync<DbProviderLink>(_ => { });

        var row = rows.Should().ContainSingle().Subject;
        row.UpdateReason.Should().BeNull();
        row.CreatedAt.Should().BeNull();
        var token = row.Token;
        token["access_token"].Should().Be("at-123");
        token["refresh_token"].Should().Be("rt-456");
        token["token_type"].Should().Be("Bearer");
        token["expires_in"].Should().Be(10800L);
        token["received_at"].Should().Be(1717171717L);
        token["scope"].Should().Be("user.metrics");
        token["disabled"].Should().Be(true);
        token["ratio"].Should().Be(0.5d);
        // Nested values are SDK-specific containers (JObject with Newtonsoft, dictionaries with
        // System.Text.Json); production never reads inside them, so only their presence is pinned.
        token["nested"].Should().NotBeNull();
        token["list"].Should().NotBeNull();

        // The exact expressions production uses.
        (token.GetValueOrDefault("disabled") as bool? == true).Should().BeTrue();
        long.TryParse(token["received_at"].ToString(), out var receivedAt).Should().BeTrue();
        receivedAt.Should().Be(1717171717L);
        int.TryParse(token["expires_in"].ToString(), out var expiresIn).Should().BeTrue();
        expiresIn.Should().Be(10800);
        token["access_token"].ToString().Should().Be("at-123");
    }

    [Fact]
    public async Task Get_ReadsLegacyProfileColumns()
    {
        await using var receiver = await SupabaseReceiver.StartAsync(TestContext.Current.CancellationToken);
        receiver.Respond = _ => """
            [{
              "email": "legacy@example.com",
              "username": "legacyuser",
              "first_name": "Legacy",
              "use_metric": false,
              "start_date": "2010-03-04T00:00:00",
              "goal_weight": 72.5,
              "planned_pounds_per_week": 1.25,
              "day_start_offset": -3,
              "private_url_key": "abc123",
              "device_type": "withings",
              "refresh_token": null,
              "measurements": [{"date": "2010-03-04", "time": "06:00:00", "weight": 90.1, "fatRatio": null}],
              "created_at": "2024-01-01T12:34:56.789+00:00",
              "updated_at": null
            }]
            """;
        var service = CreateService(receiver);

        var rows = await service.QueryAsync<DbLegacyProfile>(_ => { });

        var row = rows.Should().ContainSingle().Subject;
        row.Email.Should().Be("legacy@example.com");
        row.Username.Should().Be("legacyuser");
        row.FirstName.Should().Be("Legacy");
        row.UseMetric.Should().BeFalse();
        row.StartDate.Should().Be(new DateTime(2010, 3, 4));
        row.GoalWeight.Should().Be(72.5m);
        row.PlannedPoundsPerWeek.Should().Be(1.25m);
        row.DayStartOffset.Should().Be(-3);
        row.PrivateUrlKey.Should().Be("abc123");
        row.DeviceType.Should().Be("withings");
        row.RefreshToken.Should().BeNull();
        row.Measurements.Should().Equal(new RawMeasurement { Date = "2010-03-04", Time = "06:00:00", Weight = 90.1m, FatRatio = null });
        row.CreatedAt!.Value.ToUniversalTime().Should().Be(new DateTime(2024, 1, 1, 12, 34, 56, 789, DateTimeKind.Utc));
        row.UpdatedAt.Should().BeNull();
    }

    // ----- Writes -----

    [Fact]
    public async Task Insert_SendsColumnNamesAndPascalCaseProfileJson()
    {
        await using var receiver = await SupabaseReceiver.StartAsync(TestContext.Current.CancellationToken);
        receiver.Respond = MinimalRow;
        var service = CreateService(receiver);
        var profile = new DbProfile
        {
            Uid = Uid,
            Email = "new@example.com",
            Profile = new ProfileData
            {
                FirstName = "New",
                GoalStart = new DateTime(2024, 1, 15),
                GoalWeight = 72.5m,
                PlannedPoundsPerWeek = 1m,
                UseMetric = false,
                TrendAlgorithm = "holt"
            },
            CreatedAt = "2024-01-01T00:00:00Z",
            UpdatedAt = "2024-01-01T00:00:00Z"
        };

        var returned = await service.InsertAsync(profile);

        returned.Email.Should().Be("row@example.com", "the row PostgREST returns is what the caller gets back");
        var request = receiver.Requests.Should().ContainSingle().Subject;
        request.Method.Should().Be("POST");
        request.Path.Should().Be("/rest/v1/profiles");
        request.Headers["Prefer"].Should().Contain("return=representation");
        var body = ParseBody(request);
        body.ValueKind.Should().Be(JsonValueKind.Object);
        Keys(body).Should().BeEquivalentTo("uid", "email", "profile", "created_at", "updated_at");
        body.GetProperty("uid").GetString().Should().Be(Uid.ToString(), "callers choose the uid; the database default must not apply");
        body.GetProperty("email").GetString().Should().Be("new@example.com");
        body.GetProperty("created_at").GetString().Should().Be("2024-01-01T00:00:00Z");

        var json = body.GetProperty("profile");
        Keys(json).Should().BeEquivalentTo(typeof(ProfileData).GetProperties().Select(p => p.Name),
            "every field is written, PascalCase, nulls included, so readers never see a partial object");
        json.GetProperty("FirstName").GetString().Should().Be("New");
        json.GetProperty("GoalStart").GetString().Should().Be("2024-01-15T00:00:00");
        json.GetProperty("GoalWeight").GetDecimal().Should().Be(72.5m);
        json.GetProperty("PlannedPoundsPerWeek").GetDecimal().Should().Be(1m);
        json.GetProperty("UseMetric").GetBoolean().Should().BeFalse();
        json.GetProperty("TrendAlgorithm").GetString().Should().Be("holt");
        json.GetProperty("SharingToken").ValueKind.Should().Be(JsonValueKind.Null);
        json.GetProperty("DayStartOffset").ValueKind.Should().Be(JsonValueKind.Null);
        json.GetProperty("ShowCalories").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task Insert_SendsUserAccountUidAndReturnsTheStoredRow()
    {
        await using var receiver = await SupabaseReceiver.StartAsync(TestContext.Current.CancellationToken);
        receiver.Respond = MinimalRow;
        var service = CreateService(receiver);

        var returned = await service.InsertAsync(new DbUserAccount
        {
            Uid = Uid,
            ExternalId = "user_123",
            Provider = "clerk",
            CreatedAt = "2024-01-01T00:00:00Z",
            UpdatedAt = "2024-01-01T00:00:00Z"
        });

        returned.Uid.Should().Be(Uid);
        returned.ExternalId.Should().Be("user_123");
        returned.Provider.Should().Be("clerk");
        returned.CreatedAt.Should().Be("2024-01-01T00:00:00+00:00");
        var body = ParseBody(receiver.Requests.Should().ContainSingle().Subject);
        Keys(body).Should().BeEquivalentTo("uid", "external_id", "provider", "created_at", "updated_at");
        body.GetProperty("uid").GetString().Should().Be(Uid.ToString());
        body.GetProperty("external_id").GetString().Should().Be("user_123");
    }

    [Fact]
    public async Task Update_FiltersByPrimaryKeyAndWritesUtcDatesWithZ()
    {
        await using var receiver = await SupabaseReceiver.StartAsync(TestContext.Current.CancellationToken);
        receiver.Respond = MinimalRow;
        var service = CreateService(receiver);
        var profile = new DbProfile
        {
            Uid = Uid,
            Email = "update@example.com",
            Profile = new ProfileData { FirstName = "Upd", GoalStart = new DateTime(2024, 1, 15, 0, 0, 0, DateTimeKind.Utc) },
            CreatedAt = "2024-01-01T00:00:00Z",
            UpdatedAt = "2024-02-01T00:00:00Z"
        };

        await service.UpdateAsync(profile);

        var request = receiver.Requests.Should().ContainSingle().Subject;
        request.Method.Should().Be("PATCH");
        request.Path.Should().Be("/rest/v1/profiles");
        request.Query.Should().Be($"?uid=eq.{Uid}");
        var body = ParseBody(request);
        body.GetProperty("email").GetString().Should().Be("update@example.com");
        body.GetProperty("updated_at").GetString().Should().Be("2024-02-01T00:00:00Z");
        body.GetProperty("profile").GetProperty("FirstName").GetString().Should().Be("Upd");
        body.GetProperty("profile").GetProperty("GoalStart").GetString().Should().Be("2024-01-15T00:00:00Z");
    }

    [Fact]
    public async Task Update_WritesMeasurementsWithPascalCaseKeysAndNumericValues()
    {
        await using var receiver = await SupabaseReceiver.StartAsync(TestContext.Current.CancellationToken);
        receiver.Respond = MinimalRow;
        var service = CreateService(receiver);
        var sourceData = new DbSourceData
        {
            Uid = Uid,
            Provider = "withings",
            Measurements =
            [
                new RawMeasurement { Date = "2024-05-01", Time = "07:30:00", Weight = 81.25m, FatRatio = 0.215m },
                new RawMeasurement { Date = "2024-05-02", Time = "07:31:00", Weight = 80m, FatRatio = null }
            ],
            LastSync = "2024-05-03T06:07:08.1234567Z",
            ForceFullSync = false,
            UpdatedAt = "2024-05-03T06:07:08Z"
        };

        await service.UpdateAsync(sourceData);

        var request = receiver.Requests.Should().ContainSingle().Subject;
        request.Method.Should().Be("PATCH");
        request.Path.Should().Be("/rest/v1/source_data");
        request.Query.Should().Contain($"uid=eq.{Uid}").And.Contain("provider=eq.withings");
        var body = ParseBody(request);
        Keys(body).Should().Contain(["measurements", "last_sync", "force_full_sync", "updated_at"]);
        body.GetProperty("last_sync").GetString().Should().Be("2024-05-03T06:07:08.1234567Z");
        body.GetProperty("force_full_sync").GetBoolean().Should().BeFalse();
        var measurements = body.GetProperty("measurements").EnumerateArray().ToList();
        measurements.Should().HaveCount(2);
        Keys(measurements[0]).Should().BeEquivalentTo("Date", "Time", "Weight", "FatRatio");
        measurements[0].GetProperty("Date").GetString().Should().Be("2024-05-01");
        measurements[0].GetProperty("Time").GetString().Should().Be("07:30:00");
        measurements[0].GetProperty("Weight").GetDecimal().Should().Be(81.25m);
        measurements[0].GetProperty("FatRatio").GetDecimal().Should().Be(0.215m);
        measurements[1].GetProperty("Weight").GetDecimal().Should().Be(80m);
        measurements[1].GetProperty("FatRatio").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task Update_WritesTokenDictionaryValuesWithTheirJsonTypes()
    {
        await using var receiver = await SupabaseReceiver.StartAsync(TestContext.Current.CancellationToken);
        receiver.Respond = MinimalRow;
        var service = CreateService(receiver);
        var link = new DbProviderLink
        {
            Uid = Uid,
            Provider = "withings",
            Token = new Dictionary<string, object>
            {
                ["access_token"] = "at-123",
                ["expires_in"] = 10800,
                ["received_at"] = 1717171717L,
                ["disabled"] = true,
                ["scope"] = "user.metrics"
            },
            UpdateReason = null,
            UpdatedAt = "2024-01-01T00:00:00Z",
            CreatedAt = "2023-12-31T00:00:00Z"
        };

        await service.UpdateAsync(link);

        var request = receiver.Requests.Should().ContainSingle().Subject;
        request.Query.Should().Contain($"uid=eq.{Uid}").And.Contain("provider=eq.withings");
        var body = ParseBody(request);
        body.GetProperty("update_reason").ValueKind.Should().Be(JsonValueKind.Null);
        body.GetProperty("created_at").GetString().Should().Be("2023-12-31T00:00:00Z");
        var token = body.GetProperty("token");
        Keys(token).Should().BeEquivalentTo("access_token", "expires_in", "received_at", "disabled", "scope");
        token.GetProperty("access_token").GetString().Should().Be("at-123");
        token.GetProperty("expires_in").GetInt32().Should().Be(10800);
        token.GetProperty("received_at").GetInt64().Should().Be(1717171717L);
        token.GetProperty("disabled").ValueKind.Should().Be(JsonValueKind.True);
        token.GetProperty("scope").GetString().Should().Be("user.metrics");
    }

    [Fact]
    public async Task Delete_FiltersByEveryPrimaryKeyColumn()
    {
        await using var receiver = await SupabaseReceiver.StartAsync(TestContext.Current.CancellationToken);
        var service = CreateService(receiver);

        await service.DeleteAsync(new DbSourceData { Uid = Uid, Provider = "withings" });
        await service.DeleteAsync(new DbProfile { Uid = Uid });

        receiver.Requests.Should().HaveCount(2);
        var requests = receiver.Requests.ToList();
        requests.Should().OnlyContain(request => request.Method == "DELETE");
        requests[0].Path.Should().Be("/rest/v1/source_data");
        requests[0].Query.Should().Contain($"uid=eq.{Uid}").And.Contain("provider=eq.withings");
        requests[1].Path.Should().Be("/rest/v1/profiles");
        requests[1].Query.Should().Be($"?uid=eq.{Uid}");
    }
}
