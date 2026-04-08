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

        private static readonly string[] ManagerRoles = { "Admin", "Müdür", "Şef", "Manager" };

        private bool IsManager()
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user == null) return false;
            return ManagerRoles.Any(r => user.IsInRole(r));
        }

        public async Task<List<LeaveRequestDto>> GetAllAsync()
        {
            var currentUserId = GetCurrentUserId();
            var isManager = IsManager();

            var query = _context.LeaveRequests
                .Include(l => l.User)
                .Include(l => l.ReviewedByUser)
                .AsQueryable();

            if (!isManager)
                query = query.Where(l => l.UserId == currentUserId);

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

        private IQueryable<LeaveRequest> BuildLeaveQuery()
        {
            var currentUserId = GetCurrentUserId();
            var isManager = IsManager();
            var query = _context.LeaveRequests
                .Include(l => l.User)
                .Include(l => l.ReviewedByUser)
                .AsQueryable();
            if (!isManager)
                query = query.Where(l => l.UserId == currentUserId);
            return query;
        }

        private static LeaveRequestDto MapLeaveToDto(LeaveRequest l) => new()
        {
            Id                 = l.Id,
            UserId             = l.UserId,
            UserFullName       = l.User.Name + " " + l.User.Surname,
            UserDepartment     = l.User.Department,
            LeaveType          = l.LeaveType,
            StartDate          = l.StartDate,
            EndDate            = l.EndDate,
            DaysCount          = l.DaysCount,
            IsSaatlik          = l.IsSaatlik,
            BaslangicSaati     = l.BaslangicSaati,
            BitisSaati         = l.BitisSaati,
            Description        = l.Description,
            Status             = l.Status,
            ReviewNote         = l.ReviewNote,
            ReviewedByFullName = l.ReviewedByUser != null
                ? l.ReviewedByUser.Name + " " + l.ReviewedByUser.Surname : null,
            ReviewedAt         = l.ReviewedAt,
            CreatedAt          = l.CreatedAt
        };

        public async Task<PagedResult<LeaveRequestDto>> GetPagedAsync(string? personSearch, string? leaveType, string? status, DateTime? dateFrom, DateTime? dateTo, int page, int pageSize)
        {
            var query = BuildLeaveQuery();

            if (!string.IsNullOrWhiteSpace(personSearch))
                query = query.Where(l => (l.User.Name + " " + l.User.Surname).Contains(personSearch));
            if (!string.IsNullOrWhiteSpace(leaveType))
                query = query.Where(l => l.LeaveType == leaveType);
            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(l => l.Status == status);
            if (dateFrom.HasValue)
                query = query.Where(l => l.StartDate >= dateFrom.Value);
            if (dateTo.HasValue)
                query = query.Where(l => l.StartDate <= dateTo.Value);

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(l => l.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new PagedResult<LeaveRequestDto>
            {
                Items    = items.Select(MapLeaveToDto).ToList(),
                Total    = total,
                Page     = page,
                PageSize = pageSize
            };
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

            if (!IsManager() && (leave.UserId != currentUserId || leave.Status != "Bekliyor"))
                throw new UnauthorizedAccessException("Bu talebi silemezsiniz.");

            _context.LeaveRequests.Remove(leave);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<List<LeaveBalanceSummaryDto>> GetBalanceSummaryAsync()
        {
            var users = await _context.Users
                .Where(u => !u.IsDeleted && u.IsActive)
                .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .OrderBy(u => u.Name)
                .ToListAsync();

            var today = DateTime.UtcNow.Date;
            var result = new List<LeaveBalanceSummaryDto>();

            foreach (var u in users)
            {
                var leaves = await _context.LeaveRequests
                    .Where(l => l.UserId == u.Id && !l.IsSaatlik)
                    .ToListAsync();

                var planned = leaves
                    .Where(l => l.Status == "Onaylandı" && l.StartDate.Date >= today)
                    .Sum(l => l.DaysCount);

                var pending = leaves
                    .Where(l => l.Status == "Bekliyor")
                    .Sum(l => l.DaysCount);

                result.Add(new LeaveBalanceSummaryDto
                {
                    UserId         = u.Id,
                    UserFullName   = $"{u.Name} {u.Surname}",
                    Department     = u.Department,
                    KalanIzinGunu  = u.KalanIzinGunu,
                    PlanlananIzin  = planned,
                    BekleyenIzin   = pending
                });
            }

            return result;
        }

        public async Task<List<HourlyLeaveSummaryDto>> GetHourlySummaryAsync()
        {
            var users = await _context.Users
                .Where(u => !u.IsDeleted && u.IsActive)
                .OrderBy(u => u.Name)
                .ToListAsync();

            var allHourlyLeaves = await _context.LeaveRequests
                .Where(l => l.IsSaatlik && l.Status == "Onaylandı")
                .ToListAsync();

            var allCompensations = await _context.HourlyLeaveCompensations
                .Where(h => !h.IsDeleted)
                .ToListAsync();

            var result = new List<HourlyLeaveSummaryDto>();
            foreach (var u in users)
            {
                // Saatlik izin saati: BaslangicSaati-BitisSaati farkından hesapla
                decimal toplam = 0;
                foreach (var l in allHourlyLeaves.Where(l => l.UserId == u.Id))
                {
                    if (TimeSpan.TryParse(l.BitisSaati, out var bitis) &&
                        TimeSpan.TryParse(l.BaslangicSaati, out var baslangic))
                    {
                        toplam += (decimal)(bitis - baslangic).TotalHours;
                    }
                }

                var telaf = allCompensations.Where(c => c.UserId == u.Id).Sum(c => c.TelafSaati);

                result.Add(new HourlyLeaveSummaryDto
                {
                    UserId                = u.Id,
                    UserFullName          = $"{u.Name} {u.Surname}",
                    Department            = u.Department,
                    ToplamSaatlikIzin     = toplam,
                    TelafEdilen           = telaf,
                    TelafEdilmesiGereken  = Math.Max(0, toplam - telaf)
                });
            }

            return result;
        }

        public async Task<HourlyCompensationDto> AddHourlyCompensationAsync(CreateHourlyCompensationDto dto)
        {
            if (!IsManager())
                throw new UnauthorizedAccessException("Telafi girişi için yönetici yetkisi gereklidir.");

            var ekleyenId = GetCurrentUserId();
            var comp = new HourlyLeaveCompensation
            {
                UserId         = dto.UserId,
                TelafTarihi    = dto.TelafTarihi,
                BaslangicSaati = dto.BaslangicSaati,
                BitisSaati     = dto.BitisSaati,
                TelafSaati     = dto.TelafSaati,
                Aciklama       = dto.Aciklama,
                EkleyenId      = ekleyenId
            };

            _context.HourlyLeaveCompensations.Add(comp);
            await _context.SaveChangesAsync();

            var user    = await _context.Users.FindAsync(dto.UserId);
            var ekleyen = await _context.Users.FindAsync(ekleyenId);

            return new HourlyCompensationDto
            {
                Id             = comp.Id,
                UserId         = comp.UserId,
                UserFullName   = user != null ? $"{user.Name} {user.Surname}" : "",
                TelafTarihi    = comp.TelafTarihi,
                BaslangicSaati = comp.BaslangicSaati,
                BitisSaati     = comp.BitisSaati,
                TelafSaati     = comp.TelafSaati,
                Aciklama       = comp.Aciklama,
                EkleyenFullName = ekleyen != null ? $"{ekleyen.Name} {ekleyen.Surname}" : "",
                CreatedAt      = comp.CreatedAt
            };
        }

        public async Task<List<HourlyCompensationDto>> GetAllHourlyCompensationsAsync()
        {
            var list = await _context.HourlyLeaveCompensations
                .Where(h => !h.IsDeleted)
                .Include(h => h.User)
                .Include(h => h.Ekleyen)
                .OrderByDescending(h => h.TelafTarihi)
                .ToListAsync();

            return list.Select(h => new HourlyCompensationDto
            {
                Id              = h.Id,
                UserId          = h.UserId,
                UserFullName    = $"{h.User?.Name} {h.User?.Surname}",
                TelafTarihi     = h.TelafTarihi,
                BaslangicSaati  = h.BaslangicSaati,
                BitisSaati      = h.BitisSaati,
                TelafSaati      = h.TelafSaati,
                Aciklama        = h.Aciklama,
                EkleyenFullName = $"{h.Ekleyen?.Name} {h.Ekleyen?.Surname}",
                CreatedAt       = h.CreatedAt
            }).ToList();
        }
    }
}
