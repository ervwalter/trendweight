using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace TrendWeight.Infrastructure.Auth;

public class ClerkAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly IClerkTokenService _clerkTokenService;
    private readonly IUserAccountMappingService _userAccountMappingService;
    private readonly ILogger<ClerkAuthenticationHandler> _logger;

    public ClerkAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IClerkTokenService clerkTokenService,
        IUserAccountMappingService userAccountMappingService)
        : base(options, logger, encoder)
    {
        _clerkTokenService = clerkTokenService;
        _userAccountMappingService = userAccountMappingService;
        _logger = logger.CreateLogger<ClerkAuthenticationHandler>();
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        // Get the authorization header
        string? authorization = Request.Headers["Authorization"];

        if (string.IsNullOrEmpty(authorization))
        {
            return AuthenticateResult.NoResult();
        }

        if (!authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return AuthenticateResult.NoResult();
        }

        var token = authorization.Substring("Bearer ".Length).Trim();

        if (string.IsNullOrEmpty(token))
        {
            return AuthenticateResult.NoResult();
        }

        try
        {
            // Validate the Clerk JWT
            var claimsPrincipal = await _clerkTokenService.ValidateTokenAsync(token);
            if (claimsPrincipal == null)
            {
                return AuthenticateResult.Fail("Invalid token");
            }

            // Extract Clerk user ID and email
            var clerkUserId = _clerkTokenService.GetClerkUserId(claimsPrincipal);
            var email = _clerkTokenService.GetEmail(claimsPrincipal);

            if (string.IsNullOrEmpty(clerkUserId) || string.IsNullOrEmpty(email))
            {
                return AuthenticateResult.Fail("Token missing required claims");
            }

            // Get or create user mapping
            var userAccount = await _userAccountMappingService.GetOrCreateMappingAsync(clerkUserId, email, "clerk");

            // Create new claims with internal user ID
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, userAccount.Uid.ToString()),
                new Claim(ClaimTypes.Email, email!),
                new Claim("clerk_user_id", clerkUserId),
                new Claim("provider", "clerk")
            };

            // Copy any additional claims from the original principal
            foreach (var claim in claimsPrincipal.Claims)
            {
                if (claim.Type != ClaimTypes.NameIdentifier &&
                    claim.Type != ClaimTypes.Email &&
                    claim.Type != "sub" &&
                    claim.Type != "userId" &&
                    claim.Type != "email")
                {
                    claims.Add(claim);
                }
            }

            var identity = new ClaimsIdentity(claims, Scheme.Name);
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, Scheme.Name);

            return AuthenticateResult.Success(ticket);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Authentication failed");
            return AuthenticateResult.Fail("Authentication failed");
        }
    }
}
