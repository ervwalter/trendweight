using System.Globalization;
using System.Text.Json;

namespace TrendWeight.Tests.Fixtures;

/// <summary>
/// Hand-written JSON in the shape the Withings API v2 documents for
/// <c>measure?action=getmeas</c> and <c>oauth2?action=requesttoken</c>
/// (https://developer.withings.com/api-reference#tag/measure/operation/measure-getmeas).
/// These are deliberately string literals rather than serialized DTOs so a test
/// proves our models read the documented wire format, not merely round-trip themselves.
/// </summary>
public static class WithingsPayloads
{
    /// <summary>79.35 kg: <c>{"value":79350,"type":1,"unit":-3}</c>.</summary>
    public static readonly string Weight79_35 = Measure(79350, 1, -3);

    /// <summary>22.65 % body fat: <c>{"value":2265,"type":6,"unit":-2}</c>.</summary>
    public static readonly string Fat22_65 = Measure(2265, 6, -2);

    /// <summary>
    /// One entry of a group's <c>measures</c> array. <paramref name="extra"/> is spliced in
    /// verbatim before the closing brace for documented optional fields, e.g. <c>,"algo":0,"fm":3</c>.
    /// </summary>
    public static string Measure(int value, int type, int unit, string extra = "")
        => $"{{\"value\":{value},\"type\":{type},\"unit\":{unit}{extra}}}";

    /// <summary>
    /// One entry of <c>measuregrps</c>, with every field the docs list for a scale reading.
    /// </summary>
    public static string Group(long grpid, long unixDate, params string[] measuresJson)
        => "{"
           + $"\"grpid\":{grpid},"
           + "\"attrib\":0,"
           + $"\"date\":{unixDate},"
           + $"\"created\":{unixDate + 2},"
           + $"\"modified\":{unixDate + 2},"
           + "\"category\":1,"
           + "\"deviceid\":\"892359876fd8805ac45bab078c4828692f0276b1\","
           + "\"hash_deviceid\":\"892359876fd8805ac45bab078c4828692f0276b1\","
           + $"\"measures\":[{string.Join(",", measuresJson)}],"
           + "\"comment\":null"
           + "}";

    /// <summary>
    /// A full <c>getmeas</c> success envelope. Omits <c>timezone</c> when <paramref name="timezone"/>
    /// is null; includes <c>offset</c> only when supplied or when <paramref name="more"/> is 1
    /// (Withings sends it with the next-page cursor).
    /// </summary>
    public static string GetMeas(string? timezone, IEnumerable<string> groupsJson, int more = 0, int? offset = null)
    {
        var body = new List<string> { "\"updatetime\":1700000000" };

        if (timezone is not null)
        {
            body.Add($"\"timezone\":{Quote(timezone)}");
        }

        body.Add($"\"measuregrps\":[{string.Join(",", groupsJson)}]");
        body.Add($"\"more\":{more}");

        var effectiveOffset = offset ?? (more == 1 ? 0 : (int?)null);
        if (effectiveOffset is not null)
        {
            body.Add($"\"offset\":{effectiveOffset.Value.ToString(CultureInfo.InvariantCulture)}");
        }

        return $"{{\"status\":0,\"body\":{{{string.Join(",", body)}}}}}";
    }

    /// <summary>A non-zero-status envelope: <c>{"status":401,"error":"..."}</c>.</summary>
    public static string Error(int status, string error)
        => $"{{\"status\":{status},\"error\":{Quote(error)}}}";

    /// <summary>
    /// A documented <c>requesttoken</c> response, including the fields our model ignores
    /// (<c>userid</c>, <c>csrf_token</c>) so tests prove unknown members are tolerated.
    /// </summary>
    public static string Token(string accessToken = "acc", string refreshToken = "ref", int expiresIn = 10800, bool includeRefresh = true)
    {
        var body = new List<string>
        {
            "\"userid\":\"123\"",
            $"\"access_token\":{Quote(accessToken)}"
        };

        if (includeRefresh)
        {
            body.Add($"\"refresh_token\":{Quote(refreshToken)}");
        }

        body.Add($"\"expires_in\":{expiresIn}");
        body.Add("\"scope\":\"user.metrics\"");
        body.Add("\"csrf_token\":\"abc\"");
        body.Add("\"token_type\":\"Bearer\"");

        return $"{{\"status\":0,\"body\":{{{string.Join(",", body)}}}}}";
    }

    private static string Quote(string value) => JsonSerializer.Serialize(value);
}
