using Harita.API.DTOs;

namespace Harita.API.Services
{
    public interface ITaskService
    {
        Task<List<TaskDto>> GetAllAsync(string? status = null, string? priority = null);
        Task<TaskDto?> GetByIdAsync(Guid id);
        Task<TaskDto> CreateAsync(CreateTaskDto dto);
        Task<TaskDto> UpdateAsync(Guid id, UpdateTaskDto dto);
        Task<bool> DeleteAsync(Guid id);
        Task<TaskSummaryDto> GetSummaryAsync();
    }
}