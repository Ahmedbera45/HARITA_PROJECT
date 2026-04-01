using System.Security.Claims;
using Harita.API.Data;
using Harita.API.DTOs;
using Harita.API.Entities;
using Harita.API.Services;
using Harita.Tests.Helpers;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;

namespace Harita.Tests.Services
{
    public class TaskServiceTests
    {
        private readonly Guid _userId = Guid.NewGuid();
        private readonly Guid _managerId = Guid.NewGuid();

        private IHttpContextAccessor CreateHttpContextAccessor(Guid userId, string role = "Staff")
        {
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim(ClaimTypes.Role, role)
            };
            var identity = new ClaimsIdentity(claims);
            var principal = new ClaimsPrincipal(identity);
            var httpContext = new DefaultHttpContext { User = principal };

            var mock = new Mock<IHttpContextAccessor>();
            mock.Setup(m => m.HttpContext).Returns(httpContext);
            return mock.Object;
        }

        private (AppDbContext db, User user) SeedUser(string dbName, Guid userId, string name = "Test", string surname = "User")
        {
            var db = TestDbContextFactory.Create(dbName);
            var user = new User
            {
                Id = userId,
                Name = name,
                Surname = surname,
                Email = $"{name}@test.com",
                PasswordHash = "hash",
                Department = "Test Dept"
            };
            db.Users.Add(user);
            db.SaveChanges();
            return (db, user);
        }

        // ─── CreateAsync ──────────────────────────────────────

        [Fact]
        public async Task CreateAsync_CreatesTask_WithNullAssignedUser_WhenNotSpecified()
        {
            var (db, _) = SeedUser(nameof(CreateAsync_CreatesTask_WithNullAssignedUser_WhenNotSpecified), _userId);
            var service = new TaskService(db, CreateHttpContextAccessor(_userId));

            var dto = new CreateTaskDto { Title = "Test Görevi", Priority = "Orta", Status = "Bekliyor" };
            var result = await service.CreateAsync(dto);

            Assert.NotNull(result);
            Assert.Equal("Test Görevi", result.Title);
            Assert.Null(result.AssignedUserId);
            Assert.Equal("Atanmamış", result.AssignedUserName);
        }

        [Fact]
        public async Task CreateAsync_AssignsCorrectUser_WhenAssignedUserIdProvided()
        {
            var dbName = nameof(CreateAsync_AssignsCorrectUser_WhenAssignedUserIdProvided);
            var (db, _) = SeedUser(dbName, _userId);
            var (_, assignee) = SeedUser(dbName, Guid.NewGuid(), "Ahmet", "Bera");

            var service = new TaskService(db, CreateHttpContextAccessor(_userId, "Manager"));
            var dto = new CreateTaskDto { Title = "Atanmış Görev", AssignedUserId = assignee.Id };

            var result = await service.CreateAsync(dto);

            Assert.Equal(assignee.Id, result.AssignedUserId);
            Assert.Equal("Ahmet Bera", result.AssignedUserName);
        }

        [Fact]
        public async Task CreateAsync_SetsCreatedByUserId_ToCurrentUser()
        {
            var (db, _) = SeedUser(nameof(CreateAsync_SetsCreatedByUserId_ToCurrentUser), _userId);
            var service = new TaskService(db, CreateHttpContextAccessor(_userId));

            var dto = new CreateTaskDto { Title = "Görev" };
            await service.CreateAsync(dto);

            var saved = db.Tasks.First();
            Assert.Equal(_userId, saved.CreatedByUserId);
        }

        // ─── GetAllAsync ──────────────────────────────────────

        [Fact]
        public async Task GetAllAsync_ReturnsOnlyOwnTasks_ForStaff()
        {
            var dbName = nameof(GetAllAsync_ReturnsOnlyOwnTasks_ForStaff);
            var (db, user) = SeedUser(dbName, _userId);
            var (_, otherUser) = SeedUser(dbName, Guid.NewGuid(), "Other", "User");

            // Kendi oluşturduğu görev
            db.Tasks.Add(new AppTask { Title = "Benim Görevim", CreatedByUserId = _userId, Status = "Bekliyor", Priority = "Orta" });
            // Başkasının görevi
            db.Tasks.Add(new AppTask { Title = "Onun Görevi", CreatedByUserId = otherUser.Id, Status = "Bekliyor", Priority = "Orta" });
            db.SaveChanges();

            var service = new TaskService(db, CreateHttpContextAccessor(_userId, "Staff"));
            var result = await service.GetAllAsync();

            Assert.Single(result);
            Assert.Equal("Benim Görevim", result[0].Title);
        }

