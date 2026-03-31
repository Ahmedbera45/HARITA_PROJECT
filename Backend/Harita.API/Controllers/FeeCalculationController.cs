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

        // GET api/feecalculation/rates
        [HttpGet("rates")]
        public IActionResult GetRates()
        {
            return Ok(_service.GetFeeRates());
        }

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
        public async Task<IActionResult> Delete(Guid id)
        {
            var deleted = await _service.DeleteAsync(id);
            if (!deleted) return NotFound();
            return NoContent();
        }
    }
}
