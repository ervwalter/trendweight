using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using TrendWeight.Infrastructure.Extensions;
using TrendWeight.Infrastructure.Middleware;

// Create a singleton JsonSerializerOptions for rate limiting responses
var rateLimitJsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Use camelCase for all JSON property names
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;

        // Ensure DateTime values are serialized with timezone info (as UTC)
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.WriteIndented = false;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add Clerk authentication (includes Supabase as fallback)
builder.Services.AddClerkAuthentication(builder.Configuration);

// Add TrendWeight services
builder.Services.AddTrendWeightServices(builder.Configuration);

// Add YARP reverse proxy
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

// Add rate limiting
builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
    {
        // Only apply rate limiting to authenticated users
        var userId = httpContext.User?.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(userId))
        {
            // No rate limiting for anonymous requests
            return RateLimitPartition.GetNoLimiter("anonymous");
        }

        // Apply rate limiting for authenticated users
        return RateLimitPartition.GetFixedWindowLimiter(
            userId,
            partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1)
            });
    });

    // Return 429 Too Many Requests when rate limit is exceeded
    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        context.HttpContext.Response.ContentType = "application/json";

        var response = new
        {
            message = "Too many requests. Please try again later.",
            statusCode = 429,
            errorCode = "RATE_LIMIT_EXCEEDED"
        };

        await context.HttpContext.Response.WriteAsync(
            JsonSerializer.Serialize(response, rateLimitJsonOptions),
            cancellationToken: token);
    };

    // Set standard rate limit headers
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// Add HTTP logging
builder.Services.AddHttpLogging(options =>
{
    options.LoggingFields = Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.RequestPath |
                          Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.RequestMethod |
                          Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.ResponseStatusCode |
                          Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.Duration;
});

// Configure forwarded headers for proxy scenarios
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedHost;

    // Clear default networks/proxies to trust headers from load balancers
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();

    // Limit proxy chain depth to prevent spoofing
    options.ForwardLimit = 2; // Allows for Cloudflare -> DigitalOcean chain
    options.RequireHeaderSymmetry = false;

    // Configure allowed hosts for forwarded headers (semicolon-separated)
    // This validates the host header after forwarded headers are processed
    var allowedHosts = builder.Configuration["AllowedHosts"];
    if (!string.IsNullOrEmpty(allowedHosts) && allowedHosts != "*")
    {
        options.AllowedHosts = allowedHosts.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    }
});

var app = builder.Build();

// Configure the HTTP request pipeline
app.UseMiddleware<RequestTimingMiddleware>();
app.UseMiddleware<ErrorHandlingMiddleware>();

// Enable HTTP request logging
app.UseHttpLogging();

// Use forwarded headers from proxies
// The ForwardedHeaders middleware also validates allowed hosts if configured
app.UseForwardedHeaders();


// Validate host header after ForwardedHeaders middleware
var allowedHosts = app.Configuration["AllowedHosts"];
if (!string.IsNullOrEmpty(allowedHosts) && allowedHosts != "*")
{
    var allowedHostList = allowedHosts.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    app.Use(async (context, next) =>
    {
        var host = context.Request.Host.Host;
        if (!allowedHostList.Contains(host, StringComparer.OrdinalIgnoreCase))
        {
            app.Logger.LogWarning("Rejected request with invalid host: {Host}", host);
            context.Response.StatusCode = 400;
            await context.Response.WriteAsync("Invalid host header");
            return;
        }
        await next();
    });
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Handle legacy chart image URLs
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value;
    if (path != null && path.StartsWith("/u/", StringComparison.OrdinalIgnoreCase))
    {
        var segments = path.Split('/');
        // Check if it matches pattern /u/{id}/chart/{filename}.png
        if (segments.Length >= 5 &&
            segments[3].Equals("chart", StringComparison.OrdinalIgnoreCase) &&
            segments[4].EndsWith(".png", StringComparison.OrdinalIgnoreCase))
        {
            context.Response.Redirect("/chart-not-available.png", permanent: true);
            return;
        }
    }
    await next();
});

// Use static files with custom caching rules for the SPA
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        var path = ctx.File.Name;
        var headers = ctx.Context.Response.Headers;

        // Check if this is a hashed asset (contains hash pattern like -aBc123De)
        if (System.Text.RegularExpressions.Regex.IsMatch(path, @"-[a-zA-Z0-9_]{8,}\.(js|css)$"))
        {
            // Long-term immutable caching for hashed assets
            headers.CacheControl = "public,max-age=31536000,immutable";
        }
        else
        {
            // Short cache for other static files (1 hour)
            headers.CacheControl = "public,max-age=3600";
        }
    }
});

// Map reverse proxy endpoints (before rate limiting so they're not rate limited)
app.MapReverseProxy();

// Apply rate limiting only to API routes (after static files)
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Health check endpoint for container health checks
app.MapGet("/api/health", () => Results.Ok(new { status = "healthy", service = "TrendWeight API", timestamp = DateTime.UtcNow }))
    .DisableRateLimiting();

// For production, serve the SPA for any non-API routes
if (!app.Environment.IsDevelopment())
{
    // Custom fallback handler that redirects trailing slashes and serves SPA
    app.MapFallback(async context =>
    {
        var path = context.Request.Path.Value;

        // Redirect trailing slash requests to non-slash URLs (except root "/")
        if (path != null &&
            path.EndsWith('/') &&
            path.Length > 1 &&
            context.Request.Method == "GET")
        {
            var newPath = path.TrimEnd('/');
            var queryString = context.Request.QueryString.Value;
            var redirectUrl = newPath + queryString;

            context.Response.Redirect(redirectUrl, permanent: true);
            return;
        }

        context.Response.ContentType = "text/html";
        context.Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
        context.Response.Headers.Pragma = "no-cache";
        context.Response.Headers.Expires = "0";

        var indexPath = Path.Combine(app.Environment.WebRootPath, "index.html");
        await context.Response.SendFileAsync(indexPath);
    });
}

app.Run();

// Make Program accessible to test projects
public partial class Program { }
