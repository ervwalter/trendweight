using System.Reflection;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Routing;
using TrendWeight.Features.ApiV1;
using TrendWeight.Features.ApiV1.Models;

namespace TrendWeight.Tests.Features.ApiV1;

public class V1InvalidModelStateResponseTests
{
    [Fact]
    public void Create_WithNoErrors_UsesTheGenericMessage()
    {
        var response = V1InvalidModelStateResponse.Create(new ModelStateDictionary());

        response.Error.Should().Be("The request is invalid.");
        response.Errors.Should().BeNull();
    }

    [Fact]
    public void Create_PrefixesTheMessageWithTheFieldName()
    {
        var modelState = new ModelStateDictionary();
        modelState.AddModelError("weight", "must be > 0");

        V1InvalidModelStateResponse.Create(modelState).Error.Should().Be("weight: must be > 0");
    }

    [Fact]
    public void Create_WithAnEmptyKey_ReturnsTheMessageAlone()
    {
        var modelState = new ModelStateDictionary();
        modelState.AddModelError(string.Empty, "A non-empty request body is required.");

        V1InvalidModelStateResponse.Create(modelState).Error.Should().Be("A non-empty request body is required.");
    }

    [Fact]
    public void Create_WithAnEmptyMessage_SubstitutesAGenericOne()
    {
        var modelState = new ModelStateDictionary();
        modelState.AddModelError("weight", string.Empty);

        V1InvalidModelStateResponse.Create(modelState).Error.Should().Be("weight: The input was not valid.");
    }

    [Fact]
    public void Create_WithAnEmptyKeyAndMessage_ReturnsOnlyTheGenericMessage()
    {
        var modelState = new ModelStateDictionary();
        modelState.AddModelError(string.Empty, string.Empty);

        V1InvalidModelStateResponse.Create(modelState).Error.Should().Be("The input was not valid.");
    }

    [Fact]
    public void Create_JoinsEveryErrorWithASingleSpace()
    {
        var modelState = new ModelStateDictionary();
        modelState.AddModelError("weight", "must be > 0");
        modelState.AddModelError("weight", "must be a number");
        modelState.AddModelError("fatRatio", "must be between 0 and 1");

        var response = V1InvalidModelStateResponse.Create(modelState);

        response.Error.Should().Be("weight: must be > 0 weight: must be a number fatRatio: must be between 0 and 1");
    }

    [Fact]
    public void Create_IgnoresEntriesWithoutErrors()
    {
        var modelState = new ModelStateDictionary();
        modelState.SetModelValue("date", "2024-01-01", "2024-01-01");
        modelState.AddModelError("weight", "must be > 0");

        V1InvalidModelStateResponse.Create(modelState).Error.Should().Be("weight: must be > 0");
    }

    [Fact]
    public void Configure_ForAV1Controller_AnswersBadRequestWithTheV1ErrorShape()
    {
        var (options, originalCalls) = ConfigureWithCountingDefault();
        var context = CreateActionContext(typeof(V1MeasurementsController), "weight", "must be > 0");

        var result = options.InvalidModelStateResponseFactory(context);

        var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
        badRequest.Value.Should().BeOfType<V1ErrorResponse>().Which.Error.Should().Be("weight: must be > 0");
        originalCalls.Count.Should().Be(0);
    }

    [Fact]
    public void Configure_ForAnInternalController_DelegatesToTheOriginalFactory()
    {
        var (options, originalCalls) = ConfigureWithCountingDefault();
        var context = CreateActionContext(typeof(InternalController), "weight", "must be > 0");

        var result = options.InvalidModelStateResponseFactory(context);

        result.Should().BeSameAs(originalCalls.Result);
        originalCalls.Count.Should().Be(1);
    }

    [Fact]
    public void Configure_ForANonControllerAction_DelegatesToTheOriginalFactory()
    {
        var (options, originalCalls) = ConfigureWithCountingDefault();
        var modelState = new ModelStateDictionary();
        modelState.AddModelError("weight", "must be > 0");
        var context = new ActionContext(new DefaultHttpContext(), new RouteData(), new ActionDescriptor(), modelState);

        var result = options.InvalidModelStateResponseFactory(context);

        result.Should().BeSameAs(originalCalls.Result);
        originalCalls.Count.Should().Be(1);
    }

    private static (ApiBehaviorOptions Options, OriginalFactoryCalls Calls) ConfigureWithCountingDefault()
    {
        var calls = new OriginalFactoryCalls();
        var options = new ApiBehaviorOptions
        {
            InvalidModelStateResponseFactory = _ =>
            {
                calls.Count++;
                return calls.Result;
            }
        };

        V1InvalidModelStateResponse.Configure(options);
        return (options, calls);
    }

    private static ActionContext CreateActionContext(Type controllerType, string key, string message)
    {
        var modelState = new ModelStateDictionary();
        modelState.AddModelError(key, message);
        var descriptor = new ControllerActionDescriptor { ControllerTypeInfo = controllerType.GetTypeInfo() };
        return new ActionContext(new DefaultHttpContext(), new RouteData(), descriptor, modelState);
    }

    private sealed class OriginalFactoryCalls
    {
        public int Count { get; set; }
        public IActionResult Result { get; } = new ObjectResult("framework default");
    }

    private sealed class InternalController : ControllerBase
    {
    }
}
