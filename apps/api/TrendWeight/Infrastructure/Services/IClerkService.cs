namespace TrendWeight.Infrastructure.Services;

public interface IClerkService
{
    /// <summary>
    /// Deletes a user from Clerk
    /// </summary>
    /// <param name="clerkUserId">The Clerk user ID (external_id)</param>
    /// <returns>True if successful, false otherwise</returns>
    Task<bool> DeleteUserAsync(string clerkUserId);
}
