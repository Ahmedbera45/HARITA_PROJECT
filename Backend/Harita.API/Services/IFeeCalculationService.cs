using Harita.API.DTOs;

namespace Harita.API.Services
{
    public interface IFeeCalculationService
    {
        // Hesaplama
        Task<FeeCalculationDto> CalculateAsync(CreateFeeCalculationDto dto);
        Task<List<FeeCalculationDto>> GetAllAsync();
        Task<FeeCalculationDto?> GetByIdAsync(Guid id);
        Task<bool> DeleteAsync(Guid id);

        // Harç kalemleri (DB'den)
        Task<List<FeeRateDto>> GetFeeRatesAsync();
        Task<FeeRateDto> CreateFeeRateAsync(CreateFeeRateDto dto);
        Task<FeeRateDto> UpdateFeeRateAsync(Guid id, UpdateFeeRateDto dto);
        Task<bool> DeleteFeeRateAsync(Guid id);

        // Harç kategorileri
        Task<List<FeeCategoryDto>> GetCategoriesAsync();
        Task<FeeCategoryDto> CreateCategoryAsync(CreateFeeCategoryDto dto);
        Task<FeeCategoryDto> UpdateCategoryAsync(Guid id, CreateFeeCategoryDto dto);
        Task<bool> DeleteCategoryAsync(Guid id);
    }
}
