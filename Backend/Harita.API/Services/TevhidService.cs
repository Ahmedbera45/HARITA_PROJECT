using System.Security.Claims;
using ClosedXML.Excel;
using Harita.API.Data;
using Harita.API.DTOs;
using Harita.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Harita.API.Services
{
    public class TevhidService : ITevhidService
    {
        private readonly AppDbContext _context;
        private readonly IHttpContextAccessor _accessor;

        public TevhidService(AppDbContext context, IHttpContextAccessor accessor)
        {
            _context = context;
            _accessor = accessor;
        }

        private Guid GetCurrentUserId()
        {
            var claim = _accessor.HttpContext!.User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.Parse(claim!);
        }

        private bool IsManager()
        {
            var role = _accessor.HttpContext?.User.FindFirst(ClaimTypes.Role)?.Value;
            return role == "Manager" || role == "Admin";
        }

        private static double Calc(double katsayi, double m2, decimal rayic) =>
            Math.Round(katsayi * m2 * (double)rayic, 2);

        public async Task<TevhidDto> CreateAsync(CreateTevhidDto dto)
        {
            var userId = GetCurrentUserId();
            var entity = new TevhidCalculation
            {
                ParcelId        = dto.ParcelId,
                Ada             = dto.Ada,
                ParselNo        = dto.ParselNo,
                Mahalle         = dto.Mahalle,
                EskiAda         = dto.EskiAda,
                EskiParsel      = dto.EskiParsel,
                MalikAdi        = dto.MalikAdi,
                PlanFonksiyonu  = dto.PlanFonksiyonu,
                Katsayi         = dto.Katsayi,
                RayicBedel      = dto.RayicBedel,
                ArsaM2          = dto.ArsaM2,
                TaksM2          = dto.TaksM2,
                CekmelerM2      = dto.CekmelerM2,
                ArsaHarc        = Calc(dto.Katsayi, dto.ArsaM2,     dto.RayicBedel),
                TaksHarc        = Calc(dto.Katsayi, dto.TaksM2,     dto.RayicBedel),
                CekmelerHarc    = Calc(dto.Katsayi, dto.CekmelerM2, dto.RayicBedel),
                Status          = "Bekliyor",
                Notlar          = dto.Notlar,
                CreatedByUserId = userId,
                CreatedAt       = DateTime.UtcNow
            };

            _context.TevhidCalculations.Add(entity);
            await _context.SaveChangesAsync();
            return await GetByIdAsync(entity.Id) ?? Map(entity, null, null);
        }

        public async Task<List<TevhidDto>> GetAllAsync()
        {
            var userId = GetCurrentUserId();
            var isManager = IsManager();

            var query = _context.TevhidCalculations
                .Include(t => t.CreatedByUser)
                .Include(t => t.ReviewedByUser)
                .AsQueryable();

            if (!isManager)
                query = query.Where(t => t.CreatedByUserId == userId);

            var list = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();
            return list.Select(t => Map(t, t.CreatedByUser, t.ReviewedByUser)).ToList();
        }

        public async Task<TevhidDto?> GetByIdAsync(Guid id)
        {
            var t = await _context.TevhidCalculations
                .Include(t => t.CreatedByUser)
                .Include(t => t.ReviewedByUser)
                .FirstOrDefaultAsync(t => t.Id == id);
            return t == null ? null : Map(t, t.CreatedByUser, t.ReviewedByUser);
        }

        public async Task<TevhidDto> ReviewAsync(Guid id, ReviewTevhidDto dto)
        {
            if (!IsManager()) throw new UnauthorizedAccessException("Bu işlem için yönetici yetkisi gereklidir.");

            var entity = await _context.TevhidCalculations.FindAsync(id)
                ?? throw new Exception("Hesaplama bulunamadı.");

            if (dto.Decision != "Onaylandı" && dto.Decision != "Reddedildi" && dto.Decision != "Düzeltme İstendi")
                throw new Exception("Geçersiz karar.");

            if (dto.Decision == "Onaylandı")
            {
                if (dto.OnaylananSenaryo == null || dto.OnaylananSenaryo < 1 || dto.OnaylananSenaryo > 3)
                    throw new Exception("Onay için senaryo seçimi (1, 2 veya 3) zorunludur.");

                entity.OnaylananSenaryo = dto.OnaylananSenaryo;
                entity.OnaylananHarc = dto.OnaylananSenaryo switch
                {
                    1 => entity.ArsaHarc,
                    2 => entity.TaksHarc,
                    3 => entity.CekmelerHarc,
                    _ => null
                };
            }

            entity.Status          = dto.Decision;
            entity.ReviewNote      = dto.ReviewNote;
            entity.ReviewedByUserId = GetCurrentUserId();
            entity.ReviewedAt      = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return await GetByIdAsync(id) ?? throw new Exception("Güncelleme sonrası kayıt bulunamadı.");
        }

        public async Task<TevhidDto> UpdateAsync(Guid id, UpdateTevhidDto dto)
        {
            if (!IsManager()) throw new UnauthorizedAccessException("Bu işlem için yönetici yetkisi gereklidir.");

            var entity = await _context.TevhidCalculations.FindAsync(id)
                ?? throw new Exception("Hesaplama bulunamadı.");

            entity.ParcelId     = dto.ParcelId;
            entity.Ada          = dto.Ada;
            entity.ParselNo     = dto.ParselNo;
            entity.Mahalle      = dto.Mahalle;
            entity.EskiAda      = dto.EskiAda;
            entity.EskiParsel   = dto.EskiParsel;
            entity.MalikAdi     = dto.MalikAdi;
            entity.PlanFonksiyonu = dto.PlanFonksiyonu;
            entity.Katsayi      = dto.Katsayi;
            entity.RayicBedel   = dto.RayicBedel;
            entity.ArsaM2       = dto.ArsaM2;
            entity.TaksM2       = dto.TaksM2;
            entity.CekmelerM2   = dto.CekmelerM2;
            entity.ArsaHarc     = Calc(dto.Katsayi, dto.ArsaM2,     dto.RayicBedel);
            entity.TaksHarc     = Calc(dto.Katsayi, dto.TaksM2,     dto.RayicBedel);
            entity.CekmelerHarc = Calc(dto.Katsayi, dto.CekmelerM2, dto.RayicBedel);
            entity.Notlar       = dto.Notlar;
            // Düzenleme yapılınca durumu tekrar Bekliyor'a al
            entity.Status          = "Bekliyor";
            entity.OnaylananSenaryo = null;
            entity.OnaylananHarc   = null;
            entity.ReviewedByUserId = null;
            entity.ReviewedAt      = null;
            entity.ReviewNote      = null;

            await _context.SaveChangesAsync();
            return await GetByIdAsync(id) ?? throw new Exception("Güncelleme sonrası kayıt bulunamadı.");
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            if (!IsManager()) throw new UnauthorizedAccessException("Bu işlem için yönetici yetkisi gereklidir.");
            var entity = await _context.TevhidCalculations.FindAsync(id);
            if (entity == null) return false;
            _context.TevhidCalculations.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }

        // ─── Excel Raporları ──────────────────────────────────────────

        public async Task<byte[]> ExportAllApprovedAsync()
        {
            var list = await _context.TevhidCalculations
                .Include(t => t.CreatedByUser)
                .Include(t => t.ReviewedByUser)
                .Where(t => t.Status == "Onaylandı")
                .OrderByDescending(t => t.ReviewedAt)
                .ToListAsync();

            using var wb = new XLWorkbook();
            var ws = wb.Worksheets.Add("Onaylanan Tevhid Harçları");

            var headers = new[] { "Ada", "Parsel", "Eski Ada", "Eski Parsel", "Mahalle", "Malik",
                "Onaylanan Senaryo", "Onaylanan Harç (TL)", "Katsayı", "Rayiç Bedel",
                "Oluşturan", "Onaylayan", "Onay Tarihi" };
            for (int i = 0; i < headers.Length; i++)
            {
                var cell = ws.Cell(1, i + 1);
                cell.Value = headers[i];
                cell.Style.Font.Bold = true;
                cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#1976d2");
                cell.Style.Font.FontColor = XLColor.White;
            }

            var senaryoAd = new Dictionary<int, string> { { 1, "S1-Arsa" }, { 2, "S2-TAKS" }, { 3, "S3-Çekmeler" } };
            for (int i = 0; i < list.Count; i++)
            {
                var t = list[i]; var r = i + 2;
                ws.Cell(r, 1).Value  = t.Ada;
                ws.Cell(r, 2).Value  = t.ParselNo;
                ws.Cell(r, 3).Value  = t.EskiAda ?? "";
                ws.Cell(r, 4).Value  = t.EskiParsel ?? "";
                ws.Cell(r, 5).Value  = t.Mahalle;
                ws.Cell(r, 6).Value  = t.MalikAdi ?? "";
                ws.Cell(r, 7).Value  = t.OnaylananSenaryo.HasValue ? senaryoAd.GetValueOrDefault(t.OnaylananSenaryo.Value, "") : "";
                ws.Cell(r, 8).Value  = t.OnaylananHarc ?? 0;
                ws.Cell(r, 9).Value  = t.Katsayi;
                ws.Cell(r, 10).Value = (double)t.RayicBedel;
                ws.Cell(r, 11).Value = t.CreatedByUser != null ? $"{t.CreatedByUser.Name} {t.CreatedByUser.Surname}" : "";
                ws.Cell(r, 12).Value = t.ReviewedByUser != null ? $"{t.ReviewedByUser.Name} {t.ReviewedByUser.Surname}" : "";
                ws.Cell(r, 13).Value = t.ReviewedAt?.ToLocalTime().ToString("dd.MM.yyyy HH:mm") ?? "";
            }
            ws.Columns().AdjustToContents();
            using var ms = new MemoryStream();
            wb.SaveAs(ms);
            return ms.ToArray();
        }

        public async Task<byte[]> ExportScenariosAsync(Guid id)
        {
            var t = await _context.TevhidCalculations
                .Include(t => t.CreatedByUser)
                .FirstOrDefaultAsync(t => t.Id == id)
                ?? throw new Exception("Hesaplama bulunamadı.");

            using var wb = new XLWorkbook();
            var ws = wb.Worksheets.Add("3 Senaryo");

            // Parsel başlığı
            ws.Cell(1, 1).Value = "Ada"; ws.Cell(1, 2).Value = t.Ada;
            ws.Cell(2, 1).Value = "Parsel"; ws.Cell(2, 2).Value = t.ParselNo;
            ws.Cell(3, 1).Value = "Mahalle"; ws.Cell(3, 2).Value = t.Mahalle;
            ws.Cell(4, 1).Value = "Malik"; ws.Cell(4, 2).Value = t.MalikAdi ?? "";
            ws.Cell(5, 1).Value = "Katsayı"; ws.Cell(5, 2).Value = t.Katsayi;
            ws.Cell(6, 1).Value = "Rayiç Bedel (TL/m²)"; ws.Cell(6, 2).Value = (double)t.RayicBedel;
            ws.Cell(7, 1).Value = "Oluşturan"; ws.Cell(7, 2).Value = t.CreatedByUser != null ? $"{t.CreatedByUser.Name} {t.CreatedByUser.Surname}" : "";

            // Tablo başlığı
            ws.Cell(9, 1).Value = "Senaryo"; ws.Cell(9, 2).Value = "Alan (m²)"; ws.Cell(9, 3).Value = "Hesaplanan Harç (TL)";
            new[] { ws.Cell(9, 1), ws.Cell(9, 2), ws.Cell(9, 3) }.ToList()
                .ForEach(c => { c.Style.Font.Bold = true; c.Style.Fill.BackgroundColor = XLColor.LightBlue; });

            ws.Cell(10, 1).Value = "Senaryo 1 — Arsa m²";    ws.Cell(10, 2).Value = t.ArsaM2;    ws.Cell(10, 3).Value = t.ArsaHarc;
            ws.Cell(11, 1).Value = "Senaryo 2 — TAKS m²";    ws.Cell(11, 2).Value = t.TaksM2;    ws.Cell(11, 3).Value = t.TaksHarc;
            ws.Cell(12, 1).Value = "Senaryo 3 — Çekmeler m²"; ws.Cell(12, 2).Value = t.CekmelerM2; ws.Cell(12, 3).Value = t.CekmelerHarc;

            if (t.OnaylananSenaryo.HasValue)
            {
                ws.Cell(14, 1).Value = "ONAYLANAN SENARYO"; ws.Cell(14, 2).Value = t.OnaylananSenaryo;
                ws.Cell(15, 1).Value = "ONAYLANAN HARÇ (TL)"; ws.Cell(15, 2).Value = t.OnaylananHarc ?? 0;
                new[] { ws.Cell(14, 1), ws.Cell(15, 1) }.ToList().ForEach(c => c.Style.Font.Bold = true);
            }

            ws.Columns().AdjustToContents();
            using var ms = new MemoryStream();
            wb.SaveAs(ms);
            return ms.ToArray();
        }

        public async Task<byte[]> ExportApprovedAsync(Guid id)
        {
            var t = await _context.TevhidCalculations
                .Include(t => t.CreatedByUser)
                .Include(t => t.ReviewedByUser)
                .FirstOrDefaultAsync(t => t.Id == id)
                ?? throw new Exception("Hesaplama bulunamadı.");

            if (t.Status != "Onaylandı") throw new Exception("Bu hesaplama henüz onaylanmamış.");

            using var wb = new XLWorkbook();
            var ws = wb.Worksheets.Add("Onaylanan Harç");

            void AddRow(int row, string label, string value)
            {
                ws.Cell(row, 1).Value = label;
                ws.Cell(row, 2).Value = value;
                ws.Cell(row, 1).Style.Font.Bold = true;
            }

            var senaryoAd = new Dictionary<int, string> { { 1, "Senaryo 1 — Arsa m²" }, { 2, "Senaryo 2 — TAKS m²" }, { 3, "Senaryo 3 — Çekmeler m²" } };

            AddRow(1,  "Ada",                 t.Ada);
            AddRow(2,  "Parsel",              t.ParselNo);
            AddRow(3,  "Eski Ada",            t.EskiAda ?? "");
            AddRow(4,  "Eski Parsel",         t.EskiParsel ?? "");
            AddRow(5,  "Mahalle",             t.Mahalle);
            AddRow(6,  "Malik Adı",           t.MalikAdi ?? "");
            AddRow(7,  "Katsayı",             t.Katsayi.ToString());
            AddRow(8,  "Rayiç Bedel (TL/m²)", t.RayicBedel.ToString());
            AddRow(9,  "Onaylanan Senaryo",   t.OnaylananSenaryo.HasValue ? senaryoAd.GetValueOrDefault(t.OnaylananSenaryo.Value, "") : "");
            AddRow(10, "Onaylanan Harç (TL)", (t.OnaylananHarc ?? 0).ToString("F2"));
            AddRow(11, "Oluşturan",           t.CreatedByUser != null ? $"{t.CreatedByUser.Name} {t.CreatedByUser.Surname}" : "");
            AddRow(12, "Onaylayan",           t.ReviewedByUser != null ? $"{t.ReviewedByUser.Name} {t.ReviewedByUser.Surname}" : "");
            AddRow(13, "Onay Tarihi",         t.ReviewedAt?.ToLocalTime().ToString("dd.MM.yyyy HH:mm") ?? "");
            if (!string.IsNullOrEmpty(t.ReviewNote)) AddRow(14, "Not", t.ReviewNote);

            ws.Columns().AdjustToContents();
            using var ms = new MemoryStream();
            wb.SaveAs(ms);
            return ms.ToArray();
        }

        // ─── Mapper ──────────────────────────────────────────────────

        private static TevhidDto Map(TevhidCalculation t, User? creator, User? reviewer) => new()
        {
            Id                  = t.Id,
            ParcelId            = t.ParcelId,
            Ada                 = t.Ada,
            ParselNo            = t.ParselNo,
            Mahalle             = t.Mahalle,
            EskiAda             = t.EskiAda,
            EskiParsel          = t.EskiParsel,
            MalikAdi            = t.MalikAdi,
            PlanFonksiyonu      = t.PlanFonksiyonu,
            Katsayi             = t.Katsayi,
            RayicBedel          = t.RayicBedel,
            ArsaM2              = t.ArsaM2,
            ArsaHarc            = t.ArsaHarc,
            TaksM2              = t.TaksM2,
            TaksHarc            = t.TaksHarc,
            CekmelerM2          = t.CekmelerM2,
            CekmelerHarc        = t.CekmelerHarc,
            Status              = t.Status,
            OnaylananSenaryo    = t.OnaylananSenaryo,
            OnaylananHarc       = t.OnaylananHarc,
            ReviewNote          = t.ReviewNote,
            ReviewedBy          = reviewer != null ? $"{reviewer.Name} {reviewer.Surname}" : null,
            ReviewedByUserId    = t.ReviewedByUserId,
            ReviewedAt          = t.ReviewedAt,
            OlusturanKullanici  = creator != null ? $"{creator.Name} {creator.Surname}" : "",
            CreatedByUserId     = t.CreatedByUserId,
            CreatedAt           = t.CreatedAt,
            Notlar              = t.Notlar
        };
    }
}
