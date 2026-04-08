using System.Security.Claims;
using System.Text.Json;
using Harita.API.Data;
using Harita.API.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.IO;

namespace Harita.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class MapController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;

        public MapController(AppDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        private Guid GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (claim == null) throw new UnauthorizedAccessException();
            return Guid.Parse(claim.Value);
        }

        // GET /api/Map/layers
        [HttpGet("layers")]
        public async Task<IActionResult> GetLayers()
        {
            var layers = await _context.MapLayers
                .Where(l => !l.IsDeleted)
                .OrderBy(l => l.Order)
                .Select(l => new
                {
                    l.Id, l.Name, l.LayerType, l.FilePath, l.WmsUrl,
                    l.StyleJson, l.IsVisible, l.Order, l.CreatedAt,
                    HasGeoJson = l.GeoJsonData != null
                })
                .ToListAsync();
            return Ok(layers);
        }

        // POST /api/Map/layers  (JSON: name, layerType="wms"|"parcel")
        [HttpPost("layers")]
        public async Task<IActionResult> CreateLayer([FromBody] CreateMapLayerDto dto)
        {
            var userId = GetCurrentUserId();
            var layer = new MapLayer
            {
                Name            = dto.Name,
                LayerType       = dto.LayerType,
                WmsUrl          = dto.WmsUrl,
                StyleJson       = dto.StyleJson,
                IsVisible       = true,
                Order           = await _context.MapLayers.CountAsync() + 1,
                CreatedByUserId = userId
            };

            if (dto.LayerType == "parcel")
                layer.GeoJsonData = await BuildParcelGeoJsonAsync();
            else if (!string.IsNullOrEmpty(dto.GeoJsonData))
                layer.GeoJsonData = dto.GeoJsonData;

            _context.MapLayers.Add(layer);
            await _context.SaveChangesAsync();
            return Ok(new { layer.Id, layer.Name, layer.LayerType, layer.IsVisible, layer.Order });
        }

        // POST /api/Map/layers/shp  (multipart: file + name)
        [HttpPost("layers/shp")]
        [RequestSizeLimit(50 * 1024 * 1024)]
        public async Task<IActionResult> CreateShpLayer(IFormFile file, [FromForm] string name, [FromForm] string? styleJson)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Dosya seçilmedi.");

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (ext != ".zip")
                return BadRequest("SHP yüklemek için .zip formatında arşiv gereklidir.");

            var userId = GetCurrentUserId();

            // ZIP'i geçici klasöre aç
            var tmpDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
            Directory.CreateDirectory(tmpDir);
            try
            {
                var zipPath = Path.Combine(tmpDir, file.FileName);
                using (var fs = System.IO.File.Create(zipPath))
                    await file.CopyToAsync(fs);

                System.IO.Compression.ZipFile.ExtractToDirectory(zipPath, tmpDir);
                var shpFile = Directory.GetFiles(tmpDir, "*.shp", SearchOption.AllDirectories).FirstOrDefault()
                    ?? throw new Exception(".shp dosyası ZIP içinde bulunamadı.");

                // SHP → GeoJSON features
                var features = new List<object>();
                var reader = new ShapefileDataReader(shpFile, NetTopologySuite.NtsGeometryServices.Instance.CreateGeometryFactory());
                var dbaseHeader = reader.DbaseHeader;
                while (reader.Read())
                {
                    var geom = reader.Geometry;
                    if (geom == null) continue;
                    var props = new Dictionary<string, object?>();
                    for (int i = 0; i < dbaseHeader.NumFields; i++)
                    {
                        var field = dbaseHeader.Fields[i];
                        props[field.Name] = reader.GetValue(i + 1);
                    }
                    features.Add(new
                    {
                        type = "Feature",
                        geometry = JsonSerializer.Deserialize<JsonElement>(geom.AsText().Length > 0
                            ? WktToGeoJsonGeometry(geom)
                            : "{}"),
                        properties = props
                    });
                }
                reader.Close();

                var geoJson = JsonSerializer.Serialize(new
                {
                    type = "FeatureCollection",
                    features
                });

                // Dosyayı uploads klasörüne kaydet
                var uploadsDir = Path.Combine(_env.ContentRootPath, "uploads", "shp");
                Directory.CreateDirectory(uploadsDir);
                var savedPath = Path.Combine(uploadsDir, Guid.NewGuid() + "_" + Path.GetFileName(shpFile));
                System.IO.File.Copy(shpFile, savedPath);

                var layer = new MapLayer
                {
                    Name            = name,
                    LayerType       = "shp",
                    FilePath        = savedPath,
                    GeoJsonData     = geoJson,
                    StyleJson       = styleJson,
                    IsVisible       = true,
                    Order           = await _context.MapLayers.CountAsync() + 1,
                    CreatedByUserId = userId
                };
                _context.MapLayers.Add(layer);
                await _context.SaveChangesAsync();

                return Ok(new { layer.Id, layer.Name, layer.LayerType, layer.IsVisible, layer.Order });
            }
            finally
            {
                try { Directory.Delete(tmpDir, true); } catch { }
            }
        }

        // GET /api/Map/layers/{id}/geojson
        [HttpGet("layers/{id:guid}/geojson")]
        public async Task<IActionResult> GetGeoJson(Guid id)
        {
            var layer = await _context.MapLayers.FindAsync(id);
            if (layer == null || layer.IsDeleted) return NotFound();
            if (layer.GeoJsonData == null) return NoContent();
            return Content(layer.GeoJsonData, "application/json");
        }

        // PUT /api/Map/layers/{id}
        [HttpPut("layers/{id:guid}")]
        public async Task<IActionResult> UpdateLayer(Guid id, [FromBody] UpdateMapLayerDto dto)
        {
            var layer = await _context.MapLayers.FindAsync(id);
            if (layer == null || layer.IsDeleted) return NotFound();

            layer.Name      = dto.Name ?? layer.Name;
            layer.IsVisible = dto.IsVisible;
            layer.Order     = dto.Order;
            layer.StyleJson = dto.StyleJson ?? layer.StyleJson;

            await _context.SaveChangesAsync();
            return Ok(new { layer.Id, layer.Name, layer.IsVisible, layer.Order });
        }

        // DELETE /api/Map/layers/{id}
        [HttpDelete("layers/{id:guid}")]
        public async Task<IActionResult> DeleteLayer(Guid id)
        {
            var layer = await _context.MapLayers.FindAsync(id);
            if (layer == null || layer.IsDeleted) return NotFound();
            layer.IsDeleted = true;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // GET /api/Map/parcels/count  — Toplam parsel sayısı
        [HttpGet("parcels/count")]
        public async Task<IActionResult> GetParcelCount()
        {
            var total = await _context.Parcels.CountAsync(p => !p.IsDeleted);
            var withGeom = await _context.Parcels.CountAsync(p => !p.IsDeleted && p.Geometry != null);
            return Ok(new { total, withGeometry = withGeom });
        }

        // GET /api/Map/parcels/geojson  — DB parsel verilerini GeoJSON olarak dön
        [HttpGet("parcels/geojson")]
        public async Task<IActionResult> GetParcelGeoJson()
        {
            var geoJson = await BuildParcelGeoJsonAsync();
            return Content(geoJson, "application/json");
        }

        private async Task<string> BuildParcelGeoJsonAsync()
        {
            var parcels = await _context.Parcels
                .Where(p => !p.IsDeleted && p.Geometry != null)
                .Select(p => new { p.Ada, p.Parsel, p.Mahalle, p.MalikAdi, p.Alan, p.Geometry })
                .Take(5000)
                .ToListAsync();

            var features = parcels
                .Where(p => !string.IsNullOrEmpty(p.Geometry))
                .Select(p =>
                {
                    try
                    {
                        var reader = new WKTReader();
                        var geom = reader.Read(p.Geometry);
                        return new
                        {
                            type = "Feature",
                            geometry = JsonSerializer.Deserialize<JsonElement>(WktToGeoJsonGeometry(geom)),
                            properties = new { p.Ada, p.Parsel, p.Mahalle, p.MalikAdi, p.Alan }
                        };
                    }
                    catch { return (object?)null; }
                })
                .Where(f => f != null)
                .ToList();

            return JsonSerializer.Serialize(new { type = "FeatureCollection", features });
        }

        // Basit WKT → GeoJSON geometry dönüşümü (NetTopologySuite geometry üzerinden)
        private static string WktToGeoJsonGeometry(NetTopologySuite.Geometries.Geometry geom)
        {
            var writer = new NetTopologySuite.IO.GeoJsonWriter();
            return writer.Write(geom);
        }
    }

    public class CreateMapLayerDto
    {
        public required string Name { get; set; }
        public string LayerType { get; set; } = "parcel"; // "parcel" | "wms" | "shp" | "gis"
        public string? WmsUrl { get; set; }
        public string? StyleJson { get; set; }
        public string? GeoJsonData { get; set; } // Hazır GeoJSON (GIS veya harici kaynak)
    }

    public class UpdateMapLayerDto
    {
        public string? Name { get; set; }
        public bool IsVisible { get; set; } = true;
        public int Order { get; set; }
        public string? StyleJson { get; set; }
    }
}
