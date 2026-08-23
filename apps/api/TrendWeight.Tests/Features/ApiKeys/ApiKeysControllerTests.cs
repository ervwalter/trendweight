using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using TrendWeight.Common.Models;
using TrendWeight.Features.ApiKeys;
using TrendWeight.Features.ApiKeys.Models;
using Xunit;

namespace TrendWeight.Tests.Features.ApiKeys;

public class ApiKeysControllerTests
{
    private readonly Mock<IApiKeyService> _apiKeyServiceMock;
    private readonly ApiKeysController _sut;
    private readonly Guid _userId = Guid.NewGuid();

    public ApiKeysControllerTests()
    {
        _apiKeyServiceMock = new Mock<IApiKeyService>();
        _sut = new ApiKeysController(_apiKeyServiceMock.Object);

        var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, _userId.ToString()) };
        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"))
            }
        };
    }

    [Fact]
    public async Task GetMetadata_ReturnsMetadata()
    {
        var metadata = new ApiKeyMetadata { Exists = true, Suffix = "wxyz", CreatedAt = "2026-08-23T00:00:00Z" };
        _apiKeyServiceMock.Setup(x => x.GetMetadataAsync(_userId)).ReturnsAsync(metadata);

        var result = await _sut.GetMetadata();

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().Be(metadata);
    }

    [Fact]
    public async Task GetMetadata_ReturnsNotFoundWhenProfileMissing()
    {
        _apiKeyServiceMock.Setup(x => x.GetMetadataAsync(_userId)).ReturnsAsync((ApiKeyMetadata?)null);

        var result = await _sut.GetMetadata();

        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Generate_ReturnsPlaintextKeyOnce()
    {
        var generated = new GeneratedApiKey { ApiKey = "sk-abc", Suffix = "-abc", CreatedAt = "2026-08-23T00:00:00Z" };
        _apiKeyServiceMock.Setup(x => x.GenerateAsync(_userId)).ReturnsAsync(generated);

        var result = await _sut.Generate();

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().Be(generated);
    }

    [Fact]
    public async Task Generate_ReturnsNotFoundWhenProfileMissing()
    {
        _apiKeyServiceMock.Setup(x => x.GenerateAsync(_userId)).ReturnsAsync((GeneratedApiKey?)null);

        var result = await _sut.Generate();

        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Revoke_ReturnsMessage()
    {
        _apiKeyServiceMock.Setup(x => x.RevokeAsync(_userId)).ReturnsAsync(true);

        var result = await _sut.Revoke();

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeOfType<MessageResponse>();
        _apiKeyServiceMock.Verify(x => x.RevokeAsync(_userId), Times.Once);
    }

    [Fact]
    public async Task Revoke_ReturnsNotFoundWhenProfileMissing()
    {
        _apiKeyServiceMock.Setup(x => x.RevokeAsync(_userId)).ReturnsAsync(false);

        var result = await _sut.Revoke();

        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }
}