        [Fact]
        public async Task GetAllAsync_ReturnsAllTasks_ForManager()
        {
            var dbName = nameof(GetAllAsync_ReturnsAllTasks_ForManager);
            var (db, _) = SeedUser(dbName, _managerId, "Manager", "User");
            var (_, staffUser) = SeedUser(dbName, Guid.NewGuid(), "Staff", "User");

            db.Tasks.Add(new AppTask { Title = "Yönetici Görevi", CreatedByUserId = _managerId, Status = "Bekliyor", Priority = "Orta" });
            db.Tasks.Add(new AppTask { Title = "Personel Görevi", CreatedByUserId = staffUser.Id, Status = "İşlemde", Priority = "Yüksek" });
            db.SaveChanges();

            var service = new TaskService(db, CreateHttpContextAccessor(_managerId, "Manager"));
            var result = await service.GetAllAsync();

            Assert.Equal(2, result.Count);
        }

        [Fact]
        public async Task GetAllAsync_FiltersByStatus_Correctly()
        {
            var dbName = nameof(GetAllAsync_FiltersByStatus_Correctly);
            var (db, _) = SeedUser(dbName, _userId);

            db.Tasks.Add(new AppTask { Title = "Bekleyen", CreatedByUserId = _userId, Status = "Bekliyor", Priority = "Orta" });
            db.Tasks.Add(new AppTask { Title = "İşlemde", CreatedByUserId = _userId, Status = "İşlemde", Priority = "Orta" });
            db.Tasks.Add(new AppTask { Title = "Bitti", CreatedByUserId = _userId, Status = "Bitti", Priority = "Orta" });
            db.SaveChanges();

            var service = new TaskService(db, CreateHttpContextAccessor(_userId, "Manager"));
            var result = await service.GetAllAsync(status: "Bekliyor");

            Assert.Single(result);
            Assert.Equal("Bekleyen", result[0].Title);
        }

        [Fact]
        public async Task GetAllAsync_FiltersByPriority_Correctly()
        {
            var dbName = nameof(GetAllAsync_FiltersByPriority_Correctly);
            var (db, _) = SeedUser(dbName, _userId);

            db.Tasks.Add(new AppTask { Title = "Yüksek Öncelik", CreatedByUserId = _userId, Status = "Bekliyor", Priority = "Yüksek" });
            db.Tasks.Add(new AppTask { Title = "Düşük Öncelik", CreatedByUserId = _userId, Status = "Bekliyor", Priority = "Düşük" });
            db.SaveChanges();

            var service = new TaskService(db, CreateHttpContextAccessor(_userId, "Manager"));
            var result = await service.GetAllAsync(priority: "Yüksek");

            Assert.Single(result);
            Assert.Equal("Yüksek Öncelik", result[0].Title);
        }

        // ─── GetByIdAsync ─────────────────────────────────────

        [Fact]
        public async Task GetByIdAsync_ReturnsCorrectTask()
        {
            var (db, _) = SeedUser(nameof(GetByIdAsync_ReturnsCorrectTask), _userId);
            var taskId = Guid.NewGuid();
            db.Tasks.Add(new AppTask { Id = taskId, Title = "Detay Görevi", CreatedByUserId = _userId, Status = "Bekliyor", Priority = "Orta" });
            db.SaveChanges();

            var service = new TaskService(db, CreateHttpContextAccessor(_userId));
            var result = await service.GetByIdAsync(taskId);

            Assert.NotNull(result);
            Assert.Equal("Detay Görevi", result!.Title);
        }

