using Microsoft.AspNetCore.Authorization;
using TrendWeight.Infrastructure.Auth;
using TrendWeight.Infrastructure.Middleware;
using TrendWeight.Features.Providers;
using TrendWeight.Features.Providers.Withings;
using TrendWeight.Features.Providers.Fitbit;
using TrendWeight.Infrastructure.DataAccess;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Features.ProviderLinks.Services;
using TrendWeight.Features.Measurements;

namespace TrendWeight.Infrastructure.Extensions;

public static class ServiceCollectionExtensions
{

    public static IServiceCollection AddSupabaseAuthentication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Get Supabase config (already registered in AddTrendWeightServices)
        var supabaseConfig = new SupabaseConfig();
        configuration.GetSection("Supabase").Bind(supabaseConfig);

        // Configure authentication - Supabase only
        services.AddAuthentication("Supabase")
            .AddScheme<SupabaseAuthenticationSchemeOptions, SupabaseAuthenticationHandler>("Supabase", null);

        // Configure authorization
        services.AddAuthorization(options =>
        {
            options.DefaultPolicy = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .Build();
        });

        return services;
    }

    public static IServiceCollection AddTrendWeightServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Register Supabase services
        var supabaseConfig = new SupabaseConfig();
        configuration.GetSection("Supabase").Bind(supabaseConfig);
        services.AddSingleton(supabaseConfig);
        services.AddSingleton<ISupabaseService, SupabaseService>();

        // Register feature services
        services.AddScoped<IProfileService, ProfileService>();
        services.AddScoped<IProviderLinkService, ProviderLinkService>();
        services.AddScoped<ISourceDataService, SourceDataService>();
        services.AddScoped<ILegacyDbService, LegacyDbService>();
        services.AddScoped<ILegacyMigrationService, LegacyMigrationService>();

        // Register Withings service
        var withingsConfig = new WithingsConfig();
        configuration.GetSection("Withings").Bind(withingsConfig);
        services.AddSingleton(withingsConfig);
        services.AddHttpClient<WithingsService>();
        services.AddScoped<IWithingsService>(sp => sp.GetRequiredService<WithingsService>());
        services.AddScoped<IProviderService>(sp => sp.GetRequiredService<WithingsService>());

        // Register Fitbit service
        var fitbitConfig = new FitbitConfig();
        configuration.GetSection("Fitbit").Bind(fitbitConfig);
        services.AddSingleton(fitbitConfig);
        services.AddHttpClient<FitbitService>();
        services.AddScoped<IFitbitService>(sp => sp.GetRequiredService<FitbitService>());
        services.AddScoped<IProviderService>(sp => sp.GetRequiredService<FitbitService>());

        // Register provider integration orchestrator
        services.AddScoped<IProviderIntegrationService, ProviderIntegrationService>();

        return services;
    }
}
