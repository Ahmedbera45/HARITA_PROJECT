using Harita.API.Data;
using Harita.API.Entities;
using Harita.Tests.Helpers;
using Xunit;

namespace Harita.Tests.Data
{
    public class DbSeederTests
    {
        [Fact]
        public async Task SeedAsync_CreatesThreeRoles()
        {
            var db = TestDbContextFactory.Create(nameof(SeedAsync_CreatesThreeRoles));

            await DbSeeder.SeedAsync(db);

            var roles = db.Roles.ToList();
            Assert.Equal(3, roles.Count);
            Assert.Contains(roles, r => r.Name == "Admin");
            Assert.Contains(roles, r => r.Name == "Manager");
            Assert.Contains(roles, r => r.Name == "Staff");
        }

        [Fact]
        public async Task SeedAsync_IsIdempotent_DoesNotDuplicateRoles()
        {
            var db = TestDbContextFactory.Create(nameof(SeedAsync_IsIdempotent_DoesNotDuplicateRoles));

            // İki kez çalıştır
            await DbSeeder.SeedAsync(db);
            await DbSeeder.SeedAsync(db);

            var roles = db.Roles.ToList();
            Assert.Equal(3, roles.Count);
        }

        [Fact]
        public async Task SeedAsync_DoesNotOverwriteExistingRoles()
        {
            var db = TestDbContextFactory.Create(nameof(SeedAsync_DoesNotOverwriteExistingRoles));

            // Admin rolü önceden eklenmiş
            var existingAdminId = Guid.NewGuid();
            db.Roles.Add(new Role { Id = existingAdminId, Name = "Admin" });
            db.SaveChanges();

            await DbSeeder.SeedAsync(db);

            var admin = db.Roles.First(r => r.Name == "Admin");
            Assert.Equal(existingAdminId, admin.Id); // aynı kayıt korunmalı
        }

        [Fact]
        public async Task SeedAsync_WorksOnEmptyDatabase()
        {
            var db = TestDbContextFactory.Create(nameof(SeedAsync_WorksOnEmptyDatabase));
            Assert.Empty(db.Roles.ToList());

            await DbSeeder.SeedAsync(db);

            Assert.Equal(3, db.Roles.Count());
        }
    }
}
