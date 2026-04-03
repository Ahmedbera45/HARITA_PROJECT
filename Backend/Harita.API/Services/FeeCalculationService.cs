using System.Security.Claims;
using Harita.API.Data;
using Harita.API.DTOs;
using Harita.API.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Harita.API.Services
{
    public class FeeCalculationService : IFeeCalculationService
    {
        private readonly AppDbContext _context;
        private readonly IHttpContextAccessor _accessor;

        public FeeCalculationService(AppDbContext context, IHttpContextAccessor accessor)
        {
            _context = context;
            _accessor = accessor;
        }

        private Guid GetCurrentUserId()
        {
            var claim = _accessor.HttpContext!.User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.Parse(claim!);
        }

        // ─── Harç Kalemleri (DB) ────────────────────────────────────────────

        public async Task<List<FeeRateDto>> GetFeeRatesAsync()
        {
            return await _context.FeeRates
                .Include(r => r.Category)
                .Where(r => !r.IsDeleted)
                .OrderBy(r => r.Category != null ? r.Category.SiraNo : int.MaxValue)
                .ThenBy(r => r.SiraNo).ThenBy(r => r.HarcTuru)
                .Select(r => new FeeRateDto
                {
                    Id           = r.Id,
                    CategoryId   = r.CategoryId,
                    CategoryName = r.Category != null ? r.Category.Name : null,
                    HarcTuru     = r.HarcTuru,
                    BirimHarc    = r.BirimHarc,
                    Katsayi      = r.Katsayi,
                    Aciklama     = r.Aciklama,
                    IsActive     = r.IsActive,
                    SiraNo       = r.SiraNo
                })
                .ToListAsync();
        }

        public async Task<FeeRateDto> CreateFeeRateAsync(CreateFeeRateDto dto)
        {
            if (await _context.FeeRates.AnyAsync(r => r.HarcTuru == dto.HarcTuru && !r.IsDeleted))
                throw new Exception("Bu harç türü zaten mevcut.");

            var rate = new FeeRate
            {
                CategoryId = dto.CategoryId,
                HarcTuru   = dto.HarcTuru,
                BirimHarc  = dto.BirimHarc,
                Katsayi    = dto.Katsayi,
                Aciklama   = dto.Aciklama,
                IsActive   = true,
                SiraNo     = dto.SiraNo
            };
            _context.FeeRates.Add(rate);
            await _context.SaveChangesAsync();
            await _context.Entry(rate).Reference(r => r.Category).LoadAsync();
            return MapRateToDto(rate);
        }

        public async Task<FeeRateDto> UpdateFeeRateAsync(Guid id, UpdateFeeRateDto dto)
        {
            var rate = await _context.FeeRates.FindAsync(id)
                ?? throw new Exception("Harç kalemi bulunamadı.");

            rate.CategoryId = dto.CategoryId;
            rate.HarcTuru   = dto.HarcTuru;
            rate.BirimHarc  = dto.BirimHarc;
            rate.Katsayi    = dto.Katsayi;
            rate.Aciklama   = dto.Aciklama;
            rate.IsActive   = dto.IsActive;
            rate.SiraNo     = dto.SiraNo;
            await _context.SaveChangesAsync();
            await _context.Entry(rate).Reference(r => r.Category).LoadAsync();
            return MapRateToDto(rate);
        }

        public async Task<bool> DeleteFeeRateAsync(Guid id)
        {
            var rate = await _context.FeeRates.FindAsync(id);
            if (rate == null) return false;
            rate.IsDeleted = true;
            await _context.SaveChangesAsync();
            return true;
        }

        // ─── Harç Kategorileri ──────────────────────────────────────────────

        public async Task<List<FeeCategoryDto>> GetCategoriesAsync()
        {
            return await _context.FeeCategories
                .Where(c => !c.IsDeleted)
                .OrderBy(c => c.SiraNo).ThenBy(c => c.Name)
                .Select(c => new FeeCategoryDto { Id = c.Id, Name = c.Name, Description = c.Description, SiraNo = c.SiraNo })
                .ToListAsync();
        }

        public async Task<FeeCategoryDto> CreateCategoryAsync(CreateFeeCategoryDto dto)
        {
            var cat = new FeeCategory { Name = dto.Name, Description = dto.Description, SiraNo = dto.SiraNo };
            _context.FeeCategories.Add(cat);
            await _context.SaveChangesAsync();
            return new FeeCategoryDto { Id = cat.Id, Name = cat.Name, Description = cat.Description, SiraNo = cat.SiraNo };
        }

        public async Task<FeeCategoryDto> UpdateCategoryAsync(Guid id, CreateFeeCategoryDto dto)
        {
            var cat = await _context.FeeCategories.FindAsync(id)
                ?? throw new Exception("Kategori bulunamadı.");
            cat.Name = dto.Name;
            cat.Description = dto.Description;
            cat.SiraNo = dto.SiraNo;
            await _context.SaveChangesAsync();
            return new FeeCategoryDto { Id = cat.Id, Name = cat.Name, Description = cat.Description, SiraNo = cat.SiraNo };
        }

        public async Task<bool> DeleteCategoryAsync(Guid id)
        {
            var cat = await _context.FeeCategories.FindAsync(id);
            if (cat == null) return false;
            cat.IsDeleted = true;
            await _context.SaveChangesAsync();
            return true;
        }

        private static FeeRateDto MapRateToDto(FeeRate r) => new()
        {
            Id           = r.Id,
            CategoryId   = r.CategoryId,
            CategoryName = r.Category?.Name,
            HarcTuru     = r.HarcTuru,
            BirimHarc    = r.BirimHarc,
            Katsayi      = r.Katsayi,
            Aciklama     = r.Aciklama,
            IsActive     = r.IsActive,
            SiraNo       = r.SiraNo
        };

        // ─── Harç Hesaplama ─────────────────────────────────────────────────

        public async Task<FeeCalculationDto> CalculateAsync(CreateFeeCalculationDto dto)
        {
            var rate = await _context.FeeRates
                .FirstOrDefaultAsync(r => r.HarcTuru == dto.HarcTuru && r.IsActive && !r.IsDeleted)
                ?? throw new Exception($"Geçersiz veya pasif ruhsat türü: {dto.HarcTuru}");

            if (dto.AlanM2 <= 0)
                throw new Exception("Alan değeri sıfırdan büyük olmalıdır.");

            var userId = GetCurrentUserId();
            var carpan = rate.Katsayi.HasValue ? rate.Katsayi.Value : 1.0;
            var entity = new FeeCalculation
            {
                UserId     = userId,
                HarcTuru = dto.HarcTuru,
                AlanM2     = dto.AlanM2,
                BirimHarc  = rate.BirimHarc,
                ToplamHarc = Math.Round(dto.AlanM2 * rate.BirimHarc * carpan, 2),
                Ada        = dto.Ada,
                Parsel     = dto.Parsel,
                Mahalle    = dto.Mahalle,
                MalikAdi   = dto.MalikAdi,
                PlanFonksiyonu = dto.PlanFonksiyonu,
                Notlar     = dto.Notlar,
                CreatedAt  = DateTime.UtcNow
            };

            _context.FeeCalculations.Add(entity);
            await _context.SaveChangesAsync();

            var user = await _context.Users.FindAsync(userId);
            return MapToDto(entity, user);
        }

        public async Task<List<FeeCalculationDto>> GetAllAsync()
        {
            var list = await _context.FeeCalculations
                .Include(f => f.User)
                .OrderByDescending(f => f.CreatedAt)
                .ToListAsync();
            return list.Select(f => MapToDto(f, f.User)).ToList();
        }

        public async Task<FeeCalculationDto?> GetByIdAsync(Guid id)
        {
            var f = await _context.FeeCalculations
                .Include(f => f.User)
                .FirstOrDefaultAsync(f => f.Id == id);

            return f == null ? null : MapToDto(f, f.User);
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var entity = await _context.FeeCalculations.FindAsync(id);
            if (entity == null) return false;
            _context.FeeCalculations.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }

        private static FeeCalculationDto MapToDto(FeeCalculation f, User? user) => new()
        {
            Id                       = f.Id,
            HarcTuru               = f.HarcTuru,
            AlanM2                   = f.AlanM2,
            BirimHarc                = f.BirimHarc,
            ToplamHarc               = f.ToplamHarc,
            Ada                      = f.Ada,
            Parsel                   = f.Parsel,
            Mahalle                  = f.Mahalle,
            MalikAdi                 = f.MalikAdi,
            PlanFonksiyonu           = f.PlanFonksiyonu,
            Notlar                   = f.Notlar,
            HesaplayanKullaniciId    = f.UserId,
            HesaplayanKullanici      = user != null ? $"{user.Name} {user.Surname}" : "",
            HesaplamaTarihi          = f.CreatedAt
        };
    }
}
