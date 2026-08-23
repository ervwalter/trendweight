using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using TrendWeight.Features.ApiKeys;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Infrastructure.Middleware;

namespace TrendWeight.Infrastructure.Auth;

/// <summary>
/// Authenticates requests carrying a TrendWeight API key ("sk-" prefixed), via either
/// an X-Api-Key header or an Authorization: Bearer header. Anything else returns
/// NoResult so the Clerk scheme (whose JWTs never start with "sk-") is unaffected.
/// Only the /api/v1 surface opts into this scheme.
/// </summary>
public class ApiKeyAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "ApiKey";
    public const string ApiKeyHeader = "X-Api-Key";

    private readonly IProfileService _profileService;
    private readonly ILogger<ApiKeyAuthenticationHandler> _logger;

    public ApiKeyAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IProfileService profileService)
        : base(options, logger, encoder)
    {
        _profileService = profileService;
        _logger = logger.CreateLogger<ApiKeyAuthenticationHandler>();
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var apiKey = ExtractApiKey();
        if (string.IsNullOrEmpty(apiKey))
        {
            return AuthenticateResult.NoResult();
        }

        // A credential that isn't an API key (e.g. a Clerk JWT) is not ours to judge
        if (!apiKey.StartsWith(ApiKeyService.KeyPrefix, StringComparison.Ordinal))
        {
            return AuthenticateResult.NoResult();
        }

        try
        {
            var profile = await _profileService.GetByApiKeyHashAsync(ApiKeyService.HashKey(apiKey));
            if (profile == null)
            {
                return AuthenticateResult.Fail("Invalid API key");
            }

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, profile.Uid.ToString()),
                new Claim(ClaimTypes.Email, profile.Email),
                new Claim(RateLimitPartitionResolver.ApiKeyAuthMethodClaim, RateLimitPartitionResolver.ApiKeyAuthMethodValue),
                new Claim("provider", "api_key")
            };

            var identity = new ClaimsIdentity(claims, Scheme.Name);
            var ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name);
            return AuthenticateResult.Success(ticket);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "API key authentication failed");
            return AuthenticateResult.Fail("Authentication failed");
        }
    }

    private string? ExtractApiKey()
    {
        string? headerKey = Request.Headers[ApiKeyHeader];
        if (!string.IsNullOrEmpty(headerKey))
        {
            return headerKey.Trim();
        }

        string? authorization = Request.Headers["Authorization"];
        if (!string.IsNullOrEmpty(authorization) && authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return authorization.Substring("Bearer ".Length).Trim();
        }

        return null;
    }
}
