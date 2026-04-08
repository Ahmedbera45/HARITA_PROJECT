using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Harita.API.Data;
using Harita.API.DTOs;
using Harita.API.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace Harita.API.Services
{
    public class AuthService : IAuthService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthService(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<TokenDto> LoginAsync(LoginDto dto)
        {
            var user = await _context.Users
                .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (user == null) throw new Exception("Kullanıcı bulunamadı.");

            if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                throw new Exception("Şifre hatalı.");

            var permissionsJson = await BuildPermissionsJsonAsync(user);
            return GenerateToken(user, permissionsJson);
        }

        public async Task<TokenDto> RegisterAsync(RegisterDto dto)
        {
            // Username yerine Email kontrolü
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
                throw new Exception("Bu e-posta zaten kayıtlı.");

            var user = new User
            {
                Email = dto.Email, // Username -> Email
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Name = dto.Name,
                Surname = dto.Surname,
                Department = dto.Department
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Yeni kullanıcıya varsayılan Memur rolü ver
            var staffRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Memur")
                         ?? await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Staff");
            if (staffRole != null)
            {
                _context.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = staffRole.Id });
                await _context.SaveChangesAsync();
            }

            // Roller ile birlikte yeniden yükle
            await _context.Entry(user).Collection(u => u.UserRoles).Query()
                .Include(ur => ur.Role).LoadAsync();

            var permissionsJson2 = await BuildPermissionsJsonAsync(user);
            return GenerateToken(user, permissionsJson2);
        }

        private async Task<string> BuildPermissionsJsonAsync(User user)
        {
            // Admin/Müdür/Şef → tüm izinler açık; diğerleri → gruplardan birleştir
            var roles = user.UserRoles?.Select(ur => ur.Role?.Name).Where(n => n != null).ToList() ?? new();
            var managerRoles = new[] { "Admin", "Müdür", "Şef", "Manager" };
            if (roles.Any(r => managerRoles.Contains(r)))
            {
                var modules = new[] { "rehber", "gorev", "izin", "harc", "veriYukleme", "tevhid", "imarPlanlari", "ozelSayfalar", "kullanicilar", "map" };
                var allTrue = modules.ToDictionary(m => m, m => new { view = true, edit = true });
                return JsonSerializer.Serialize(allTrue);
            }

            // Staff: merge permissions from all assigned groups
            var groups = await _context.UserPermissionGroups
                .Where(upg => upg.UserId == user.Id)
                .Include(upg => upg.PermissionGroup)
                .Where(upg => !upg.PermissionGroup.IsDeleted)
                .Select(upg => upg.PermissionGroup.Permissions)
                .ToListAsync();

            if (groups.Count == 0) return "{}";

            var jsonOpts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var merged = new Dictionary<string, (bool view, bool edit)>();
            foreach (var json in groups)
            {
                try
                {
                    var dict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json, jsonOpts);
                    if (dict == null) continue;
                    foreach (var kv in dict)
                    {
                        var v = kv.Value.TryGetProperty("view", out var vp) && vp.GetBoolean();
                        var e = kv.Value.TryGetProperty("edit", out var ep) && ep.GetBoolean();
                        if (!merged.ContainsKey(kv.Key)) merged[kv.Key] = (v, e);
                        else merged[kv.Key] = (merged[kv.Key].view || v, merged[kv.Key].edit || e);
                    }
                }
                catch { }
            }

            var result = merged.ToDictionary(kv => kv.Key, kv => new { view = kv.Value.view, edit = kv.Value.edit });
            return JsonSerializer.Serialize(result);
        }

        private TokenDto GenerateToken(User user, string permissionsJson = "{}")
        {
            var key = Encoding.UTF8.GetBytes(_configuration["Jwt:Key"] ?? "gizli_anahtar_en_az_32_karakter_olmali_12345");
            var issuer = _configuration["Jwt:Issuer"] ?? "HaritaAPI";
            var audience = _configuration["Jwt:Audience"] ?? "HaritaClient";

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Email),
                new Claim("FullName", $"{user.Name} {user.Surname}"),
                new Claim("Department", user.Department ?? ""),
                new Claim("Permissions", permissionsJson)
            };

            // Rol claim'lerini ekle
            if (user.UserRoles != null)
            {
                foreach (var userRole in user.UserRoles)
                {
                    if (userRole.Role != null)
                        claims.Add(new Claim(ClaimTypes.Role, userRole.Role.Name));
                }
            }

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddHours(8),
                Issuer = issuer,
                Audience = audience,
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);

            return new TokenDto
            {
                AccessToken = tokenHandler.WriteToken(token),
                ExpiresIn = 8 * 60 * 60
            };
        }
    }
}