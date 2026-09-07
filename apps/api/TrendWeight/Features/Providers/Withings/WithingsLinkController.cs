using TrendWeight.Infrastructure.Configuration;
using Microsoft.AspNetCore.Mvc;
using TrendWeight.Features.Common;
using TrendWeight.Features.Common.Models;
using TrendWeight.Features.Providers.Exceptions;

namespace TrendWeight.Features.Providers.Withings;

/// <summary>
/// Controller for Withings OAuth flow
/// </summary>
[ApiController]
[Route("api/withings")]
public class WithingsLinkController : BaseAuthController
{
    private readonly PublicUrl _publicUrl;
    private readonly IWithingsService _withingsService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<WithingsLinkController> _logger;

    public WithingsLinkController(
        IWithingsService withingsService,
        IConfiguration configuration,
        ILogger<WithingsLinkController> logger,
        PublicUrl publicUrl)
    {
        _withingsService = withingsService;
        _configuration = configuration;
        _logger = logger;
        _publicUrl = publicUrl;
    }

    /// <summary>
    /// Gets the Withings authorization URL for linking
    /// </summary>
    /// <returns>Authorization URL</returns>
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
                return StatusCode(500, new ApiErrorResponse { Error = "JWT signing key not configured" });
            }

            // The signed state rides along in the authorization URL and is validated on exchange
            var signedState = OAuthStateToken.Create(jwtSigningKey, UserId, "withings");

            // Use the same configured origin for initiation and token exchange.
            var callbackUrl = _publicUrl.Callback("/oauth/withings/callback");

            _logger.LogInformation("Using callback URL: {CallbackUrl}", callbackUrl);

            // Get authorization URL
            var authorizationUrl = _withingsService.GetAuthorizationUrl(signedState, callbackUrl);

            return Ok(new { authorizationUrl });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating Withings authorization URL");
            return StatusCode(500, new ApiErrorResponse { Error = "Internal server error" });
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
                return BadRequest(new ApiErrorResponse { Error = "Authorization code is required" });
            }

            if (!OAuthStateToken.IsValid(request.State, _configuration["Jwt:SigningKey"], UserId, "withings"))
            {
                return BadRequest(new ApiErrorResponse { Error = "Invalid or expired authorization state. Please connect your account again." });
            }

            // Build the redirect URI that was used in the authorization request
            var redirectUri = _publicUrl.Callback("/oauth/withings/callback");

            _logger.LogDebug("Exchanging Withings code for token with redirect URI: {RedirectUri}", redirectUri);

            var success = await _withingsService.ExchangeAuthorizationCodeAsync(request.Code, redirectUri, Guid.Parse(UserId));

            if (success)
            {
                return Ok(new { success = true, message = "Withings account successfully connected" });
            }

            return BadRequest(new ApiErrorResponse { Error = "Failed to complete authorization" });
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
