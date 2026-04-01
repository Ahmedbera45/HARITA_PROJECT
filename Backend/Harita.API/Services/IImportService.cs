using Harita.API.DTOs;
using Microsoft.AspNetCore.Http;

namespace Harita.API.Services
{
    public interface IImportService
    {
        Task<ImportResultDto> ImportParcelsFromExcelAsync(IFormFile file);
        Task<List<ImportLogDto>> GetImportLogsAsync();
        Task<List<ParcelDto>> GetParcelsAsync(string? batchId = null, string? mahalle = null);
        Task<ParcelDto> UpdateParcelAsync(Guid id, UpdateParcelDto dto);
    }
}
