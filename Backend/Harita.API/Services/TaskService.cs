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
            var roleClaim = _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.Role);
            return roleClaim?.Value == "Manager" || roleClaim?.Value == "Admin";
        }

        public async Task<List<TaskDto>> GetAllAsync(string? status = null, string? priority = null)
        {
            var currentUserId = GetCurrentUserId();
            var isManager = IsManager();

            var query = _context.Tasks.AsQueryable();

            if (!isManager)
                query = query.Where(t => t.AssignedUserId == currentUserId || t.CreatedByUserId == currentUserId);

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(t => t.Status == status);

            if (!string.IsNullOrWhiteSpace(priority))
                query = query.Where(t => t.Priority == priority);

            return await query
                .Include(t => t.AssignedUser)
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new TaskDto
                {
                    Id = t.Id,
                    Title = t.Title,
                    Description = t.Description,
                    Status = t.Status,
                    Priority = t.Priority,
                    DueDate = t.DueDate,
                    CreatedAt = t.CreatedAt,
                    AssignedUserId = t.AssignedUserId,
                    AssignedUserName = t.AssignedUser != null
                        ? t.AssignedUser.Name + " " + t.AssignedUser.Surname
                        : "Atanmamış"
                })
                .ToListAsync();
        }

        public async Task<TaskDto?> GetByIdAsync(Guid id)
        {
            var t = await _context.Tasks
                .Include(t => t.AssignedUser)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (t == null) return null;

            return new TaskDto
            {
                Id = t.Id,
                Title = t.Title,
                Description = t.Description,
                Status = t.Status,
                Priority = t.Priority,
                DueDate = t.DueDate,
                CreatedAt = t.CreatedAt,
                AssignedUserId = t.AssignedUserId,
                AssignedUserName = t.AssignedUser != null
                    ? t.AssignedUser.Name + " " + t.AssignedUser.Surname
                    : "Atanmamış"
            };
        }

        public async Task<TaskDto> CreateAsync(CreateTaskDto dto)
        {
            var currentUserId = GetCurrentUserId();

            var task = new AppTask
            {
                Title = dto.Title,
                Description = dto.Description,
                Status = dto.Status,
                Priority = dto.Priority,
                DueDate = dto.DueDate,
                CreatedByUserId = currentUserId,
                AssignedUserId = dto.AssignedUserId
            };

            _context.Tasks.Add(task);
            await _context.SaveChangesAsync();

            string? assignedUserName = null;
            if (task.AssignedUserId.HasValue)
            {
                var assignedUser = await _context.Users.FindAsync(task.AssignedUserId.Value);
                if (assignedUser != null)
                    assignedUserName = $"{assignedUser.Name} {assignedUser.Surname}";
            }

            return new TaskDto
            {
                Id = task.Id,
                Title = task.Title,
                Description = task.Description,
                Status = task.Status,
                Priority = task.Priority,
                DueDate = task.DueDate,
                CreatedAt = task.CreatedAt,
                AssignedUserId = task.AssignedUserId,
                AssignedUserName = assignedUserName ?? "Atanmamış"
            };
        }

        public async Task<TaskDto> UpdateAsync(Guid id, UpdateTaskDto dto)
        {
            var task = await _context.Tasks.FindAsync(id);
            if (task == null) throw new Exception("Görev bulunamadı");

            task.Title = dto.Title;
            task.Description = dto.Description;
            task.Status = dto.Status;
            task.Priority = dto.Priority;
            task.DueDate = dto.DueDate;
            task.AssignedUserId = dto.AssignedUserId; // null = atamayı kaldır

            await _context.SaveChangesAsync();

            string? assignedUserName = null;
            if (task.AssignedUserId.HasValue)
            {
                var assignedUser = await _context.Users.FindAsync(task.AssignedUserId.Value);
                if (assignedUser != null)
                    assignedUserName = $"{assignedUser.Name} {assignedUser.Surname}";
            }

            return new TaskDto
            {
                Id = task.Id,
                Title = task.Title,
                Description = task.Description,
                Status = task.Status,
                Priority = task.Priority,
                DueDate = task.DueDate,
                CreatedAt = task.CreatedAt,
                AssignedUserId = task.AssignedUserId,
                AssignedUserName = assignedUserName ?? "Atanmamış"
            };
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
            var currentUserId = GetCurrentUserId();
            var isManager = IsManager();

            var query = _context.Tasks.AsQueryable();
            if (!isManager)
                query = query.Where(t => t.AssignedUserId == currentUserId || t.CreatedByUserId == currentUserId);

            var tasks = await query.ToListAsync();
            return new TaskSummaryDto
            {
                Pending = tasks.Count(t => t.Status == "Bekliyor"),
                InProgress = tasks.Count(t => t.Status == "İşlemde"),
                Done = tasks.Count(t => t.Status == "Bitti"),
                Total = tasks.Count
            };
        }
    }
}