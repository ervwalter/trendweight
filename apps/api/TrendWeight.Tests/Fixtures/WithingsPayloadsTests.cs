using System.Text.Json;
using FluentAssertions;
using TrendWeight.Features.Providers.Withings.Models;

namespace TrendWeight.Tests.Fixtures;

/// <summary>
/// Proves the hand-written payloads deserialize into the production models with the same
/// System.Text.Json calls WithingsService makes (getmeas: default options; token: case-insensitive).
/// </summary>
public class WithingsPayloadsTests
{
    private static readonly JsonSerializerOptions TokenOptions = new() { PropertyNameCaseInsensitive = true };

    [Fact]
    public void GetMeas_DeserializesIntoTheModelsTheServiceReads()
    {
        var json = WithingsPayloads.GetMeas(
            "Europe/Paris",
            [WithingsPayloads.Group(1001, 1700000000, WithingsPayloads.Weight79_35, WithingsPayloads.Fat22_65)],
            more: 1,
            offset: 42);

        var response = JsonSerializer.Deserialize<WithingsResponse<WithingsGetMeasuresResponse>>(json);

        response.Should().NotBeNull();
        response!.Status.Should().Be(0);
        response.Error.Should().BeNull();
        response.Body.Should().NotBeNull();

        var body = response.Body!;
        body.Timezone.Should().Be("Europe/Paris");
        body.More.Should().Be(1);
        body.Offset.Should().Be(42);

        var group = body.MeasureGroups.Should().ContainSingle().Which;
        group.GroupId.Should().Be(1001);
        group.Date.Should().Be(1700000000);
        group.Category.Should().Be(1);
        group.DeviceId.Should().NotBeEmpty();
        group.Measures.Should().HaveCount(2);

        group.Measures[0].Value.Should().Be(79350);
        group.Measures[0].Type.Should().Be(1);
        group.Measures[0].Unit.Should().Be(-3);

        group.Measures[1].Value.Should().Be(2265);
        group.Measures[1].Type.Should().Be(6);
        group.Measures[1].Unit.Should().Be(-2);
    }

    [Fact]
    public void GetMeas_WithoutTimezoneOrOffset_LeavesThoseFieldsAtTheirDefaults()
    {
        var json = WithingsPayloads.GetMeas(null, []);

        var response = JsonSerializer.Deserialize<WithingsResponse<WithingsGetMeasuresResponse>>(json);

        response!.Body.Should().NotBeNull();
        var body = response.Body!;
        body.Timezone.Should().BeEmpty();
        body.MeasureGroups.Should().BeEmpty();
        body.More.Should().Be(0);
        body.Offset.Should().BeNull();
        json.Should().NotContain("\"timezone\"").And.NotContain("\"offset\"");
    }

    [Fact]
    public void GetMeas_WithMoreButNoOffset_IncludesAnOffsetLikeTheApiDoes()
    {
        var json = WithingsPayloads.GetMeas("UTC", [], more: 1);

        var response = JsonSerializer.Deserialize<WithingsResponse<WithingsGetMeasuresResponse>>(json);

        response!.Body!.More.Should().Be(1);
        response.Body.Offset.Should().Be(0);
    }

    [Fact]
    public void Measure_SplicesExtraDocumentedFieldsWithoutBreakingTheModel()
    {
        var json = WithingsPayloads.GetMeas(
            "UTC",
            [WithingsPayloads.Group(7, 1700000000, WithingsPayloads.Measure(80000, 1, -3, ",\"algo\":0,\"fm\":3"))]);

        var response = JsonSerializer.Deserialize<WithingsResponse<WithingsGetMeasuresResponse>>(json);

        var measure = response!.Body!.MeasureGroups.Single().Measures.Single();
        measure.Value.Should().Be(80000);
        measure.Type.Should().Be(1);
        measure.Unit.Should().Be(-3);
    }

    [Fact]
    public void Error_DeserializesStatusAndMessage()
    {
        var json = WithingsPayloads.Error(401, "The access token provided is invalid");

        var response = JsonSerializer.Deserialize<WithingsResponse<WithingsGetMeasuresResponse>>(json);

        response!.Status.Should().Be(401);
        response.Error.Should().Be("The access token provided is invalid");
        response.Body.Should().BeNull();
    }

    [Fact]
    public void Token_DeserializesWithTheServiceOptionsAndIgnoresDocumentedExtras()
    {
        var json = WithingsPayloads.Token("access-1", "refresh-1", 3600);

        var response = JsonSerializer.Deserialize<WithingsResponse<WithingsTokenResponse>>(json, TokenOptions);

        response!.Status.Should().Be(0);
        response.Body.Should().NotBeNull();
        var body = response.Body!;
        body.AccessToken.Should().Be("access-1");
        body.RefreshToken.Should().Be("refresh-1");
        body.ExpiresIn.Should().Be(3600);
        body.TokenType.Should().Be("Bearer");
        body.Scope.Should().Be("user.metrics");
        json.Should().Contain("\"userid\"").And.Contain("\"csrf_token\"");
    }

    [Fact]
    public void Token_WithoutRefresh_OmitsTheKeyEntirely()
    {
        var json = WithingsPayloads.Token(includeRefresh: false);

        var response = JsonSerializer.Deserialize<WithingsResponse<WithingsTokenResponse>>(json, TokenOptions);

        response!.Body!.RefreshToken.Should().BeNull();
        json.Should().NotContain("refresh_token");
    }
}
