using Microsoft.AspNetCore.Mvc;
using TrendWeight.Common.Models;
using TrendWeight.Features.ApiKeys.Models;
using TrendWeight.Features.Common;

namespace TrendWeight.Features.ApiKeys;

/// <summary>
/// Interactive (Clerk-authenticated) management of the user's API key.
/// The key itself only authenticates against the external /api/v1 surface.
/// </summary>
[ApiController]
[Route("api/profile/api-key")]
public class ApiKeysController : BaseAuthController
{
    private readonly IApiKeyService _apiKeyService;

    public ApiKeysController(IApiKeyService apiKeyService)
    {
        _apiKeyService = apiKeyService;
    }

    /// <summary>
    /// Gets metadata about the user's API key (never the key itself)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiKeyMetadata>> GetMetadata()
    {
        var metadata = await _apiKeyService.GetMetadataAsync(Guid.Parse(UserId));
        if (metadata == null)
        {
            return NotFound(new ErrorResponse { Error = "Profile not found" });
        }

        return Ok(metadata);
    }

    /// <summary>
    /// Generates a new API key, replacing any existing one. The plaintext key is
    /// returned exactly once and cannot be retrieved later.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<GeneratedApiKey>> Generate()
    {
        var generated = await _apiKeyService.GenerateAsync(Guid.Parse(UserId));
        if (generated == null)
        {
            return NotFound(new ErrorResponse { Error = "Profile not found" });
        }

        return Ok(generated);
    }

    /// <summary>
    /// Revokes the user's API key
    /// </summary>
    [HttpDelete]
    public async Task<ActionResult<MessageResponse>> Revoke()
    {
        var revoked = await _apiKeyService.RevokeAsync(Guid.Parse(UserId));
        if (!revoked)
        {
            return NotFound(new ErrorResponse { Error = "Profile not found" });
        }

        return Ok(new MessageResponse { Message = "API key revoked" });
    }
}
