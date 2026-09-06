using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moq;
using TrendWeight.Features.ApiKeys;
using TrendWeight.Features.Measurements.Manual;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Features.Profile.Models;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Infrastructure.Auth;
using TrendWeight.Infrastructure.DataAccess;
using TrendWeight.Infrastructure.DataAccess.Models;

namespace TrendWeight.Tests.Infrastructure.Startup;

public class RequestPipelineTests : IClassFixture<StartupTestFactory>
{
    private readonly StartupTestFactory _factory;

    public RequestPipelineTests(StartupTestFactory factory) => _factory = factory;

    [Theory]
    [InlineData("Development", null, "http://localhost:5173")]
    [InlineData("Production", "https://canonical.example/", "https://canonical.example")]
    public async Task ClerkAuthentication_UsesPublicOriginBehindProxy(string environment, string? configuredOrigin, string expectedOrigin)
    {
        var tokens = new Mock<IClerkTokenService>();
        var principal = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim("sub", "clerk-test") }, "jwt"));
        tokens.Setup(x => x.ValidateTokenAsync("origin-test-jwt", expectedOrigin)).ReturnsAsync(principal);
        tokens.Setup(x => x.GetClerkUserId(principal)).Returns("clerk-test");
        tokens.Setup(x => x.GetEmail(principal)).Returns("clerk@example.com");
        using var factory = _factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(environment);
            builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(
                new Dictionary<string, string?> { ["PublicBaseUrl"] = configuredOrigin }));
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IClerkTokenService>();
                services.AddSingleton(tokens.Object);
            });
        });
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, "http://localhost:5199/api/measurements/manual");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", "origin-test-jwt");
        request.Headers.Add("Origin", "https://attacker.example");
        request.Headers.Add("X-Forwarded-Host", "attacker.example");
        request.Headers.Add("X-Forwarded-Proto", "https");

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        tokens.Verify(x => x.ValidateTokenAsync("origin-test-jwt", expectedOrigin), Times.Once);
    }

    [Fact]
    public async Task ApiDocumentation_AdvertisesCanonicalOriginForInternalHttp()
    {
        using var client = _factory.CreateHttpsClient();
        using var response = await client.GetAsync("http://localhost/openapi/v1.json", TestContext.Current.CancellationToken);
        response.EnsureSuccessStatusCode();
        using var document = System.Text.Json.JsonDocument.Parse(
            await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
        document.RootElement.GetProperty("servers")[0].GetProperty("url").GetString()
            .Should().Be("https://canonical.example");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("http://canonical.example")]
    public void InvalidPublicOrigin_PreventsProductionStartup(string? origin)
    {
        using var factory = _factory.WithWebHostBuilder(builder =>
            builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(
                new Dictionary<string, string?> { ["PublicBaseUrl"] = origin })));
        var start = () => factory.CreateClient();
        start.Should().Throw<InvalidOperationException>().WithMessage("PublicBaseUrl*");
    }

    [Theory]
    [InlineData("http", "untrusted.example")]
    [InlineData("https", "localhost")]
    public async Task AppleCallback_UsesCanonicalOriginDespiteIncomingHeaders(string scheme, string host)
    {
        using var client = _factory.CreateHttpsClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{scheme}://{host}/api/auth/apple/callback");
        request.Headers.Add("X-Forwarded-Host", "attacker.example");
        request.Headers.Add("X-Forwarded-Proto", "http");
        request.Content = new FormUrlEncodedContent(new Dictionary<string, string> { ["code"] = "test-code" });

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.Redirect);
        response.Headers.Location!.AbsoluteUri.Should().Be("https://canonical.example/auth/apple/callback?code=test-code");
    }

    [Fact]
    public async Task HostValidation_RejectsInvalidHostEvenWhenForwardedHostIsAllowed()
    {
        using var factory = _factory.WithWebHostBuilder(builder =>
            builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(
                new Dictionary<string, string?> { ["AllowedHosts"] = "localhost" })));
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        using var request = new HttpRequestMessage(HttpMethod.Get, "http://attacker.example/api/health");
        request.Headers.Add("X-Forwarded-Host", "localhost");

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Theory]
    [InlineData("/api/measurements/manual", null, HttpStatusCode.Unauthorized)]
    [InlineData("/api/v1/measurements/manual", null, HttpStatusCode.Unauthorized)]
    [InlineData("/api/measurements/manual", StartupTestFactory.ApiKey, HttpStatusCode.Unauthorized)]
    [InlineData("/api/v1/measurements/manual", "test-clerk-jwt", HttpStatusCode.Unauthorized)]
    [InlineData("/api/measurements/manual", "test-clerk-jwt", HttpStatusCode.OK)]
    [InlineData("/api/v1/measurements/manual", StartupTestFactory.ApiKey, HttpStatusCode.OK)]
    public async Task MeasurementEndpoints_EnforceAuthenticationScheme(string path, string? token, HttpStatusCode expected)
    {
        using var client = _factory.CreateHttpsClient();
        if (token != null)
        {
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        using var response = await client.GetAsync(path, TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(expected);
        if (expected == HttpStatusCode.OK)
        {
            // Each real authentication handler resolves a different owner. The
            // manual-service double returns that owner's distinct measurement.
            var expectedWeight = token == StartupTestFactory.ApiKey ? "82" : "73";
            (await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken)).Should().Contain($"\"weight\":{expectedWeight}");
        }
    }

    [Fact]
    public async Task ApiKeyHeader_WorksOnlyOnExternalEndpoints()
    {
        using var client = _factory.CreateHttpsClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", StartupTestFactory.ApiKey);

        using var external = await client.GetAsync("/api/v1/measurements/manual", TestContext.Current.CancellationToken);
        using var internalResponse = await client.GetAsync("/api/measurements/manual", TestContext.Current.CancellationToken);

        external.StatusCode.Should().Be(HttpStatusCode.OK);
        internalResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ApiKeyAuthorization_ReplacesDefaultClerkPrincipal()
    {
        using var client = _factory.CreateHttpsClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "test-clerk-jwt");
        client.DefaultRequestHeaders.Add("X-Api-Key", StartupTestFactory.ApiKey);

        using var response = await client.GetAsync("/api/v1/measurements/manual", TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken)).Should().Contain("\"weight\":82");
    }

    [Fact]
    public async Task ApiKeyRequests_AreLimitedAfterSchemeAuthorization()
    {
        // A separate host gives this test an unused fixed-window partition.
        using var factory = new StartupTestFactory();
        using var client = factory.CreateHttpsClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", StartupTestFactory.ApiKey);
        for (var i = 0; i < 60; i++)
        {
            using var allowed = await client.GetAsync("/api/v1/measurements/manual", TestContext.Current.CancellationToken);
            allowed.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        using var rejected = await client.GetAsync("/api/v1/measurements/manual", TestContext.Current.CancellationToken);

        rejected.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
        (await rejected.Content.ReadAsStringAsync(TestContext.Current.CancellationToken)).Should().Contain("RATE_LIMIT_EXCEEDED");
    }

    [Theory]
    [InlineData("/api/profile/disabled-share")]
    [InlineData("/api/data/disabled-share")]
    [InlineData("/api/providers/links/disabled-share")]
    public async Task DisabledSharing_CannotBeReadAnonymously(string path)
    {
        using var client = _factory.CreateHttpsClient();

        using var response = await client.GetAsync(path, TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Theory]
    [InlineData("/api/missing", "GET")]
    [InlineData("/api/missing/", "GET")]
    [InlineData("/API/missing", "HEAD")]
    [InlineData("/api", "GET")]
    [InlineData("/dashboard", "POST")]
    public async Task NonSpaRequests_DoNotReceiveApplicationShell(string path, string method)
    {
        using var client = _factory.CreateHttpsClient();
        using var request = new HttpRequestMessage(new HttpMethod(method), path);

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        response.Headers.Location.Should().BeNull();
        (await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken)).Should().NotContain(StartupTestFactory.Shell);
    }

    [Theory]
    [InlineData("/dashboard")]
    [InlineData("/index.html")]
    public async Task ApplicationShell_IsNeverStoredInCaches(string path)
    {
        using var client = _factory.CreateHttpsClient();

        using var response = await client.GetAsync(path, TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Headers.CacheControl!.NoStore.Should().BeTrue();
        (await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken)).Should().Be(StartupTestFactory.Shell);
    }

    [Fact]
    public async Task HashedAssets_KeepImmutableCaching()
    {
        using var client = _factory.CreateHttpsClient();

        using var response = await client.GetAsync("/assets/app-abcdefgh.js", TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Headers.CacheControl!.MaxAge.Should().Be(TimeSpan.FromDays(365));
    }

    [Theory]
    [InlineData("//evil.example/")]
    [InlineData("/\\evil.example/")]
    public async Task AmbiguousPaths_CannotRedirectToExternalHost(string path)
    {
        // Set the raw path directly; HttpClient/Uri would normalize these paths
        // before they reach the server and hide the redirect vulnerability.
        var response = await _factory.Server.SendAsync(context =>
        {
            context.Request.Method = "GET";
            context.Request.Scheme = "https";
            context.Request.Host = new HostString("localhost");
            context.Request.Path = path;
        }, TestContext.Current.CancellationToken);

        response.Response.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
        response.Response.Headers.Location.Should().BeEmpty();
    }

    [Fact]
    public async Task TrailingSlashRedirect_StaysLocalAndPreservesQuery()
    {
        using var client = _factory.CreateHttpsClient();

        using var response = await client.GetAsync("/dashboard/?range=month", TestContext.Current.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.MovedPermanently);
        response.Headers.Location!.OriginalString.Should().Be("/dashboard?range=month");
    }

    [Theory]
    [InlineData("127.0.0.1")]
    [InlineData("10.20.30.40")]
    [InlineData("10.30.40.50")]
    [InlineData("203.0.113.10")]
    public async Task ForwardedHeaders_AreIgnoredAndInternalHttpDoesNotRedirect(string peer)
    {
        var response = await _factory.Server.SendAsync(context =>
        {
            context.Connection.RemoteIpAddress = IPAddress.Parse(peer);
            context.Request.Method = "GET";
            context.Request.Scheme = "http";
            context.Request.Host = new HostString("localhost");
            context.Request.Path = "/api/health";
            context.Request.Headers["X-Forwarded-For"] = "198.51.100.20";
            context.Request.Headers["X-Forwarded-Host"] = "forwarded.example";
            context.Request.Headers["X-Forwarded-Proto"] = "https";
        }, TestContext.Current.CancellationToken);

        response.Response.StatusCode.Should().Be(StatusCodes.Status200OK);
        response.Request.Scheme.Should().Be("http");
        response.Request.Host.Host.Should().Be("localhost");
        response.Connection.RemoteIpAddress.Should().Be(IPAddress.Parse(peer));
    }
}

public sealed class StartupTestFactory : WebApplicationFactory<Program>
{
    public const string ApiKey = "sk-pipeline-test-key";
    public const string Shell = "<!doctype html><title>Pipeline test shell</title>";
    private readonly string _webRoot = Path.Combine(Path.GetTempPath(), $"trendweight-pipeline-{Guid.NewGuid():N}");

    public StartupTestFactory()
    {
        Directory.CreateDirectory(Path.Combine(_webRoot, "assets"));
        File.WriteAllText(Path.Combine(_webRoot, "index.html"), Shell);
        File.WriteAllText(Path.Combine(_webRoot, "assets", "app-abcdefgh.js"), "/* test asset */");
    }

    public HttpClient CreateHttpsClient() => CreateClient(new WebApplicationFactoryClientOptions
    {
        BaseAddress = new Uri("https://localhost"),
        AllowAutoRedirect = false
    });

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Production");
        builder.UseWebRoot(_webRoot);
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["AllowedHosts"] = "*",
            ["PublicBaseUrl"] = "https://canonical.example"
        }));
        builder.ConfigureServices(services =>
        {
            var clerkUserId = Guid.NewGuid();
            var apiUserId = Guid.NewGuid();
            var tokens = new Mock<IClerkTokenService>();
            var principal = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim("sub", "clerk-test") }, "jwt"));
            tokens.Setup(x => x.ValidateTokenAsync("test-clerk-jwt", It.IsAny<string>())).ReturnsAsync(principal);
            tokens.Setup(x => x.GetClerkUserId(principal)).Returns("clerk-test");
            tokens.Setup(x => x.GetEmail(principal)).Returns("clerk@example.com");
            var mapping = new Mock<IUserAccountMappingService>();
            mapping.Setup(x => x.GetOrCreateMappingAsync("clerk-test", "clerk@example.com", "clerk"))
                .ReturnsAsync(new DbUserAccount { Uid = clerkUserId, ExternalId = "clerk-test", Provider = "clerk" });
            var profiles = new Mock<IProfileService>();
            profiles.Setup(x => x.GetByApiKeyHashAsync(ApiKeyService.HashKey(ApiKey)))
                .ReturnsAsync(new DbProfile { Uid = apiUserId, Email = "api@example.com", Profile = new ProfileData() });
            profiles.Setup(x => x.GetBySharingTokenAsync("disabled-share"))
                .ReturnsAsync(new DbProfile { Uid = Guid.NewGuid(), Profile = new ProfileData { SharingEnabled = false } });
            var manual = new Mock<IManualDataService>();
            manual.Setup(x => x.GetReadingsAsync(clerkUserId))
                .ReturnsAsync(new List<RawMeasurement> { new() { Date = "2024-01-01", Weight = 73m } });
            manual.Setup(x => x.GetReadingsAsync(apiUserId))
                .ReturnsAsync(new List<RawMeasurement> { new() { Date = "2024-01-01", Weight = 82m } });

            services.RemoveAll<IClerkTokenService>();
            services.RemoveAll<IUserAccountMappingService>();
            services.RemoveAll<IProfileService>();
            services.RemoveAll<IManualDataService>();
            services.RemoveAll<ISupabaseService>();
            services.AddSingleton(tokens.Object);
            services.AddSingleton(mapping.Object);
            services.AddSingleton(profiles.Object);
            services.AddSingleton(manual.Object);
            services.AddSingleton(Mock.Of<ISupabaseService>());
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing && Directory.Exists(_webRoot))
        {
            Directory.Delete(_webRoot, recursive: true);
        }
    }
}
