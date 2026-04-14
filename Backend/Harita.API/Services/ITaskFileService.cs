using Harita.API.DTOs;

namespace Harita.API.Services
{
    public interface ITaskFileService
    {
        Task<TaskFileDto> UploadAsync(Guid taskId, IFormFile file);
        Task<bool> DeleteAsync(Guid taskId, Guid fileId);
        Task<List<TaskFileDto>> GetFilesAsync(Guid taskId);
    }
}
