using FluentAssertions;
using Microsoft.Extensions.Configuration;
using TrendWeight.Infrastructure.Configuration;

namespace TrendWeight.Tests.Infrastructure.Configuration;

public class RequiredConfigurationTests
{
    private static readonly Dictionary<string, string?> Complete = new()
    {
        ["Clerk:Authority"] = "https://real-instance.clerk.accounts.dev",
        ["Clerk:SecretKey"] = "sk_live_synthetic",
        ["Supabase:Url"] = "https://abcdefghijklmnopqrst.supabase.co",
        ["Supabase:ServiceKey"] = "sb_secret_synthetic",
    };

    [Fact]
    public void Validate_AcceptsRealValues()
    {
        var act = () => RequiredConfiguration.Validate(Build(Complete));

        act.Should().NotThrow();
    }

    [Theory]
    [InlineData("Clerk:Authority", "https://your-instance.clerk.accounts.dev")]
    [InlineData("Clerk:SecretKey", "your-clerk-secret-key")]
    [InlineData("Supabase:Url", "https://your-project-id.supabase.co")]
    [InlineData("Supabase:ServiceKey", "paste-your-service-role-key-here")]
    [InlineData("Supabase:ServiceKey", "PASTE-YOUR-KEY")]
    [InlineData("Supabase:ServiceKey", "")]
    [InlineData("Supabase:ServiceKey", "   ")]
    [InlineData("Supabase:ServiceKey", null)]
    public void Validate_RejectsPlaceholderAndMissingValues(string key, string? value)
    {
        var settings = new Dictionary<string, string?>(Complete) { [key] = value };

        var act = () => RequiredConfiguration.Validate(Build(settings));

        var message = act.Should().Throw<InvalidOperationException>()
            .WithMessage("Required configuration is missing or still set to a placeholder: *")
            .Which.Message;
        message.Should().Contain(key);
        if (!string.IsNullOrWhiteSpace(value))
        {
            // The message names keys only; values (even placeholders) stay out of logs.
            message.Should().NotContain(value);
        }
    }

    [Fact]
    public void Validate_ListsEveryOffendingKey()
    {
        var act = () => RequiredConfiguration.Validate(Build(new Dictionary<string, string?>()));

        act.Should().Throw<InvalidOperationException>()
            .Which.Message.Should().ContainAll(RequiredConfiguration.Keys);
    }

    private static IConfiguration Build(Dictionary<string, string?> settings) =>
        new ConfigurationBuilder().AddInMemoryCollection(settings).Build();
}
