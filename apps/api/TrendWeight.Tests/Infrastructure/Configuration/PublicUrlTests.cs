using FluentAssertions;
using TrendWeight.Infrastructure.Configuration;

namespace TrendWeight.Tests.Infrastructure.Configuration;

public class PublicUrlTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("trendweight.com")]
    [InlineData("//trendweight.com")]
    [InlineData("http://trendweight.com")]
    [InlineData("ftp://trendweight.com")]
    [InlineData("https://user:password@trendweight.com")]
    [InlineData("https://trendweight.com/path")]
    [InlineData("https://trendweight.com/?query=value")]
    [InlineData("https://trendweight.com/#fragment")]
    public void NonDevelopment_RejectsMissingOrInvalidOrigin(string? value)
    {
        var create = () => new PublicUrl(value, false);
        create.Should().Throw<InvalidOperationException>().WithMessage("PublicBaseUrl*");
    }

    [Theory]
    [InlineData("https://trendweight.com", "https://trendweight.com/oauth/withings/callback")]
    [InlineData("https://staging.trendweight.com/", "https://staging.trendweight.com/oauth/withings/callback")]
    [InlineData("https://localhost:7133", "https://localhost:7133/oauth/withings/callback")]
    public void UsesConfiguredOriginAndPreservesExplicitPort(string value, string expected)
    {
        new PublicUrl(value, false).Callback("/oauth/withings/callback").Should().Be(expected);
    }

    [Theory]
    [InlineData(null, "http://localhost:5173/auth/apple/callback")]
    [InlineData("http://localhost:3000", "http://localhost:3000/auth/apple/callback")]
    public void Development_AllowsHttpAndHasLocalDefault(string? value, string expected)
    {
        new PublicUrl(value, true).Callback("/auth/apple/callback").Should().Be(expected);
    }
}
