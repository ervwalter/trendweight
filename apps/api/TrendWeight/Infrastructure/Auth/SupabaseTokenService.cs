using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using TrendWeight.Infrastructure.Configuration;

namespace TrendWeight.Infrastructure.Auth;

public class SupabaseTokenService : ISupabaseTokenService
{
    private readonly SupabaseConfig _supabaseConfig;
    private readonly ILogger<SupabaseTokenService> _logger;
    private readonly JwtSecurityTokenHandler _tokenHandler;

    public SupabaseTokenService(IOptions<AppOptions> appOptions, ILogger<SupabaseTokenService> logger)
    {
        _supabaseConfig = appOptions.Value.Supabase;
        _logger = logger;
        _tokenHandler = new JwtSecurityTokenHandler();
    }

    public TokenValidationResult ValidateTokenAndExtractClaims(string token)
    {
        try
        {
            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_supabaseConfig.JwtSecret)),
                ValidateIssuer = true,
                ValidIssuer = $"{_supabaseConfig.Url}/auth/v1",
                ValidateAudience = true,
                ValidAudience = "authenticated",
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(5)
            };

            var principal = _tokenHandler.ValidateToken(token, validationParameters, out var validatedToken);

            var jwtToken = (JwtSecurityToken)validatedToken;

            // Extract and map claims according to our business logic
            var claims = ExtractClaimsFromToken(jwtToken);

            var identity = new ClaimsIdentity(claims, "Supabase");
            var claimsPrincipal = new ClaimsPrincipal(identity);

            return TokenValidationResult.Success(claimsPrincipal);
        }
        catch (SecurityTokenExpiredException)
        {
            return TokenValidationResult.Failure("Token has expired");
        }
        catch (SecurityTokenValidationException)
        {
            return TokenValidationResult.Failure("Token validation failed");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during token validation");
            return TokenValidationResult.Failure("An error occurred during token validation");
        }
    }

    /// <summary>
    /// Extracts and maps claims from the JWT token according to our business logic
    /// This is the core logic we own and want to test
    /// </summary>
    private static List<Claim> ExtractClaimsFromToken(JwtSecurityToken jwtToken)
    {
        var claims = new List<Claim>();

        // Map 'sub' claim to both NameIdentifier and our custom supabase:uid
        var subClaim = jwtToken.Claims.FirstOrDefault(x => x.Type == "sub");
        if (subClaim != null)
        {
            claims.Add(new Claim(ClaimTypes.NameIdentifier, subClaim.Value));
            claims.Add(new Claim("supabase:uid", subClaim.Value));
        }

        // Map email claim
        var emailClaim = jwtToken.Claims.FirstOrDefault(x => x.Type == "email");
        if (emailClaim != null)
        {
            claims.Add(new Claim(ClaimTypes.Email, emailClaim.Value));
        }

        // Map role claim
        var roleClaim = jwtToken.Claims.FirstOrDefault(x => x.Type == "role");
        if (roleClaim != null)
        {
            claims.Add(new Claim(ClaimTypes.Role, roleClaim.Value));
        }

        // Add all other claims that aren't already mapped
        foreach (var claim in jwtToken.Claims)
        {
            if (!claims.Any(c => c.Type == claim.Type))
            {
                claims.Add(claim);
            }
        }

        return claims;
    }
}
