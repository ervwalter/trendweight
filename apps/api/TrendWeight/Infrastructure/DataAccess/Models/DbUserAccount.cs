using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace TrendWeight.Infrastructure.DataAccess.Models;

[Table("user_accounts")]
public class DbUserAccount : BaseModel
{
    [PrimaryKey("uid", false)]
    [Column("uid")]
    public Guid Uid { get; set; }

    [Column("external_id")]
    public string ExternalId { get; set; } = string.Empty;

    [Column("provider")]
    public string Provider { get; set; } = string.Empty;

    [Column("created_at")]
    public string CreatedAt { get; set; } = string.Empty;

    [Column("updated_at")]
    public string UpdatedAt { get; set; } = string.Empty;
}
