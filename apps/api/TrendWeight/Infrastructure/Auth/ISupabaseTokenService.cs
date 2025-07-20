using System.Security.Claims;

namespace TrendWeight.Infrastructure.Auth;

public interface ISupabaseTokenService
{
    /// <summary>
    /// Validates a Supabase JWT token and extracts claims
    /// </summary>
    /// <param name="token">The JWT token to validate</param>
    /// <returns>A result containing the claims principal or error information</returns>
    TokenValidationResult ValidateTokenAndExtractClaims(string token);
}

public class TokenValidationResult
{
    public bool IsValid { get; init; }
    public ClaimsPrincipal? Principal { get; init; }
    public string? ErrorMessage { get; init; }

    public static TokenValidationResult Success(ClaimsPrincipal principal) => new()
    {
        IsValid = true,
        Principal = principal
    };

    public static TokenValidationResult Failure(string errorMessage) => new()
    {
        IsValid = false,
        ErrorMessage = errorMessage
    };
}
