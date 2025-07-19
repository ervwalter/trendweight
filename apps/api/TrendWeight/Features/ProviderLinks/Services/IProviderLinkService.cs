using DbProviderLink = TrendWeight.Infrastructure.DataAccess.Models.DbProviderLink;

namespace TrendWeight.Features.ProviderLinks.Services;

public interface IProviderLinkService
{
    Task<DbProviderLink?> GetProviderLinkAsync(Guid uid, string provider);
    Task<List<DbProviderLink>> GetAllForUserAsync(Guid uid);
    Task<DbProviderLink> CreateAsync(DbProviderLink providerLink);
    Task<DbProviderLink> UpdateAsync(DbProviderLink providerLink);
    Task RemoveProviderLinkAsync(Guid uid, string provider);
    Task StoreProviderLinkAsync(Guid uid, string provider, Dictionary<string, object> token, string? updateReason = null);
    Task DeleteAllProviderLinksAsync(Guid uid);
}
