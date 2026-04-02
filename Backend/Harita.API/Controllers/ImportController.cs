using ClosedXML.Excel;
using Harita.API.DTOs;
using Harita.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Harita.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class ImportController : ControllerBase
    {
        private readonly IImportService _importService;

        public ImportController(IImportService importService)
        {
            _importService = importService;
        }

        /// <summary>Gerçek .xlsx şablon dosyası indir</summary>
        [HttpGet("template")]
        public IActionResult GetTemplate()
        {
            using var wb = new XLWorkbook();
            var ws = wb.Worksheets.Add("Parseller");

            // Başlık satırı
            var headers = new[] { "Ada", "Parsel", "Mahalle", "Mevkii", "Alan", "Nitelik", "MalikAdi", "PaftaNo", "RayicBedel", "YolGenisligi" };
            for (int i = 0; i < headers.Length; i++)
            {
                var cell = ws.Cell(1, i + 1);
                cell.Value = headers[i];
                cell.Style.Font.Bold = true;
                cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#1976d2");
                cell.Style.Font.FontColor = XLColor.White;
            }

            // Örnek satırlar
            ws.Cell(2, 1).Value = "100"; ws.Cell(2, 2).Value = "1";  ws.Cell(2, 3).Value = "Merkez";      ws.Cell(2, 4).Value = "Aşağı Mah."; ws.Cell(2, 5).Value = 500;    ws.Cell(2, 6).Value = "Arsa";  ws.Cell(2, 7).Value = "Ali Veli";  ws.Cell(2, 8).Value = "10-B"; ws.Cell(2, 9).Value = 250000; ws.Cell(2, 10).Value = "15+";
            ws.Cell(3, 1).Value = "200"; ws.Cell(3, 2).Value = "5";  ws.Cell(3, 3).Value = "Fatih";       ws.Cell(3, 4).Value = "Yukarı Mah."; ws.Cell(3, 5).Value = 320;   ws.Cell(3, 6).Value = "Konut"; ws.Cell(3, 7).Value = "Ayşe Kaya"; ws.Cell(3, 8).Value = "12-C"; ws.Cell(3, 9).Value = 180000; ws.Cell(3, 10).Value = "10-15";
            ws.Cell(4, 1).Value = "305"; ws.Cell(4, 2).Value = "12"; ws.Cell(4, 3).Value = "Cumhuriyet"; ws.Cell(4, 4).Value = "";            ws.Cell(4, 5).Value = 750;    ws.Cell(4, 6).Value = "Tarla"; ws.Cell(4, 7).Value = "";          ws.Cell(4, 8).Value = "8-A";  ws.Cell(4, 9).Value = "";     ws.Cell(4, 10).Value = "7m";

            ws.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            wb.SaveAs(stream);
            stream.Position = 0;

            return File(stream.ToArray(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "parsel_sablonu.xlsx");
        }

        /// <summary>Excel dosyasından parsel verisi içe aktar (Admin/Manager)</summary>
        [HttpPost("parcels")]
        [Authorize(Roles = "Admin,Manager")]
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
                return BadRequest(ex.Message);
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

        /// <summary>Parsel kaydını güncelle (Admin/Manager)</summary>
        [HttpPut("parcels/{id:guid}")]
        [Authorize(Roles = "Admin,Manager")]
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
