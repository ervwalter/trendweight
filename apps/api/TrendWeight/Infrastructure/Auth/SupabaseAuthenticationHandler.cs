using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace TrendWeight.Infrastructure.Auth;

public class SupabaseAuthenticationSchemeOptions : AuthenticationSchemeOptions { }

public class SupabaseAuthenticationHandler : AuthenticationHandler<SupabaseAuthenticationSchemeOptions>
{
    private readonly ISupabaseTokenService _tokenService;

    public SupabaseAuthenticationHandler(
        IOptionsMonitor<SupabaseAuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        ISupabaseTokenService tokenService)
        : base(options, logger, encoder)
    {
        _tokenService = tokenService;
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

        var validationResult = _tokenService.ValidateTokenAndExtractClaims(token);

        if (!validationResult.IsValid)
        {
            return Task.FromResult(AuthenticateResult.Fail(validationResult.ErrorMessage ?? "Token validation failed"));
        }

        var ticket = new AuthenticationTicket(validationResult.Principal!, Scheme.Name);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
#pragma warning restore CS1998
}
