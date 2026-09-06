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
}
