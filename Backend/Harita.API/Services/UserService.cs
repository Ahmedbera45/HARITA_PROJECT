using Harita.API.Data;
using Harita.API.DTOs;
using Harita.API.Entities;
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

        private static UserDto MapToDto(User u) => new()
        {
            Id                  = u.Id,
            FullName            = $"{u.Name} {u.Surname}",
            Name                = u.Name ?? "",
            Surname             = u.Surname ?? "",
            Email               = u.Email ?? "",
            Department          = u.Department,
            IsActive            = u.IsActive,
            CreatedAt           = u.CreatedAt,
            Roles               = u.UserRoles?.Select(ur => ur.Role.Name).ToList() ?? new(),
            KalanIzinGunu       = u.KalanIzinGunu,
            IzinYenilemeTarihi  = u.IzinYenilemeTarihi,
            IzinYenilenecekGun  = u.IzinYenilenecekGun
        };

        public async Task<List<UserDto>> GetAllAsync()
        {
            var users = await _context.Users
                .Where(u => !u.IsDeleted)
                .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .OrderBy(u => u.Name)
                .ToListAsync();
            return users.Select(MapToDto).ToList();
        }

        public async Task<PagedResult<UserDto>> GetPagedAsync(string? search, string? role, bool? isActive, int page, int pageSize)
        {
            var query = _context.Users
                .Where(u => !u.IsDeleted)
                .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(u => (u.Name + " " + u.Surname).Contains(search) || u.Email.Contains(search));
            if (!string.IsNullOrWhiteSpace(role))
                query = query.Where(u => u.UserRoles.Any(ur => ur.Role.Name == role));
            if (isActive.HasValue)
                query = query.Where(u => u.IsActive == isActive.Value);

            var total = await query.CountAsync();
            var items = await query.OrderBy(u => u.Name).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

            return new PagedResult<UserDto>
            {
                Items    = items.Select(MapToDto).ToList(),
                Total    = total,
                Page     = page,
                PageSize = pageSize
            };
        }

        public async Task<UserDto?> GetByIdAsync(Guid id)
        {
            var u = await _context.Users
                .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted);

            return u == null ? null : MapToDto(u);
        }

        public async Task<UserDto> CreateAsync(CreateUserDto dto)
        {
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email && !u.IsDeleted))
                throw new Exception("Bu e-posta adresi zaten kullanılıyor.");

            var user = new User
            {
                Name                = dto.Name,
                Surname             = dto.Surname,
                Email               = dto.Email,
                PasswordHash        = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Department          = dto.Department,
                IsActive            = true,
                KalanIzinGunu       = dto.KalanIzinGunu,
                IzinYenilemeTarihi  = dto.IzinYenilemeTarihi,
                IzinYenilenecekGun  = dto.IzinYenilenecekGun
            };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            await SetRoleAsync(user.Id, dto.Role);

            return await GetByIdAsync(user.Id) ?? MapToDto(user);
        }

        public async Task<UserDto> UpdateAsync(Guid id, UpdateUserDto dto)
        {
            var user = await _context.Users
                .Include(u => u.UserRoles)
                .FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted)
                ?? throw new Exception("Kullanıcı bulunamadı.");

            if (await _context.Users.AnyAsync(u => u.Email == dto.Email && u.Id != id && !u.IsDeleted))
                throw new Exception("Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor.");

            user.Name               = dto.Name;
            user.Surname            = dto.Surname;
            user.Email              = dto.Email;
            user.Department         = dto.Department;
            user.IsActive           = dto.IsActive;
            user.KalanIzinGunu      = dto.KalanIzinGunu;
            user.IzinYenilemeTarihi = dto.IzinYenilemeTarihi;
            user.IzinYenilenecekGun = dto.IzinYenilenecekGun;

            await SetRoleAsync(id, dto.Role);
            await _context.SaveChangesAsync();

            return await GetByIdAsync(id) ?? MapToDto(user);
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null || user.IsDeleted) return false;

            user.IsDeleted = true;
            user.IsActive  = false;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<UserDto> ChangePasswordAsync(Guid id, ChangePasswordDto dto)
        {
            var user = await _context.Users
                .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted)
                ?? throw new Exception("Kullanıcı bulunamadı.");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            await _context.SaveChangesAsync();
            return MapToDto(user);
        }

        // Kullanıcının rolünü tek rolle değiştir (mevcut rolleri temizle, yenisini ata)
        private async Task SetRoleAsync(Guid userId, string roleName)
        {
            var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == roleName);
            if (role == null) return;

            var existing = _context.UserRoles.Where(ur => ur.UserId == userId);
            _context.UserRoles.RemoveRange(existing);
            _context.UserRoles.Add(new UserRole { UserId = userId, RoleId = role.Id });
            await _context.SaveChangesAsync();
        }
    }
}
