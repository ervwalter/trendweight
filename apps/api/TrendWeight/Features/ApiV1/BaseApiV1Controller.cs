using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TrendWeight.Infrastructure.Auth;

namespace TrendWeight.Features.ApiV1;

/// <summary>
/// Base for the external /api/v1 surface: API-key authentication only (a Clerk JWT
/// is rejected here, just as an API key is rejected on internal endpoints), and
/// grouped into the public "v1" OpenAPI document.
/// </summary>
[ApiController]
[Authorize(AuthenticationSchemes = ApiKeyAuthenticationHandler.SchemeName)]
[ApiExplorerSettings(GroupName = "v1")]
public abstract class BaseApiV1Controller : ControllerBase
{
    /// <summary>
    /// The authenticated user's internal id
    /// </summary>
    protected Guid UserId => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException("User ID not found"));
}