        [Fact]
        public async Task GetByIdAsync_ReturnsNull_WhenNotFound()
        {
            var (db, _) = SeedUser(nameof(GetByIdAsync_ReturnsNull_WhenNotFound), _userId);
            var service = new TaskService(db, CreateHttpContextAccessor(_userId));

            var result = await service.GetByIdAsync(Guid.NewGuid());

            Assert.Null(result);
        }

        // ─── UpdateAsync ─────────────────────────────────────

        [Fact]
        public async Task UpdateAsync_UpdatesTaskFields()
        {
            var (db, _) = SeedUser(nameof(UpdateAsync_UpdatesTaskFields), _userId);
            var taskId = Guid.NewGuid();
            db.Tasks.Add(new AppTask { Id = taskId, Title = "Eski Başlık", Status = "Bekliyor", Priority = "Düşük", CreatedByUserId = _userId });
            db.SaveChanges();

            var service = new TaskService(db, CreateHttpContextAccessor(_userId));
            var updateDto = new UpdateTaskDto { Title = "Yeni Başlık", Status = "İşlemde", Priority = "Yüksek" };
            var result = await service.UpdateAsync(taskId, updateDto);

            Assert.Equal("Yeni Başlık", result.Title);
            Assert.Equal("İşlemde", result.Status);
            Assert.Equal("Yüksek", result.Priority);
        }

        [Fact]
        public async Task UpdateAsync_ThrowsException_WhenTaskNotFound()
        {
            var (db, _) = SeedUser(nameof(UpdateAsync_ThrowsException_WhenTaskNotFound), _userId);
            var service = new TaskService(db, CreateHttpContextAccessor(_userId));

            await Assert.ThrowsAsync<Exception>(() =>
                service.UpdateAsync(Guid.NewGuid(), new UpdateTaskDto { Title = "X", Status = "Bekliyor", Priority = "Orta" }));
        }

        // ─── DeleteAsync ─────────────────────────────────────

        [Fact]
        public async Task DeleteAsync_DeletesTask_ReturnsTrue()
        {
            var (db, _) = SeedUser(nameof(DeleteAsync_DeletesTask_ReturnsTrue), _userId);
            var taskId = Guid.NewGuid();
            db.Tasks.Add(new AppTask { Id = taskId, Title = "Silinecek", Status = "Bekliyor", Priority = "Orta", CreatedByUserId = _userId });
            db.SaveChanges();

            var service = new TaskService(db, CreateHttpContextAccessor(_userId));
            var result = await service.DeleteAsync(taskId);

            Assert.True(result);
            Assert.Empty(db.Tasks.ToList());
        }

        [Fact]
        public async Task DeleteAsync_ReturnsFalse_WhenNotFound()
        {
            var (db, _) = SeedUser(nameof(DeleteAsync_ReturnsFalse_WhenNotFound), _userId);
            var service = new TaskService(db, CreateHttpContextAccessor(_userId));

            var result = await service.DeleteAsync(Guid.NewGuid());

            Assert.False(result);
        }

        // ─── GetSummaryAsync ─────────────────────────────────

        [Fact]
        public async Task GetSummaryAsync_ReturnsCorrectCounts()
        {
            var dbName = nameof(GetSummaryAsync_ReturnsCorrectCounts);
            var (db, _) = SeedUser(dbName, _userId);

            db.Tasks.Add(new AppTask { Title = "T1", CreatedByUserId = _userId, Status = "Bekliyor", Priority = "Orta" });
            db.Tasks.Add(new AppTask { Title = "T2", CreatedByUserId = _userId, Status = "Bekliyor", Priority = "Orta" });
            db.Tasks.Add(new AppTask { Title = "T3", CreatedByUserId = _userId, Status = "İşlemde", Priority = "Orta" });
            db.Tasks.Add(new AppTask { Title = "T4", CreatedByUserId = _userId, Status = "Bitti", Priority = "Orta" });
            db.SaveChanges();

            var service = new TaskService(db, CreateHttpContextAccessor(_userId, "Manager"));
            var summary = await service.GetSummaryAsync();

            Assert.Equal(2, summary.Pending);
            Assert.Equal(1, summary.InProgress);
            Assert.Equal(1, summary.Done);
            Assert.Equal(4, summary.Total);
        }
    }
}
