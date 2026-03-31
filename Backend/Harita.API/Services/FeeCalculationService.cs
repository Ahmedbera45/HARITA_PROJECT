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

        // Ruhsat türüne göre birim harç tablosu (TL/m²)
        // 2024 yılı Çayırova Belediyesi tarife cetveli (örnek)
        public static readonly Dictionary<string, (double BirimHarc, string Aciklama)> HarcTablosu =
            new(StringComparer.OrdinalIgnoreCase)
        {
            ["Yeni Yapı Ruhsatı"]      = (8.50,  "Yeni inşaat yapı ruhsatı harcı (TL/m²)"),
            ["Tadilat Ruhsatı"]        = (4.00,  "Tadilat / onarım ruhsatı harcı (TL/m²)"),
            ["Yıkım Ruhsatı"]          = (2.50,  "Yıkım ruhsatı harcı (TL/m²)"),
            ["İstinat Duvarı Ruhsatı"] = (3.50,  "İstinat duvarı ruhsatı harcı (TL/m²)"),
            ["Kat İrtifakı"]           = (5.00,  "Kat irtifakı tesis harcı (TL/m²)"),
            ["Yapı Kullanma İzni"]     = (6.00,  "Yapı kullanma izin belgesi harcı (TL/m²)"),
            ["Ruhsat Yenileme"]        = (2.00,  "Ruhsat yenileme / uzatma harcı (TL/m²)"),
        };

        public FeeCalculationService(AppDbContext context, IHttpContextAccessor accessor)
        {
            _context = context;
            _accessor = accessor;
        }

        public List<FeeRateDto> GetFeeRates()
        {
            return HarcTablosu
                .Select(kv => new FeeRateDto
                {
                    RuhsatTuru = kv.Key,
                    BirimHarc  = kv.Value.BirimHarc,
                    Aciklama   = kv.Value.Aciklama
                })
                .ToList();
        }

        public async Task<FeeCalculationDto> CalculateAsync(CreateFeeCalculationDto dto)
        {
            if (!HarcTablosu.TryGetValue(dto.RuhsatTuru, out var rate))
                throw new Exception($"Geçersiz ruhsat türü: {dto.RuhsatTuru}");

            if (dto.AlanM2 <= 0)
                throw new Exception("Alan değeri sıfırdan büyük olmalıdır.");

            var userId = Guid.Parse(_accessor.HttpContext!.User
                .FindFirstValue(ClaimTypes.NameIdentifier)!);

            var entity = new FeeCalculation
            {
                UserId     = userId,
                RuhsatTuru = dto.RuhsatTuru,
                AlanM2     = dto.AlanM2,
                BirimHarc  = rate.BirimHarc,
                ToplamHarc = Math.Round(dto.AlanM2 * rate.BirimHarc, 2),
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
            return MapToDto(entity, $"{user?.Name} {user?.Surname}".Trim());
        }

        public async Task<List<FeeCalculationDto>> GetAllAsync()
        {
            return await _context.FeeCalculations
                .Include(f => f.User)
                .OrderByDescending(f => f.CreatedAt)
                .Select(f => new FeeCalculationDto
                {
                    Id                   = f.Id,
                    RuhsatTuru           = f.RuhsatTuru,
                    AlanM2               = f.AlanM2,
                    BirimHarc            = f.BirimHarc,
                    ToplamHarc           = f.ToplamHarc,
                    Ada                  = f.Ada,
                    Parsel               = f.Parsel,
                    Mahalle              = f.Mahalle,
                    MalikAdi             = f.MalikAdi,
                    Notlar               = f.Notlar,
                    HesaplayanKullanici  = f.User.Name + " " + f.User.Surname,
                    HesaplamaTarihi      = f.CreatedAt
                })
                .ToListAsync();
        }

        public async Task<FeeCalculationDto?> GetByIdAsync(Guid id)
        {
            var f = await _context.FeeCalculations
                .Include(f => f.User)
                .FirstOrDefaultAsync(f => f.Id == id);

            if (f == null) return null;
            return MapToDto(f, $"{f.User.Name} {f.User.Surname}".Trim());
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var entity = await _context.FeeCalculations.FindAsync(id);
            if (entity == null) return false;

            _context.FeeCalculations.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }

        private static FeeCalculationDto MapToDto(FeeCalculation f, string kullanici) => new()
        {
            Id                  = f.Id,
            RuhsatTuru          = f.RuhsatTuru,
            AlanM2              = f.AlanM2,
            BirimHarc           = f.BirimHarc,
            ToplamHarc          = f.ToplamHarc,
            Ada                 = f.Ada,
            Parsel              = f.Parsel,
            Mahalle             = f.Mahalle,
            MalikAdi            = f.MalikAdi,
            Notlar              = f.Notlar,
            HesaplayanKullanici = kullanici,
            HesaplamaTarihi     = f.CreatedAt
        };
    }
}
