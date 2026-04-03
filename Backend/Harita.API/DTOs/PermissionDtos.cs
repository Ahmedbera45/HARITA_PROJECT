namespace Harita.API.DTOs;

public class ModulePermissionDto
{
    public bool View { get; set; }
    public bool Edit { get; set; }
}

public class PermissionGroupDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Dictionary<string, ModulePermissionDto> Permissions { get; set; } = new();
}

public class CreatePermissionGroupDto
{
    public required string Name { get; set; }
    public string? Description { get; set; }
    public Dictionary<string, ModulePermissionDto> Permissions { get; set; } = new();
}
