using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using TrendWeight.Infrastructure.Configuration;

namespace TrendWeight.Infrastructure.Auth;

public class ClerkTokenService : IClerkTokenService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ClerkTokenService> _logger;
    private readonly string _authority;
    private readonly string _jwksUrl;
    private JsonWebKeySet? _cachedKeySet;
    private DateTime _cacheExpiry = DateTime.MinValue;
    private const int CacheDurationMinutes = 60;

    public ClerkTokenService(
        IHttpClientFactory httpClientFactory,
        ILogger<ClerkTokenService> logger,
        IOptions<AppOptions> options)
    {
        _httpClient = httpClientFactory.CreateClient();
        _logger = logger;
        _authority = options.Value.Clerk.Authority;
        _jwksUrl = $"{_authority}/.well-known/jwks.json";
    }

    public async Task<ClaimsPrincipal?> ValidateTokenAsync(string token, string? requestOrigin = null)
    {
        try
        {
            var keySet = await GetJsonWebKeySetAsync();
            var tokenHandler = new JwtSecurityTokenHandler();

            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKeys = keySet.Keys,
                ValidateIssuer = true,
                ValidIssuer = _authority,
                ValidateAudience = false, // Clerk uses 'azp' claim, not standard 'aud'
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(5)
            };

            var principal = tokenHandler.ValidateToken(token, validationParameters, out var validatedToken);

            // Validate azp claim if request origin is provided
            if (!string.IsNullOrEmpty(requestOrigin))
            {
                var azp = principal.FindFirst("azp")?.Value;
                if (!string.IsNullOrEmpty(azp) && azp != requestOrigin)
                {
                    _logger.LogWarning("Token azp claim '{Azp}' does not match request origin '{Origin}'", azp, requestOrigin);
                    return null;
                }
            }

            return principal;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to validate Clerk JWT token");
            return null;
        }
    }

    public string? GetClerkUserId(ClaimsPrincipal principal)
    {
        // Clerk uses 'sub' claim for user ID
        return principal.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? principal.FindFirst("sub")?.Value
            ?? principal.FindFirst("userId")?.Value;
    }

    public string? GetEmail(ClaimsPrincipal principal)
    {
        return principal.FindFirst(ClaimTypes.Email)?.Value
            ?? principal.FindFirst("email")?.Value;
    }

    private async Task<JsonWebKeySet> GetJsonWebKeySetAsync()
    {
        if (_cachedKeySet != null && DateTime.UtcNow < _cacheExpiry)
        {
            return _cachedKeySet;
        }

        try
        {
            var response = await _httpClient.GetStringAsync(_jwksUrl);
            _cachedKeySet = JsonWebKeySet.Create(response);
            _cacheExpiry = DateTime.UtcNow.AddMinutes(CacheDurationMinutes);
            return _cachedKeySet;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch Clerk JWKS from {Url}", _jwksUrl);
            throw;
        }
    }

}
