using System.Security.Claims;
using Harita.API.Data;
using Harita.API.DTOs;
using Harita.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Harita.API.Services
{
    public class NoteService : INoteService
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;
        private readonly IHttpContextAccessor _accessor;

        private static readonly string[] AllowedExtensions =
            { ".pdf", ".zip", ".rar", ".docx", ".xlsx", ".jpg", ".jpeg", ".png" };
        private const long MaxFileSize = 20 * 1024 * 1024;

        public NoteService(AppDbContext context, IWebHostEnvironment env, IHttpContextAccessor accessor)
        {
            _context = context;
            _env = env;
            _accessor = accessor;
        }

        private Guid GetCurrentUserId()
        {
            var claim = _accessor.HttpContext!.User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.Parse(claim!);
        }

        // ─── Categories ──────────────────────────────────────────────────

        public async Task<List<NoteCategoryDto>> GetCategoriesAsync()
        {
            var me = GetCurrentUserId();
            var cats = await _context.NoteCategories
                .Where(c => c.UserId == me && !c.IsDeleted)
                .OrderBy(c => c.Name)
                .ToListAsync();

            // Note counts
            var catIds = cats.Select(c => c.Id).ToList();
            var counts = await _context.Notes
                .Where(n => n.CategoryId != null && catIds.Contains(n.CategoryId.Value) && !n.IsDeleted)
                .GroupBy(n => n.CategoryId!.Value)
                .Select(g => new { CatId = g.Key, Count = g.Count() })
                .ToListAsync();

            var countDict = counts.ToDictionary(x => x.CatId, x => x.Count);

            return cats.Select(c => new NoteCategoryDto
            {
                Id = c.Id,
                Name = c.Name,
                Color = c.Color,
                NoteCount = countDict.TryGetValue(c.Id, out var cnt) ? cnt : 0,
            }).ToList();
        }

        public async Task<NoteCategoryDto> CreateCategoryAsync(CreateNoteCategoryDto dto)
        {
            var me = GetCurrentUserId();
            var cat = new NoteCategory
            {
                Id = Guid.NewGuid(),
                CreatedAt = DateTime.UtcNow,
                Name = dto.Name,
                Color = dto.Color,
                UserId = me,
            };
            _context.NoteCategories.Add(cat);
            await _context.SaveChangesAsync();
            return new NoteCategoryDto { Id = cat.Id, Name = cat.Name, Color = cat.Color, NoteCount = 0 };
        }

        public async Task<NoteCategoryDto> UpdateCategoryAsync(Guid id, CreateNoteCategoryDto dto)
        {
            var me = GetCurrentUserId();
            var cat = await _context.NoteCategories
                .FirstOrDefaultAsync(c => c.Id == id && c.UserId == me && !c.IsDeleted)
                ?? throw new Exception("Kategori bulunamadı.");

            cat.Name = dto.Name;
            cat.Color = dto.Color;
            await _context.SaveChangesAsync();

            var count = await _context.Notes.CountAsync(n => n.CategoryId == id && !n.IsDeleted);
            return new NoteCategoryDto { Id = cat.Id, Name = cat.Name, Color = cat.Color, NoteCount = count };
        }

        public async Task<bool> DeleteCategoryAsync(Guid id)
        {
            var me = GetCurrentUserId();
            var cat = await _context.NoteCategories
                .FirstOrDefaultAsync(c => c.Id == id && c.UserId == me && !c.IsDeleted);
            if (cat == null) return false;

            cat.IsDeleted = true;
            await _context.SaveChangesAsync();
            return true;
        }

        // ─── Notes ───────────────────────────────────────────────────────

        public async Task<List<NoteListItemDto>> GetNotesAsync(Guid? categoryId)
        {
            var me = GetCurrentUserId();

            var query = _context.Notes
                .Where(n => !n.IsDeleted && (
                    n.UserId == me ||
                    n.Shares.Any(s => s.SharedWithUserId == me)
                ))
                .Include(n => n.Category)
                .Include(n => n.LastEditedByUser)
                .Include(n => n.Shares)
                .AsQueryable();

            if (categoryId.HasValue)
                query = query.Where(n => n.CategoryId == categoryId.Value);

            var notes = await query.OrderByDescending(n => n.UpdatedAt).ToListAsync();

            return notes.Select(n => MapToListItem(n, me)).ToList();
        }

        public async Task<NoteDetailDto?> GetNoteByIdAsync(Guid id)
        {
            var me = GetCurrentUserId();
            var note = await _context.Notes
                .Where(n => !n.IsDeleted)
                .Include(n => n.Category)
                .Include(n => n.User)
                .Include(n => n.LastEditedByUser)
                .Include(n => n.Shares).ThenInclude(s => s.SharedWithUser)
                .Include(n => n.Files.Where(f => !f.IsDeleted))
                .FirstOrDefaultAsync(n => n.Id == id);

            if (note == null) return null;

            bool isOwner = note.UserId == me;
            var share = note.Shares.FirstOrDefault(s => s.SharedWithUserId == me);
            if (!isOwner && share == null)
                throw new UnauthorizedAccessException("Bu nota erişim yetkiniz yok.");

            return MapToDetail(note, me);
        }

        public async Task<NoteDetailDto> CreateNoteAsync(CreateNoteDto dto)
        {
            var me = GetCurrentUserId();
            var note = new Note
            {
                Id = Guid.NewGuid(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Title = dto.Title,
                Content = dto.Content,
                CategoryId = dto.CategoryId,
                UserId = me,
                LastEditedByUserId = me,
            };
            _context.Notes.Add(note);
            await _context.SaveChangesAsync();

            return await GetNoteByIdAsync(note.Id) ?? throw new Exception("Not oluşturulamadı.");
        }

        public async Task<NoteDetailDto> UpdateNoteAsync(Guid id, UpdateNoteDto dto)
        {
            var me = GetCurrentUserId();
            var note = await _context.Notes
                .Include(n => n.Shares)
                .FirstOrDefaultAsync(n => n.Id == id && !n.IsDeleted)
                ?? throw new Exception("Not bulunamadı.");

            bool isOwner = note.UserId == me;
            var share = note.Shares.FirstOrDefault(s => s.SharedWithUserId == me);
            if (!isOwner && (share == null || !share.CanEdit))
                throw new UnauthorizedAccessException("Bu notu düzenleme yetkiniz yok.");

            note.Title = dto.Title;
            note.Content = dto.Content;
            note.CategoryId = dto.CategoryId;
            note.UpdatedAt = DateTime.UtcNow;
            note.LastEditedByUserId = me;

            await _context.SaveChangesAsync();
            return await GetNoteByIdAsync(id) ?? throw new Exception("Not güncellenemedi.");
        }

        public async Task<bool> DeleteNoteAsync(Guid id)
        {
            var me = GetCurrentUserId();
            var note = await _context.Notes
                .FirstOrDefaultAsync(n => n.Id == id && !n.IsDeleted);
            if (note == null) return false;
            if (note.UserId != me)
                throw new UnauthorizedAccessException("Yalnızca not sahibi silebilir.");

            note.IsDeleted = true;
            await _context.SaveChangesAsync();
            return true;
        }

        // ─── Sharing ─────────────────────────────────────────────────────

        public async Task<NoteShareDto> ShareNoteAsync(Guid noteId, ShareNoteDto dto)
        {
            var me = GetCurrentUserId();
            var note = await _context.Notes
                .Include(n => n.Shares)
                .FirstOrDefaultAsync(n => n.Id == noteId && !n.IsDeleted)
                ?? throw new Exception("Not bulunamadı.");

            if (note.UserId != me)
                throw new UnauthorizedAccessException("Yalnızca not sahibi paylaşabilir.");

            // Aynı kullanıcıya zaten paylaşılmışsa güncelle
            var existing = note.Shares.FirstOrDefault(s => s.SharedWithUserId == dto.SharedWithUserId);
            if (existing != null)
            {
                existing.CanEdit = dto.CanEdit;
                await _context.SaveChangesAsync();
                var user2 = await _context.Users.FindAsync(dto.SharedWithUserId);
                return new NoteShareDto
                {
                    Id = existing.Id,
                    SharedWithUserId = existing.SharedWithUserId,
                    SharedWithUserName = user2 != null ? $"{user2.Name} {user2.Surname}".Trim() : "",
                    CanEdit = existing.CanEdit,
                };
            }

            var share = new NoteShare
            {
                Id = Guid.NewGuid(),
                NoteId = noteId,
                SharedWithUserId = dto.SharedWithUserId,
                CanEdit = dto.CanEdit,
                SharedAt = DateTime.UtcNow,
            };
            _context.NoteShares.Add(share);
            await _context.SaveChangesAsync();

            var sharedUser = await _context.Users.FindAsync(dto.SharedWithUserId);
            return new NoteShareDto
            {
                Id = share.Id,
                SharedWithUserId = share.SharedWithUserId,
                SharedWithUserName = sharedUser != null ? $"{sharedUser.Name} {sharedUser.Surname}".Trim() : "",
                CanEdit = share.CanEdit,
            };
        }

        public async Task<bool> RemoveShareAsync(Guid noteId, Guid shareId)
        {
            var me = GetCurrentUserId();
            var note = await _context.Notes.FindAsync(noteId);
            if (note == null || note.IsDeleted) return false;
            if (note.UserId != me)
                throw new UnauthorizedAccessException("Yalnızca not sahibi paylaşımı kaldırabilir.");

            var share = await _context.NoteShares.FindAsync(shareId);
            if (share == null || share.NoteId != noteId) return false;

            _context.NoteShares.Remove(share);
            await _context.SaveChangesAsync();
            return true;
        }

        // ─── Files ───────────────────────────────────────────────────────

        public async Task<NoteFileDto> UploadFileAsync(Guid noteId, IFormFile file)
        {
            var me = GetCurrentUserId();
            var note = await _context.Notes
                .Include(n => n.Shares)
                .FirstOrDefaultAsync(n => n.Id == noteId && !n.IsDeleted)
                ?? throw new Exception("Not bulunamadı.");

            bool isOwner = note.UserId == me;
            var share = note.Shares.FirstOrDefault(s => s.SharedWithUserId == me);
            if (!isOwner && (share == null || !share.CanEdit))
                throw new UnauthorizedAccessException("Dosya yükleme yetkiniz yok.");

            if (file.Length > MaxFileSize)
                throw new Exception("Dosya boyutu 20 MB'ı geçemez.");

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(ext))
                throw new Exception("Desteklenmeyen dosya türü.");

            var uploadsDir = Path.Combine(_env.WebRootPath ?? "wwwroot", "note-uploads");
            Directory.CreateDirectory(uploadsDir);

            var fileName = $"{noteId}_{Path.GetFileNameWithoutExtension(file.FileName)}_{DateTime.UtcNow:yyyyMMddHHmmss}{ext}";
            var filePath = Path.Combine(uploadsDir, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
                await file.CopyToAsync(stream);

            var entity = new NoteFile
            {
                Id = Guid.NewGuid(),
                CreatedAt = DateTime.UtcNow,
                NoteId = noteId,
                FileName = file.FileName,
                FilePath = $"/note-uploads/{fileName}",
                FileSize = file.Length,
                ContentType = file.ContentType,
                UploadedByUserId = me,
            };

            _context.NoteFiles.Add(entity);
            await _context.SaveChangesAsync();

            return new NoteFileDto
            {
                Id = entity.Id,
                FileName = entity.FileName,
                FilePath = entity.FilePath,
                FileSize = entity.FileSize,
                ContentType = entity.ContentType,
                UploadedAt = entity.CreatedAt,
            };
        }

        public async Task<bool> DeleteFileAsync(Guid noteId, Guid fileId)
        {
            var me = GetCurrentUserId();
            var file = await _context.NoteFiles
                .FirstOrDefaultAsync(f => f.Id == fileId && f.NoteId == noteId && !f.IsDeleted);
            if (file == null) return false;

            var physicalPath = Path.Combine(_env.WebRootPath ?? "wwwroot", file.FilePath.TrimStart('/'));
            if (File.Exists(physicalPath)) File.Delete(physicalPath);

            file.IsDeleted = true;
            await _context.SaveChangesAsync();
            return true;
        }

        // ─── Mappers ─────────────────────────────────────────────────────

        private NoteListItemDto MapToListItem(Note n, Guid me)
        {
            var share = n.Shares.FirstOrDefault(s => s.SharedWithUserId == me);
            return new NoteListItemDto
            {
                Id = n.Id,
                Title = n.Title,
                CategoryId = n.CategoryId,
                CategoryName = n.Category?.Name,
                CategoryColor = n.Category?.Color,
                UpdatedAt = n.UpdatedAt,
                LastEditedByName = n.LastEditedByUser != null
                    ? $"{n.LastEditedByUser.Name} {n.LastEditedByUser.Surname}".Trim()
                    : null,
                IsSharedWithMe = n.UserId != me,
                CanEdit = n.UserId == me || (share?.CanEdit ?? false),
            };
        }

        private NoteDetailDto MapToDetail(Note n, Guid me)
        {
            var share = n.Shares.FirstOrDefault(s => s.SharedWithUserId == me);
            return new NoteDetailDto
            {
                Id = n.Id,
                Title = n.Title,
                Content = n.Content,
                CategoryId = n.CategoryId,
                CategoryName = n.Category?.Name,
                CategoryColor = n.Category?.Color,
                UpdatedAt = n.UpdatedAt,
                CreatedAt = n.CreatedAt,
                LastEditedByName = n.LastEditedByUser != null
                    ? $"{n.LastEditedByUser.Name} {n.LastEditedByUser.Surname}".Trim()
                    : null,
                IsSharedWithMe = n.UserId != me,
                CanEdit = n.UserId == me || (share?.CanEdit ?? false),
                OwnerUserId = n.UserId,
                OwnerName = n.User != null ? $"{n.User.Name} {n.User.Surname}".Trim() : "",
                Shares = n.Shares.Select(s => new NoteShareDto
                {
                    Id = s.Id,
                    SharedWithUserId = s.SharedWithUserId,
                    SharedWithUserName = s.SharedWithUser != null
                        ? $"{s.SharedWithUser.Name} {s.SharedWithUser.Surname}".Trim()
                        : "",
                    CanEdit = s.CanEdit,
                }).ToList(),
                Files = n.Files.Where(f => !f.IsDeleted).Select(f => new NoteFileDto
                {
                    Id = f.Id,
                    FileName = f.FileName,
                    FilePath = f.FilePath,
                    FileSize = f.FileSize,
                    ContentType = f.ContentType,
                    UploadedAt = f.CreatedAt,
                }).ToList(),
            };
        }
    }
}
