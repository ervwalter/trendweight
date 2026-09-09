using System.Collections.Concurrent;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.HostFiltering;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using TrendWeight.Infrastructure.Configuration;
using TrendWeight.Infrastructure.DataAccess;
using TrendWeight.Infrastructure.DataAccess.Models;

namespace TrendWeight.Tests.Infrastructure.DataAccess;

public class SupabaseServiceTests
{
    [Theory]
    [InlineData("sb_secret_synthetic-test-key", false)]
    [InlineData("eyJhbGciOiJIUzI1NiJ9.synthetic.signature", true)]
    public async Task Requests_UseApiKeyAndOnlyUseLegacyKeysAsBearer(string key, bool legacy)
    {
        // Real SDK requests go to a local HTTP receiver; no Supabase project or
        // real credentials are used. This catches SDK-added headers too.
        var requests = new ConcurrentQueue<(string Method, string Path, string Key, string Authorization)>();
        var id = Guid.NewGuid();
        var builder = WebApplication.CreateSlimBuilder();
        builder.Logging.ClearProviders();
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        // A developer machine may export AllowedHosts for the real API; accept the SDK's 127.0.0.1:<port>.
        builder.Services.Configure<HostFilteringOptions>(options => options.AllowedHosts = ["*"]);
        await using var server = builder.Build();
        server.Run(async context =>
        {
            requests.Enqueue((context.Request.Method, context.Request.Path.ToString(),
                context.Request.Headers["apikey"].ToString(), context.Request.Headers.Authorization.ToString()));
            context.Response.ContentType = "application/json";
            var json = context.Request.Path.StartsWithSegments("/rest/v1")
                ? JsonSerializer.Serialize(new[] { new { uid = id, email = "test@example.com", profile = new { }, created_at = "", updated_at = "" } })
                : "{}";
            await context.Response.WriteAsync(json);
        });
        await server.StartAsync(TestContext.Current.CancellationToken);
        var factory = new Mock<IHttpClientFactory>();
        factory.Setup(x => x.CreateClient(It.IsAny<string>())).Returns(() => new HttpClient());
        var service = new SupabaseService(Options.Create(new AppOptions
        {
            Supabase = new SupabaseConfig { Url = server.Urls.Single(), ServiceKey = key }
        }), Mock.Of<ILogger<SupabaseService>>(), factory.Object);
        var row = new DbProfile { Uid = id, Email = "test@example.com" };

        (await service.GetByIdAsync<DbProfile>(id))!.Uid.Should().Be(id);
        (await service.QueryAsync<DbProfile>(_ => { })).Should().ContainSingle();
        (await service.InsertAsync(row)).Uid.Should().Be(id);
        (await service.UpdateAsync(row)).Uid.Should().Be(id);
        await service.DeleteAsync(row);
        (await service.DeleteAuthUserAsync(id)).Should().BeTrue();
        (await service.BroadcastAsync("test-topic", "progress", new { status = "running" })).Should().BeTrue();

        requests.Should().HaveCount(7);
        requests.Should().OnlyContain(request => request.Key == key);
        requests.Where(request => request.Path != "/realtime/v1/api/broadcast")
            .Should().OnlyContain(request => request.Authorization == (legacy ? $"Bearer {key}" : ""));
        requests.Single(request => request.Path == "/realtime/v1/api/broadcast").Authorization.Should().BeEmpty();
        requests.Should().Contain(request => request.Method == "DELETE" && request.Path == $"/auth/v1/admin/users/{id}");
        requests.Should().Contain(request => request.Method == "PATCH" && request.Path == "/rest/v1/profiles");
        await server.StopAsync(TestContext.Current.CancellationToken);
    }
}
