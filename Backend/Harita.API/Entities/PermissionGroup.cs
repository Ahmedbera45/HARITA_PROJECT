namespace Harita.API.Entities;

public class PermissionGroup : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    // JSON: {"rehber":{"view":true,"edit":true},"gorev":{"view":false,"edit":false},...}
    public string Permissions { get; set; } = "{}";
    public ICollection<UserPermissionGroup> UserPermissionGroups { get; set; } = new List<UserPermissionGroup>();
}
