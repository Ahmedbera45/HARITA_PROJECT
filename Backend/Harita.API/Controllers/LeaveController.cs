using Harita.API.DTOs;
using Harita.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Harita.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class LeaveController : ControllerBase
    {
        private readonly ILeaveService _leaveService;

        public LeaveController(ILeaveService leaveService)
        {
            _leaveService = leaveService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _leaveService.GetAllAsync();
            return Ok(result);
        }

        [HttpGet("paged")]
        public async Task<IActionResult> GetPaged(
            [FromQuery] string? personSearch,
            [FromQuery] string? leaveType,
            [FromQuery] string? status,
            [FromQuery] DateTime? dateFrom,
            [FromQuery] DateTime? dateTo,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await _leaveService.GetPagedAsync(personSearch, leaveType, status, dateFrom, dateTo, page, pageSize);
            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateLeaveRequestDto dto)
        {
            try
            {
                var result = await _leaveService.CreateAsync(dto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("{id}/review")]
        public async Task<IActionResult> Review(Guid id, ReviewLeaveRequestDto dto)
        {
            try
            {
                var result = await _leaveService.ReviewAsync(id, dto);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            try
            {
                var result = await _leaveService.DeleteAsync(id);
                if (!result) return NotFound();
                return NoContent();
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("balance-summary")]
        [Authorize(Roles = "Admin,Müdür,Şef")]
        public async Task<IActionResult> GetBalanceSummary()
        {
            var result = await _leaveService.GetBalanceSummaryAsync();
            return Ok(result);
        }

        [HttpGet("hourly-summary")]
        [Authorize(Roles = "Admin,Müdür,Şef")]
        public async Task<IActionResult> GetHourlySummary()
        {
            var result = await _leaveService.GetHourlySummaryAsync();
            return Ok(result);
        }

        [HttpPost("hourly-compensation")]
        [Authorize(Roles = "Admin,Müdür,Şef")]
        public async Task<IActionResult> AddHourlyCompensation(CreateHourlyCompensationDto dto)
        {
            try
            {
                var result = await _leaveService.AddHourlyCompensationAsync(dto);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("hourly-compensations")]
        [Authorize(Roles = "Admin,Müdür,Şef")]
        public async Task<IActionResult> GetAllHourlyCompensations()
        {
            var result = await _leaveService.GetAllHourlyCompensationsAsync();
            return Ok(result);
        }
    }
}
