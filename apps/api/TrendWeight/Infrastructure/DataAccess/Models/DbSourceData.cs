using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using TrendWeight.Features.Measurements.Models;

namespace TrendWeight.Infrastructure.DataAccess.Models;

[Table("source_data")]
public class DbSourceData : BaseModel
{
    [PrimaryKey("uid")]
    [Column("uid")]
    public Guid Uid { get; set; }

    [PrimaryKey("provider")]
    [Column("provider")]
    public string Provider { get; set; } = string.Empty;

    [Column("measurements")]
    public List<RawMeasurement> Measurements { get; set; } = new List<RawMeasurement>();

    [Column("last_sync")]
    public string? LastSync { get; set; }

    [Column("force_full_sync")]
    public bool ForceFullSync { get; set; } = false;

    [Column("updated_at")]
    public string UpdatedAt { get; set; } = string.Empty;
}
