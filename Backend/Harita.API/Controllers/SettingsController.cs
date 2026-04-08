using System.Security.Claims;
using Harita.API.Data;
using Harita.API.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Harita.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class SettingsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SettingsController(AppDbContext context)
        {
            _context = context;
        }

        private Guid CurrentUserId =>
            Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // Admin: Tüm ayarları listele
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAll()
        {
            var settings = await _context.SystemSettings.ToListAsync();
            return Ok(settings.Select(s => new { s.Key, s.Value, s.Description, s.UpdatedAt }));
        }

        // Ağ arşiv yolunu oku (tüm yetkili kullanıcılar)
        [HttpGet("network-storage-path")]
        public async Task<IActionResult> GetNetworkStoragePath()
        {
            var s = await _context.SystemSettings.FirstOrDefaultAsync(x => x.Key == "NetworkStorageBasePath");
            return Ok(new { value = s?.Value ?? @"C:\ImarArsiv" });
        }

        // Ağ klasörü erişim testi (sadece Admin)
        [HttpGet("test-network-path")]
        [Authorize(Roles = "Admin")]
        public IActionResult TestNetworkPath([FromQuery] string path)
        {
            if (string.IsNullOrWhiteSpace(path))
                return BadRequest("Yol boş olamaz.");

            try
            {
                var accessible = Directory.Exists(path);
                return Ok(new { accessible, path });
            }
            catch (Exception ex)
            {
                return Ok(new { accessible = false, path, error = ex.Message });
            }
        }

        // Ağ arşiv yolunu güncelle (sadece Admin)
        [HttpPut("network-storage-path")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateNetworkStoragePath([FromBody] UpdateSettingDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Value))
                return BadRequest("Yol boş olamaz.");

            var setting = await _context.SystemSettings
                .FirstOrDefaultAsync(s => s.Key == "NetworkStorageBasePath");

            if (setting == null)
            {
                setting = new SystemSetting
                {
                    Key         = "NetworkStorageBasePath",
                    Description = "Ağ arşiv klasörü yolu (UNC veya mapped drive)"
                };
                _context.SystemSettings.Add(setting);
            }

            setting.Value           = dto.Value.Trim();
            setting.UpdatedByUserId = CurrentUserId;
            setting.UpdatedAt       = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { value = setting.Value });
        }
    }

    public class UpdateSettingDto
    {
        public string Value { get; set; } = "";
    }
}
