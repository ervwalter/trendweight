using FluentAssertions;
using TrendWeight.Features.Measurements.Manual;
using Xunit;

namespace TrendWeight.Tests.Features.Measurements.Manual;

public class ManualMeasurementValidationTests
{
    private static string Day(int offsetFromToday) =>
        DateTime.UtcNow.Date.AddDays(offsetFromToday).ToString("yyyy-MM-dd");

    [Fact]
    public void TryValidateDate_AcceptsTodayAndTomorrow_ButNotTheDayAfter()
    {
        // Users ahead of UTC can legitimately log "tomorrow"; anything later is a typo
        ManualMeasurementValidation.TryValidateDate(Day(0), out _).Should().BeTrue();
        ManualMeasurementValidation.TryValidateDate(Day(1), out _).Should().BeTrue();

        ManualMeasurementValidation.TryValidateDate(Day(2), out var error).Should().BeFalse();
        error.Should().Contain("between 1900-01-01 and today");
    }

    [Fact]
    public void TryValidateDate_Accepts1900_ButNothingEarlier()
    {
        ManualMeasurementValidation.TryValidateDate("1900-01-01", out _).Should().BeTrue();

        ManualMeasurementValidation.TryValidateDate("1899-12-31", out var error).Should().BeFalse();
        error.Should().Contain("between 1900-01-01 and today");
    }

    [Theory]
    [InlineData("")]
    [InlineData("2024-1-5")]
    [InlineData("05/01/2024")]
    [InlineData("2024-13-01")]
    [InlineData("2024-02-30")]
    [InlineData("2024-01-05T00:00:00")]
    public void TryValidateDate_RejectsMalformedDates(string date)
    {
        ManualMeasurementValidation.TryValidateDate(date, out var error).Should().BeFalse();
        error.Should().Be("Date must be in yyyy-MM-dd format");
    }
}
