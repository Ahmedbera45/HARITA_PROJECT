using Harita.API.DTOs;

namespace Harita.API.Services
{
    public interface ITaskService
    {
        // "GetMyTasks" yerine "GetAll" kullanıyoruz, çünkü içeride role göre filtreliyoruz
        Task<List<TaskDto>> GetAllAsync(); 
        
        Task<TaskDto> CreateAsync(CreateTaskDto dto);
        
        // "UpdateTaskStatus" yerine genel "Update" kullanıyoruz
        Task<TaskDto> UpdateAsync(Guid id, UpdateTaskDto dto); 
        
        Task<bool> DeleteAsync(Guid id);
    }
}