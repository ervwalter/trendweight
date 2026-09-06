namespace TrendWeight.Infrastructure.Configuration;

/// <summary>Validated public origin used for callback URLs, independent of request headers.</summary>
public sealed class PublicUrl
{
    public Uri BaseUri { get; }

    public PublicUrl(string? value, bool isDevelopment)
    {
        value ??= isDevelopment ? "http://localhost:5173" : null;
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttps && !(isDevelopment && uri.Scheme == Uri.UriSchemeHttp)) ||
            string.IsNullOrEmpty(uri.Host) || !string.IsNullOrEmpty(uri.UserInfo) ||
            uri.AbsolutePath != "/" || !string.IsNullOrEmpty(uri.Query) || !string.IsNullOrEmpty(uri.Fragment))
        {
            throw new InvalidOperationException(
                "PublicBaseUrl must be an absolute HTTPS origin without credentials, a path, query, or fragment. HTTP is allowed only in Development.");
        }

        BaseUri = uri;
    }

    public string Callback(string path) => new Uri(BaseUri, path).AbsoluteUri;
}
