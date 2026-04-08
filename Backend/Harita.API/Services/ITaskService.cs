using Harita.API.DTOs;

namespace Harita.API.Services
{
    public interface ITaskService
    {
        Task<List<TaskDto>> GetAllAsync(string? status = null, string? priority = null, bool assignedToMe = false);
        Task<PagedResult<TaskDto>> GetPagedAsync(string? status, string? priority, string? search, Guid? assignedUserId, int page, int pageSize);
        Task<TaskDto?> GetByIdAsync(Guid id);
        Task<TaskDto> CreateAsync(CreateTaskDto dto);
        Task<TaskDto> UpdateAsync(Guid id, UpdateTaskDto dto);
        Task<bool> DeleteAsync(Guid id);
        Task<TaskSummaryDto> GetSummaryAsync();
    }
}