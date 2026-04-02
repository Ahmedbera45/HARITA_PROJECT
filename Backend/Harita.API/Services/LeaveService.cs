using System.Security.Claims;
using Harita.API.Data;
using Harita.API.DTOs;
using Harita.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Harita.API.Services
{
    public class LeaveService : ILeaveService
    {
        private readonly AppDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public LeaveService(AppDbContext context, IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
        }

        private Guid GetCurrentUserId()
        {
            var claim = _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier);
            if (claim == null) throw new UnauthorizedAccessException("Kullanıcı bulunamadı.");
            return Guid.Parse(claim.Value);
        }

        private bool IsManager()
        {
            var role = _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.Role)?.Value;
            return role == "Manager" || role == "Admin";
        }

        public async Task<List<LeaveRequestDto>> GetAllAsync()
        {
            var currentUserId = GetCurrentUserId();
            var isManager = IsManager();

            var query = _context.LeaveRequests
                .Include(l => l.User)
                .Include(l => l.ReviewedByUser)
                .AsQueryable();

            return await query
                .OrderByDescending(l => l.CreatedAt)
                .Select(l => new LeaveRequestDto
                {
                    Id = l.Id,
                    UserId = l.UserId,
                    UserFullName = l.User.Name + " " + l.User.Surname,
                    UserDepartment = l.User.Department,
                    LeaveType = l.LeaveType,
                    StartDate = l.StartDate,
                    EndDate = l.EndDate,
                    DaysCount = l.DaysCount,
                    IsSaatlik = l.IsSaatlik,
                    BaslangicSaati = l.BaslangicSaati,
                    BitisSaati = l.BitisSaati,
                    Description = l.Description,
                    Status = l.Status,
                    ReviewNote = l.ReviewNote,
                    ReviewedByFullName = l.ReviewedByUser != null
                        ? l.ReviewedByUser.Name + " " + l.ReviewedByUser.Surname
                        : null,
                    ReviewedAt = l.ReviewedAt,
                    CreatedAt = l.CreatedAt
                })
                .ToListAsync();
        }

        public async Task<LeaveRequestDto> CreateAsync(CreateLeaveRequestDto dto)
        {
            var currentUserId = GetCurrentUserId();

            if (dto.EndDate < dto.StartDate)
                throw new Exception("Bitiş tarihi başlangıç tarihinden önce olamaz.");

            if (dto.IsSaatlik)
            {
                if (string.IsNullOrWhiteSpace(dto.BaslangicSaati) || string.IsNullOrWhiteSpace(dto.BitisSaati))
                    throw new Exception("Saatlik izin için başlangıç ve bitiş saati zorunludur.");
            }

            var daysCount = dto.IsSaatlik ? 0 : (int)(dto.EndDate.Date - dto.StartDate.Date).TotalDays + 1;

            var leave = new LeaveRequest
            {
                UserId = currentUserId,
                LeaveType = dto.LeaveType,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                DaysCount = daysCount,
                IsSaatlik = dto.IsSaatlik,
                BaslangicSaati = dto.IsSaatlik ? dto.BaslangicSaati : null,
                BitisSaati = dto.IsSaatlik ? dto.BitisSaati : null,
                Description = dto.Description,
                Status = "Bekliyor"
            };

            _context.LeaveRequests.Add(leave);
            await _context.SaveChangesAsync();

            var user = await _context.Users.FindAsync(currentUserId);
            return new LeaveRequestDto
            {
                Id = leave.Id,
                UserId = leave.UserId,
                UserFullName = user != null ? $"{user.Name} {user.Surname}" : "",
                UserDepartment = user?.Department ?? "",
                LeaveType = leave.LeaveType,
                StartDate = leave.StartDate,
                EndDate = leave.EndDate,
                DaysCount = leave.DaysCount,
                IsSaatlik = leave.IsSaatlik,
                BaslangicSaati = leave.BaslangicSaati,
                BitisSaati = leave.BitisSaati,
                Description = leave.Description,
                Status = leave.Status,
                CreatedAt = leave.CreatedAt
            };
        }

        public async Task<LeaveRequestDto> ReviewAsync(Guid id, ReviewLeaveRequestDto dto)
        {
            if (!IsManager())
                throw new UnauthorizedAccessException("Bu işlem için yönetici yetkisi gereklidir.");

            var leave = await _context.LeaveRequests
                .Include(l => l.User)
                .FirstOrDefaultAsync(l => l.Id == id);

            if (leave == null) throw new Exception("İzin talebi bulunamadı.");
            if (leave.Status != "Bekliyor") throw new Exception("Bu talep zaten incelenmiş.");

            if (dto.Decision != "Onaylandı" && dto.Decision != "Reddedildi")
                throw new Exception("Geçersiz karar. 'Onaylandı' veya 'Reddedildi' olmalıdır.");

            var reviewerId = GetCurrentUserId();
            leave.Status = dto.Decision;
            leave.ReviewNote = dto.ReviewNote;
            leave.ReviewedByUserId = reviewerId;
            leave.ReviewedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var reviewer = await _context.Users.FindAsync(reviewerId);
            return new LeaveRequestDto
            {
                Id = leave.Id,
                UserId = leave.UserId,
                UserFullName = $"{leave.User.Name} {leave.User.Surname}",
                UserDepartment = leave.User.Department,
                LeaveType = leave.LeaveType,
                StartDate = leave.StartDate,
                EndDate = leave.EndDate,
                DaysCount = leave.DaysCount,
                IsSaatlik = leave.IsSaatlik,
                BaslangicSaati = leave.BaslangicSaati,
                BitisSaati = leave.BitisSaati,
                Description = leave.Description,
                Status = leave.Status,
                ReviewNote = leave.ReviewNote,
                ReviewedByFullName = reviewer != null ? $"{reviewer.Name} {reviewer.Surname}" : null,
                ReviewedAt = leave.ReviewedAt,
                CreatedAt = leave.CreatedAt
            };
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var currentUserId = GetCurrentUserId();
            var leave = await _context.LeaveRequests.FindAsync(id);
            if (leave == null) return false;

            // Sadece kendi "Bekliyor" talebini silebilir, yönetici hepsini silebilir
            if (!IsManager() && (leave.UserId != currentUserId || leave.Status != "Bekliyor"))
                throw new UnauthorizedAccessException("Bu talebi silemezsiniz.");

            _context.LeaveRequests.Remove(leave);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
