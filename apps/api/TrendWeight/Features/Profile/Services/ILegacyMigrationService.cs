using TrendWeight.Features.Profile.Models;
using TrendWeight.Infrastructure.DataAccess.Models;

namespace TrendWeight.Features.Profile.Services;

public interface ILegacyMigrationService
{
    /// <summary>
    /// Checks if a user needs migration and performs it if necessary
    /// </summary>
    /// <param name="userId">Supabase UID</param>
    /// <param name="userEmail">User's email address</param>
    /// <returns>Migrated profile if migration was performed, null otherwise</returns>
    Task<DbProfile?> CheckAndMigrateIfNeededAsync(string userId, string? userEmail);

    /// <summary>
    /// Migrate a legacy profile to the new system
    /// </summary>
    /// <param name="userId">Supabase UID</param>
    /// <param name="email">User's email address</param>
    /// <param name="legacyProfile">Legacy profile data</param>
    /// <returns>The migrated profile</returns>
    Task<DbProfile> MigrateLegacyProfileAsync(string userId, string email, LegacyProfile legacyProfile);
}

