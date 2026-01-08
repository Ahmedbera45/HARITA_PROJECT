using Harita.API.DTOs;

namespace Harita.API.Services;

public interface IAuthService
{
    Task<string> LoginAsync(LoginDto dto);
    Task<bool> RegisterAsync(RegisterDto dto);
}