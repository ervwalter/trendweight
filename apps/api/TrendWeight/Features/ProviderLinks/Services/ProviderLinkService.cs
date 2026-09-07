using System.Text.Json;
using TrendWeight.Infrastructure.DataAccess;
using TrendWeight.Infrastructure.DataAccess.Models;

namespace TrendWeight.Features.ProviderLinks.Services;

public class ProviderLinkService : IProviderLinkService
{
    private readonly ISupabaseService _supabaseService;
    private readonly ILogger<ProviderLinkService> _logger;

    public ProviderLinkService(ISupabaseService supabaseService, ILogger<ProviderLinkService> logger)
    {
        _supabaseService = supabaseService;
        _logger = logger;
    }

    public async Task<DbProviderLink?> GetProviderLinkAsync(Guid uid, string provider)
    {
        try
        {
            var links = await _supabaseService.QueryAsync<DbProviderLink>(query =>
                query.Filter("uid", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
                     .Filter("provider", Supabase.Postgrest.Constants.Operator.Equals, provider)
            );

            return links.FirstOrDefault();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting provider link for user {Uid} and provider {Provider}", uid, provider);
            throw;
        }
    }

    public async Task<List<DbProviderLink>> GetAllForUserAsync(Guid uid)
    {
        try
        {
            return await _supabaseService.QueryAsync<DbProviderLink>(query =>
                query.Filter("uid", Supabase.Postgrest.Constants.Operator.Equals, uid.ToString())
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting provider links for user {Uid}", uid);
            throw;
        }
    }

    public async Task<DbProviderLink> CreateAsync(DbProviderLink providerLink)
    {
        var now = DateTime.UtcNow.ToString("o");
        if (string.IsNullOrEmpty(providerLink.CreatedAt))
        {
            providerLink.CreatedAt = now;
        }

        providerLink.UpdatedAt = now;
        return await _supabaseService.InsertAsync(providerLink);
    }

    public async Task<DbProviderLink> UpdateAsync(DbProviderLink providerLink)
    {
        providerLink.UpdatedAt = DateTime.UtcNow.ToString("o");
        return await _supabaseService.UpdateAsync(providerLink);
    }

    public async Task RemoveProviderLinkAsync(Guid uid, string provider)
    {
        var providerLink = await GetProviderLinkAsync(uid, provider);
        if (providerLink != null)
        {
            await _supabaseService.DeleteAsync(providerLink);
        }
    }


    public async Task StoreProviderLinkAsync(Guid uid, string provider, Dictionary<string, object> token, string? updateReason = null)
    {
        var existingLink = await GetProviderLinkAsync(uid, provider);

        if (existingLink != null)
        {
            // Update existing link
            existingLink.Token = token;
            existingLink.UpdateReason = updateReason;
            await UpdateAsync(existingLink);
        }
        else
        {
            // Create new link
            var newLink = new DbProviderLink
            {
                Uid = uid,
                Provider = provider,
                Token = token,
                UpdateReason = updateReason,
                UpdatedAt = DateTime.UtcNow.ToString("o")
            };
            await CreateAsync(newLink);
        }
    }
}
