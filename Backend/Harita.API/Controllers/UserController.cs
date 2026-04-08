using Harita.API.DTOs;
using Harita.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Harita.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;

        public UserController(IUserService userService)
        {
            _userService = userService;
        }

        // Tüm kullanıcılar — login olan herkes (görev atama için)
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _userService.GetAllAsync();
            return Ok(result);
        }

        [HttpGet("paged")]
        [Authorize(Roles = "Admin,Müdür,Şef")]
        public async Task<IActionResult> GetPaged(
            [FromQuery] string? search,
            [FromQuery] string? role,
            [FromQuery] bool? isActive,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await _userService.GetPagedAsync(search, role, isActive, page, pageSize);
            return Ok(result);
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,Müdür,Şef")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _userService.GetByIdAsync(id);
            if (result == null) return NotFound("Kullanıcı bulunamadı.");
            return Ok(result);
        }

        // Yeni kullanıcı oluştur — Sadece Admin
        [HttpPost]
        [Authorize(Roles = "Admin,Müdür,Şef")]
        public async Task<IActionResult> Create(CreateUserDto dto)
        {
            try
            {
                var result = await _userService.CreateAsync(dto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Kullanıcı güncelle (bilgi + rol) — Sadece Admin
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Müdür,Şef")]
        public async Task<IActionResult> Update(Guid id, UpdateUserDto dto)
        {
            try
            {
                var result = await _userService.UpdateAsync(id, dto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Kullanıcı sil (soft delete) — Sadece Admin
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Müdür,Şef")]
        public async Task<IActionResult> Delete(Guid id)
        {
            try
            {
                var result = await _userService.DeleteAsync(id);
                if (!result) return NotFound("Kullanıcı bulunamadı.");
                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Şifre sıfırla — Sadece Admin
        [HttpPut("{id}/password")]
        [Authorize(Roles = "Admin,Müdür,Şef")]
        public async Task<IActionResult> ChangePassword(Guid id, ChangePasswordDto dto)
        {
            try
            {
                var result = await _userService.ChangePasswordAsync(id, dto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
