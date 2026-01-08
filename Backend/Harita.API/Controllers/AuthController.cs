using Harita.API.DTOs;
using Harita.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace Harita.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto loginDto)
    {
        var token = await _authService.LoginAsync(loginDto);

        if (string.IsNullOrEmpty(token))
            return Unauthorized("Kullanıcı adı veya şifre hatalı.");

        return Ok(new { Token = token });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto registerDto)
    {
        var result = await _authService.RegisterAsync(registerDto);

        if (!result)
            return BadRequest("Kayıt başarısız. Kullanıcı adı kullanılıyor olabilir.");

        return Ok("Kayıt başarılı.");
    }
}