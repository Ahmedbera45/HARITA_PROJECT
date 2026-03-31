using Harita.API.DTOs;

namespace Harita.API.Services
{
    public interface ILeaveService
    {
        Task<List<LeaveRequestDto>> GetAllAsync();
        Task<LeaveRequestDto> CreateAsync(CreateLeaveRequestDto dto);
        Task<LeaveRequestDto> ReviewAsync(Guid id, ReviewLeaveRequestDto dto);
        Task<bool> DeleteAsync(Guid id);
    }
}
