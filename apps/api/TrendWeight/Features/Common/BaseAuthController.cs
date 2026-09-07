using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace TrendWeight.Features.Common;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public abstract class BaseAuthController : ControllerBase
{
    protected string UserId => User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException("User ID not found");

    /// <summary>
    /// The authenticated user's internal id. The claim is always a UUID for a valid
    /// session; anything else is treated as unauthenticated.
    /// </summary>
    protected Guid UserGuid => Guid.TryParse(UserId, out var id)
        ? id
        : throw new UnauthorizedAccessException("Invalid user ID");
}
