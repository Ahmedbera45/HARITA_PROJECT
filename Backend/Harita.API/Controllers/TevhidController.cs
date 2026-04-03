using Harita.API.DTOs;
using Harita.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Harita.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TevhidController : ControllerBase
    {
        private readonly ITevhidService _service;

        public TevhidController(ITevhidService service)
        {
            _service = service;
        }

        // POST api/Tevhid
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateTevhidDto dto)
        {
            try
            {
                var result = await _service.CreateAsync(dto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET api/Tevhid
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync();
            return Ok(result);
        }

        // GET api/Tevhid/{id}
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        // PUT api/Tevhid/{id}/review
        [HttpPut("{id:guid}/review")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Review(Guid id, [FromBody] ReviewTevhidDto dto)
        {
            try
            {
                var result = await _service.ReviewAsync(id, dto);
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

        // PUT api/Tevhid/{id}
        [HttpPut("{id:guid}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTevhidDto dto)
        {
            try
            {
                var result = await _service.UpdateAsync(id, dto);
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

        // DELETE api/Tevhid/{id}
        [HttpDelete("{id:guid}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var deleted = await _service.DeleteAsync(id);
            if (!deleted) return NotFound();
            return NoContent();
        }

        // GET api/Tevhid/export/approved
        [HttpGet("export/approved")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> ExportAllApproved()
        {
            var bytes = await _service.ExportAllApprovedAsync();
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"TevhidOnaylananlar_{DateTime.Now:yyyyMMdd}.xlsx");
        }

        // GET api/Tevhid/export/{id}/scenarios
        [HttpGet("export/{id:guid}/scenarios")]
        public async Task<IActionResult> ExportScenarios(Guid id)
        {
            try
            {
                var bytes = await _service.ExportScenariosAsync(id);
                return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    $"TevhidSenaryolar_{id:N}.xlsx");
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        // GET api/Tevhid/export/{id}/approved
        [HttpGet("export/{id:guid}/approved")]
        public async Task<IActionResult> ExportApproved(Guid id)
        {
            try
            {
                var bytes = await _service.ExportApprovedAsync(id);
                return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    $"TevhidOnayli_{id:N}.xlsx");
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
