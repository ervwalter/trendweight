using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FluentAssertions;
using Microsoft.IdentityModel.Tokens;
using TrendWeight.Features.Providers;
using Xunit;

namespace TrendWeight.Tests.Features.Providers;

public class OAuthStateTokenTests
{
    private const string SigningKey = "a-test-secret-with-at-least-32-bytes-for-HS256";
    private const string UserId = "a-user";

    [Fact]
    public void SignedState_IsAcceptedOnlyForItsUserAndProvider()
    {
        var state = OAuthStateToken.Create(SigningKey, UserId, "withings");

        OAuthStateToken.IsValid(state, SigningKey, UserId, "withings").Should().BeTrue();
        OAuthStateToken.IsValid(state, SigningKey, "another-user", "withings").Should().BeFalse();
        OAuthStateToken.IsValid(state, SigningKey, UserId, "fitbit").Should().BeFalse();
        OAuthStateToken.IsValid(state, SigningKey + "different", UserId, "withings").Should().BeFalse();
        OAuthStateToken.IsValid(state, null, UserId, "withings").Should().BeFalse();
    }

    [Fact]
    public void ExpiredState_IsRejected()
    {
        var token = new JwtSecurityToken(
            claims: new[] { new Claim("uid", UserId), new Claim("reason", "link"), new Claim("provider", "withings") },
            notBefore: DateTime.UtcNow.AddHours(-2),
            expires: DateTime.UtcNow.AddMinutes(-1),
            signingCredentials: new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(SigningKey)), SecurityAlgorithms.HmacSha256));
        var state = new JwtSecurityTokenHandler().WriteToken(token);

        OAuthStateToken.IsValid(state, SigningKey, UserId, "withings").Should().BeFalse();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not-a-jwt")]
    public void MissingOrMalformedState_IsRejected(string? state)
    {
        OAuthStateToken.IsValid(state, SigningKey, UserId, "withings").Should().BeFalse();
    }
}
