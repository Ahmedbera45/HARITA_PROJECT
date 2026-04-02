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
                .Where(r => !r.IsDeleted)
                .OrderBy(r => r.SiraNo).ThenBy(r => r.RuhsatTuru)
                .Select(r => new FeeRateDto
                {
                    Id         = r.Id,
                    RuhsatTuru = r.RuhsatTuru,
                    BirimHarc  = r.BirimHarc,
                    Katsayi    = r.Katsayi,
                    Aciklama   = r.Aciklama,
                    IsActive   = r.IsActive,
                    SiraNo     = r.SiraNo
                })
                .ToListAsync();
        }

        public async Task<FeeRateDto> CreateFeeRateAsync(CreateFeeRateDto dto)
        {
            if (await _context.FeeRates.AnyAsync(r => r.RuhsatTuru == dto.RuhsatTuru && !r.IsDeleted))
                throw new Exception("Bu ruhsat türü zaten mevcut.");

            var rate = new FeeRate
            {
                RuhsatTuru = dto.RuhsatTuru,
                BirimHarc  = dto.BirimHarc,
                Katsayi    = dto.Katsayi,
                Aciklama   = dto.Aciklama,
                IsActive   = true,
                SiraNo     = dto.SiraNo
            };
            _context.FeeRates.Add(rate);
            await _context.SaveChangesAsync();

            return new FeeRateDto { Id = rate.Id, RuhsatTuru = rate.RuhsatTuru, BirimHarc = rate.BirimHarc, Katsayi = rate.Katsayi, Aciklama = rate.Aciklama, IsActive = rate.IsActive, SiraNo = rate.SiraNo };
        }

        public async Task<FeeRateDto> UpdateFeeRateAsync(Guid id, UpdateFeeRateDto dto)
        {
            var rate = await _context.FeeRates.FindAsync(id)
                ?? throw new Exception("Harç kalemi bulunamadı.");

            rate.RuhsatTuru = dto.RuhsatTuru;
            rate.BirimHarc  = dto.BirimHarc;
            rate.Katsayi    = dto.Katsayi;
            rate.Aciklama   = dto.Aciklama;
            rate.IsActive   = dto.IsActive;
            rate.SiraNo     = dto.SiraNo;
            await _context.SaveChangesAsync();

            return new FeeRateDto { Id = rate.Id, RuhsatTuru = rate.RuhsatTuru, BirimHarc = rate.BirimHarc, Katsayi = rate.Katsayi, Aciklama = rate.Aciklama, IsActive = rate.IsActive, SiraNo = rate.SiraNo };
        }

        public async Task<bool> DeleteFeeRateAsync(Guid id)
        {
            var rate = await _context.FeeRates.FindAsync(id);
            if (rate == null) return false;
            rate.IsDeleted = true;
            await _context.SaveChangesAsync();
            return true;
        }

        // ─── Harç Hesaplama ─────────────────────────────────────────────────

        public async Task<FeeCalculationDto> CalculateAsync(CreateFeeCalculationDto dto)
        {
            var rate = await _context.FeeRates
                .FirstOrDefaultAsync(r => r.RuhsatTuru == dto.RuhsatTuru && r.IsActive && !r.IsDeleted)
                ?? throw new Exception($"Geçersiz veya pasif ruhsat türü: {dto.RuhsatTuru}");

            if (dto.AlanM2 <= 0)
                throw new Exception("Alan değeri sıfırdan büyük olmalıdır.");

            var userId = GetCurrentUserId();
            var carpan = rate.Katsayi.HasValue ? rate.Katsayi.Value : 1.0;
            var entity = new FeeCalculation
            {
                UserId     = userId,
                RuhsatTuru = dto.RuhsatTuru,
                AlanM2     = dto.AlanM2,
                BirimHarc  = rate.BirimHarc,
                ToplamHarc = Math.Round(dto.AlanM2 * rate.BirimHarc * carpan, 2),
                Ada        = dto.Ada,
                Parsel     = dto.Parsel,
                Mahalle    = dto.Mahalle,
                MalikAdi   = dto.MalikAdi,
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
            RuhsatTuru               = f.RuhsatTuru,
            AlanM2                   = f.AlanM2,
            BirimHarc                = f.BirimHarc,
            ToplamHarc               = f.ToplamHarc,
            Ada                      = f.Ada,
            Parsel                   = f.Parsel,
            Mahalle                  = f.Mahalle,
            MalikAdi                 = f.MalikAdi,
            Notlar                   = f.Notlar,
            HesaplayanKullaniciId    = f.UserId,
            HesaplayanKullanici      = user != null ? $"{user.Name} {user.Surname}" : "",
            HesaplamaTarihi          = f.CreatedAt
        };
    }
}
