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
