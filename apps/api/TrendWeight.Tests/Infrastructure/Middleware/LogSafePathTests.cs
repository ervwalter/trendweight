using FluentAssertions;
using Microsoft.AspNetCore.Http;
using TrendWeight.Infrastructure.Middleware;

namespace TrendWeight.Tests.Infrastructure.Middleware;

public class LogSafePathTests
{
    [Theory]
    [InlineData("/api/profile/abc123sharingtoken", "/api/profile/{sharing-token}")]
    [InlineData("/api/data/abc123sharingtoken", "/api/data/{sharing-token}")]
    [InlineData("/api/providers/links/abc123sharingtoken", "/api/providers/links/{sharing-token}")]
    [InlineData("/API/Profile/abc123sharingtoken", "/API/Profile/{sharing-token}")]
    [InlineData("/api/profile/abc123sharingtoken/", "/api/profile/{sharing-token}/")]
    [InlineData("/api/data/abc123sharingtoken/extra", "/api/data/{sharing-token}/extra")]
    public void Redact_ReplacesTheSharingTokenSegment(string path, string expected)
    {
        LogSafePath.Redact(new PathString(path)).Should().Be(expected);
    }

    [Theory]
    [InlineData("/api/profile")]
    [InlineData("/api/profile/")]
    [InlineData("/api/profile/generate-token")]
    [InlineData("/api/profile/complete-migration")]
    [InlineData("/api/data")]
    [InlineData("/api/providers/links")]
    [InlineData("/api/providers/withings")]
    [InlineData("/api/measurements/manual/2024-01-01")]
    [InlineData("/dashboard")]
    [InlineData("/")]
    public void Redact_LeavesOtherPathsAlone(string path)
    {
        LogSafePath.Redact(new PathString(path)).Should().Be(path);
    }

    [Fact]
    public void Redact_HandlesEmptyPaths()
    {
        LogSafePath.Redact(PathString.Empty).Should().BeEmpty();
        LogSafePath.Redact((string?)null).Should().BeEmpty();
    }
}
