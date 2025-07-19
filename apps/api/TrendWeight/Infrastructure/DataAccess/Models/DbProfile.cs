using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using TrendWeight.Features.Profile.Models;

namespace TrendWeight.Infrastructure.DataAccess.Models;

[Table("profiles")]
public class DbProfile : BaseModel
{
    [PrimaryKey]
    [Column("uid")]
    public Guid Uid { get; set; }

    [Column("email")]
    public string Email { get; set; } = string.Empty;

    [Column("profile")]
    public ProfileData Profile { get; set; } = new();

    [Column("created_at")]
    public string CreatedAt { get; set; } = string.Empty;

    [Column("updated_at")]
    public string UpdatedAt { get; set; } = string.Empty;
}
