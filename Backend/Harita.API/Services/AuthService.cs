using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
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
            // Username yerine Email ile arıyoruz
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (user == null) throw new Exception("Kullanıcı bulunamadı.");

            if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                throw new Exception("Şifre hatalı.");

            return GenerateToken(user);
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

            return GenerateToken(user);
        }

        private TokenDto GenerateToken(User user)
        {
            var key = Encoding.UTF8.GetBytes(_configuration["Jwt:Key"] ?? "gizli_anahtar_en_az_32_karakter_olmali_12345");
            var issuer = _configuration["Jwt:Issuer"] ?? "HaritaAPI";
            var audience = _configuration["Jwt:Audience"] ?? "HaritaClient";

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Email), // Username -> Email
                new Claim("FullName", $"{user.Name} {user.Surname}"),
                new Claim("Department", user.Department)
            };

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddHours(24),
                Issuer = issuer,
                Audience = audience,
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);

            return new TokenDto
            {
                AccessToken = tokenHandler.WriteToken(token),
                ExpiresIn = 24 * 60 * 60
            };
        }
    }
}