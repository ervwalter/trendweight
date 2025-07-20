using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using TrendWeight.Features.Common;
using Microsoft.Extensions.Options;
using TrendWeight.Features.Common.Models;
using TrendWeight.Features.Providers.Exceptions;
using TrendWeight.Infrastructure.Configuration;

namespace TrendWeight.Features.Providers.Fitbit;

/// <summary>
/// Controller for initiating Fitbit OAuth flow
/// </summary>
[ApiController]
[Route("api/fitbit")]
public class FitbitLinkController : BaseAuthController
{
    private readonly IFitbitService _fitbitService;
    private readonly FitbitConfig _config;
    private readonly IConfiguration _configuration;
    private readonly ILogger<FitbitLinkController> _logger;

    /// <summary>
    /// Constructor
    /// </summary>
    public FitbitLinkController(
        IFitbitService fitbitService,
        IOptions<AppOptions> appOptions,
        IConfiguration configuration,
        ILogger<FitbitLinkController> logger)
    {
        _fitbitService = fitbitService;
        _config = appOptions.Value.Fitbit;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Initiates Fitbit OAuth flow
    /// </summary>
    [HttpGet("link")]
    public IActionResult LinkFitbit()
    {
        // Get JWT signing key
        var jwtSigningKey = _configuration["Jwt:SigningKey"];
        if (string.IsNullOrEmpty(jwtSigningKey))
        {
            _logger.LogError("JWT signing key not configured");
            return StatusCode(500, new { error = "JWT signing key not configured" });
        }

        // Generate state token with user ID and expiration
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.ASCII.GetBytes(jwtSigningKey);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim("uid", UserId),
                new Claim("reason", "link")
            }),
            Expires = DateTime.UtcNow.AddHours(1),
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        var state = tokenHandler.WriteToken(token);

        // Get callback URL - ForwardedHeaders middleware has already updated Request.Scheme and Request.Host
        var callbackUrl = $"{Request.Scheme}://{Request.Host}/oauth/fitbit/callback";

        _logger.LogInformation("Using callback URL: {CallbackUrl}", callbackUrl);

        // Get authorization URL
        var authUrl = _fitbitService.GetAuthorizationUrl(state, callbackUrl);

        _logger.LogInformation("Generated authorization URL: {AuthorizationUrl}", authUrl);

        return Ok(new { url = authUrl });
    }

    /// <summary>
    /// Exchange authorization code for access token
    /// </summary>
    [HttpPost("exchange-token")]
    public async Task<IActionResult> ExchangeToken([FromBody] ExchangeTokenRequest request)
    {
        try
        {
            if (string.IsNullOrEmpty(request.Code))
            {
                return BadRequest(new { error = "Authorization code is required" });
            }

            // Build the redirect URI that was used in the authorization request
            // ForwardedHeaders middleware has already updated Request.Scheme and Request.Host
            var redirectUri = $"{Request.Scheme}://{Request.Host}/oauth/fitbit/callback";

            _logger.LogDebug("Exchanging Fitbit code for token with redirect URI: {RedirectUri}", redirectUri);

            var success = await _fitbitService.ExchangeAuthorizationCodeAsync(request.Code, redirectUri, Guid.Parse(UserId));

            if (success)
            {
                return Ok(new { success = true, message = "Fitbit account successfully connected" });
            }

            return BadRequest(new { error = "Failed to complete authorization" });
        }
        catch (ProviderException ex)
        {
            _logger.LogError(ex, "Provider error during Fitbit token exchange");

            var response = new ApiErrorResponse
            {
                Error = ex.Message,
                ErrorCode = ex.ErrorCode,
                IsRetryable = ex.IsRetryable
            };

            // Return the appropriate status code based on the provider's response
            return StatusCode((int)ex.StatusCode, response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during Fitbit token exchange");
            return StatusCode(500, new ApiErrorResponse
            {
                Error = "An unexpected error occurred. Please try again.",
                ErrorCode = ErrorCodes.UnexpectedError,
                IsRetryable = false
            });
        }
    }

    /// <summary>
    /// Request model for token exchange
    /// </summary>
    public class ExchangeTokenRequest
    {
        /// <summary>
        /// Authorization code from OAuth provider
        /// </summary>
        public string Code { get; set; } = string.Empty;
    }
}
