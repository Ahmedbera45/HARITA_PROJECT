using Harita.API.DTOs;
using Harita.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Harita.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DynamicPageController : ControllerBase
    {
        private readonly IDynamicPageService _service;

        public DynamicPageController(IDynamicPageService service)
        {
            _service = service;
        }

        // POST api/DynamicPage
        [HttpPost]
        [Authorize(Roles = "Admin,Müdür,Şef")]
        public async Task<IActionResult> CreatePage([FromBody] CreateDynamicPageDto dto)
        {
            try
            {
                var result = await _service.CreatePageAsync(dto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET api/DynamicPage
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllPagesAsync();
            return Ok(result);
        }

        // GET api/DynamicPage/{id}?search=&column=
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetPage(Guid id, [FromQuery] string? search, [FromQuery] string? column)
        {
            var result = await _service.GetPageAsync(id, search, column);
            if (result == null) return NotFound();
            return Ok(result);
        }

        // DELETE api/DynamicPage/{id}
        [HttpDelete("{id:guid}")]
        [Authorize(Roles = "Admin,Müdür,Şef")]
        public async Task<IActionResult> DeletePage(Guid id)
        {
            var deleted = await _service.DeletePageAsync(id);
            if (!deleted) return NotFound();
            return NoContent();
        }

        // POST api/DynamicPage/{id}/import
        [HttpPost("{id:guid}/import")]
        [Authorize(Roles = "Admin,Müdür,Şef")]
        [RequestSizeLimit(20 * 1024 * 1024)]
        public async Task<IActionResult> ImportRows(Guid id, IFormFile file)
        {
            try
            {
                var result = await _service.ImportRowsFromExcelAsync(id, file);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST api/DynamicPage/{id}/rows
        [HttpPost("{id:guid}/rows")]
        [Authorize(Roles = "Admin,Müdür,Şef")]
        public async Task<IActionResult> AddRow(Guid id, [FromBody] UpsertRowDto dto)
        {
            try
            {
                var result = await _service.AddRowAsync(id, dto);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        // PUT api/DynamicPage/{id}/rows/{rowId}
        [HttpPut("{id:guid}/rows/{rowId:guid}")]
        [Authorize(Roles = "Admin,Müdür,Şef")]
        public async Task<IActionResult> UpdateRow(Guid id, Guid rowId, [FromBody] UpsertRowDto dto)
        {
            try
            {
                var result = await _service.UpdateRowAsync(rowId, dto);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        // DELETE api/DynamicPage/{id}/rows/{rowId}
        [HttpDelete("{id:guid}/rows/{rowId:guid}")]
        [Authorize(Roles = "Admin,Müdür,Şef")]
        public async Task<IActionResult> DeleteRow(Guid id, Guid rowId)
        {
            var deleted = await _service.DeleteRowAsync(rowId);
            if (!deleted) return NotFound();
            return NoContent();
        }

        // POST api/DynamicPage/{id}/columns
        [HttpPost("{id:guid}/columns")]
        [Authorize(Roles = "Admin,Müdür,Şef")]
        public async Task<IActionResult> AddColumn(Guid id, [FromBody] AddColumnDto dto)
        {
            try
            {
                var result = await _service.AddColumnAsync(id, dto);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }
    }
}
