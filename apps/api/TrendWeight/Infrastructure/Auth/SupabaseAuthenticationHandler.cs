using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using TrendWeight.Infrastructure.Configuration;

namespace TrendWeight.Infrastructure.Auth;

public class SupabaseAuthenticationSchemeOptions : AuthenticationSchemeOptions { }

public class SupabaseAuthenticationHandler : AuthenticationHandler<SupabaseAuthenticationSchemeOptions>
{
    private readonly SupabaseConfig _supabaseConfig;

    public SupabaseAuthenticationHandler(
        IOptionsMonitor<SupabaseAuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IOptions<AppOptions> appOptions)
        : base(options, logger, encoder)
    {
        _supabaseConfig = appOptions.Value.Supabase;
    }

#pragma warning disable CS1998 // Async method lacks 'await' operators - required by base class
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.ContainsKey("Authorization"))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var authHeader = Request.Headers.Authorization.ToString();
        if (!authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var token = authHeader.Substring("Bearer ".Length).Trim();
        if (string.IsNullOrEmpty(token))
        {
            return Task.FromResult(AuthenticateResult.Fail("Token is empty"));
        }

        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();
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

            var principal = tokenHandler.ValidateToken(token, validationParameters, out var validatedToken);
            var jwtToken = (JwtSecurityToken)validatedToken;

            // Extract claims from the JWT
            var claims = new List<Claim>();

            // Add the sub claim as NameIdentifier
            var subClaim = jwtToken.Claims.FirstOrDefault(x => x.Type == "sub");
            if (subClaim != null)
            {
                claims.Add(new Claim(ClaimTypes.NameIdentifier, subClaim.Value));
                claims.Add(new Claim("supabase:uid", subClaim.Value));
            }

            // Add email claim
            var emailClaim = jwtToken.Claims.FirstOrDefault(x => x.Type == "email");
            if (emailClaim != null)
            {
                claims.Add(new Claim(ClaimTypes.Email, emailClaim.Value));
            }

            // Add role claim
            var roleClaim = jwtToken.Claims.FirstOrDefault(x => x.Type == "role");
            if (roleClaim != null)
            {
                claims.Add(new Claim(ClaimTypes.Role, roleClaim.Value));
            }

            // Add all other claims for reference
            foreach (var claim in jwtToken.Claims)
            {
                if (!claims.Any(c => c.Type == claim.Type))
                {
                    claims.Add(claim);
                }
            }

            var identity = new ClaimsIdentity(claims, Scheme.Name);
            var claimsPrincipal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(claimsPrincipal, Scheme.Name);

            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
        catch (SecurityTokenExpiredException)
        {
            return Task.FromResult(AuthenticateResult.Fail("Token has expired"));
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "Supabase authentication failed");
            return Task.FromResult(AuthenticateResult.Fail(ex));
        }
    }
#pragma warning restore CS1998
}
