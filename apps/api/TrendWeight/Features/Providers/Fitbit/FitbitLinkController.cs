using Microsoft.AspNetCore.Mvc;
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
    private readonly PublicUrl _publicUrl;
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
        ILogger<FitbitLinkController> logger,
        PublicUrl publicUrl)
    {
        _fitbitService = fitbitService;
        _config = appOptions.Value.Fitbit;
        _configuration = configuration;
        _logger = logger;
        _publicUrl = publicUrl;
    }

    /// <summary>
    /// Initiates Fitbit OAuth flow
    /// </summary>
    [HttpGet("link")]
    public IActionResult LinkFitbit()
    {
        if (!_config.Enabled)
        {
            return FitbitDisabledResponse();
        }

        // Get JWT signing key
        var jwtSigningKey = _configuration["Jwt:SigningKey"];
        if (string.IsNullOrEmpty(jwtSigningKey))
        {
            _logger.LogError("JWT signing key not configured");
            return StatusCode(500, new { error = "JWT signing key not configured" });
        }

        var state = OAuthStateToken.Create(jwtSigningKey, UserId, "fitbit");

        // Use the same configured origin for initiation and token exchange.
        var callbackUrl = _publicUrl.Callback("/oauth/fitbit/callback");

        _logger.LogInformation("Using callback URL: {CallbackUrl}", callbackUrl);

        // Get authorization URL
        var authUrl = _fitbitService.GetAuthorizationUrl(state, callbackUrl);



        return Ok(new { url = authUrl });
    }

    /// <summary>
    /// Exchange authorization code for access token
    /// </summary>
    [HttpPost("exchange-token")]
    public async Task<IActionResult> ExchangeToken([FromBody] ExchangeTokenRequest request)
    {
        if (!_config.Enabled)
        {
            return FitbitDisabledResponse();
        }

        try
        {
            if (string.IsNullOrEmpty(request.Code))
            {
                return BadRequest(new { error = "Authorization code is required" });
            }

            if (!OAuthStateToken.IsValid(request.State, _configuration["Jwt:SigningKey"], UserId, "fitbit"))
            {
                return BadRequest(new { error = "Invalid or expired authorization state. Please connect your account again." });
            }

            // Build the redirect URI that was used in the authorization request
            var redirectUri = _publicUrl.Callback("/oauth/fitbit/callback");

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

    private ObjectResult FitbitDisabledResponse()
    {
        return StatusCode(StatusCodes.Status503ServiceUnavailable, new ApiErrorResponse
        {
            Error = "Fitbit connections are no longer available. Google has retired the Fitbit API that TrendWeight used.",
            ErrorCode = ErrorCodes.ProviderDisabled,
            IsRetryable = false
        });
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
