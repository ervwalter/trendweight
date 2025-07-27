using System.Security.Claims;

namespace TrendWeight.Infrastructure.Auth;

public interface IClerkTokenService
{
    Task<ClaimsPrincipal?> ValidateTokenAsync(string token);
    string? GetClerkUserId(ClaimsPrincipal principal);
    string? GetEmail(ClaimsPrincipal principal);
}
