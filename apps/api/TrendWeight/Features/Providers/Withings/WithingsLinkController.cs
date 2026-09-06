using Microsoft.AspNetCore.Mvc;
using TrendWeight.Features.Common;
using TrendWeight.Features.Common.Models;
using TrendWeight.Features.Providers.Exceptions;
using TrendWeight.Features.Providers.Models;

namespace TrendWeight.Features.Providers.Withings;

/// <summary>
/// Controller for Withings OAuth flow
/// </summary>
[ApiController]
[Route("api/withings")]
public class WithingsLinkController : BaseAuthController
{
    private readonly IWithingsService _withingsService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<WithingsLinkController> _logger;

    public WithingsLinkController(
        IWithingsService withingsService,
        IConfiguration configuration,
        ILogger<WithingsLinkController> logger)
    {
        _withingsService = withingsService;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Gets the Withings authorization URL for linking
    /// </summary>
    /// <returns>Authorization URL and state</returns>
    [HttpGet("link")]
    public IActionResult GetAuthorizationUrl()
    {
        try
        {

            // Get JWT signing key
            var jwtSigningKey = _configuration["Jwt:SigningKey"];
            if (string.IsNullOrEmpty(jwtSigningKey))
            {
                _logger.LogError("JWT signing key not configured");
                return StatusCode(500, new { error = "JWT signing key not configured" });
            }

            // Create OAuth state
            var state = new OAuthState
            {
                Uid = UserId,
                Reason = "link"
            };

            var signedState = OAuthStateToken.Create(jwtSigningKey, UserId, "withings");

            // Get callback URL - ForwardedHeaders middleware has already updated Request.Scheme and Request.Host
            var callbackUrl = $"{Request.Scheme}://{Request.Host}/oauth/withings/callback";

            _logger.LogInformation("Using callback URL: {CallbackUrl}", callbackUrl);

            // Get authorization URL
            var authorizationUrl = _withingsService.GetAuthorizationUrl(signedState, callbackUrl);



            return Ok(new
            {
                authorizationUrl = authorizationUrl,
                state = state
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating Withings authorization URL");
            return StatusCode(500, new { error = "Internal server error" });
        }
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

            if (!OAuthStateToken.IsValid(request.State, _configuration["Jwt:SigningKey"], UserId, "withings"))
            {
                return BadRequest(new { error = "Invalid or expired authorization state. Please connect your account again." });
            }

            // Build the redirect URI that was used in the authorization request
            // ForwardedHeaders middleware has already updated Request.Scheme and Request.Host
            var redirectUri = $"{Request.Scheme}://{Request.Host}/oauth/withings/callback";

            _logger.LogDebug("Exchanging Withings code for token with redirect URI: {RedirectUri}", redirectUri);

            var success = await _withingsService.ExchangeAuthorizationCodeAsync(request.Code, redirectUri, Guid.Parse(UserId));

            if (success)
            {
                return Ok(new { success = true, message = "Withings account successfully connected" });
            }

            return BadRequest(new { error = "Failed to complete authorization" });
        }
        catch (ProviderException ex)
        {
            _logger.LogError(ex, "Provider error during Withings token exchange");

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
            _logger.LogError(ex, "Unexpected error during Withings token exchange");
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

        public string State { get; set; } = string.Empty;
    }
}
