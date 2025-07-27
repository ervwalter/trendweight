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
        _jwksUrl = options.Value.Clerk.JwksUrl;
    }

    public async Task<ClaimsPrincipal?> ValidateTokenAsync(string token)
    {
        try
        {
            var keySet = await GetJsonWebKeySetAsync();
            var tokenHandler = new JwtSecurityTokenHandler();

            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKeys = keySet.Keys,
                ValidateIssuer = false, // Clerk doesn't use issuer validation
                ValidateAudience = false, // Clerk doesn't use audience validation
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(5)
            };

            var principal = tokenHandler.ValidateToken(token, validationParameters, out var validatedToken);
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
