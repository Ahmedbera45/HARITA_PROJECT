using System.Text.Json;
using Harita.API.Data;
using Harita.API.DTOs;
using Harita.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Harita.API.Services;

public class PermissionService : IPermissionService
{
    private readonly AppDbContext _context;

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public PermissionService(AppDbContext context)
    {
        _context = context;
    }

    private static PermissionGroupDto MapToDto(PermissionGroup pg)
    {
        var permissions = new Dictionary<string, ModulePermissionDto>();
        try
        {
            if (!string.IsNullOrWhiteSpace(pg.Permissions) && pg.Permissions != "{}")
            {
                permissions = JsonSerializer.Deserialize<Dictionary<string, ModulePermissionDto>>(pg.Permissions, _jsonOptions)
                    ?? new Dictionary<string, ModulePermissionDto>();
            }
        }
        catch { /* ignore deserialization errors */ }

        return new PermissionGroupDto
        {
            Id = pg.Id,
            Name = pg.Name,
            Description = pg.Description,
            Permissions = permissions,
        };
    }

    public async Task<List<PermissionGroupDto>> GetAllAsync()
    {
        var groups = await _context.PermissionGroups
            .Where(pg => !pg.IsDeleted)
            .OrderBy(pg => pg.Name)
            .ToListAsync();
        return groups.Select(MapToDto).ToList();
    }

    public async Task<PermissionGroupDto> CreateAsync(CreatePermissionGroupDto dto)
    {
        var permissionsJson = JsonSerializer.Serialize(dto.Permissions, _jsonOptions);
        var group = new PermissionGroup
        {
            Name = dto.Name,
            Description = dto.Description,
            Permissions = permissionsJson,
            CreatedAt = DateTime.UtcNow,
        };
        _context.PermissionGroups.Add(group);
        await _context.SaveChangesAsync();
        return MapToDto(group);
    }

    public async Task<PermissionGroupDto> UpdateAsync(Guid id, CreatePermissionGroupDto dto)
    {
        var group = await _context.PermissionGroups.FindAsync(id)
            ?? throw new Exception("Yetki grubu bulunamadı.");

        group.Name = dto.Name;
        group.Description = dto.Description;
        group.Permissions = JsonSerializer.Serialize(dto.Permissions, _jsonOptions);

        await _context.SaveChangesAsync();
        return MapToDto(group);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var group = await _context.PermissionGroups.FindAsync(id);
        if (group == null) return false;
        group.IsDeleted = true;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task AssignGroupToUserAsync(Guid userId, Guid groupId)
    {
        var exists = await _context.UserPermissionGroups
            .AnyAsync(upg => upg.UserId == userId && upg.PermissionGroupId == groupId);
        if (exists) return;

        _context.UserPermissionGroups.Add(new UserPermissionGroup
        {
            UserId = userId,
            PermissionGroupId = groupId,
            CreatedAt = DateTime.UtcNow,
        });
        await _context.SaveChangesAsync();
    }

    public async Task RemoveGroupFromUserAsync(Guid userId, Guid groupId)
    {
        var upg = await _context.UserPermissionGroups
            .FirstOrDefaultAsync(x => x.UserId == userId && x.PermissionGroupId == groupId);
        if (upg != null)
        {
            _context.UserPermissionGroups.Remove(upg);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<List<PermissionGroupDto>> GetUserGroupsAsync(Guid userId)
    {
        var groups = await _context.UserPermissionGroups
            .Where(upg => upg.UserId == userId)
            .Include(upg => upg.PermissionGroup)
            .Where(upg => !upg.PermissionGroup.IsDeleted)
            .Select(upg => upg.PermissionGroup)
            .ToListAsync();
        return groups.Select(MapToDto).ToList();
    }

    public async Task SetUserGroupsAsync(Guid userId, List<Guid> groupIds)
    {
        // Remove all existing
        var existing = _context.UserPermissionGroups.Where(upg => upg.UserId == userId);
        _context.UserPermissionGroups.RemoveRange(existing);

        // Add new
        foreach (var groupId in groupIds.Distinct())
        {
            _context.UserPermissionGroups.Add(new UserPermissionGroup
            {
                UserId = userId,
                PermissionGroupId = groupId,
                CreatedAt = DateTime.UtcNow,
            });
        }

        await _context.SaveChangesAsync();
    }
}
