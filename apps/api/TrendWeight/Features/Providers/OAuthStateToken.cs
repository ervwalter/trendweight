using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace TrendWeight.Features.Providers;

/// <summary>Signs OAuth state and binds callbacks to the initiating user and provider.</summary>
public static class OAuthStateToken
{
    public static string Create(string signingKey, string userId, string provider)
    {
        var handler = new JwtSecurityTokenHandler();
        var token = handler.CreateToken(new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim("uid", userId),
                new Claim("reason", "link"),
                new Claim("provider", provider),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            }),
            Expires = DateTime.UtcNow.AddHours(1),
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)),
                SecurityAlgorithms.HmacSha256Signature)
        });
        return handler.WriteToken(token);
    }

    public static bool IsValid(string? state, string? signingKey, string userId, string provider)
    {
        if (string.IsNullOrWhiteSpace(state) || string.IsNullOrEmpty(signingKey))
        {
            return false;
        }

        try
        {
            var principal = new JwtSecurityTokenHandler().ValidateToken(state, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)),
                ValidAlgorithms = new[] { SecurityAlgorithms.HmacSha256 },
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
                RequireExpirationTime = true,
                ClockSkew = TimeSpan.Zero
            }, out _);
            return principal.FindFirst("uid")?.Value == userId
                && principal.FindFirst("reason")?.Value == "link"
                && principal.FindFirst("provider")?.Value == provider;
        }
        catch (SecurityTokenException)
        {
            return false;
        }
        catch (ArgumentException)
        {
            return false;
        }
    }
}
