using System.Security.Claims;
using Harita.API.DTOs;
using Harita.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Harita.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ImarPlanController : ControllerBase
{
    private readonly IImarPlanService _service;

    public ImarPlanController(IImarPlanService service)
    {
        _service = service;
    }

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // GET /api/ImarPlan
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _service.GetAllAsync();
        return Ok(result);
    }

    // GET /api/ImarPlan/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _service.GetByIdAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    // POST /api/ImarPlan
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateImarPlanDto dto)
    {
        try
        {
            var result = await _service.CreateAsync(dto, CurrentUserId);
            return Ok(result);
        }
        catch (Exception ex) { return BadRequest(ex.Message); }
    }

    // PUT /api/ImarPlan/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateImarPlanDto dto)
    {
        try
        {
            var result = await _service.UpdateAsync(id, dto);
            return Ok(result);
        }
        catch (Exception ex) { return BadRequest(ex.Message); }
    }

    // DELETE /api/ImarPlan/{id}
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var ok = await _service.DeleteAsync(id);
        return ok ? NoContent() : NotFound();
    }

    // POST /api/ImarPlan/{id}/ekler — Ek dosya ekle
    [HttpPost("{id}/ekler")]
    public async Task<IActionResult> AddEk(Guid id, [FromBody] AddImarPlanEkDto dto)
    {
        try
        {
            var result = await _service.AddEkAsync(id, dto, CurrentUserId);
            return Ok(result);
        }
        catch (Exception ex) { return BadRequest(ex.Message); }
    }

    // DELETE /api/ImarPlan/ekler/{ekId} — Ek dosya sil
    [HttpDelete("ekler/{ekId}")]
    public async Task<IActionResult> DeleteEk(Guid ekId)
    {
        var ok = await _service.DeleteEkAsync(ekId);
        return ok ? NoContent() : NotFound();
    }

    // GET /api/ImarPlan/ekler/{ekId}/download — Dosyayı indir
    [HttpGet("ekler/{ekId}/download")]
    public async Task<IActionResult> DownloadEk(Guid ekId)
    {
        try
        {
            var (content, fileName, contentType) = await _service.DownloadEkAsync(ekId);
            return File(content, contentType, fileName);
        }
        catch (FileNotFoundException ex) { return NotFound(ex.Message); }
        catch (UnauthorizedAccessException ex) { return BadRequest(ex.Message); }
        catch (Exception ex) { return BadRequest(ex.Message); }
    }

    // GET /api/ImarPlan/browse?path= — Ağ klasörü listele
    [HttpGet("browse")]
    public IActionResult Browse([FromQuery] string path = "")
    {
        try
        {
            var result = _service.BrowseNetwork(path);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex) { return BadRequest(ex.Message); }
        catch (DirectoryNotFoundException ex) { return NotFound(ex.Message); }
        catch (Exception ex) { return BadRequest(ex.Message); }
    }
}
