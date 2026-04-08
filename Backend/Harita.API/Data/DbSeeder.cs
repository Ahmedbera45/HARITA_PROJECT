using Harita.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Harita.API.Data
{
    public static class DbSeeder
    {
        public static async Task SeedAsync(AppDbContext context)
        {
            // 1. Rolleri seed et — eski roller korunur, yeniler eklenir
            var roleNames = new[]
            {
                "Admin",
                "Müdür", "Şef",
                "Harita Mühendisi", "Harita Teknikeri", "Memur", "Şehir Plancısı",
                // Geriye dönük uyumluluk için eski roller
                "Manager", "Staff"
            };
            foreach (var name in roleNames)
            {
                if (!await context.Roles.AnyAsync(r => r.Name == name))
                    context.Roles.Add(new Role { Name = name });
            }
            await context.SaveChangesAsync();

            // 2. Varsayılan kullanıcıları seed et (yoksa ekle)
            var seedUsers = new[]
            {
                new { Email = "admin@cayirova.bel.tr",    Password = "Admin123!",   Name = "Sistem",  Surname = "Yöneticisi", Department = "Bilgi İşlem",             Role = "Admin"   },
                new { Email = "mudur@cayirova.bel.tr",    Password = "Mudur123!",   Name = "Ahmet",   Surname = "Çakmak",     Department = "İmar ve Şehircilik Md.",  Role = "Müdür"   },
                new { Email = "personel@cayirova.bel.tr", Password = "Personel1!",  Name = "Ayşe",    Surname = "Kaya",       Department = "İmar ve Şehircilik Md.",  Role = "Memur"   },
            };

            var roles = await context.Roles.ToListAsync();

            foreach (var su in seedUsers)
            {
                if (await context.Users.AnyAsync(u => u.Email == su.Email))
                    continue;

                var user = new User
                {
                    Email        = su.Email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(su.Password),
                    Name         = su.Name,
                    Surname      = su.Surname,
                    Department   = su.Department,
                    IsActive     = true
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

            // 3. Sistem ayarlarını seed et
            if (!await context.SystemSettings.AnyAsync(s => s.Key == "NetworkStorageBasePath"))
            {
                context.SystemSettings.Add(new SystemSetting
                {
                    Key         = "NetworkStorageBasePath",
                    Value       = @"C:\ImarArsiv",
                    Description = "Ağ arşiv klasörü yolu (UNC veya mapped drive)",
                    UpdatedAt   = DateTime.UtcNow
                });
                await context.SaveChangesAsync();
            }

            // 4. Varsayılan harç kalemlerini seed et (yoksa ekle)
            if (!await context.FeeRates.AnyAsync())
            {
                var defaultRates = new[]
                {
                    new FeeRate { HarcTuru = "Yapı Ruhsatı",            BirimHarc = 12.50, Aciklama = "m² başına yapı ruhsatı harcı",           IsActive = true, SiraNo = 1 },
                    new FeeRate { HarcTuru = "İskan Ruhsatı",           BirimHarc = 8.75,  Aciklama = "m² başına iskan (yapı kullanma) harcı",   IsActive = true, SiraNo = 2 },
                    new FeeRate { HarcTuru = "Tadilat Ruhsatı",         BirimHarc = 6.00,  Aciklama = "m² başına tadilat ruhsatı harcı",          IsActive = true, SiraNo = 3 },
                    new FeeRate { HarcTuru = "Yıkım Ruhsatı",           BirimHarc = 4.50,  Aciklama = "m² başına yıkım ruhsatı harcı",            IsActive = true, SiraNo = 4 },
                    new FeeRate { HarcTuru = "Kat İrtifakı",            BirimHarc = 3.25,  Aciklama = "m² başına kat irtifakı tesis harcı",       IsActive = true, SiraNo = 5 },
                    new FeeRate { HarcTuru = "Reklam Tabelası Ruhsatı", BirimHarc = 15.00, Aciklama = "m² başına reklam tabelası ruhsatı harcı",  IsActive = true, SiraNo = 6 },
                };
                context.FeeRates.AddRange(defaultRates);
                await context.SaveChangesAsync();
            }
        }
    }
}
