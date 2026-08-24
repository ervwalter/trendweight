using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.OpenApi;
using Scalar.AspNetCore;
using TrendWeight.Features.Measurements.Manual;
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

// OpenAPI documents served by Scalar: the public v1 API reference (API-key endpoints
// only, grouped via [ApiExplorerSettings(GroupName = "v1")]), plus the full internal
// surface in development.
const string TimeJsonPattern = @"^\d{2}:\d{2}:\d{2}$";
const string ProviderJsonPattern = "^(withings|fitbit|legacy)$";

builder.Services.AddOpenApi("v1", options =>
{
    options.ShouldInclude = description => description.GroupName == "v1";
    // Document the string formats and value ranges the API enforces. These schema
    // constraints are documentation only - actual validation happens in the
    // controllers (ManualMeasurementValidation) so error responses keep their shape.
    options.AddSchemaTransformer((schema, context, cancellationToken) =>
    {
        switch (context.JsonPropertyInfo?.Name)
        {
            case "date":
                schema.Pattern = ManualMeasurementValidation.DateJsonPattern;
                break;
            case "time":
                schema.Pattern = TimeJsonPattern;
                break;
            case "provider":
                schema.Pattern = ProviderJsonPattern;
                break;
            case "weight":
                schema.ExclusiveMinimum = "0";
                schema.ExclusiveMaximum = "700";
                break;
            case "fatRatio":
                schema.ExclusiveMinimum = "0";
                schema.ExclusiveMaximum = "1";
                break;
        }
        return Task.CompletedTask;
    });
    options.AddOperationTransformer((operation, context, cancellationToken) =>
    {
        foreach (var parameter in operation.Parameters ?? [])
        {
            if (parameter is OpenApiParameter { Schema: OpenApiSchema schema } concrete)
            {
                if (concrete.Name is "date" or "since")
                {
                    schema.Pattern = ManualMeasurementValidation.DateJsonPattern;
                }
                else if (concrete.Name == "provider")
                {
                    schema.Pattern = ProviderJsonPattern;
                }
            }
        }
        return Task.CompletedTask;
    });
    // Schema names read better without the C# "V1" DTO prefix (Measurement, not V1Measurement)
    options.CreateSchemaReferenceId = jsonTypeInfo =>
    {
        var id = OpenApiOptions.CreateDefaultSchemaReferenceId(jsonTypeInfo);
        return id != null && id.StartsWith("V1", StringComparison.Ordinal) ? id[2..] : id;
    };
    options.AddDocumentTransformer((document, context, cancellationToken) =>
    {
        document.Info.Title = "TrendWeight API";
        document.Info.Version = "v1";
        document.Info.Description =
            "Programmatic access to your own TrendWeight data: read your measurements, and add or edit weight log entries.\n\n" +
            "Authenticate every request with the API key from your [settings page](/settings), sent as `Authorization: Bearer sk-...` " +
            "(or in an `X-Api-Key` header).\n\n" +
            "All weights are in kilograms, and body fat values are 0–1 ratios (0.225 means 22.5%).";
        // The root tags array controls the sidebar/TOC order in Scalar
        document.Tags = new HashSet<OpenApiTag>
        {
            new OpenApiTag
            {
                Name = "Weight Data",
                Description = "Your daily weight data with trend math applied (combined from every source), "
                    + "plus the raw readings from each connected scale."
            },
            new OpenApiTag
            {
                Name = "Manual Weight Log",
                Description = "Weight entries added manually - in the app or through this API. These endpoints do not "
                    + "cover readings synced from Withings or Fitbit; those are read-only and appear under Weight Data."
            },
        };
        // Declaring the auth scheme gives Scalar an "enter your API key" box and
        // attaches the key to try-it requests
        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
        document.Components.SecuritySchemes["API Key"] = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "sk-...",
            Description = "Your TrendWeight API key from the settings page"
        };
        document.Security ??= new List<OpenApiSecurityRequirement>();
        document.Security.Add(new OpenApiSecurityRequirement
        {
            [new OpenApiSecuritySchemeReference("API Key", document)] = new List<string>()
        });
        return Task.CompletedTask;
    });
});
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddOpenApi("internal", options =>
    {
        options.ShouldInclude = description => description.GroupName != "v1";
    });
}

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
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(RateLimitPartitionResolver.Resolve);

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
    options.KnownIPNetworks.Clear();
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

// API reference docs: /openapi/{document}.json + Scalar UI at /api-docs/{document}.
// Only the "v1" document exists outside development.
app.MapOpenApi();
app.MapScalarApiReference("/api-docs", options =>
{
    // Keep the reference fully self-contained: no Scalar-hosted AI chat, MCP
    // generation, telemetry, or CDN-served fonts. The only network calls the
    // page should make are to this API itself.
    options.DisableAgent();
    options.DisableMcp();
    options.DisableTelemetry();
    options.DisableDefaultFonts();

    // Presentation defaults: open everything up front and show operation ids
    options.ExpandAllTags();
    options.ExpandAllModelSections();
    options.ExpandAllResponses();
    options.HideClientButton();
    options.ShowOperationId();
    options.WithFavicon("/favicon.ico");
});

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

app.UseAuthentication();
app.UseAuthorization();

// Rate limiting partitions on the authenticated principal, so it must run AFTER
// UseAuthorization: endpoints authenticated via a non-default scheme (e.g. API keys)
// only get their principal assigned to HttpContext.User by the authorization
// middleware's policy evaluation, not by UseAuthentication itself.
app.UseRateLimiter();

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
