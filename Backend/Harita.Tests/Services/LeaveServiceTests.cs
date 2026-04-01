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
    public class LeaveServiceTests
    {
        private readonly Guid _staffId  = Guid.NewGuid();
        private readonly Guid _managerId = Guid.NewGuid();

        private IHttpContextAccessor CreateAccessor(Guid userId, string role)
        {
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim(ClaimTypes.Role, role)
            };
            var ctx = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims)) };
            var mock = new Mock<IHttpContextAccessor>();
            mock.Setup(m => m.HttpContext).Returns(ctx);
            return mock.Object;
        }

        private User SeedUser(AppDbContext db, Guid id, string name, string surname, string role = "Staff")
        {
            var user = new User { Id = id, Name = name, Surname = surname, Email = $"{name}@test.com", PasswordHash = "h", Department = "Test" };
            db.Users.Add(user);
            db.SaveChanges();
            return user;
        }

        // ─── CreateAsync ──────────────────────────────────────

        [Fact]
        public async Task CreateAsync_CreatesLeave_WithCorrectDaysCount()
        {
            var db = TestDbContextFactory.Create(nameof(CreateAsync_CreatesLeave_WithCorrectDaysCount));
            SeedUser(db, _staffId, "Ali", "Veli");

            var service = new LeaveService(db, CreateAccessor(_staffId, "Staff"));
            var dto = new CreateLeaveRequestDto
            {
                LeaveType = "Yıllık İzin",
                StartDate = new DateTime(2026, 4, 1),
                EndDate = new DateTime(2026, 4, 5),
                Description = "Tatil"
            };

            var result = await service.CreateAsync(dto);

            Assert.NotNull(result);
            Assert.Equal(5, result.DaysCount);
            Assert.Equal("Bekliyor", result.Status);
            Assert.Equal("Yıllık İzin", result.LeaveType);
        }

        [Fact]
        public async Task CreateAsync_Throws_WhenEndDateBeforeStartDate()
        {
            var db = TestDbContextFactory.Create(nameof(CreateAsync_Throws_WhenEndDateBeforeStartDate));
            SeedUser(db, _staffId, "Ali", "Veli");

            var service = new LeaveService(db, CreateAccessor(_staffId, "Staff"));
            var dto = new CreateLeaveRequestDto
            {
                LeaveType = "Yıllık İzin",
                StartDate = new DateTime(2026, 4, 10),
                EndDate = new DateTime(2026, 4, 5)
            };

            await Assert.ThrowsAsync<Exception>(() => service.CreateAsync(dto));
        }

        // ─── GetAllAsync ──────────────────────────────────────

        [Fact]
        public async Task GetAllAsync_StaffSeesOnlyOwnLeaves()
        {
            var dbName = nameof(GetAllAsync_StaffSeesOnlyOwnLeaves);
            var db = TestDbContextFactory.Create(dbName);
            SeedUser(db, _staffId, "Personel", "Bir");
            SeedUser(db, _managerId, "Yonetici", "Bir");

            db.LeaveRequests.Add(new LeaveRequest { UserId = _staffId,  LeaveType = "Yıllık İzin", StartDate = DateTime.Today, EndDate = DateTime.Today.AddDays(2), DaysCount = 3, Status = "Bekliyor" });
            db.LeaveRequests.Add(new LeaveRequest { UserId = _managerId, LeaveType = "Yıllık İzin", StartDate = DateTime.Today, EndDate = DateTime.Today.AddDays(1), DaysCount = 2, Status = "Bekliyor" });
            db.SaveChanges();

            var service = new LeaveService(db, CreateAccessor(_staffId, "Staff"));
            var result = await service.GetAllAsync();

            Assert.Single(result);
            Assert.Equal(_staffId, result[0].UserId);
        }

        [Fact]
        public async Task GetAllAsync_ManagerSeesAllLeaves()
        {
            var dbName = nameof(GetAllAsync_ManagerSeesAllLeaves);
            var db = TestDbContextFactory.Create(dbName);
            SeedUser(db, _staffId, "Personel", "Bir");
            SeedUser(db, _managerId, "Yonetici", "Bir");

            db.LeaveRequests.Add(new LeaveRequest { UserId = _staffId,   LeaveType = "Yıllık İzin", StartDate = DateTime.Today, EndDate = DateTime.Today.AddDays(2), DaysCount = 3, Status = "Bekliyor" });
            db.LeaveRequests.Add(new LeaveRequest { UserId = _managerId, LeaveType = "Hastalık İzni", StartDate = DateTime.Today, EndDate = DateTime.Today, DaysCount = 1, Status = "Onaylandı" });
            db.SaveChanges();

            var service = new LeaveService(db, CreateAccessor(_managerId, "Manager"));
            var result = await service.GetAllAsync();

            Assert.Equal(2, result.Count);
        }

        // ─── ReviewAsync ─────────────────────────────────────

        [Fact]
        public async Task ReviewAsync_ApprovesLeave_Successfully()
        {
            var dbName = nameof(ReviewAsync_ApprovesLeave_Successfully);
            var db = TestDbContextFactory.Create(dbName);
            SeedUser(db, _staffId, "Personel", "Bir");
            SeedUser(db, _managerId, "Yonetici", "Bir");

            var leave = new LeaveRequest { UserId = _staffId, LeaveType = "Yıllık İzin", StartDate = DateTime.Today, EndDate = DateTime.Today.AddDays(2), DaysCount = 3, Status = "Bekliyor" };
            db.LeaveRequests.Add(leave);
            db.SaveChanges();

            var service = new LeaveService(db, CreateAccessor(_managerId, "Manager"));
            var result = await service.ReviewAsync(leave.Id, new ReviewLeaveRequestDto { Decision = "Onaylandı", ReviewNote = "Uygun" });

            Assert.Equal("Onaylandı", result.Status);
            Assert.Equal("Uygun", result.ReviewNote);
        }

        [Fact]
        public async Task ReviewAsync_RejectsLeave_Successfully()
        {
            var dbName = nameof(ReviewAsync_RejectsLeave_Successfully);
            var db = TestDbContextFactory.Create(dbName);
            SeedUser(db, _staffId, "Personel", "Bir");
            SeedUser(db, _managerId, "Yonetici", "Bir");

            var leave = new LeaveRequest { UserId = _staffId, LeaveType = "Yıllık İzin", StartDate = DateTime.Today, EndDate = DateTime.Today.AddDays(2), DaysCount = 3, Status = "Bekliyor" };
            db.LeaveRequests.Add(leave);
            db.SaveChanges();

            var service = new LeaveService(db, CreateAccessor(_managerId, "Manager"));
            var result = await service.ReviewAsync(leave.Id, new ReviewLeaveRequestDto { Decision = "Reddedildi", ReviewNote = "Dönem uygun değil" });

            Assert.Equal("Reddedildi", result.Status);
        }

        [Fact]
        public async Task ReviewAsync_Throws_WhenAlreadyReviewed()
        {
            var dbName = nameof(ReviewAsync_Throws_WhenAlreadyReviewed);
            var db = TestDbContextFactory.Create(dbName);
            SeedUser(db, _staffId, "Personel", "Bir");
            SeedUser(db, _managerId, "Yonetici", "Bir");

            var leave = new LeaveRequest { UserId = _staffId, LeaveType = "Yıllık İzin", StartDate = DateTime.Today, EndDate = DateTime.Today, DaysCount = 1, Status = "Onaylandı" };
            db.LeaveRequests.Add(leave);
            db.SaveChanges();

            var service = new LeaveService(db, CreateAccessor(_managerId, "Manager"));
            await Assert.ThrowsAsync<Exception>(() =>
                service.ReviewAsync(leave.Id, new ReviewLeaveRequestDto { Decision = "Reddedildi" }));
        }

        [Fact]
        public async Task ReviewAsync_Throws_WhenStaffTriesToReview()
        {
            var dbName = nameof(ReviewAsync_Throws_WhenStaffTriesToReview);
            var db = TestDbContextFactory.Create(dbName);
            SeedUser(db, _staffId, "Personel", "Bir");

            var leave = new LeaveRequest { UserId = _staffId, LeaveType = "Yıllık İzin", StartDate = DateTime.Today, EndDate = DateTime.Today, DaysCount = 1, Status = "Bekliyor" };
            db.LeaveRequests.Add(leave);
            db.SaveChanges();

            var service = new LeaveService(db, CreateAccessor(_staffId, "Staff"));
            await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                service.ReviewAsync(leave.Id, new ReviewLeaveRequestDto { Decision = "Onaylandı" }));
        }

        // ─── DeleteAsync ─────────────────────────────────────

        [Fact]
        public async Task DeleteAsync_StaffCanDeleteOwnPendingLeave()
        {
            var db = TestDbContextFactory.Create(nameof(DeleteAsync_StaffCanDeleteOwnPendingLeave));
            SeedUser(db, _staffId, "Personel", "Bir");

            var leave = new LeaveRequest { UserId = _staffId, LeaveType = "Yıllık İzin", StartDate = DateTime.Today, EndDate = DateTime.Today, DaysCount = 1, Status = "Bekliyor" };
            db.LeaveRequests.Add(leave);
            db.SaveChanges();

            var service = new LeaveService(db, CreateAccessor(_staffId, "Staff"));
            var result = await service.DeleteAsync(leave.Id);

            Assert.True(result);
            Assert.Empty(db.LeaveRequests.ToList());
        }

        [Fact]
        public async Task DeleteAsync_StaffCannotDeleteApprovedLeave()
        {
            var db = TestDbContextFactory.Create(nameof(DeleteAsync_StaffCannotDeleteApprovedLeave));
            SeedUser(db, _staffId, "Personel", "Bir");

            var leave = new LeaveRequest { UserId = _staffId, LeaveType = "Yıllık İzin", StartDate = DateTime.Today, EndDate = DateTime.Today, DaysCount = 1, Status = "Onaylandı" };
            db.LeaveRequests.Add(leave);
            db.SaveChanges();

            var service = new LeaveService(db, CreateAccessor(_staffId, "Staff"));
            await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.DeleteAsync(leave.Id));
        }
    }
}
