namespace Harita.API.Entities
{
    public class User : BaseEntity
    {
        public string? Name { get; set; }
        public string? Surname { get; set; }
        public string? Email { get; set; }
        public string? PasswordHash { get; set; }
        public string? Department { get; set; }
        public bool IsActive { get; set; } = true;

        public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
        public ICollection<AppTask> CreatedAppTasks { get; set; } = new List<AppTask>();
        public ICollection<UserPermissionGroup> UserPermissionGroups { get; set; } = new List<UserPermissionGroup>();
    }
}
