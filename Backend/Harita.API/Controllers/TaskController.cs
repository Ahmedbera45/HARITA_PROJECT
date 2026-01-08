using System.Security.Claims;
using Harita.API.DTOs;
using Harita.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Harita.API.Controllers;
[Authorize]
[Route("api/[controller]")]
[ApiController]
public class TaskController : ControllerBase
{
    private readonly ITaskService _taskService;

    public TaskController(ITaskService taskService)
    {
        _taskService = taskService;
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        return userIdClaim != null ? Guid.Parse(userIdClaim.Value) : Guid.Empty;
    }

    [HttpGet("mytasks")]
    public async Task<IActionResult> GetMyTasks()
    {
        var userId = GetCurrentUserId();
        var result = await _taskService.GetMyTasksAsync(userId);
        return Ok(result);
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] CreateTaskDto dto)
    {
        var userId = GetCurrentUserId();
        var result = await _taskService.CreateTaskAsync(dto, userId);
        if (!result) return BadRequest();
        return Ok("Görev oluşturuldu.");
    }

    [HttpPut("update-status/{id}")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateTaskStatusDto dto)
    {
        var result = await _taskService.UpdateTaskStatusAsync(id, dto.Status);
        if (!result) return NotFound();
        return Ok("Görev durumu güncellendi.");
    }
}