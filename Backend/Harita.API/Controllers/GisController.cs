using System.Security.Claims;
using Harita.API.Data;
using Harita.API.DTOs;
using Harita.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Harita.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class GisController : ControllerBase
{
    private readonly IGisService _gis;
    private readonly AppDbContext _context;

    public GisController(IGisService gis, AppDbContext context)
    {
        _gis = gis;
        _context = context;
    }

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>GIS veritabanına bağlantı testi</summary>
    [HttpGet("test")]
    [Authorize(Roles = "Admin,Müdür,Şef")]
    public async Task<IActionResult> TestConnection()
    {
        var ok = await _gis.TestConnectionAsync();
        return Ok(new { connected = ok });
    }

    /// <summary>GIS veritabanındaki tabloları listele</summary>
    [HttpGet("tables")]
    [Authorize(Roles = "Admin,Müdür,Şef")]
    public async Task<IActionResult> GetTables()
    {
        try
        {
            var tables = await _gis.GetTablesAsync();
            return Ok(tables);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"GIS bağlantısı kurulamadı: {ex.Message}" });
        }
    }

    /// <summary>GIS tablosunu önizle (sayfalı)</summary>
    [HttpGet("preview")]
    [Authorize(Roles = "Admin,Müdür,Şef")]
    public async Task<IActionResult> Preview(
        [FromQuery] string schema = "public",
        [FromQuery] string table = "",
        [FromQuery] string? mahalle = null,
        [FromQuery] string? ada = null,
        [FromQuery] string? parsel = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        if (string.IsNullOrWhiteSpace(table))
            return BadRequest("Tablo adı zorunludur.");

        try
        {
            var (rows, total) = await _gis.PreviewTableAsync(schema, table, mahalle, ada, parsel, page, pageSize);
            return Ok(new { items = rows, total, page, pageSize });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>GIS tablosundan GeoJSON döndür (harita katmanı için)</summary>
    [HttpGet("geojson")]
    [Authorize(Roles = "Admin,Müdür,Şef,Personel")]
    public async Task<IActionResult> GetGeoJson(
        [FromQuery] string schema = "public",
        [FromQuery] string table = "",
        [FromQuery] int limit = 10000)
    {
        if (string.IsNullOrWhiteSpace(table))
            return BadRequest("Tablo adı zorunludur.");
        if (limit < 1 || limit > 50000) limit = 10000;

        try
        {
            var geoJson = await _gis.GetGeoJsonAsync(schema, table, limit);
            return Ok(geoJson);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>GIS tablosundan yerel veritabanına parsel aktar (Admin/Müdür/Şef)</summary>
    [HttpPost("import")]
    [Authorize(Roles = "Admin,Müdür,Şef")]
    public async Task<IActionResult> Import([FromBody] GisImportDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Table))
            return BadRequest("Tablo adı zorunludur.");

        try
        {
            var result = await _gis.ImportToLocalAsync(dto, CurrentUserId, _context);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
