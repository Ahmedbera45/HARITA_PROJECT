using Harita.API.Data;
using Harita.API.DTOs;
using Harita.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Harita.API.Services;

public class ImarPlanService : IImarPlanService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public ImarPlanService(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    private string BasePath => _configuration["NetworkStorage:BasePath"] ?? @"C:\ImarArsiv";

    private static ImarPlanEkDto MapEk(ImarPlanEk e) => new()
    {
        Id = e.Id,
        DosyaAdi = e.DosyaAdi,
        DosyaYolu = e.DosyaYolu,
        DosyaTuru = e.DosyaTuru,
        Aciklama = e.Aciklama,
        EkleyenAdi = e.Ekleyen != null ? $"{e.Ekleyen.Name} {e.Ekleyen.Surname}" : null,
        EklenmeTarihi = e.CreatedAt,
    };

    private static ImarPlanDto MapPlan(ImarPlan p) => new()
    {
        Id = p.Id,
        PlanNo = p.PlanNo,
        PlanAdi = p.PlanAdi,
        PlanTuru = p.PlanTuru,
        Mahalle = p.Mahalle,
        Ada = p.Ada,
        Parsel = p.Parsel,
        YuzolcumHa = p.YuzolcumHa,
        Konu = p.Konu,
        OnayTarihi = p.OnayTarihi,
        OnayMakami = p.OnayMakami,
        Durum = p.Durum,
        Aciklama = p.Aciklama,
        CreatedByName = p.CreatedByUser != null ? $"{p.CreatedByUser.Name} {p.CreatedByUser.Surname}" : null,
        CreatedAt = p.CreatedAt,
        Ekler = p.Ekler.Where(e => !e.IsDeleted).Select(MapEk).OrderByDescending(e => e.EklenmeTarihi).ToList(),
    };

    public async Task<List<ImarPlanDto>> GetAllAsync()
    {
        var plans = await _context.ImarPlanlar
            .Where(p => !p.IsDeleted)
            .Include(p => p.CreatedByUser)
            .Include(p => p.Ekler).ThenInclude(e => e.Ekleyen)
            .OrderByDescending(p => p.OnayTarihi ?? p.CreatedAt)
            .ToListAsync();
        return plans.Select(MapPlan).ToList();
    }

    public async Task<ImarPlanDto?> GetByIdAsync(Guid id)
    {
        var plan = await _context.ImarPlanlar
            .Where(p => p.Id == id && !p.IsDeleted)
            .Include(p => p.CreatedByUser)
            .Include(p => p.Ekler).ThenInclude(e => e.Ekleyen)
            .FirstOrDefaultAsync();
        return plan == null ? null : MapPlan(plan);
    }

    public async Task<ImarPlanDto> CreateAsync(CreateImarPlanDto dto, Guid userId)
    {
        var plan = new ImarPlan
        {
            PlanNo = dto.PlanNo.Trim(),
            PlanAdi = dto.PlanAdi.Trim(),
            PlanTuru = dto.PlanTuru,
            Mahalle = dto.Mahalle?.Trim(),
            Ada = dto.Ada?.Trim(),
            Parsel = dto.Parsel?.Trim(),
            YuzolcumHa = dto.YuzolcumHa,
            Konu = dto.Konu?.Trim(),
            OnayTarihi = dto.OnayTarihi,
            OnayMakami = dto.OnayMakami,
            Durum = dto.Durum,
            Aciklama = dto.Aciklama?.Trim(),
            CreatedByUserId = userId,
            CreatedAt = DateTime.UtcNow,
        };
        _context.ImarPlanlar.Add(plan);
        await _context.SaveChangesAsync();

        await _context.Entry(plan).Reference(p => p.CreatedByUser).LoadAsync();
        return MapPlan(plan);
    }

    public async Task<ImarPlanDto> UpdateAsync(Guid id, CreateImarPlanDto dto)
    {
        var plan = await _context.ImarPlanlar
            .Include(p => p.Ekler).ThenInclude(e => e.Ekleyen)
            .Include(p => p.CreatedByUser)
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted)
            ?? throw new Exception("İmar planı bulunamadı.");

        plan.PlanNo = dto.PlanNo.Trim();
        plan.PlanAdi = dto.PlanAdi.Trim();
        plan.PlanTuru = dto.PlanTuru;
        plan.Mahalle = dto.Mahalle?.Trim();
        plan.Ada = dto.Ada?.Trim();
        plan.Parsel = dto.Parsel?.Trim();
        plan.YuzolcumHa = dto.YuzolcumHa;
        plan.Konu = dto.Konu?.Trim();
        plan.OnayTarihi = dto.OnayTarihi;
        plan.OnayMakami = dto.OnayMakami;
        plan.Durum = dto.Durum;
        plan.Aciklama = dto.Aciklama?.Trim();

        await _context.SaveChangesAsync();
        return MapPlan(plan);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var plan = await _context.ImarPlanlar.FindAsync(id);
        if (plan == null) return false;
        plan.IsDeleted = true;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<ImarPlanEkDto> AddEkAsync(Guid planId, AddImarPlanEkDto dto, Guid userId)
    {
        var plan = await _context.ImarPlanlar.FindAsync(planId)
            ?? throw new Exception("İmar planı bulunamadı.");

        var ek = new ImarPlanEk
        {
            ImarPlanId = planId,
            DosyaAdi = dto.DosyaAdi.Trim(),
            DosyaYolu = dto.DosyaYolu.Trim(),
            DosyaTuru = dto.DosyaTuru,
            Aciklama = dto.Aciklama?.Trim(),
            EkleyenId = userId,
            CreatedAt = DateTime.UtcNow,
        };
        _context.ImarPlanEkler.Add(ek);
        await _context.SaveChangesAsync();

        await _context.Entry(ek).Reference(e => e.Ekleyen).LoadAsync();
        return MapEk(ek);
    }

    public async Task<bool> DeleteEkAsync(Guid ekId)
    {
        var ek = await _context.ImarPlanEkler.FindAsync(ekId);
        if (ek == null) return false;
        ek.IsDeleted = true;
        await _context.SaveChangesAsync();
        return true;
    }

    public NetworkBrowseResultDto BrowseNetwork(string relativePath)
    {
        var basePath = BasePath;

        // Create base directory if it doesn't exist (development convenience)
        if (!Directory.Exists(basePath))
            Directory.CreateDirectory(basePath);

        var safePath = (relativePath ?? string.Empty).Trim().Trim('\\', '/');
        var fullPath = string.IsNullOrEmpty(safePath)
            ? basePath
            : Path.Combine(basePath, safePath);

        // Security: prevent path traversal
        var fullNorm = Path.GetFullPath(fullPath);
        var baseNorm = Path.GetFullPath(basePath);
        if (!fullNorm.StartsWith(baseNorm, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("Geçersiz yol.");

        if (!Directory.Exists(fullNorm))
            throw new DirectoryNotFoundException("Klasör bulunamadı: " + fullNorm);

        var dirs = Directory.GetDirectories(fullNorm)
            .Select(d => new NetworkItemDto
            {
                Name = Path.GetFileName(d),
                FullPath = Path.GetRelativePath(basePath, d).Replace('/', '\\'),
            })
            .OrderBy(d => d.Name)
            .ToList();

        var files = Directory.GetFiles(fullNorm)
            .Select(f => new NetworkItemDto
            {
                Name = Path.GetFileName(f),
                FullPath = Path.GetRelativePath(basePath, f).Replace('/', '\\'),
                Size = new FileInfo(f).Length,
            })
            .OrderBy(f => f.Name)
            .ToList();

        var relCurrent = Path.GetRelativePath(basePath, fullNorm).Replace('/', '\\');
        string? parentRel = null;
        if (!string.Equals(fullNorm, baseNorm, StringComparison.OrdinalIgnoreCase))
        {
            var parentDir = Directory.GetParent(fullNorm)?.FullName;
            if (parentDir != null)
            {
                var pRel = Path.GetRelativePath(basePath, parentDir).Replace('/', '\\');
                parentRel = pRel == "." ? "" : pRel;
            }
        }

        return new NetworkBrowseResultDto
        {
            CurrentPath = relCurrent == "." ? "" : relCurrent,
            ParentPath = parentRel,
            Directories = dirs,
            Files = files,
        };
    }

    public async Task<(byte[] content, string fileName, string contentType)> DownloadEkAsync(Guid ekId)
    {
        var ek = await _context.ImarPlanEkler.FindAsync(ekId)
            ?? throw new Exception("Ek bulunamadı.");
        if (ek.IsDeleted) throw new Exception("Ek bulunamadı.");

        var fullPath = Path.Combine(BasePath, ek.DosyaYolu);
        var fullNorm = Path.GetFullPath(fullPath);
        var baseNorm = Path.GetFullPath(BasePath);

        if (!fullNorm.StartsWith(baseNorm, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("Geçersiz yol.");

        if (!File.Exists(fullNorm)) throw new FileNotFoundException("Dosya sunucuda bulunamadı.");

        var content = await File.ReadAllBytesAsync(fullNorm);
        var ext = Path.GetExtension(ek.DosyaAdi).ToLowerInvariant();
        var contentType = ext switch
        {
            ".pdf" => "application/pdf",
            ".xlsx" or ".xls" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".docx" or ".doc" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            _ => "application/octet-stream",
        };
        return (content, ek.DosyaAdi, contentType);
    }
}
