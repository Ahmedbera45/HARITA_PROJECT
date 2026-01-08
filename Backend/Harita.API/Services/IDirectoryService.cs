using Harita.API.DTOs;

namespace Harita.API.Services;

public interface IDirectoryService
{
    Task<List<DirectoryDto>> GetAllAsync();
    Task<DirectoryDto> GetByIdAsync(Guid id);
    Task<bool> AddAsync(CreateDirectoryDto dto);
    Task<bool> UpdateAsync(Guid id, UpdateDirectoryDto dto);
    Task<bool> DeleteAsync(Guid id);
}

