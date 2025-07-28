using System.Security.Claims;

namespace TrendWeight.Infrastructure.Auth;

public interface IClerkTokenService
{
    Task<ClaimsPrincipal?> ValidateTokenAsync(string token, string? requestOrigin = null);
    string? GetClerkUserId(ClaimsPrincipal principal);
    string? GetEmail(ClaimsPrincipal principal);
}
