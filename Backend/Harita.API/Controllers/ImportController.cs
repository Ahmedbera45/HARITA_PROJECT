using ClosedXML.Excel;
using Harita.API.Data;
using Harita.API.DTOs;
using Harita.API.Entities;
using Harita.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Harita.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class ImportController : ControllerBase
    {
        private readonly IImportService _importService;
        private readonly AppDbContext _context;

        public ImportController(IImportService importService, AppDbContext context)
        {
            _importService = importService;
            _context = context;
        }

        /// <summary>Gerçek .xlsx şablon dosyası indir (özel alanlar dahil)</summary>
        [HttpGet("template")]
        public async Task<IActionResult> GetTemplate()
        {
            var customFields = await _context.ParcelCustomFields
                .Where(f => f.IsActive && !f.IsDeleted)
                .OrderBy(f => f.SortOrder)
                .ToListAsync();

            using var wb = new XLWorkbook();
            var ws = wb.Worksheets.Add("Parseller");

            var stdHeaders = new[] { "Ada", "Parsel", "Mahalle", "Mevkii", "Alan", "Nitelik", "MalikAdi", "PaftaNo", "RayicBedel", "YolGenisligi", "EskiAda", "EskiParsel", "PlanFonksiyonu" };
            var allHeaders = stdHeaders.Concat(customFields.Select(f => f.FieldKey)).ToArray();

            for (int i = 0; i < allHeaders.Length; i++)
            {
                var cell = ws.Cell(1, i + 1);
                cell.Value = allHeaders[i];
                cell.Style.Font.Bold = true;
                cell.Style.Fill.BackgroundColor = i < stdHeaders.Length
                    ? XLColor.FromHtml("#1976d2")
                    : XLColor.FromHtml("#7b1fa2");
                cell.Style.Font.FontColor = XLColor.White;
            }

            ws.Cell(2, 1).Value = "100"; ws.Cell(2, 2).Value = "1";  ws.Cell(2, 3).Value = "Merkez";
            ws.Cell(3, 1).Value = "200"; ws.Cell(3, 2).Value = "5";  ws.Cell(3, 3).Value = "Fatih";

            ws.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            wb.SaveAs(stream);
            stream.Position = 0;

            return File(stream.ToArray(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "parsel_sablonu.xlsx");
        }

        // ── Özel Alan Yönetimi ───────────────────────────────────────────────

        [HttpGet("custom-fields")]
        public async Task<IActionResult> GetCustomFields()
        {
            var fields = await _context.ParcelCustomFields
                .Where(f => !f.IsDeleted)
                .OrderBy(f => f.SortOrder)
                .Select(f => new { f.Id, f.FieldKey, f.DisplayName, f.FieldType, f.SortOrder, f.IsActive })
                .ToListAsync();
            return Ok(fields);
        }

        [HttpPost("custom-fields")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateCustomField([FromBody] CustomFieldDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.FieldKey) || string.IsNullOrWhiteSpace(dto.DisplayName))
                return BadRequest("FieldKey ve DisplayName zorunludur.");

            // FieldKey sadece harf/rakam/alt çizgi
            if (!System.Text.RegularExpressions.Regex.IsMatch(dto.FieldKey, @"^[A-Za-z0-9_]+$"))
                return BadRequest("FieldKey sadece harf, rakam ve alt çizgi içerebilir.");

            if (await _context.ParcelCustomFields.AnyAsync(f => f.FieldKey == dto.FieldKey && !f.IsDeleted))
                return BadRequest($"'{dto.FieldKey}' anahtarı zaten kullanımda.");

            var maxOrder = await _context.ParcelCustomFields.Where(f => !f.IsDeleted).MaxAsync(f => (int?)f.SortOrder) ?? 0;
            var field = new ParcelCustomField
            {
                FieldKey    = dto.FieldKey,
                DisplayName = dto.DisplayName,
                FieldType   = dto.FieldType ?? "text",
                SortOrder   = maxOrder + 1,
                IsActive    = true,
            };
            _context.ParcelCustomFields.Add(field);
            await _context.SaveChangesAsync();
            return Ok(new { field.Id, field.FieldKey, field.DisplayName, field.FieldType, field.SortOrder, field.IsActive });
        }

        [HttpPut("custom-fields/{id:guid}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateCustomField(Guid id, [FromBody] CustomFieldDto dto)
        {
            var field = await _context.ParcelCustomFields.FindAsync(id);
            if (field == null || field.IsDeleted) return NotFound();
            field.DisplayName = dto.DisplayName ?? field.DisplayName;
            field.FieldType   = dto.FieldType ?? field.FieldType;
            field.SortOrder   = dto.SortOrder ?? field.SortOrder;
            field.IsActive    = dto.IsActive ?? field.IsActive;
            await _context.SaveChangesAsync();
            return Ok(new { field.Id, field.FieldKey, field.DisplayName, field.FieldType, field.SortOrder, field.IsActive });
        }

        [HttpDelete("custom-fields/{id:guid}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteCustomField(Guid id)
        {
            var field = await _context.ParcelCustomFields.FindAsync(id);
            if (field == null || field.IsDeleted) return NotFound();
            field.IsDeleted = true;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // ── Birleştirme (Merge / Upsert) ────────────────────────────────────

        /// <summary>Mevcut parsellere eksik sütunları ekle/güncelle</summary>
        [HttpPost("parcels/merge")]
        [Authorize(Roles = "Admin,Müdür,Şef")]
        [RequestSizeLimit(10 * 1024 * 1024)]
        public async Task<IActionResult> MergeParcels(IFormFile file, [FromQuery] string columns)
        {
            if (string.IsNullOrWhiteSpace(columns))
                return BadRequest("Güncellenecek sütunlar belirtilmelidir (columns=RayicBedel,Alan,...).");
            try
            {
                var updateColumns = columns.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
                var result = await _importService.MergeParcelsFromExcelAsync(file, updateColumns);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>Ada, Parsel veya Mahalle için distinct autocomplete listesi</summary>
        [HttpGet("parcels/autocomplete")]
        public async Task<IActionResult> Autocomplete([FromQuery] string? q, [FromQuery] string field = "mahalle")
        {
            var result = await _importService.AutocompleteAsync(q ?? "", field);
            return Ok(result);
        }

        /// <summary>Ada + Parsel ile veritabanında parsel ara</summary>
        [HttpGet("parcels/search")]
        public async Task<IActionResult> SearchParcel([FromQuery] string ada, [FromQuery] string parsel, [FromQuery] string? mahalle)
        {
            var result = await _importService.SearchParcelAsync(ada, parsel, mahalle);
            if (result == null) return NotFound(new { message = "Parsel bulunamadı." });
            return Ok(result);
        }

        /// <summary>SHP (ZIP) dosyasından parsel verisi içe aktar (Admin/Manager)</summary>
        [HttpPost("parcels/shp")]
        [Authorize(Roles = "Admin,Müdür,Şef")]
        [RequestSizeLimit(50 * 1024 * 1024)]
        public async Task<IActionResult> ImportShp(IFormFile file)
        {
            try
            {
                var result = await _importService.ImportParcelsFromShpAsync(file);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>Excel dosyasından parsel verisi içe aktar (Admin/Manager)</summary>
        [HttpPost("parcels")]
        [Authorize(Roles = "Admin,Müdür,Şef")]
        [RequestSizeLimit(10 * 1024 * 1024)]
        public async Task<IActionResult> ImportParcels(IFormFile file)
        {
            try
            {
                var result = await _importService.ImportParcelsFromExcelAsync(file);
                return Ok(result);
            }
            catch (Exception ex)
            {
                var inner = ex.InnerException?.InnerException?.Message ?? ex.InnerException?.Message ?? ex.Message;
                return BadRequest($"{ex.Message} | Detay: {inner}");
            }
        }

        /// <summary>İçe aktarma geçmişi</summary>
        [HttpGet("logs")]
        public async Task<IActionResult> GetLogs()
        {
            var result = await _importService.GetImportLogsAsync();
            return Ok(result);
        }

        /// <summary>Parsel listesi (opsiyonel batchId + mahalle filtresi)</summary>
        [HttpGet("parcels")]
        public async Task<IActionResult> GetParcels([FromQuery] string? batchId, [FromQuery] string? mahalle)
        {
            var result = await _importService.GetParcelsAsync(batchId, mahalle);
            return Ok(result);
        }

        /// <summary>Parsel listesi — sayfalı</summary>
        [HttpGet("parcels/paged")]
        public async Task<IActionResult> GetParcelsPaged(
            [FromQuery] string? batchId,
            [FromQuery] string? mahalle,
            [FromQuery] string? search,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await _importService.GetParcelsPagedAsync(batchId, mahalle, search, page, pageSize);
            return Ok(result);
        }

        /// <summary>Parsel kaydını güncelle (Admin/Manager)</summary>
        [HttpPut("parcels/{id:guid}")]
        [Authorize(Roles = "Admin,Müdür,Şef")]
        public async Task<IActionResult> UpdateParcel(Guid id, [FromBody] UpdateParcelDto dto)
        {
            try
            {
                var result = await _importService.UpdateParcelAsync(id, dto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
