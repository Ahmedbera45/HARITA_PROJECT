using Harita.API.Entities;
using Harita.API.Services;
using Harita.Tests.Helpers;
using Xunit;

namespace Harita.Tests.Services
{
    public class UserServiceTests
    {
        // ─── GetAllAsync ──────────────────────────────────────

        [Fact]
        public async Task GetAllAsync_ReturnsOnlyActiveUsers()
        {
            var db = TestDbContextFactory.Create(nameof(GetAllAsync_ReturnsOnlyActiveUsers));
            db.Users.Add(new User { Name = "Aktif", Surname = "Kullanici", Email = "aktif@test.com", PasswordHash = "h", Department = "IT", IsActive = true });
            db.Users.Add(new User { Name = "Pasif", Surname = "Kullanici", Email = "pasif@test.com", PasswordHash = "h", Department = "IT", IsActive = false });
            db.SaveChanges();

            var service = new UserService(db);
            var result = await service.GetAllAsync();

            Assert.Single(result);
            Assert.Equal("Aktif Kullanici", result[0].FullName);
        }

        [Fact]
        public async Task GetAllAsync_ReturnsEmptyList_WhenNoActiveUsers()
        {
            var db = TestDbContextFactory.Create(nameof(GetAllAsync_ReturnsEmptyList_WhenNoActiveUsers));
            db.Users.Add(new User { Name = "Pasif", Surname = "Kullanici", Email = "p@test.com", PasswordHash = "h", Department = "IT", IsActive = false });
            db.SaveChanges();

            var service = new UserService(db);
            var result = await service.GetAllAsync();

            Assert.Empty(result);
        }

        [Fact]
        public async Task GetAllAsync_ReturnsCorrectUserFields()
        {
            var db = TestDbContextFactory.Create(nameof(GetAllAsync_ReturnsCorrectUserFields));
            var userId = Guid.NewGuid();
            db.Users.Add(new User { Id = userId, Name = "Mehmet", Surname = "Yılmaz", Email = "mehmet@test.com", PasswordHash = "h", Department = "Fen İşleri", IsActive = true });
            db.SaveChanges();

            var service = new UserService(db);
            var result = await service.GetAllAsync();

            Assert.Single(result);
            Assert.Equal(userId, result[0].Id);
            Assert.Equal("Mehmet Yılmaz", result[0].FullName);
            Assert.Equal("mehmet@test.com", result[0].Email);
            Assert.Equal("Fen İşleri", result[0].Department);
        }

        [Fact]
        public async Task GetAllAsync_IncludesRoles_ForEachUser()
        {
            var db = TestDbContextFactory.Create(nameof(GetAllAsync_IncludesRoles_ForEachUser));

            var role = new Role { Name = "Manager" };
            db.Roles.Add(role);
            db.SaveChanges();

            var user = new User { Name = "Ali", Surname = "Veli", Email = "ali@test.com", PasswordHash = "h", Department = "IT", IsActive = true };
            db.Users.Add(user);
            db.SaveChanges();

            db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
            db.SaveChanges();

            var service = new UserService(db);
            var result = await service.GetAllAsync();

            Assert.Single(result);
            Assert.Contains("Manager", result[0].Roles);
        }

        [Fact]
        public async Task GetAllAsync_ReturnsUsers_OrderedByName()
        {
            var db = TestDbContextFactory.Create(nameof(GetAllAsync_ReturnsUsers_OrderedByName));
            db.Users.Add(new User { Name = "Zeynep", Surname = "A", Email = "z@test.com", PasswordHash = "h", Department = "IT", IsActive = true });
            db.Users.Add(new User { Name = "Ahmet",  Surname = "B", Email = "a@test.com", PasswordHash = "h", Department = "IT", IsActive = true });
            db.Users.Add(new User { Name = "Mehmet", Surname = "C", Email = "m@test.com", PasswordHash = "h", Department = "IT", IsActive = true });
            db.SaveChanges();

            var service = new UserService(db);
            var result = await service.GetAllAsync();

            Assert.Equal(3, result.Count);
            Assert.Equal("Ahmet B",  result[0].FullName);
            Assert.Equal("Mehmet C", result[1].FullName);
            Assert.Equal("Zeynep A", result[2].FullName);
        }

        [Fact]
        public async Task GetAllAsync_UserWithNoRoles_ReturnsEmptyRolesList()
        {
            var db = TestDbContextFactory.Create(nameof(GetAllAsync_UserWithNoRoles_ReturnsEmptyRolesList));
            db.Users.Add(new User { Name = "Test", Surname = "User", Email = "t@test.com", PasswordHash = "h", Department = "IT", IsActive = true });
            db.SaveChanges();

            var service = new UserService(db);
            var result = await service.GetAllAsync();

            Assert.Single(result);
            Assert.Empty(result[0].Roles);
        }
    }
}
