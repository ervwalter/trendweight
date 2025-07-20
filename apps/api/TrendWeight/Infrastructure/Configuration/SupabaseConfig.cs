namespace TrendWeight.Infrastructure.Configuration;

public class SupabaseConfig
{
    public string Url { get; set; } = string.Empty;
    public string AnonKey { get; set; } = string.Empty;
    public string ServiceKey { get; set; } = string.Empty;
    public string JwtSecret { get; set; } = string.Empty;
}
