using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using TrendWeight.Infrastructure.Configuration;

namespace TrendWeight.Infrastructure.Auth;

public class ClerkTokenService : IClerkTokenService, IDisposable
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<ClerkTokenService> _logger;
    private readonly TimeProvider _timeProvider;
    private readonly string _authority;
    private readonly string _jwksUrl;
    private JsonWebKeySet? _cachedKeySet;
    private DateTimeOffset _cacheExpiry = DateTimeOffset.MinValue;
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(60);
    private static readonly TimeSpan RefreshRetryInterval = TimeSpan.FromSeconds(30);
    private readonly SemaphoreSlim _keySetLock = new(1, 1);
    private DateTimeOffset _lastKeyRefreshAttempt = DateTimeOffset.MinValue;

    public ClerkTokenService(
        IHttpClientFactory httpClientFactory,
        ILogger<ClerkTokenService> logger,
        IOptions<AppOptions> options,
        TimeProvider timeProvider)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _timeProvider = timeProvider;
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

            ClaimsPrincipal principal;
            try
            {
                principal = tokenHandler.ValidateToken(token, validationParameters, out _);
            }
            catch (SecurityTokenSignatureKeyNotFoundException)
            {
                // Clerk can rotate signing keys before our cached JWKS expires.
                // Coalesce concurrent refreshes and limit untrusted unknown-kid requests.
                var refreshedKeySet = await GetJsonWebKeySetAsync(keySet);
                validationParameters.IssuerSigningKeys = refreshedKeySet.Keys;
                principal = tokenHandler.ValidateToken(token, validationParameters, out _);
            }

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

    /// <summary>
    /// Returns the cached key set while it is fresh, refreshing it once it expires or
    /// when <paramref name="previousKeySet"/> (the set a caller already tried) is the
    /// cached one. Refreshes are attempted at most once per
    /// <see cref="RefreshRetryInterval"/>; when a refresh fails, the previously
    /// cached keys keep serving so a Clerk outage does not become a sign-in outage.
    /// </summary>
    private async Task<JsonWebKeySet> GetJsonWebKeySetAsync(JsonWebKeySet? previousKeySet = null)
    {
        await _keySetLock.WaitAsync();
        try
        {
            var now = _timeProvider.GetUtcNow();
            var cached = _cachedKeySet;
            if (cached != null)
            {
                var callerAlreadyTriedCached = previousKeySet != null && ReferenceEquals(previousKeySet, cached);
                if (now < _cacheExpiry && !callerAlreadyTriedCached)
                {
                    return cached;
                }

                if (now - _lastKeyRefreshAttempt < RefreshRetryInterval)
                {
                    return cached;
                }
            }

            _lastKeyRefreshAttempt = now;
            try
            {
                var client = _httpClientFactory.CreateClient();
                var response = await client.GetStringAsync(_jwksUrl);
                _cachedKeySet = JsonWebKeySet.Create(response);
                _cacheExpiry = _timeProvider.GetUtcNow() + CacheDuration;
                return _cachedKeySet;
            }
            catch (Exception ex) when (cached != null)
            {
                _logger.LogWarning(ex, "Failed to refresh Clerk JWKS from {Url}; continuing with the cached key set", _jwksUrl);
                return cached;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fetch Clerk JWKS from {Url}", _jwksUrl);
                throw;
            }
        }
        finally
        {
            _keySetLock.Release();
        }
    }

    public void Dispose()
    {
        _keySetLock.Dispose();
        GC.SuppressFinalize(this);
    }
}
