using Harita.API.Data;
using Harita.API.DTOs; // DTO'ların burada olduğundan emin ol
using Harita.API.Entities;
using Harita.API.Services; // IAuthService burada
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

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

        public async Task<string> LoginAsync(LoginDto dto)
        {
            // 1. Kullanıcıyı Email ile bul (Username yerine Email)
            var user = await _context.Users
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Email == dto.Email); // DTO'da Email olmalı

            if (user == null)
                return null;

            // 2. Şifre Doğrulama (BinaryReader hatası burada çözüldü)
            // BCrypt kütüphanesini kullandığını varsayıyorum
            bool isPasswordValid = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);
            
            if (!isPasswordValid)
                return null;

            if (!user.IsActive) // Artık User sınıfında bu alan var
                return null;

            // 3. Token Oluştur
            return GenerateJwtToken(user);
        }

        public async Task<bool> RegisterAsync(RegisterDto dto)
        {
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
                return false;

            // Şifre Hashleme
            string passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

            var newUser = new User
            {
                Id = Guid.NewGuid(),
                Email = dto.Email,
                Name = dto.Name,
                Surname = dto.Surname,
                Department = dto.Department, // Artık User sınıfında var
                PasswordHash = passwordHash,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _context.Users.AddAsync(newUser);
            return await _context.SaveChangesAsync() > 0;
        }

        private string GenerateJwtToken(User user)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                // FullName yerine Name ve Surname birleştiriyoruz
                new Claim(ClaimTypes.Name, $"{user.Name} {user.Surname}") 
            };

            // Rolleri ekle
            foreach (var userRole in user.UserRoles)
            {
                if(userRole.Role != null)
                {
                    claims.Add(new Claim(ClaimTypes.Role, userRole.Role.Name));
                }
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddDays(1),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}