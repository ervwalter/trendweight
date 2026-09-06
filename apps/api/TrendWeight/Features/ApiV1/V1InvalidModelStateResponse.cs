using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using TrendWeight.Features.ApiV1.Models;

namespace TrendWeight.Features.ApiV1;

/// <summary>
/// Model-binding failures on the /api/v1 surface (malformed JSON, a missing body, a
/// value of the wrong type) answer with the documented <see cref="V1ErrorResponse"/>
/// instead of the framework's ValidationProblemDetails. Other controllers keep the
/// framework default.
/// </summary>
public static class V1InvalidModelStateResponse
{
    public static void Configure(ApiBehaviorOptions options)
    {
        var defaultFactory = options.InvalidModelStateResponseFactory;
        options.InvalidModelStateResponseFactory = context =>
            context.ActionDescriptor is ControllerActionDescriptor { ControllerTypeInfo: var controller }
                && typeof(BaseApiV1Controller).IsAssignableFrom(controller)
                ? new BadRequestObjectResult(Create(context.ModelState))
                : defaultFactory(context);
    }

    public static V1ErrorResponse Create(ModelStateDictionary modelState)
    {
        var messages = modelState
            .Where(entry => entry.Value?.Errors.Count > 0)
            .SelectMany(entry => entry.Value!.Errors.Select(error =>
            {
                var message = string.IsNullOrEmpty(error.ErrorMessage) ? "The input was not valid." : error.ErrorMessage;
                return string.IsNullOrEmpty(entry.Key) ? message : $"{entry.Key}: {message}";
            }))
            .ToList();

        return new V1ErrorResponse
        {
            Error = messages.Count > 0 ? string.Join(" ", messages) : "The request is invalid."
        };
    }
}
