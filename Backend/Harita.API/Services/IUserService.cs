using Harita.API.DTOs;

namespace Harita.API.Services
{
    public interface IUserService
    {
        Task<List<UserDto>> GetAllAsync();
    }
}
