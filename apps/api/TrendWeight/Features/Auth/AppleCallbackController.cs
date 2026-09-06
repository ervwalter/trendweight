using TrendWeight.Infrastructure.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace TrendWeight.Features.Auth;

[ApiController]
[Route("api/auth/apple")]
[AllowAnonymous]
public class AppleCallbackController : ControllerBase
{
    private readonly PublicUrl _publicUrl;

    public AppleCallbackController(PublicUrl publicUrl) => _publicUrl = publicUrl;

    [HttpPost("callback")]
    public IActionResult Callback()
    {
        // Convert form data to query string
        var queryString = string.Join("&", Request.Form.Select(kvp =>
            $"{Uri.EscapeDataString(kvp.Key)}={Uri.EscapeDataString(kvp.Value.ToString())}"));

        // Redirect to frontend with all the form data as query parameters
        var redirectUrl = $"{_publicUrl.Callback("/auth/apple/callback")}?{queryString}";

        return Redirect(redirectUrl);
    }
}
