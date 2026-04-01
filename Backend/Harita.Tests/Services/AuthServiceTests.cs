using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Harita.API.Data;
using Harita.API.DTOs;
using Harita.API.Entities;
using Harita.API.Services;
using Harita.Tests.Helpers;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace Harita.Tests.Services
{
    public class AuthServiceTests
    {
        private IConfiguration CreateConfig()
        {
            var dict = new Dictionary<string, string?>
            {
                { "Jwt:Key", "test_gizli_anahtar_en_az_32_karakter_12345" },
                { "Jwt:Issuer", "TestIssuer" },
                { "Jwt:Audience", "TestAudience" }
            };
            return new ConfigurationBuilder().AddInMemoryCollection(dict).Build();
        }

        // ─── RegisterAsync ────────────────────────────────────

        [Fact]
        public async Task RegisterAsync_CreatesUser_ReturnsToken()
        {
            var db = TestDbContextFactory.Create(nameof(RegisterAsync_CreatesUser_ReturnsToken));
            // Seed Staff role
            db.Roles.Add(new Role { Name = "Staff" });
            db.SaveChanges();

            var service = new AuthService(db, CreateConfig());
            var dto = new RegisterDto
            {
                Name = "Ali",
                Surname = "Veli",
                Email = "ali@test.com",
                Password = "Sifre123!",
                Department = "Fen İşleri"
            };

            var result = await service.RegisterAsync(dto);

            Assert.NotNull(result);
            Assert.NotEmpty(result.AccessToken);
            Assert.Equal(1, db.Users.Count());
        }

        [Fact]
        public async Task RegisterAsync_AssignsStaffRole_ToNewUser()
        {
            var db = TestDbContextFactory.Create(nameof(RegisterAsync_AssignsStaffRole_ToNewUser));
            db.Roles.Add(new Role { Name = "Staff" });
            db.SaveChanges();

            var service = new AuthService(db, CreateConfig());
            var dto = new RegisterDto
            {
                Name = "Test",
                Surname = "User",
                Email = "test@test.com",
                Password = "Sifre123!",
                Department = "Test"
            };

            await service.RegisterAsync(dto);

            var user = db.Users.First();
            var userRole = db.UserRoles.FirstOrDefault(ur => ur.UserId == user.Id);
            Assert.NotNull(userRole);
            var role = db.Roles.Find(userRole!.RoleId);
            Assert.Equal("Staff", role!.Name);
        }

        [Fact]
        public async Task RegisterAsync_ThrowsException_WhenEmailAlreadyExists()
        {
            var db = TestDbContextFactory.Create(nameof(RegisterAsync_ThrowsException_WhenEmailAlreadyExists));
            db.Users.Add(new User
            {
                Name = "Mevcut",
                Surname = "Kullanici",
                Email = "mevcut@test.com",
                PasswordHash = "hash",
                Department = "Test"
            });
            db.SaveChanges();

            var service = new AuthService(db, CreateConfig());
            var dto = new RegisterDto
            {
                Name = "Yeni",
                Surname = "Kullanici",
                Email = "mevcut@test.com",
                Password = "Sifre123!",
                Department = "Test"
            };

            await Assert.ThrowsAsync<Exception>(() => service.RegisterAsync(dto));
        }

        // ─── LoginAsync ───────────────────────────────────────

        [Fact]
        public async Task LoginAsync_ReturnsToken_WithCorrectCredentials()
        {
            var db = TestDbContextFactory.Create(nameof(LoginAsync_ReturnsToken_WithCorrectCredentials));
            db.Users.Add(new User
            {
                Name = "Admin",
                Surname = "User",
                Email = "admin@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("DogruSifre123"),
                Department = "IT"
            });
            db.SaveChanges();

            var service = new AuthService(db, CreateConfig());
            var result = await service.LoginAsync(new LoginDto { Email = "admin@test.com", Password = "DogruSifre123" });

            Assert.NotNull(result);
            Assert.NotEmpty(result.AccessToken);
            Assert.Equal("Bearer", result.TokenType);
        }

        [Fact]
        public async Task LoginAsync_ThrowsException_WhenUserNotFound()
        {
            var db = TestDbContextFactory.Create(nameof(LoginAsync_ThrowsException_WhenUserNotFound));
            var service = new AuthService(db, CreateConfig());

            await Assert.ThrowsAsync<Exception>(() =>
                service.LoginAsync(new LoginDto { Email = "yok@test.com", Password = "Sifre" }));
        }

        [Fact]
        public async Task LoginAsync_ThrowsException_WhenPasswordWrong()
        {
            var db = TestDbContextFactory.Create(nameof(LoginAsync_ThrowsException_WhenPasswordWrong));
            db.Users.Add(new User
            {
                Name = "Test",
                Surname = "User",
                Email = "test@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("DogruSifre"),
                Department = "Test"
            });
            db.SaveChanges();

            var service = new AuthService(db, CreateConfig());

            await Assert.ThrowsAsync<Exception>(() =>
                service.LoginAsync(new LoginDto { Email = "test@test.com", Password = "YanlisŞifre" }));
        }

        // ─── JWT İçerik Testleri ──────────────────────────────

        private ClaimsPrincipal ParseToken(string tokenString)
        {
            var config = CreateConfig();
            var key = Encoding.UTF8.GetBytes(config["Jwt:Key"]!);
            var handler = new JwtSecurityTokenHandler();
            var parameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = false,
                ValidateAudience = false,
                ClockSkew = TimeSpan.Zero
            };
            return handler.ValidateToken(tokenString, parameters, out _);
        }

        [Fact]
        public async Task LoginAsync_Token_ContainsFullNameClaim()
        {
            var db = TestDbContextFactory.Create(nameof(LoginAsync_Token_ContainsFullNameClaim));
            db.Users.Add(new User
            {
                Name = "Fatma",
                Surname = "Şahin",
                Email = "fatma@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Sifre123"),
                Department = "Harita"
            });
            db.SaveChanges();

            var service = new AuthService(db, CreateConfig());
            var token = await service.LoginAsync(new LoginDto { Email = "fatma@test.com", Password = "Sifre123" });

            var principal = ParseToken(token.AccessToken);
            var fullName = principal.FindFirst("FullName")?.Value;

            Assert.Equal("Fatma Şahin", fullName);
        }

        [Fact]
        public async Task LoginAsync_Token_ContainsDepartmentClaim()
        {
            var db = TestDbContextFactory.Create(nameof(LoginAsync_Token_ContainsDepartmentClaim));
            db.Users.Add(new User
            {
                Name = "Test",
                Surname = "User",
                Email = "t@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Pass123"),
                Department = "İmar ve Şehircilik"
            });
            db.SaveChanges();

            var service = new AuthService(db, CreateConfig());
            var token = await service.LoginAsync(new LoginDto { Email = "t@test.com", Password = "Pass123" });

            var principal = ParseToken(token.AccessToken);
            Assert.Equal("İmar ve Şehircilik", principal.FindFirst("Department")?.Value);
        }

        [Fact]
        public async Task LoginAsync_Token_ContainsRoleClaim_WhenUserHasRole()
        {
            var db = TestDbContextFactory.Create(nameof(LoginAsync_Token_ContainsRoleClaim_WhenUserHasRole));
            var role = new Role { Name = "Manager" };
            db.Roles.Add(role);

            var user = new User
            {
                Name = "Yönetici",
                Surname = "Test",
                Email = "yonetici@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Sifre123"),
                Department = "IT"
            };
            db.Users.Add(user);
            db.SaveChanges();

            db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
            db.SaveChanges();

            var service = new AuthService(db, CreateConfig());
            var token = await service.LoginAsync(new LoginDto { Email = "yonetici@test.com", Password = "Sifre123" });

            var principal = ParseToken(token.AccessToken);
            Assert.True(principal.IsInRole("Manager"));
        }

        [Fact]
        public async Task RegisterAsync_Token_ContainsCorrectEmail()
        {
            var db = TestDbContextFactory.Create(nameof(RegisterAsync_Token_ContainsCorrectEmail));
            db.Roles.Add(new Role { Name = "Staff" });
            db.SaveChanges();

            var service = new AuthService(db, CreateConfig());
            var token = await service.RegisterAsync(new RegisterDto
            {
                Name = "Hasan",
                Surname = "Çelik",
                Email = "hasan@test.com",
                Password = "Sifre123",
                Department = "Fen İşleri"
            });

            var principal = ParseToken(token.AccessToken);
            var email = principal.FindFirst(ClaimTypes.Name)?.Value;
            Assert.Equal("hasan@test.com", email);
        }

        [Fact]
        public async Task LoginAsync_Token_ExpiresIn_Is24Hours()
        {
            var db = TestDbContextFactory.Create(nameof(LoginAsync_Token_ExpiresIn_Is24Hours));
            db.Users.Add(new User
            {
                Name = "Test",
                Surname = "User",
                Email = "exp@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Sifre123"),
                Department = "Test"
            });
            db.SaveChanges();

            var service = new AuthService(db, CreateConfig());
            var token = await service.LoginAsync(new LoginDto { Email = "exp@test.com", Password = "Sifre123" });

            Assert.Equal(86400, token.ExpiresIn); // 24 * 60 * 60
        }
    }
}
