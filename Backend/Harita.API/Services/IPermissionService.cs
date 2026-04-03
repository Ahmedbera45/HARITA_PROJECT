using Harita.API.DTOs;

namespace Harita.API.Services;

public interface IPermissionService
{
    Task<List<PermissionGroupDto>> GetAllAsync();
    Task<PermissionGroupDto> CreateAsync(CreatePermissionGroupDto dto);
    Task<PermissionGroupDto> UpdateAsync(Guid id, CreatePermissionGroupDto dto);
    Task<bool> DeleteAsync(Guid id);
    Task AssignGroupToUserAsync(Guid userId, Guid groupId);
    Task RemoveGroupFromUserAsync(Guid userId, Guid groupId);
    Task<List<PermissionGroupDto>> GetUserGroupsAsync(Guid userId);
    Task SetUserGroupsAsync(Guid userId, List<Guid> groupIds);
}
