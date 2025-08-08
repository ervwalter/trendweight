using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using TrendWeight.Features.Measurements.Models;

namespace TrendWeight.Infrastructure.DataAccess.Models;

[Table("legacy_profiles")]
public class DbLegacyProfile : BaseModel
{
    [PrimaryKey("email")]
    [Column("email")]
    public string Email { get; set; } = string.Empty;

    [Column("username")]
    public string? Username { get; set; }

    [Column("first_name")]
    public string? FirstName { get; set; }

    [Column("use_metric")]
    public bool? UseMetric { get; set; }

    [Column("start_date")]
    public DateTime? StartDate { get; set; }

    [Column("goal_weight")]
    public decimal? GoalWeight { get; set; }

    [Column("planned_pounds_per_week")]
    public decimal? PlannedPoundsPerWeek { get; set; }

    [Column("day_start_offset")]
    public int? DayStartOffset { get; set; }

    [Column("private_url_key")]
    public string? PrivateUrlKey { get; set; }

    [Column("device_type")]
    public string? DeviceType { get; set; }

    [Column("refresh_token")]
    public string? RefreshToken { get; set; }

    [Column("measurements")]
    public List<RawMeasurement> Measurements { get; set; } = new List<RawMeasurement>();

    [Column("created_at")]
    public DateTime? CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime? UpdatedAt { get; set; }
}
