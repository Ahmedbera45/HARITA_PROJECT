using System.Security.Claims;
using Harita.API.Data;
using Harita.API.DTOs;
using Harita.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Harita.API.Services
{
    public class TaskService : ITaskService
    {
        private readonly AppDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public TaskService(AppDbContext context, IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
        }

        private Guid GetCurrentUserId()
        {
            var idClaim = _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier);
            if (idClaim == null) throw new UnauthorizedAccessException("Kullanıcı bulunamadı.");
            return Guid.Parse(idClaim.Value);
        }

        private static readonly string[] ManagerRoles = { "Admin", "Müdür", "Şef", "Manager" };

        private bool IsManager()
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user == null) return false;
            return ManagerRoles.Any(r => user.IsInRole(r));
        }

        private static TaskDto MapToDto(AppTask t) => new()
        {
            Id              = t.Id,
            Title           = t.Title,
            Description     = t.Description,
            Status          = t.Status,
            Priority        = t.Priority,
            DueDate         = t.DueDate,
            CreatedAt       = t.CreatedAt,
            CreatedByUserId = t.CreatedByUserId,
            CreatedByName   = t.CreatedByUser != null
                ? $"{t.CreatedByUser.Name} {t.CreatedByUser.Surname}"
                : "",
            IsHerkes        = t.IsHerkes,
            AssignedUsers   = t.Assignments?.Select(a => new AssignedUserDto
            {
                Id         = a.User.Id,
                FullName   = $"{a.User.Name} {a.User.Surname}",
                Department = a.User.Department
            }).ToList() ?? new()
        };

        public async Task<List<TaskDto>> GetAllAsync(string? status = null, string? priority = null, bool assignedToMe = false)
        {
            var currentUserId = GetCurrentUserId();
            var manager = IsManager();

            var query = _context.Tasks
                .Where(t => !t.IsDeleted)
                .Include(t => t.CreatedByUser)
                .Include(t => t.Assignments).ThenInclude(a => a.User)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(t => t.Status == status);

            if (!string.IsNullOrWhiteSpace(priority))
                query = query.Where(t => t.Priority == priority);

            // assignedToMe=true → sadece benim görevlerim (creator veya atanan)
            if (assignedToMe)
            {
                query = query.Where(t =>
                    t.IsHerkes ||
                    t.CreatedByUserId == currentUserId ||
                    t.Assignments.Any(a => a.UserId == currentUserId));
            }
            else if (!manager)
            {
                // Normal kullanıcı: sadece kendine atananlar, "herkes" görevleri, kendi oluşturduğu
                query = query.Where(t =>
                    t.IsHerkes ||
                    t.CreatedByUserId == currentUserId ||
                    t.Assignments.Any(a => a.UserId == currentUserId));
            }
            // Manager: tüm görevleri görür (filtre yok)

            var tasks = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();
            return tasks.Select(MapToDto).ToList();
        }

        public async Task<TaskDto?> GetByIdAsync(Guid id)
        {
            var t = await _context.Tasks
                .Where(t => !t.IsDeleted)
                .Include(t => t.CreatedByUser)
                .Include(t => t.Assignments).ThenInclude(a => a.User)
                .FirstOrDefaultAsync(t => t.Id == id);

            return t == null ? null : MapToDto(t);
        }

        public async Task<TaskDto> CreateAsync(CreateTaskDto dto)
        {
            var currentUserId = GetCurrentUserId();

            var task = new AppTask
            {
                Title           = dto.Title,
                Description     = dto.Description,
                Status          = dto.Status,
                Priority        = dto.Priority,
                DueDate         = dto.DueDate,
                CreatedByUserId = currentUserId,
                IsHerkes        = dto.IsHerkes
            };

            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

            if (!dto.IsHerkes)
                await SetAssignmentsAsync(task.Id, dto.AssignedUserIds);

            return await GetByIdAsync(task.Id) ?? MapToDto(task);
        }

        public async Task<TaskDto> UpdateAsync(Guid id, UpdateTaskDto dto)
        {
            var currentUserId = GetCurrentUserId();
            var task = await _context.Tasks.FindAsync(id)
                ?? throw new Exception("Görev bulunamadı.");

            if (!IsManager() && task.CreatedByUserId != currentUserId)
                throw new UnauthorizedAccessException("Bu görevi düzenleme yetkiniz yok.");

            task.Title       = dto.Title;
            task.Description = dto.Description;
            task.Status      = dto.Status;
            task.Priority    = dto.Priority;
            task.DueDate     = dto.DueDate;
            task.IsHerkes    = dto.IsHerkes;

            await _context.SaveChangesAsync();

            if (dto.IsHerkes)
            {
                var existing = _context.TaskAssignments.Where(a => a.TaskId == id);
                _context.TaskAssignments.RemoveRange(existing);
                await _context.SaveChangesAsync();
            }
            else
            {
                await SetAssignmentsAsync(id, dto.AssignedUserIds);
            }

            return await GetByIdAsync(id) ?? MapToDto(task);
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var task = await _context.Tasks.FindAsync(id);
            if (task == null) return false;

            var currentUserId = GetCurrentUserId();
            if (!IsManager() && task.CreatedByUserId != currentUserId)
                throw new UnauthorizedAccessException("Bu görevi silemezsiniz.");

            task.IsDeleted = true;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<TaskSummaryDto> GetSummaryAsync()
        {
            var currentUserId = GetCurrentUserId();
            var manager = IsManager();

            IQueryable<AppTask> query = _context.Tasks.Where(t => !t.IsDeleted);

            if (!manager)
                query = query.Where(t =>
                    t.IsHerkes ||
                    t.CreatedByUserId == currentUserId ||
                    t.Assignments.Any(a => a.UserId == currentUserId));

            var tasks = await query.ToListAsync();
            return new TaskSummaryDto
            {
                Pending    = tasks.Count(t => t.Status == "Bekliyor"),
                InProgress = tasks.Count(t => t.Status == "İşlemde"),
                Done       = tasks.Count(t => t.Status == "Bitti"),
                Total      = tasks.Count
            };
        }

        public async Task<PagedResult<TaskDto>> GetPagedAsync(string? status, string? priority, string? search, Guid? assignedUserId, int page, int pageSize)
        {
            var currentUserId = GetCurrentUserId();
            var manager = IsManager();

            var query = _context.Tasks
                .Where(t => !t.IsDeleted)
                .Include(t => t.CreatedByUser)
                .Include(t => t.Assignments).ThenInclude(a => a.User)
                .AsQueryable();

            // Role-based visibility
            if (!manager)
                query = query.Where(t =>
                    t.IsHerkes ||
                    t.CreatedByUserId == currentUserId ||
                    t.Assignments.Any(a => a.UserId == currentUserId));

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(t => t.Status == status);
            if (!string.IsNullOrWhiteSpace(priority))
                query = query.Where(t => t.Priority == priority);
            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(t => t.Title.Contains(search) || (t.Description != null && t.Description.Contains(search)));
            if (assignedUserId.HasValue)
                query = query.Where(t => t.IsHerkes || t.CreatedByUserId == assignedUserId || t.Assignments.Any(a => a.UserId == assignedUserId));

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(t => t.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new PagedResult<TaskDto>
            {
                Items    = items.Select(MapToDto).ToList(),
                Total    = total,
                Page     = page,
                PageSize = pageSize
            };
        }

        private async Task SetAssignmentsAsync(Guid taskId, List<Guid> userIds)
        {
            var existing = _context.TaskAssignments.Where(a => a.TaskId == taskId);
            _context.TaskAssignments.RemoveRange(existing);

            foreach (var uid in userIds.Distinct())
                _context.TaskAssignments.Add(new TaskAssignment { TaskId = taskId, UserId = uid });

            await _context.SaveChangesAsync();
        }
    }
}
