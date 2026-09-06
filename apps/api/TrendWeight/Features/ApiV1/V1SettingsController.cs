using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using TrendWeight.Features.ApiV1.Models;
using TrendWeight.Features.Measurements;
using TrendWeight.Features.Profile.Services;

namespace TrendWeight.Features.ApiV1;

[Route("api/v1/settings")]
[Tags("Settings")]
public class V1SettingsController(IProfileService profileService) : BaseApiV1Controller
{
    /// <summary>Get display and behavioral settings</summary>
    /// <remarks>
    /// Read-only preferences for the API key owner. Sharing need not be enabled.
    /// Unlike the measurement endpoints, goalWeight and plannedWeightChangePerWeek
    /// use the user's display units: kilograms when useMetric is true, pounds otherwise.
    /// Values match the settings screen without conversion. Unset goals are omitted.
    /// Account details, sharing settings, and credentials are never included.
    /// </remarks>
    [HttpGet]
    [EndpointName("getSettings")]
    [ProducesResponseType(typeof(V1Settings), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(V1ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<V1Settings>> GetSettings()
    {
        var user = await profileService.GetByIdAsync(UserId);
        if (user == null)
        {
            return NotFound(new V1ErrorResponse { Error = "User not found" });
        }

        var profile = user.Profile;
        return Ok(new V1Settings
        {
            GoalStart = profile.GoalStart?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            GoalWeight = profile.GoalWeight,
            PlannedWeightChangePerWeek = profile.PlannedPoundsPerWeek,
            UseMetric = profile.UseMetric,
            DayStartOffset = profile.DayStartOffset ?? 0,
            ShowCalories = profile.ShowCalories ?? false,
            HideDataBeforeStart = profile.HideDataBeforeStart,
            TrendAlgorithm = TrendAlgorithmPresets.Resolve(profile.TrendAlgorithm).Id
        });
    }
}
