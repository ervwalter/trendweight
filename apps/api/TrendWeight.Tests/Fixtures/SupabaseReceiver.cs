using System.Collections.Concurrent;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.HostFiltering;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace TrendWeight.Tests.Fixtures;

/// <summary>
/// Local HTTP receiver that stands in for a Supabase project, so the real SDK's requests
/// (method, path, query, headers and JSON body) can be captured and canned rows served back.
/// No Supabase project or real credentials are involved.
/// </summary>
public sealed class SupabaseReceiver : IAsyncDisposable
{
    public sealed record CapturedRequest(
        string Method,
        string Path,
        string Query,
        IReadOnlyDictionary<string, string> Headers,
        string Body);

    private readonly WebApplication _app;

    private SupabaseReceiver(WebApplication app)
    {
        _app = app;
    }

    public ConcurrentQueue<CapturedRequest> Requests { get; } = new();

    /// <summary>Produces the JSON body returned for a request; defaults to an empty row set.</summary>
    public Func<CapturedRequest, string> Respond { get; set; } = _ => "[]";

    public string Url => _app.Urls.Single();

    public static async Task<SupabaseReceiver> StartAsync(CancellationToken cancellationToken)
    {
        var builder = WebApplication.CreateSlimBuilder();
        builder.Logging.ClearProviders();
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        // A developer machine may export AllowedHosts for the real API; the receiver must
        // still accept the SDK's Host header of 127.0.0.1:<port>.
        builder.Services.Configure<HostFilteringOptions>(options => options.AllowedHosts = ["*"]);

        var app = builder.Build();
        var receiver = new SupabaseReceiver(app);
        app.Run(async context =>
        {
            using var reader = new StreamReader(context.Request.Body);
            var body = await reader.ReadToEndAsync(context.RequestAborted);
            var captured = new CapturedRequest(
                context.Request.Method,
                context.Request.Path.ToString(),
                context.Request.QueryString.Value ?? string.Empty,
                context.Request.Headers.ToDictionary(h => h.Key, h => h.Value.ToString(), StringComparer.OrdinalIgnoreCase),
                body);
            receiver.Requests.Enqueue(captured);

            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(receiver.Respond(captured), context.RequestAborted);
        });

        await app.StartAsync(cancellationToken);
        return receiver;
    }

    public async ValueTask DisposeAsync()
    {
        await _app.StopAsync();
        await _app.DisposeAsync();
    }
}
