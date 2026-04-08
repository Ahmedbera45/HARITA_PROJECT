using Harita.API.DTOs;

namespace Harita.API.Services
{
    public interface IUserService
    {
        Task<List<UserDto>> GetAllAsync();
        Task<PagedResult<UserDto>> GetPagedAsync(string? search, string? role, bool? isActive, int page, int pageSize);
        Task<UserDto?> GetByIdAsync(Guid id);
        Task<UserDto> CreateAsync(CreateUserDto dto);
        Task<UserDto> UpdateAsync(Guid id, UpdateUserDto dto);
        Task<bool> DeleteAsync(Guid id);
        Task<UserDto> ChangePasswordAsync(Guid id, ChangePasswordDto dto);
    }
}
