using Harita.API.Data;
using Harita.API.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Harita.API.Services
{
    public class UserService : IUserService
    {
        private readonly AppDbContext _context;

        public UserService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<UserDto>> GetAllAsync()
        {
            return await _context.Users
                .Where(u => u.IsActive)
                .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .OrderBy(u => u.Name)
                .Select(u => new UserDto
                {
                    Id = u.Id,
                    FullName = u.Name + " " + u.Surname,
                    Email = u.Email,
                    Department = u.Department,
                    Roles = u.UserRoles.Select(ur => ur.Role.Name).ToList()
                })
                .ToListAsync();
        }
    }
}
