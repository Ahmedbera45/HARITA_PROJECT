using Harita.API.DTOs;
using Harita.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Harita.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class PermissionController : ControllerBase
{
    private readonly IPermissionService _permissionService;

    public PermissionController(IPermissionService permissionService)
    {
        _permissionService = permissionService;
    }

    // GET /api/Permission — All groups (any authenticated user)
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _permissionService.GetAllAsync();
        return Ok(result);
    }

    // POST /api/Permission — Create group (Admin only)
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreatePermissionGroupDto dto)
    {
        try
        {
            var result = await _permissionService.CreateAsync(dto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    // PUT /api/Permission/{id} — Update group (Admin only)
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreatePermissionGroupDto dto)
    {
        try
        {
            var result = await _permissionService.UpdateAsync(id, dto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return NotFound(ex.Message);
        }
    }

    // DELETE /api/Permission/{id} — Delete group (Admin only)
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _permissionService.DeleteAsync(id);
        if (!result) return NotFound();
        return NoContent();
    }

    // GET /api/Permission/user/{userId}/groups — Get user's groups (Admin, Manager)
    [HttpGet("user/{userId}/groups")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetUserGroups(Guid userId)
    {
        var result = await _permissionService.GetUserGroupsAsync(userId);
        return Ok(result);
    }

    // PUT /api/Permission/user/{userId}/groups — Set user's groups (Admin only, replaces all)
    [HttpPut("user/{userId}/groups")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> SetUserGroups(Guid userId, [FromBody] List<Guid> groupIds)
    {
        try
        {
            await _permissionService.SetUserGroupsAsync(userId, groupIds);
            return Ok();
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
