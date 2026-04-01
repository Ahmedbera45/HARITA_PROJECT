using Harita.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Harita.API.Data
{
    public static class DbSeeder
    {
        public static async Task SeedAsync(AppDbContext context)
        {
            // 1. Rolleri seed et
            var roleNames = new[] { "Admin", "Manager", "Staff" };
            foreach (var name in roleNames)
            {
                if (!await context.Roles.AnyAsync(r => r.Name == name))
                    context.Roles.Add(new Role { Name = name });
            }
            await context.SaveChangesAsync();

            // 2. Varsayılan kullanıcıları seed et (yoksa ekle)
            var seedUsers = new[]
            {
                new { Email = "admin@cayirova.bel.tr",   Password = "Admin123!", Name = "Sistem",   Surname = "Yöneticisi", Department = "Bilgi İşlem",            Role = "Admin"   },
                new { Email = "mudur@cayirova.bel.tr",   Password = "Mudur123!", Name = "Ahmet",    Surname = "Çakmak",     Department = "İmar ve Şehircilik Md.", Role = "Manager" },
                new { Email = "personel@cayirova.bel.tr",Password = "Personel1!",Name = "Ayşe",     Surname = "Kaya",       Department = "İmar ve Şehircilik Md.", Role = "Staff"   },
            };

            var roles = await context.Roles.ToListAsync();

            foreach (var su in seedUsers)
            {
                if (await context.Users.AnyAsync(u => u.Email == su.Email))
                    continue;

                var user = new User
                {
                    Email      = su.Email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(su.Password),
                    Name       = su.Name,
                    Surname    = su.Surname,
                    Department = su.Department,
                    IsActive   = true
                };
                context.Users.Add(user);
                await context.SaveChangesAsync();

                var role = roles.FirstOrDefault(r => r.Name == su.Role);
                if (role != null)
                {
                    context.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
                    await context.SaveChangesAsync();
                }
            }
        }
    }
}
