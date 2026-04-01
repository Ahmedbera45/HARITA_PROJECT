using System.Security.Claims;
using System.Text.Json;
using ClosedXML.Excel;
using Harita.API.Data;
using Harita.API.DTOs;
using Harita.API.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Harita.API.Services
{
    public class ImportService : IImportService
    {
        private readonly AppDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;

        // Beklenen Excel sütun başlıkları (büyük-küçük harf duyarsız)
        private static readonly string[] RequiredColumns = { "Ada", "Parsel", "Mahalle" };

        public ImportService(AppDbContext context, IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
        }

        private Guid GetCurrentUserId()
        {
            var claim = _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier);
            if (claim == null) throw new UnauthorizedAccessException("Kullanıcı bulunamadı.");
            return Guid.Parse(claim.Value);
        }

        public async Task<ImportResultDto> ImportParcelsFromExcelAsync(IFormFile file)
        {
            if (file == null || file.Length == 0)
                throw new Exception("Dosya boş veya seçilmemiş.");

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (ext != ".xlsx" && ext != ".xls")
                throw new Exception("Sadece .xlsx veya .xls dosyaları kabul edilmektedir.");

            var batchId = Guid.NewGuid().ToString("N")[..12].ToUpper();
            var errors = new List<string>();
            var parcels = new List<Parcel>();

            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);
            stream.Position = 0;

            using var workbook = new XLWorkbook(stream);
            var sheet = workbook.Worksheets.First();

            // Başlık satırını bul ve sütun indexlerini belirle
            var headerRow = sheet.Row(1);
            var colMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            foreach (var cell in headerRow.CellsUsed())
            {
                var header = cell.GetString().Trim();
                if (!string.IsNullOrEmpty(header))
                    colMap[header] = cell.Address.ColumnNumber;
            }

            // Zorunlu sütun kontrolü
            foreach (var req in RequiredColumns)
            {
                if (!colMap.ContainsKey(req))
                    throw new Exception($"Zorunlu sütun bulunamadı: '{req}'. Beklenen başlıklar: Ada, Parsel, Mahalle");
            }

            int GetColIdx(string name) => colMap.TryGetValue(name, out var idx) ? idx : -1;

            var lastRow = sheet.LastRowUsed()?.RowNumber() ?? 1;

            for (int row = 2; row <= lastRow; row++)
            {
                var r = sheet.Row(row);

                // Tamamen boş satırı atla
                if (r.IsEmpty()) continue;

                var ada    = r.Cell(colMap["Ada"]).GetString().Trim();
                var parsel = r.Cell(colMap["Parsel"]).GetString().Trim();
                var mah    = r.Cell(colMap["Mahalle"]).GetString().Trim();

                if (string.IsNullOrWhiteSpace(ada) || string.IsNullOrWhiteSpace(parsel) || string.IsNullOrWhiteSpace(mah))
                {
                    errors.Add($"Satır {row}: Ada, Parsel ve Mahalle alanları zorunludur.");
                    continue;
                }

                double? alan = null;
                var alanIdx = GetColIdx("Alan");
                if (alanIdx > 0)
                {
                    var alanVal = r.Cell(alanIdx).GetString().Trim().Replace(',', '.');
                    if (!string.IsNullOrEmpty(alanVal) && double.TryParse(alanVal, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var parsed))
                        alan = parsed;
                }

                decimal? rayicBedel = null;
                var rayicIdx = GetColIdx("RayicBedel");
                if (rayicIdx > 0)
                {
                    var rayicVal = r.Cell(rayicIdx).GetString().Trim().Replace(',', '.');
                    if (!string.IsNullOrEmpty(rayicVal) && decimal.TryParse(rayicVal, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var parsedRayic))
                        rayicBedel = parsedRayic;
                }

                parcels.Add(new Parcel
                {
                    Ada           = ada,
                    Parsel        = parsel,
                    Mahalle       = mah,
                    Mevkii        = GetColIdx("Mevkii") > 0 ? r.Cell(GetColIdx("Mevkii")).GetString().Trim() : null,
                    Alan          = alan,
                    Nitelik       = GetColIdx("Nitelik") > 0 ? r.Cell(GetColIdx("Nitelik")).GetString().Trim() : null,
                    MalikAdi      = GetColIdx("MalikAdi") > 0 ? r.Cell(GetColIdx("MalikAdi")).GetString().Trim() : null,
                    PaftaNo       = GetColIdx("PaftaNo") > 0 ? r.Cell(GetColIdx("PaftaNo")).GetString().Trim() : null,
                    RayicBedel    = rayicBedel,
                    YolGenisligi  = GetColIdx("YolGenisligi") > 0 ? r.Cell(GetColIdx("YolGenisligi")).GetString().Trim() : null,
                    ImportBatchId = batchId
                });
            }

            if (parcels.Count > 0)
            {
                _context.Parcels.AddRange(parcels);
            }

            var log = new ImportLog
            {
                BatchId           = batchId,
                FileName          = file.FileName,
                TotalRows         = parcels.Count + errors.Count,
                SuccessRows       = parcels.Count,
                ErrorRows         = errors.Count,
                ErrorDetails      = errors.Count > 0 ? JsonSerializer.Serialize(errors) : null,
                ImportedByUserId  = GetCurrentUserId()
            };
            _context.ImportLogs.Add(log);
            await _context.SaveChangesAsync();

            return new ImportResultDto
            {
                BatchId     = batchId,
                FileName    = file.FileName,
                TotalRows   = log.TotalRows,
                SuccessRows = log.SuccessRows,
                ErrorRows   = log.ErrorRows,
                Errors      = errors
            };
        }

        public async Task<List<ImportLogDto>> GetImportLogsAsync()
        {
            return await _context.ImportLogs
                .Include(l => l.ImportedByUser)
                .OrderByDescending(l => l.CreatedAt)
                .Select(l => new ImportLogDto
                {
                    Id          = l.Id,
                    BatchId     = l.BatchId,
                    FileName    = l.FileName,
                    TotalRows   = l.TotalRows,
                    SuccessRows = l.SuccessRows,
                    ErrorRows   = l.ErrorRows,
                    ImportedBy  = l.ImportedByUser != null ? l.ImportedByUser.Name + " " + l.ImportedByUser.Surname : "—",
                    CreatedAt   = l.CreatedAt
                })
                .ToListAsync();
        }

        public async Task<List<ParcelDto>> GetParcelsAsync(string? batchId = null, string? mahalle = null)
        {
            var q = _context.Parcels.AsQueryable();

            if (!string.IsNullOrWhiteSpace(batchId))
                q = q.Where(p => p.ImportBatchId == batchId);

            if (!string.IsNullOrWhiteSpace(mahalle))
                q = q.Where(p => p.Mahalle.Contains(mahalle));

            return await q
                .OrderBy(p => p.Mahalle).ThenBy(p => p.Ada).ThenBy(p => p.Parsel)
                .Select(p => new ParcelDto
                {
                    Id            = p.Id,
                    Ada           = p.Ada,
                    Parsel        = p.Parsel,
                    Mahalle       = p.Mahalle,
                    Mevkii        = p.Mevkii,
                    Alan          = p.Alan,
                    Nitelik       = p.Nitelik,
                    MalikAdi      = p.MalikAdi,
                    PaftaNo       = p.PaftaNo,
                    RayicBedel    = p.RayicBedel,
                    YolGenisligi  = p.YolGenisligi,
                    ImportBatchId = p.ImportBatchId
                })
                .ToListAsync();
        }

        public async Task<ParcelDto> UpdateParcelAsync(Guid id, UpdateParcelDto dto)
        {
            var parcel = await _context.Parcels.FindAsync(id)
                ?? throw new Exception("Parsel bulunamadı.");

            parcel.Ada          = dto.Ada;
            parcel.Parsel       = dto.Parsel;
            parcel.Mahalle      = dto.Mahalle;
            parcel.Mevkii       = dto.Mevkii;
            parcel.Alan         = dto.Alan;
            parcel.Nitelik      = dto.Nitelik;
            parcel.MalikAdi     = dto.MalikAdi;
            parcel.PaftaNo      = dto.PaftaNo;
            parcel.RayicBedel   = dto.RayicBedel;
            parcel.YolGenisligi = dto.YolGenisligi;

            await _context.SaveChangesAsync();

            return new ParcelDto
            {
                Id            = parcel.Id,
                Ada           = parcel.Ada,
                Parsel        = parcel.Parsel,
                Mahalle       = parcel.Mahalle,
                Mevkii        = parcel.Mevkii,
                Alan          = parcel.Alan,
                Nitelik       = parcel.Nitelik,
                MalikAdi      = parcel.MalikAdi,
                PaftaNo       = parcel.PaftaNo,
                RayicBedel    = parcel.RayicBedel,
                YolGenisligi  = parcel.YolGenisligi,
                ImportBatchId = parcel.ImportBatchId
            };
        }
    }
}
