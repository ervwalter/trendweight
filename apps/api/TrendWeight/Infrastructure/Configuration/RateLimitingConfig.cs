namespace TrendWeight.Infrastructure.Configuration;

/// <summary>
/// Rate limiting configuration.
/// </summary>
public class RateLimitingConfig
{
    /// <summary>
    /// Semicolon-separated request headers, in preference order, that carry the
    /// client address when the application runs behind a hosting ingress that sets
    /// them (for example <c>do-connecting-ip;cf-connecting-ip</c> on DigitalOcean
    /// App Platform). Leave empty to partition anonymous traffic by peer address.
    /// Only list headers the ingress is known to overwrite on every request.
    /// </summary>
    public string ClientAddressHeaders { get; set; } = string.Empty;

    /// <summary>
    /// The configured headers, parsed in preference order.
    /// </summary>
    public IReadOnlyList<string> ClientAddressHeaderNames =>
        ClientAddressHeaders.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}
