using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using TrendWeight.Infrastructure.Extensions;
using TrendWeight.Infrastructure.Middleware;

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

// Add Supabase authentication
builder.Services.AddSupabaseAuthentication(builder.Configuration);

// Add TrendWeight services
builder.Services.AddTrendWeightServices(builder.Configuration);

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
            JsonSerializer.Serialize(response, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }),
            cancellationToken: token);
    };

    // Set standard rate limit headers
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// Add CORS for development
builder.Services.AddCors(options =>
{
    options.AddPolicy("DevelopmentCors", policy =>
    {
        policy
            .WithOrigins("http://localhost:5173", "http://localhost:5174", "http://localhost:3000") // Vite and Next.js ports
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
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
    app.UseCors("DevelopmentCors");
}

app.UseHttpsRedirection();

// Serve static files from wwwroot (for production container)
app.UseStaticFiles();

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
    app.MapFallbackToFile("index.html");
}

app.Run();
