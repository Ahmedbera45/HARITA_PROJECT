using Harita.API.DTOs;

namespace Harita.API.Services
{
    public interface IDynamicPageService
    {
        Task<DynamicPageDto> CreatePageAsync(CreateDynamicPageDto dto);
        Task<List<DynamicPageDto>> GetAllPagesAsync();
        Task<DynamicPageDetailDto?> GetPageAsync(Guid id, string? search, string? column);
        Task<bool> DeletePageAsync(Guid id);
        Task<ImportResultDto> ImportRowsFromExcelAsync(Guid pageId, IFormFile file);
        Task<DynamicRowDto> AddRowAsync(Guid pageId, UpsertRowDto dto);
        Task<DynamicRowDto> UpdateRowAsync(Guid rowId, UpsertRowDto dto);
        Task<bool> DeleteRowAsync(Guid rowId);
        Task<DynamicColumnDto> AddColumnAsync(Guid pageId, AddColumnDto dto);
    }
}
