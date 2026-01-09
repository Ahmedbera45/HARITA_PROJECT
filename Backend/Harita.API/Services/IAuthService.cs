using Harita.API.DTOs;

namespace Harita.API.Services
{
    public interface IAuthService
    {
        // Artık string değil, TokenDto dönüyor
        Task<TokenDto> LoginAsync(LoginDto dto);
        
        // Artık bool değil, TokenDto dönüyor (Kayıt olunca direkt giriş yapmış sayılır)
        Task<TokenDto> RegisterAsync(RegisterDto dto);
    }
}