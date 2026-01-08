using Harita.API.DTOs;

namespace Harita.API.Services;
public interface ITaskService
{
    Task<List<TaskDto>> GetMyTasksAsync(Guid userId);
    Task<bool> CreateTaskAsync(CreateTaskDto dto, Guid createdByUserId);
    Task<bool> UpdateTaskStatusAsync(Guid id, string status);
}