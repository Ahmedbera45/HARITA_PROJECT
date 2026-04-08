using Harita.API.DTOs;

namespace Harita.API.Services
{
    public interface ITevhidService
    {
        Task<TevhidDto> CreateAsync(CreateTevhidDto dto);
        Task<List<TevhidDto>> GetAllAsync();
        Task<PagedResult<TevhidDto>> GetPagedAsync(string? ada, string? parsel, string? mahalle, string? status, DateTime? dateFrom, DateTime? dateTo, int page, int pageSize);
        Task<TevhidDto?> GetByIdAsync(Guid id);
        Task<TevhidDto> ReviewAsync(Guid id, ReviewTevhidDto dto);
        Task<TevhidDto> UpdateAsync(Guid id, UpdateTevhidDto dto);
        Task<bool> DeleteAsync(Guid id);
        Task<byte[]> ExportAllApprovedAsync();
        Task<byte[]> ExportScenariosAsync(Guid id);
        Task<byte[]> ExportApprovedAsync(Guid id);
    }
}
