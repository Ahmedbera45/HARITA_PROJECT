using Harita.API.DTOs;
using Microsoft.AspNetCore.Http;

namespace Harita.API.Services
{
    public interface IImportService
    {
        Task<ImportResultDto> ImportParcelsFromExcelAsync(IFormFile file);
        Task<ImportResultDto> ImportParcelsFromShpAsync(IFormFile file);
        Task<List<ImportLogDto>> GetImportLogsAsync();
        Task<List<ParcelDto>> GetParcelsAsync(string? batchId = null, string? mahalle = null);
        Task<PagedResult<ParcelDto>> GetParcelsPagedAsync(string? batchId, string? mahalle, string? search, int page, int pageSize);
        Task<ParcelDto?> SearchParcelAsync(string ada, string parsel, string? mahalle = null);
        Task<ParcelDto> UpdateParcelAsync(Guid id, UpdateParcelDto dto);
        Task<List<string>> AutocompleteAsync(string q, string field);
        Task<MergeImportResultDto> MergeParcelsFromExcelAsync(IFormFile file, List<string> updateColumns);
    }
}
