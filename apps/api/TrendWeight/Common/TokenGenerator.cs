using System.Numerics;
using System.Security.Cryptography;
using System.Text;

namespace TrendWeight.Common;

/// <summary>
/// Generates URL-friendly secret tokens (sharing tokens, API keys)
/// </summary>
public static class TokenGenerator
{
    /// <summary>
    /// Generates a token with 128 bits of entropy encoded as 25 base36 characters
    /// </summary>
    public static string GenerateToken()
    {
        // Generate 128 bits (16 bytes) of cryptographically secure random data
        var bytes = new byte[16];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(bytes);
        }

        // Convert to base36 (0-9, a-z) for URL-friendly, lowercase representation
        // This gives us ~25 characters for 128 bits of entropy
        return ToBase36(bytes);
    }

    /// <summary>
    /// Converts byte array to base36 string (0-9, a-z)
    /// </summary>
    private static string ToBase36(byte[] bytes)
    {
        const string base36Chars = "0123456789abcdefghijklmnopqrstuvwxyz";
        var result = new StringBuilder();

        // Convert bytes to BigInteger for easier base conversion
        var bigInt = new BigInteger(bytes.Concat(new byte[] { 0 }).ToArray());

        // Convert to base36
        while (bigInt > 0)
        {
            var remainder = (int)(bigInt % 36);
            result.Insert(0, base36Chars[remainder]);
            bigInt /= 36;
        }

        // Pad to ensure consistent length (25 chars for 128 bits in base36)
        while (result.Length < 25)
        {
            result.Insert(0, '0');
        }

        return result.ToString();
    }
}
