using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using TrendWeight.Features.ApiKeys;
using TrendWeight.Features.Profile.Models;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Infrastructure.DataAccess.Models;
using Xunit;

namespace TrendWeight.Tests.Features.ApiKeys;

public class ApiKeyServiceTests
{
    private readonly Mock<IProfileService> _profileServiceMock;
    private readonly ApiKeyService _sut;
    private readonly Guid _userId = Guid.NewGuid();

    public ApiKeyServiceTests()
    {
        _profileServiceMock = new Mock<IProfileService>();
        _sut = new ApiKeyService(_profileServiceMock.Object, Mock.Of<ILogger<ApiKeyService>>());
    }

    private DbProfile CreateProfile()
    {
        var profile = new DbProfile
        {
            Uid = _userId,
            Email = "test@example.com",
            Profile = new ProfileData { FirstName = "Test" },
            CreatedAt = DateTime.UtcNow.ToString("o"),
            UpdatedAt = DateTime.UtcNow.ToString("o")
        };
        _profileServiceMock.Setup(x => x.GetByIdAsync(_userId)).ReturnsAsync(profile);
        _profileServiceMock.Setup(x => x.UpdateAsync(It.IsAny<DbProfile>())).ReturnsAsync((DbProfile p) => p);
        return profile;
    }

    [Fact]
    public void HashKey_IsDeterministicLowercaseHex()
    {
        var hash1 = ApiKeyService.HashKey("sk-test");
        var hash2 = ApiKeyService.HashKey("sk-test");

        hash1.Should().Be(hash2);
        hash1.Should().MatchRegex("^[0-9a-f]{64}$");
        ApiKeyService.HashKey("sk-other").Should().NotBe(hash1);
    }

    [Fact]
    public async Task GenerateAsync_CreatesKeyInExpectedFormat()
    {
        CreateProfile();

        var result = await _sut.GenerateAsync(_userId);

        result.Should().NotBeNull();
        result!.ApiKey.Should().MatchRegex("^sk-[0-9a-z]{25}$");
        result.Suffix.Should().Be(result.ApiKey[^4..]);
        result.CreatedAt.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task GenerateAsync_StoresHashSuffixAndCreatedAtOnProfile()
    {
        var profile = CreateProfile();

        var result = await _sut.GenerateAsync(_userId);

        profile.Profile.ApiKeyHash.Should().Be(ApiKeyService.HashKey(result!.ApiKey));
        profile.Profile.ApiKeySuffix.Should().Be(result.Suffix);
        profile.Profile.ApiKeyCreatedAt.Should().Be(result.CreatedAt);
        _profileServiceMock.Verify(x => x.UpdateAsync(profile), Times.Once);
    }

    [Fact]
    public async Task GenerateAsync_ReplacesExistingKey()
    {
        var profile = CreateProfile();

        var first = await _sut.GenerateAsync(_userId);
        var second = await _sut.GenerateAsync(_userId);

        second!.ApiKey.Should().NotBe(first!.ApiKey);
        profile.Profile.ApiKeyHash.Should().Be(ApiKeyService.HashKey(second.ApiKey));
    }

    [Fact]
    public async Task GenerateAsync_ReturnsNullWhenProfileMissing()
    {
        _profileServiceMock.Setup(x => x.GetByIdAsync(_userId)).ReturnsAsync((DbProfile?)null);

        var result = await _sut.GenerateAsync(_userId);

        result.Should().BeNull();
        _profileServiceMock.Verify(x => x.UpdateAsync(It.IsAny<DbProfile>()), Times.Never);
    }

    [Fact]
    public async Task GetMetadataAsync_ReportsNoKey()
    {
        CreateProfile();

        var metadata = await _sut.GetMetadataAsync(_userId);

        metadata.Should().NotBeNull();
        metadata!.Exists.Should().BeFalse();
        metadata.Suffix.Should().BeNull();
        metadata.CreatedAt.Should().BeNull();
    }

    [Fact]
    public async Task GetMetadataAsync_ReportsExistingKey()
    {
        var profile = CreateProfile();
        profile.Profile.ApiKeyHash = "somehash";
        profile.Profile.ApiKeySuffix = "wxyz";
        profile.Profile.ApiKeyCreatedAt = "2026-08-23T00:00:00.0000000Z";

        var metadata = await _sut.GetMetadataAsync(_userId);

        metadata!.Exists.Should().BeTrue();
        metadata.Suffix.Should().Be("wxyz");
        metadata.CreatedAt.Should().Be("2026-08-23T00:00:00.0000000Z");
    }

    [Fact]
    public async Task RevokeAsync_ClearsKeyFields()
    {
        var profile = CreateProfile();
        profile.Profile.ApiKeyHash = "somehash";
        profile.Profile.ApiKeySuffix = "wxyz";
        profile.Profile.ApiKeyCreatedAt = "2026-08-23T00:00:00.0000000Z";

        var revoked = await _sut.RevokeAsync(_userId);

        revoked.Should().BeTrue();
        profile.Profile.ApiKeyHash.Should().BeNull();
        profile.Profile.ApiKeySuffix.Should().BeNull();
        profile.Profile.ApiKeyCreatedAt.Should().BeNull();
        _profileServiceMock.Verify(x => x.UpdateAsync(profile), Times.Once);
    }

    [Fact]
    public async Task RevokeAsync_ReturnsFalseWhenProfileMissing()
    {
        _profileServiceMock.Setup(x => x.GetByIdAsync(_userId)).ReturnsAsync((DbProfile?)null);

        var revoked = await _sut.RevokeAsync(_userId);

        revoked.Should().BeFalse();
    }
}
