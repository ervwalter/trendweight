using System.Numerics;
using System.Text.RegularExpressions;
using FluentAssertions;
using TrendWeight.Common;

namespace TrendWeight.Tests.Common;

public class TokenGeneratorTests
{
    private const string Base36Alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";

    [Fact]
    public void ToBase36_WithAllZeroBytes_PadsToTwentyFiveZeros()
    {
        TokenGenerator.ToBase36(new byte[16]).Should().Be(new string('0', 25));
    }

    [Fact]
    public void ToBase36_WithValueOne_EndsInOne()
    {
        // The implementation reads the bytes little-endian, so byte 0 is the least significant.
        var bytes = new byte[16];
        bytes[0] = 1;

        TokenGenerator.ToBase36(bytes).Should().Be(new string('0', 24) + "1");
    }

    [Fact]
    public void ToBase36_WithValueThirtySix_EndsInOneZero()
    {
        var bytes = new byte[16];
        bytes[0] = 36;

        TokenGenerator.ToBase36(bytes).Should().Be(new string('0', 23) + "10");
    }

    [Fact]
    public void ToBase36_WithAllOnesBytes_MatchesBigIntegerConversionAtFullLength()
    {
        var bytes = Enumerable.Repeat((byte)0xFF, 16).ToArray();

        var token = TokenGenerator.ToBase36(bytes);

        token.Should().HaveLength(25);
        token.Should().Be(ExpectedBase36(bytes));
    }

    [Theory]
    [InlineData(new byte[] { 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 })]
    [InlineData(new byte[] { 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0, 0x0f, 0xed, 0xcb, 0xa9, 0x87, 0x65, 0x43, 0x21 })]
    [InlineData(new byte[] { 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x80 })]
    public void ToBase36_MatchesAnIndependentLittleEndianConversion(byte[] bytes)
    {
        TokenGenerator.ToBase36(bytes).Should().Be(ExpectedBase36(bytes));
    }

    [Fact]
    public void GenerateToken_ProducesTwentyFiveLowercaseBase36Characters()
    {
        var token = TokenGenerator.GenerateToken();

        token.Should().MatchRegex("^[0-9a-z]{25}$");
    }

    [Fact]
    public void GenerateToken_DrawsDistinctTokens()
    {
        var tokens = Enumerable.Range(0, 1000).Select(_ => TokenGenerator.GenerateToken()).ToList();

        tokens.Should().OnlyHaveUniqueItems();
        tokens.Should().AllSatisfy(token => Regex.IsMatch(token, "^[0-9a-z]{25}$").Should().BeTrue());
    }

    /// <summary>
    /// Independent conversion: interpret the bytes as an unsigned little-endian integer
    /// (the way <see cref="BigInteger"/> reads a byte array with a trailing zero appended),
    /// then repeatedly divide by 36 and left-pad to 25 characters.
    /// </summary>
    private static string ExpectedBase36(byte[] bytes)
    {
        var value = new BigInteger(bytes, isUnsigned: true, isBigEndian: false);
        var digits = new List<char>();
        while (value > BigInteger.Zero)
        {
            digits.Add(Base36Alphabet[(int)(value % 36)]);
            value /= 36;
        }

        digits.Reverse();
        return new string(digits.ToArray()).PadLeft(25, '0');
    }
}
