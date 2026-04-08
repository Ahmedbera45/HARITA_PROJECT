using Harita.API.DTOs;

namespace Harita.API.Services
{
    public interface ILeaveService
    {
        Task<List<LeaveRequestDto>> GetAllAsync();
        Task<PagedResult<LeaveRequestDto>> GetPagedAsync(string? personSearch, string? leaveType, string? status, DateTime? dateFrom, DateTime? dateTo, int page, int pageSize);
        Task<LeaveRequestDto> CreateAsync(CreateLeaveRequestDto dto);
        Task<LeaveRequestDto> ReviewAsync(Guid id, ReviewLeaveRequestDto dto);
        Task<bool> DeleteAsync(Guid id);
        Task<List<LeaveBalanceSummaryDto>> GetBalanceSummaryAsync();
        Task<List<HourlyLeaveSummaryDto>> GetHourlySummaryAsync();
        Task<HourlyCompensationDto> AddHourlyCompensationAsync(CreateHourlyCompensationDto dto);
        Task<List<HourlyCompensationDto>> GetAllHourlyCompensationsAsync();
    }
}
