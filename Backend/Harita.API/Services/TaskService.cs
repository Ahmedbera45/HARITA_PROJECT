using Harita.API.Data;
using Harita.API.DTOs;
using Harita.API.Entities;
using Microsoft.EntityFrameworkCore; // ToListAsync ve FindAsync için gerekli!

namespace Harita.API.Services;

public class TaskService : ITaskService
{
    private readonly AppDbContext _context;

    public TaskService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<TaskDto>> GetMyTasksAsync(Guid userId)
    {
        // _context.AppTasks yaptık (DbContext'te DbSet ismini değiştirdiğini varsayıyorum)
        // Eğer değiştirmeden bıraktıysan _context.Tasks olarak kalabilir ama tipi AppTask olmalı.
        return await _context.AppTasks 
            .Where(t => t.AssignedToUserId == userId && !t.IsDeleted)
            .Select(t => new TaskDto
            {
                Id = t.Id,
                Title = t.Title,
                Description = t.Description,
                Status = t.Status,
                DueDate = t.DueDate,
                AssignedToUserId = t.AssignedToUserId,
                CreatedByUserId = t.CreatedByUserId
            }).ToListAsync();
    }

    public async Task<bool> CreateTaskAsync(CreateTaskDto dto, Guid createdByUserId)
    {
        // ARTIK "TaskEntity" YERİNE DOĞRUDAN "AppTask" KULLANIYORUZ
        var entity = new AppTask
        {
            Id = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false,
            Title = dto.Title,
            Description = dto.Description,
            DueDate = dto.DueDate,
            Status = "Pending",
            AssignedToUserId = dto.AssignedToUserId,
            CreatedByUserId = createdByUserId
        };

        await _context.AppTasks.AddAsync(entity);
        return await _context.SaveChangesAsync() > 0;
    }

    public async Task<bool> UpdateTaskStatusAsync(Guid id, string status)
    {
        var entity = await _context.AppTasks.FindAsync(id);
        if (entity == null || entity.IsDeleted) return false;

        entity.Status = status;
        return await _context.SaveChangesAsync() > 0;
    }
}