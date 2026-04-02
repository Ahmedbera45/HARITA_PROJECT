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

        private bool IsManager()
        {
            var role = _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.Role)?.Value;
            return role == "Manager" || role == "Admin";
        }

        private static TaskDto MapToDto(AppTask t) => new()
        {
            Id          = t.Id,
            Title       = t.Title,
            Description = t.Description,
            Status      = t.Status,
            Priority    = t.Priority,
            DueDate     = t.DueDate,
            CreatedAt   = t.CreatedAt,
            AssignedUsers = t.Assignments?.Select(a => new AssignedUserDto
            {
                Id         = a.User.Id,
                FullName   = $"{a.User.Name} {a.User.Surname}",
                Department = a.User.Department
            }).ToList() ?? new()
        };

        public async Task<List<TaskDto>> GetAllAsync(string? status = null, string? priority = null)
        {
            var query = _context.Tasks
                .Include(t => t.Assignments).ThenInclude(a => a.User)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(t => t.Status == status);

            if (!string.IsNullOrWhiteSpace(priority))
                query = query.Where(t => t.Priority == priority);

            var tasks = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();
            return tasks.Select(MapToDto).ToList();
        }

        public async Task<TaskDto?> GetByIdAsync(Guid id)
        {
            var t = await _context.Tasks
                .Include(t => t.Assignments).ThenInclude(a => a.User)
                .FirstOrDefaultAsync(t => t.Id == id);

            return t == null ? null : MapToDto(t);
        }

        public async Task<TaskDto> CreateAsync(CreateTaskDto dto)
        {
            var currentUserId = GetCurrentUserId();
            var isManager = IsManager();

            var task = new AppTask
            {
                Title             = dto.Title,
                Description       = dto.Description,
                Status            = dto.Status,
                Priority          = dto.Priority,
                DueDate           = dto.DueDate,
                CreatedByUserId   = currentUserId
            };

            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

            // Atama listesini belirle:
            // Manager/Admin → DTO'daki listeyi kullan
            // Staff → havuza ekler (atanmamış), yönetici atar
            var assignIds = isManager
                ? dto.AssignedUserIds
                : new List<Guid>();

            await SetAssignmentsAsync(task.Id, assignIds);

            return await GetByIdAsync(task.Id) ?? MapToDto(task);
        }

        public async Task<TaskDto> UpdateAsync(Guid id, UpdateTaskDto dto)
        {
            var task = await _context.Tasks.FindAsync(id)
                ?? throw new Exception("Görev bulunamadı.");

            task.Title       = dto.Title;
            task.Description = dto.Description;
            task.Status      = dto.Status;
            task.Priority    = dto.Priority;
            task.DueDate     = dto.DueDate;

            await _context.SaveChangesAsync();

            // Manager/Admin atama listesini değiştirebilir
            if (IsManager())
                await SetAssignmentsAsync(id, dto.AssignedUserIds);

            return await GetByIdAsync(id) ?? MapToDto(task);
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var task = await _context.Tasks.FindAsync(id);
            if (task == null) return false;
            _context.Tasks.Remove(task);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<TaskSummaryDto> GetSummaryAsync()
        {
            var query = _context.Tasks.AsQueryable();

            var tasks = await query.ToListAsync();
            return new TaskSummaryDto
            {
                Pending    = tasks.Count(t => t.Status == "Bekliyor"),
                InProgress = tasks.Count(t => t.Status == "İşlemde"),
                Done       = tasks.Count(t => t.Status == "Bitti"),
                Total      = tasks.Count
            };
        }

        // Görevin atamalarını toptan güncelle (mevcut sil + yeni ekle)
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
