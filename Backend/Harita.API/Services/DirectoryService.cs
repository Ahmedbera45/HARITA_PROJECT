using Harita.API.Data;
using Harita.API.DTOs;
using Harita.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Harita.API.Services;

public class DirectoryService : IDirectoryService
{
    private readonly AppDbContext _context;

    public DirectoryService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<DirectoryDto>> GetAllAsync()
    {
        return await _context.Directories
            .Where(d => !d.IsDeleted)
            .Select(d => new DirectoryDto
            {
                Id = d.Id,
                Name = d.Name,
                Title = d.Title,
                Institution = d.Institution,
                Unit = d.Unit,
                Phone = d.Phone,
                Email = d.Email,
                Tags = d.Tags
            }).ToListAsync();
    }

    public async Task<DirectoryDto> GetByIdAsync(Guid id)
    {
        var entity = await _context.Directories
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

        if (entity == null) return null;

        return new DirectoryDto
        {
            Id = entity.Id,
            Name = entity.Name,
            Title = entity.Title,
            Institution = entity.Institution,
            Unit = entity.Unit,
            Phone = entity.Phone,
            Email = entity.Email,
            Tags = entity.Tags
        };
    }

    public async Task<bool> AddAsync(CreateDirectoryDto dto)
    {
        var entity = new Directory
        {
            Id = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false,
            Name = dto.Name,
            Title = dto.Title,
            Institution = dto.Institution,
            Unit = dto.Unit,
            Phone = dto.Phone,
            Email = dto.Email,
            Tags = dto.Tags
        };

        await _context.Directories.AddAsync(entity);
        return await _context.SaveChangesAsync() > 0;
    }

    public async Task<bool> UpdateAsync(Guid id, UpdateDirectoryDto dto)
    {
        var entity = await _context.Directories.FindAsync(id);
        if (entity == null || entity.IsDeleted) return false;

        entity.Name = dto.Name;
        entity.Title = dto.Title;
        entity.Institution = dto.Institution;
        entity.Unit = dto.Unit;
        entity.Phone = dto.Phone;
        entity.Email = dto.Email;
        entity.Tags = dto.Tags;

        return await _context.SaveChangesAsync() > 0;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var entity = await _context.Directories.FindAsync(id);
        if (entity == null || entity.IsDeleted) return false;

        entity.IsDeleted = true;
        return await _context.SaveChangesAsync() > 0;
    }
}

