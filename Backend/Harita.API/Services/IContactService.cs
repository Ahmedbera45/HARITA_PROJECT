using Harita.API.DTOs;

namespace Harita.API.Services
{
    public interface IContactService
    {
        Task<List<ContactDto>> GetAllAsync();
        
        // DİKKAT: Burası int idi, şimdi Guid yapıyoruz
        Task<ContactDto?> GetByIdAsync(Guid id); 
        
        Task<ContactDto> CreateAsync(CreateContactDto dto);
        
        Task<ContactDto> UpdateAsync(Guid id, UpdateContactDto dto);
        // DİKKAT: Burası da int idi, şimdi Guid yapıyoruz
        Task<bool> DeleteAsync(Guid id); 
    }
}