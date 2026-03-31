using Harita.API.DTOs;

namespace Harita.API.Services
{
    public interface IFeeCalculationService
    {
        Task<FeeCalculationDto> CalculateAsync(CreateFeeCalculationDto dto);
        Task<List<FeeCalculationDto>> GetAllAsync();
        Task<FeeCalculationDto?> GetByIdAsync(Guid id);
        Task<bool> DeleteAsync(Guid id);
        List<FeeRateDto> GetFeeRates();
    }
}
