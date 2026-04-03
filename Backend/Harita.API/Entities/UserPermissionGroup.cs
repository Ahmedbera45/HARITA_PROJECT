namespace Harita.API.Entities;

public class UserPermissionGroup : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public Guid PermissionGroupId { get; set; }
    public PermissionGroup PermissionGroup { get; set; } = null!;
}
