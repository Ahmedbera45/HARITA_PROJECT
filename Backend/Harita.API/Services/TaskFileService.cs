using System.Security.Claims;
using Harita.API.Data;
using Harita.API.DTOs;
using Harita.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Harita.API.Services
{
    public class TaskFileService : ITaskFileService
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;
        private readonly IHttpContextAccessor _accessor;

        private static readonly string[] AllowedExtensions =
            { ".pdf", ".zip", ".rar", ".docx", ".xlsx", ".jpg", ".jpeg", ".png" };
        private const long MaxFileSize = 20 * 1024 * 1024;

        public TaskFileService(AppDbContext context, IWebHostEnvironment env, IHttpContextAccessor accessor)
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

        public async Task<TaskFileDto> UploadAsync(Guid taskId, IFormFile file)
        {
            var task = await _context.Tasks.FindAsync(taskId)
                ?? throw new Exception("Görev bulunamadı.");

            if (file.Length > MaxFileSize)
                throw new Exception("Dosya boyutu 20 MB'ı geçemez.");

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(ext))
                throw new Exception("Desteklenmeyen dosya türü. İzin verilen: PDF, ZIP, RAR, DOCX, XLSX, JPG, PNG");

            var uploadsDir = Path.Combine(_env.WebRootPath ?? "wwwroot", "task-uploads");
            Directory.CreateDirectory(uploadsDir);

            var safeOriginal = Path.GetFileNameWithoutExtension(file.FileName);
            var fileName = $"{taskId}_{safeOriginal}_{DateTime.UtcNow:yyyyMMddHHmmss}{ext}";
            var filePath = Path.Combine(uploadsDir, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
                await file.CopyToAsync(stream);

            var entity = new TaskFile
            {
                Id = Guid.NewGuid(),
                CreatedAt = DateTime.UtcNow,
                TaskId = taskId,
                FileName = file.FileName,
                FilePath = $"/task-uploads/{fileName}",
                FileSize = file.Length,
                ContentType = file.ContentType,
                UploadedByUserId = GetCurrentUserId(),
            };

            _context.TaskFiles.Add(entity);
            await _context.SaveChangesAsync();

            await _context.Entry(entity).Reference(f => f.UploadedByUser).LoadAsync();

            return MapToDto(entity);
        }

        public async Task<bool> DeleteAsync(Guid taskId, Guid fileId)
        {
            var file = await _context.TaskFiles
                .FirstOrDefaultAsync(f => f.Id == fileId && f.TaskId == taskId && !f.IsDeleted);
            if (file == null) return false;

            var physicalPath = Path.Combine(_env.WebRootPath ?? "wwwroot", file.FilePath.TrimStart('/'));
            if (File.Exists(physicalPath)) File.Delete(physicalPath);

            file.IsDeleted = true;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<List<TaskFileDto>> GetFilesAsync(Guid taskId)
        {
            var files = await _context.TaskFiles
                .Where(f => f.TaskId == taskId && !f.IsDeleted)
                .Include(f => f.UploadedByUser)
                .OrderByDescending(f => f.CreatedAt)
                .ToListAsync();

            return files.Select(MapToDto).ToList();
        }

        private static TaskFileDto MapToDto(TaskFile f) => new()
        {
            Id = f.Id,
            FileName = f.FileName,
            FilePath = f.FilePath,
            FileSize = f.FileSize,
            ContentType = f.ContentType,
            UploadedAt = f.CreatedAt,
            UploadedByName = f.UploadedByUser != null
                ? $"{f.UploadedByUser.Name} {f.UploadedByUser.Surname}".Trim()
                : string.Empty,
        };
    }
}
