using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace TrendWeight.Infrastructure.DataAccess.Models;

[Table("provider_links")]
public class DbProviderLink : BaseModel
{
    [PrimaryKey("uid")]
    [Column("uid")]
    public Guid Uid { get; set; }

    [PrimaryKey("provider")]
    [Column("provider")]
    public string Provider { get; set; } = string.Empty;

    [Column("token")]
    public Dictionary<string, object> Token { get; set; } = new Dictionary<string, object>();

    [Column("update_reason")]
    public string? UpdateReason { get; set; }

    [Column("updated_at")]
    public string UpdatedAt { get; set; } = string.Empty;

    /// <summary>
    /// When the link was first created. Null for rows that predate the column.
    /// </summary>
    [Column("created_at")]
    public string? CreatedAt { get; set; }
}
