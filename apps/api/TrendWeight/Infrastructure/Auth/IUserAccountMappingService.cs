using TrendWeight.Infrastructure.DataAccess.Models;

namespace TrendWeight.Infrastructure.Auth;

public interface IUserAccountMappingService
{
    Task<DbUserAccount?> GetByExternalIdAsync(string externalId, string provider = "clerk");
    Task<DbUserAccount?> GetByInternalIdAsync(Guid uid);
    Task<DbUserAccount> CreateMappingAsync(string externalId, string email, string provider = "clerk");
    Task<DbUserAccount> GetOrCreateMappingAsync(string externalId, string email, string provider = "clerk");
}
