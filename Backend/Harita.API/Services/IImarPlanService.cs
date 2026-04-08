using Harita.API.DTOs;

namespace Harita.API.Services;

public interface IImarPlanService
{
    Task<List<ImarPlanDto>> GetAllAsync();
    Task<PagedResult<ImarPlanDto>> GetPagedAsync(string? search, string? planTuru, string? durum, int? yil, int page, int pageSize);
    Task<ImarPlanDto?> GetByIdAsync(Guid id);
    Task<ImarPlanDto> CreateAsync(CreateImarPlanDto dto, Guid userId);
    Task<ImarPlanDto> UpdateAsync(Guid id, CreateImarPlanDto dto);
    Task<bool> DeleteAsync(Guid id);
    Task<ImarPlanEkDto> AddEkAsync(Guid planId, AddImarPlanEkDto dto, Guid userId);
    Task<bool> DeleteEkAsync(Guid ekId);
    NetworkBrowseResultDto BrowseNetwork(string relativePath);
    Task<(byte[] content, string fileName, string contentType)> DownloadEkAsync(Guid ekId);
}
