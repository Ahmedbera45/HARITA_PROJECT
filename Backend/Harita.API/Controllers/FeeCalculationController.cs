using Harita.API.DTOs;
using Harita.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Harita.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class FeeCalculationController : ControllerBase
    {
        private readonly IFeeCalculationService _service;

        public FeeCalculationController(IFeeCalculationService service)
        {
            _service = service;
        }

        // ─── Harç Kalemleri ────────────────────────────────────────────────

        // GET api/feecalculation/rates
        [HttpGet("rates")]
        public async Task<IActionResult> GetRates()
        {
            var result = await _service.GetFeeRatesAsync();
            return Ok(result);
        }

        // POST api/feecalculation/rates
        [HttpPost("rates")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> CreateRate([FromBody] CreateFeeRateDto dto)
        {
            try
            {
                var result = await _service.CreateFeeRateAsync(dto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // PUT api/feecalculation/rates/{id}
        [HttpPut("rates/{id:guid}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> UpdateRate(Guid id, [FromBody] UpdateFeeRateDto dto)
        {
            try
            {
                var result = await _service.UpdateFeeRateAsync(id, dto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // DELETE api/feecalculation/rates/{id}
        [HttpDelete("rates/{id:guid}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> DeleteRate(Guid id)
        {
            var deleted = await _service.DeleteFeeRateAsync(id);
            if (!deleted) return NotFound();
            return NoContent();
        }

        // ─── Harç Hesaplama ────────────────────────────────────────────────

        // POST api/feecalculation
        [HttpPost]
        public async Task<IActionResult> Calculate([FromBody] CreateFeeCalculationDto dto)
        {
            try
            {
                var result = await _service.CalculateAsync(dto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET api/feecalculation
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync();
            return Ok(result);
        }

        // GET api/feecalculation/{id}
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        // DELETE api/feecalculation/{id}
        [HttpDelete("{id:guid}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var deleted = await _service.DeleteAsync(id);
            if (!deleted) return NotFound();
            return NoContent();
        }
    }
}
