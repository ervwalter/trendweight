using System.Net.Http.Headers;
using Microsoft.Extensions.Options;
using TrendWeight.Infrastructure.Configuration;

namespace TrendWeight.Infrastructure.Services;

public class ClerkService : IClerkService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ClerkService> _logger;
    private readonly string _secretKey;

    public ClerkService(HttpClient httpClient, ILogger<ClerkService> logger, IOptions<AppOptions> appOptions)
    {
        _httpClient = httpClient;
        _logger = logger;
        _secretKey = appOptions.Value.Clerk?.SecretKey ?? throw new InvalidOperationException("Clerk:SecretKey is not configured");

        // Configure the HttpClient with base URL and auth header
        _httpClient.BaseAddress = new Uri("https://api.clerk.com/v1/");
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _secretKey);
    }

    /// <summary>
    /// Deletes a user from Clerk
    /// </summary>
    /// <param name="clerkUserId">The Clerk user ID (external_id)</param>
    /// <returns>True if successful, false otherwise</returns>
    public async Task<bool> DeleteUserAsync(string clerkUserId)
    {
        try
        {
            _logger.LogInformation("Attempting to delete Clerk user {ClerkUserId}", clerkUserId);

            using var response = await _httpClient.DeleteAsync($"users/{Uri.EscapeDataString(clerkUserId)}");

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Successfully deleted Clerk user {ClerkUserId}", clerkUserId);
                return true;
            }

            // Check if user doesn't exist (already deleted or never existed)
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                _logger.LogWarning("Clerk user {ClerkUserId} not found (may have been already deleted)", clerkUserId);
                // Return true as the end result is the same - user doesn't exist
                return true;
            }

            _logger.LogError("Failed to delete Clerk user {ClerkUserId}. Status: {StatusCode}, Reason: {ReasonPhrase}",
                clerkUserId, response.StatusCode, response.ReasonPhrase);

            // Log response body for debugging
            var responseBody = await response.Content.ReadAsStringAsync();
            _logger.LogError("Clerk API response: {ResponseBody}", responseBody);

            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting Clerk user {ClerkUserId}", clerkUserId);
            return false;
        }
    }
}
