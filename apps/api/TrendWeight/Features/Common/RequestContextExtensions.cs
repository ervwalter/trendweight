using System;
using System.Security.Claims;

namespace TrendWeight.Features.Common;

public static class RequestContextExtensions
{
    public static Guid GetRequiredGuidClaim(this ClaimsPrincipal user, string claimType)
    {
        var value = user.FindFirst(claimType)?.Value;
        if (string.IsNullOrWhiteSpace(value) || !Guid.TryParse(value, out var guid))
        {
            throw new UnauthorizedAccessException($"Required GUID claim '{claimType}' missing");
        }
        return guid;
    }

    public static string GetRequiredStringClaim(this ClaimsPrincipal user, string claimType)
    {
        var value = user.FindFirst(claimType)?.Value;
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new UnauthorizedAccessException($"Required claim '{claimType}' missing");
        }
        return value;
    }
}
