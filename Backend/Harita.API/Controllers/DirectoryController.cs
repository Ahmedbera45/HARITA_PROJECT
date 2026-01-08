using System.Security.Claims;
using Harita.API.DTOs;
using Harita.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Harita.API.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class DirectoryController : ControllerBase
{
    private readonly IDirectoryService _directoryService;

    public DirectoryController(IDirectoryService directoryService)
    {
        _directoryService = directoryService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _directoryService.GetAllAsync();
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _directoryService.GetByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDirectoryDto dto)
    {
        var result = await _directoryService.AddAsync(dto);
        if (!result) return BadRequest();
        return Ok("Rehber kaydı oluşturuldu.");
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateDirectoryDto dto)
    {
        var result = await _directoryService.UpdateAsync(id, dto);
        if (!result) return NotFound();
        return Ok("Rehber kaydı güncellendi.");
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _directoryService.DeleteAsync(id);
        if (!result) return NotFound();
        return Ok("Rehber kaydı silindi.");
    }
}

