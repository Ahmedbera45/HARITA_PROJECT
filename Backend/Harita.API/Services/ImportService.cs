using System.IO.Compression;
using System.Security.Claims;
using System.Text.Json;
using ClosedXML.Excel;
using Harita.API.Data;
using Harita.API.DTOs;
using Harita.API.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.IO;

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

            // Özel alanları yükle (ExtraData için)
            var customFields = await _context.ParcelCustomFields
                .Where(f => f.IsActive && !f.IsDeleted)
                .ToListAsync();

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

                string? OptStr(string col) { var idx = GetColIdx(col); if (idx <= 0) return null; var v = r.Cell(idx).GetString().Trim(); return string.IsNullOrEmpty(v) ? null : v; }

                // Özel alanları ExtraData JSON'una yaz
                string? extraData = null;
                var extraDict = new Dictionary<string, string>();
                foreach (var cf in customFields)
                {
                    var val = OptStr(cf.FieldKey);
                    if (val != null) extraDict[cf.FieldKey] = val;
                }
                if (extraDict.Count > 0)
                    extraData = JsonSerializer.Serialize(extraDict);

                parcels.Add(new Parcel
                {
                    Ada             = ada,
                    Parsel          = parsel,
                    Mahalle         = mah,
                    Mevkii          = OptStr("Mevkii"),
                    Alan            = alan,
                    Nitelik         = OptStr("Nitelik"),
                    MalikAdi        = OptStr("MalikAdi"),
                    PaftaNo         = OptStr("PaftaNo"),
                    RayicBedel      = rayicBedel,
                    YolGenisligi    = OptStr("YolGenisligi"),
                    EskiAda         = OptStr("EskiAda"),
                    EskiParsel      = OptStr("EskiParsel"),
                    PlanFonksiyonu  = OptStr("PlanFonksiyonu"),
                    ExtraData       = extraData,
                    ImportBatchId   = batchId
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
                    Ada             = p.Ada,
                    Parsel          = p.Parsel,
                    Mahalle         = p.Mahalle,
                    Mevkii          = p.Mevkii,
                    Alan            = p.Alan,
                    Nitelik         = p.Nitelik,
                    MalikAdi        = p.MalikAdi,
                    PaftaNo         = p.PaftaNo,
                    RayicBedel      = p.RayicBedel,
                    YolGenisligi    = p.YolGenisligi,
                    EskiAda         = p.EskiAda,
                    EskiParsel      = p.EskiParsel,
                    PlanFonksiyonu  = p.PlanFonksiyonu,
                    Geometry        = p.Geometry,
                    ImportBatchId   = p.ImportBatchId,
                    ExtraData       = p.ExtraData
                })
                .ToListAsync();
        }

        public async Task<PagedResult<ParcelDto>> GetParcelsPagedAsync(string? batchId, string? mahalle, string? search, int page, int pageSize)
        {
            var q = _context.Parcels.AsQueryable();

            if (!string.IsNullOrWhiteSpace(batchId))
                q = q.Where(p => p.ImportBatchId == batchId);
            if (!string.IsNullOrWhiteSpace(mahalle))
                q = q.Where(p => p.Mahalle.Contains(mahalle));
            if (!string.IsNullOrWhiteSpace(search))
                q = q.Where(p => p.Ada.Contains(search) || p.Parsel.Contains(search) || p.Mahalle.Contains(search) || (p.MalikAdi != null && p.MalikAdi.Contains(search)));

            var total = await q.CountAsync();
            var items = await q
                .OrderBy(p => p.Mahalle).ThenBy(p => p.Ada).ThenBy(p => p.Parsel)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new ParcelDto
                {
                    Id             = p.Id,
                    Ada            = p.Ada,
                    Parsel         = p.Parsel,
                    Mahalle        = p.Mahalle,
                    Mevkii         = p.Mevkii,
                    Alan           = p.Alan,
                    Nitelik        = p.Nitelik,
                    MalikAdi       = p.MalikAdi,
                    PaftaNo        = p.PaftaNo,
                    RayicBedel     = p.RayicBedel,
                    YolGenisligi   = p.YolGenisligi,
                    EskiAda        = p.EskiAda,
                    EskiParsel     = p.EskiParsel,
                    PlanFonksiyonu = p.PlanFonksiyonu,
                    Geometry       = p.Geometry,
                    ImportBatchId  = p.ImportBatchId,
                    ExtraData      = p.ExtraData
                })
                .ToListAsync();

            return new PagedResult<ParcelDto> { Items = items, Total = total, Page = page, PageSize = pageSize };
        }

        public async Task<ParcelDto> UpdateParcelAsync(Guid id, UpdateParcelDto dto)
        {
            var parcel = await _context.Parcels.FindAsync(id)
                ?? throw new Exception("Parsel bulunamadı.");

            parcel.Ada             = dto.Ada;
            parcel.Parsel          = dto.Parsel;
            parcel.Mahalle         = dto.Mahalle;
            parcel.Mevkii          = dto.Mevkii;
            parcel.Alan            = dto.Alan;
            parcel.Nitelik         = dto.Nitelik;
            parcel.MalikAdi        = dto.MalikAdi;
            parcel.PaftaNo         = dto.PaftaNo;
            parcel.RayicBedel      = dto.RayicBedel;
            parcel.YolGenisligi    = dto.YolGenisligi;
            parcel.EskiAda         = dto.EskiAda;
            parcel.EskiParsel      = dto.EskiParsel;
            parcel.PlanFonksiyonu  = dto.PlanFonksiyonu;
            if (dto.ExtraData != null) parcel.ExtraData = dto.ExtraData;

            await _context.SaveChangesAsync();

            return new ParcelDto
            {
                Id              = parcel.Id,
                Ada             = parcel.Ada,
                Parsel          = parcel.Parsel,
                Mahalle         = parcel.Mahalle,
                Mevkii          = parcel.Mevkii,
                Alan            = parcel.Alan,
                Nitelik         = parcel.Nitelik,
                MalikAdi        = parcel.MalikAdi,
                PaftaNo         = parcel.PaftaNo,
                RayicBedel      = parcel.RayicBedel,
                YolGenisligi    = parcel.YolGenisligi,
                EskiAda         = parcel.EskiAda,
                EskiParsel      = parcel.EskiParsel,
                PlanFonksiyonu  = parcel.PlanFonksiyonu,
                Geometry        = parcel.Geometry,
                ImportBatchId   = parcel.ImportBatchId,
                ExtraData       = parcel.ExtraData
            };
        }
        public async Task<List<string>> AutocompleteAsync(string q, string field)
        {
            var term = q.Trim().ToLower();
            IQueryable<string?> query = field switch
            {
                "ada"    => _context.Parcels.Where(p => !p.IsDeleted && p.Ada != null && p.Ada.ToLower().Contains(term)).Select(p => p.Ada),
                "parsel" => _context.Parcels.Where(p => !p.IsDeleted && p.Parsel != null && p.Parsel.ToLower().Contains(term)).Select(p => p.Parsel),
                _        => _context.Parcels.Where(p => !p.IsDeleted && p.Mahalle != null && p.Mahalle.ToLower().Contains(term)).Select(p => p.Mahalle)
            };

            return await query
                .Distinct()
                .Where(v => v != null)
                .OrderBy(v => v)
                .Take(20)
                .Select(v => v!)
                .ToListAsync();
        }

        public async Task<ParcelDto?> SearchParcelAsync(string ada, string parsel, string? mahalle = null)
        {
            var query = _context.Parcels
                .Where(x => x.Ada == ada.Trim() && x.Parsel == parsel.Trim());

            if (!string.IsNullOrWhiteSpace(mahalle))
                query = query.Where(x => x.Mahalle == mahalle.Trim());

            var p = await query.OrderByDescending(x => x.CreatedAt).FirstOrDefaultAsync();

            if (p == null) return null;

            return new ParcelDto
            {
                Id              = p.Id,
                Ada             = p.Ada,
                Parsel          = p.Parsel,
                Mahalle         = p.Mahalle,
                Mevkii          = p.Mevkii,
                Alan            = p.Alan,
                Nitelik         = p.Nitelik,
                MalikAdi        = p.MalikAdi,
                PaftaNo         = p.PaftaNo,
                RayicBedel      = p.RayicBedel,
                YolGenisligi    = p.YolGenisligi,
                EskiAda         = p.EskiAda,
                EskiParsel      = p.EskiParsel,
                PlanFonksiyonu  = p.PlanFonksiyonu,
                Geometry        = p.Geometry,
                ImportBatchId   = p.ImportBatchId,
                ExtraData       = p.ExtraData
            };
        }

        public async Task<MergeImportResultDto> MergeParcelsFromExcelAsync(IFormFile file, List<string> updateColumns)
        {
            if (file == null || file.Length == 0)
                throw new Exception("Dosya boş veya seçilmemiş.");

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (ext != ".xlsx" && ext != ".xls")
                throw new Exception("Sadece .xlsx veya .xls dosyaları kabul edilmektedir.");

            var batchId = "MERGE-" + Guid.NewGuid().ToString("N")[..8].ToUpper();
            var errors  = new List<string>();
            int inserted = 0, updated = 0, skipped = 0;

            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);
            stream.Position = 0;

            using var workbook = new XLWorkbook(stream);
            var sheet = workbook.Worksheets.First();

            var headerRow = sheet.Row(1);
            var colMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            foreach (var cell in headerRow.CellsUsed())
            {
                var header = cell.GetString().Trim();
                if (!string.IsNullOrEmpty(header))
                    colMap[header] = cell.Address.ColumnNumber;
            }

            foreach (var req in RequiredColumns)
            {
                if (!colMap.ContainsKey(req))
                    throw new Exception($"Zorunlu sütun bulunamadı: '{req}'.");
            }

            var customFields = await _context.ParcelCustomFields
                .Where(f => f.IsActive && !f.IsDeleted)
                .ToListAsync();

            int GetColIdx(string name) => colMap.TryGetValue(name, out var idx) ? idx : -1;

            var lastRow = sheet.LastRowUsed()?.RowNumber() ?? 1;

            for (int row = 2; row <= lastRow; row++)
            {
                var r = sheet.Row(row);
                if (r.IsEmpty()) continue;

                var ada    = r.Cell(colMap["Ada"]).GetString().Trim();
                var parsel = r.Cell(colMap["Parsel"]).GetString().Trim();
                var mah    = r.Cell(colMap["Mahalle"]).GetString().Trim();

                if (string.IsNullOrWhiteSpace(ada) || string.IsNullOrWhiteSpace(parsel) || string.IsNullOrWhiteSpace(mah))
                {
                    errors.Add($"Satır {row}: Ada, Parsel ve Mahalle zorunludur.");
                    continue;
                }

                string? OptStr(string col) { var idx = GetColIdx(col); if (idx <= 0) return null; var v = r.Cell(idx).GetString().Trim(); return string.IsNullOrEmpty(v) ? null : v; }

                double? ParseDouble(string col) {
                    var idx = GetColIdx(col); if (idx <= 0) return null;
                    var v = r.Cell(idx).GetString().Trim().Replace(',', '.');
                    return double.TryParse(v, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var d) ? d : null;
                }
                decimal? ParseDecimal(string col) {
                    var idx = GetColIdx(col); if (idx <= 0) return null;
                    var v = r.Cell(idx).GetString().Trim().Replace(',', '.');
                    return decimal.TryParse(v, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var d) ? d : null;
                }

                var existing = await _context.Parcels
                    .FirstOrDefaultAsync(p => !p.IsDeleted && p.Ada == ada && p.Parsel == parsel && p.Mahalle == mah);

                if (existing == null)
                {
                    // Yeni kayıt ekle
                    var extraDict2 = new Dictionary<string, string>();
                    foreach (var cf in customFields) { var v = OptStr(cf.FieldKey); if (v != null) extraDict2[cf.FieldKey] = v; }

                    _context.Parcels.Add(new Parcel
                    {
                        Ada            = ada,  Parsel = parsel,  Mahalle = mah,
                        Mevkii         = OptStr("Mevkii"),
                        Alan           = ParseDouble("Alan"),
                        Nitelik        = OptStr("Nitelik"),
                        MalikAdi       = OptStr("MalikAdi"),
                        PaftaNo        = OptStr("PaftaNo"),
                        RayicBedel     = ParseDecimal("RayicBedel"),
                        YolGenisligi   = OptStr("YolGenisligi"),
                        EskiAda        = OptStr("EskiAda"),
                        EskiParsel     = OptStr("EskiParsel"),
                        PlanFonksiyonu = OptStr("PlanFonksiyonu"),
                        ExtraData      = extraDict2.Count > 0 ? JsonSerializer.Serialize(extraDict2) : null,
                        ImportBatchId  = batchId
                    });
                    inserted++;
                    continue;
                }

                // Mevcut kaydı sadece istenen sütunlarda güncelle
                bool changed = false;
                foreach (var col in updateColumns)
                {
                    switch (col)
                    {
                        case "Alan":          var a = ParseDouble("Alan");      if (a != null) { existing.Alan = a; changed = true; } break;
                        case "RayicBedel":    var rb = ParseDecimal("RayicBedel"); if (rb != null) { existing.RayicBedel = rb; changed = true; } break;
                        case "Mevkii":        var mv = OptStr("Mevkii");        if (mv != null) { existing.Mevkii = mv; changed = true; } break;
                        case "Nitelik":       var nt = OptStr("Nitelik");       if (nt != null) { existing.Nitelik = nt; changed = true; } break;
                        case "MalikAdi":      var ma = OptStr("MalikAdi");      if (ma != null) { existing.MalikAdi = ma; changed = true; } break;
                        case "PaftaNo":       var pn = OptStr("PaftaNo");       if (pn != null) { existing.PaftaNo = pn; changed = true; } break;
                        case "YolGenisligi":  var yg = OptStr("YolGenisligi");  if (yg != null) { existing.YolGenisligi = yg; changed = true; } break;
                        case "EskiAda":       var ea = OptStr("EskiAda");       if (ea != null) { existing.EskiAda = ea; changed = true; } break;
                        case "EskiParsel":    var ep = OptStr("EskiParsel");    if (ep != null) { existing.EskiParsel = ep; changed = true; } break;
                        case "PlanFonksiyonu":var pf = OptStr("PlanFonksiyonu");if (pf != null) { existing.PlanFonksiyonu = pf; changed = true; } break;
                        default:
                            // Özel alan mı?
                            var cf = customFields.FirstOrDefault(f => f.FieldKey == col);
                            if (cf != null)
                            {
                                var cfVal = OptStr(cf.FieldKey);
                                if (cfVal != null)
                                {
                                    var dict = string.IsNullOrEmpty(existing.ExtraData)
                                        ? new Dictionary<string, string>()
                                        : JsonSerializer.Deserialize<Dictionary<string, string>>(existing.ExtraData) ?? new();
                                    dict[cf.FieldKey] = cfVal;
                                    existing.ExtraData = JsonSerializer.Serialize(dict);
                                    changed = true;
                                }
                            }
                            break;
                    }
                }

                if (changed) updated++; else skipped++;
            }

            var log = new ImportLog
            {
                BatchId          = batchId,
                FileName         = file.FileName,
                TotalRows        = inserted + updated + skipped + errors.Count,
                SuccessRows      = inserted + updated,
                ErrorRows        = errors.Count,
                ErrorDetails     = errors.Count > 0 ? JsonSerializer.Serialize(errors) : null,
                ImportedByUserId = GetCurrentUserId()
            };
            _context.ImportLogs.Add(log);
            await _context.SaveChangesAsync();

            return new MergeImportResultDto
            {
                BatchId  = batchId,
                FileName = file.FileName,
                TotalRows = log.TotalRows,
                Inserted = inserted,
                Updated  = updated,
                Skipped  = skipped,
                Errors   = errors
            };
        }

        public async Task<ImportResultDto> ImportParcelsFromShpAsync(IFormFile file)
        {
            if (file == null || file.Length == 0)
                throw new Exception("Dosya boş veya seçilmemiş.");

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (ext != ".zip")
                throw new Exception("SHP yüklemek için .zip formatında arşiv gereklidir (.shp, .dbf, .shx içermeli).");

            var batchId = Guid.NewGuid().ToString("N")[..12].ToUpper();
            var errors  = new List<string>();
            var parcels = new List<Parcel>();

            // ZIP'i geçici klasöre aç
            var tmpDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
            Directory.CreateDirectory(tmpDir);

            try
            {
                using var stream = new MemoryStream();
                await file.CopyToAsync(stream);
                stream.Position = 0;

                using (var zip = new ZipArchive(stream, ZipArchiveMode.Read))
                {
                    foreach (var entry in zip.Entries)
                        entry.ExtractToFile(Path.Combine(tmpDir, entry.Name), overwrite: true);
                }

                var shpFile = Directory.GetFiles(tmpDir, "*.shp").FirstOrDefault()
                    ?? throw new Exception("ZIP içinde .shp dosyası bulunamadı.");

                using var reader = new ShapefileDataReader(shpFile, NetTopologySuite.NtsGeometryServices.Instance.CreateGeometryFactory());
                var dbase = reader.DbaseHeader;

                // DBF sütun adlarını al (case-insensitive map)
                var colMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
                for (int i = 0; i < dbase.Fields.Length; i++)
                    colMap[dbase.Fields[i].Name] = i + 1; // +1: index 0 = geometry

                string? GetField(string name)
                {
                    if (!colMap.TryGetValue(name, out var idx)) return null;
                    var val = reader.GetValue(idx)?.ToString()?.Trim();
                    return string.IsNullOrEmpty(val) ? null : val;
                }

                int rowNum = 0;
                while (reader.Read())
                {
                    rowNum++;
                    var ada    = GetField("Ada");
                    var parsel = GetField("Parsel");
                    var mah    = GetField("Mahalle");

                    if (string.IsNullOrEmpty(ada) || string.IsNullOrEmpty(parsel) || string.IsNullOrEmpty(mah))
                    {
                        errors.Add($"Satır {rowNum}: Ada, Parsel ve Mahalle alanları zorunludur.");
                        continue;
                    }

                    double? alan = null;
                    var alanStr = GetField("Alan");
                    if (alanStr != null && double.TryParse(alanStr.Replace(',', '.'), System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var parsedAlan))
                        alan = parsedAlan;

                    decimal? rayic = null;
                    var rayicStr = GetField("RayicBedel");
                    if (rayicStr != null && decimal.TryParse(rayicStr.Replace(',', '.'), System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var parsedRayic))
                        rayic = parsedRayic;

                    string? wkt = null;
                    try { wkt = reader.Geometry?.AsText(); } catch { }

                    parcels.Add(new Parcel
                    {
                        Ada             = ada,
                        Parsel          = parsel,
                        Mahalle         = mah,
                        Mevkii          = GetField("Mevkii"),
                        Alan            = alan,
                        Nitelik         = GetField("Nitelik"),
                        MalikAdi        = GetField("MalikAdi"),
                        PaftaNo         = GetField("PaftaNo"),
                        RayicBedel      = rayic,
                        YolGenisligi    = GetField("YolGenisligi"),
                        EskiAda         = GetField("EskiAda"),
                        EskiParsel      = GetField("EskiParsel"),
                        PlanFonksiyonu  = GetField("PlanFonksiyonu"),
                        Geometry        = wkt,
                        ImportBatchId   = batchId
                    });
                }
            }
            finally
            {
                try { Directory.Delete(tmpDir, recursive: true); } catch { }
            }

            if (parcels.Count > 0)
                _context.Parcels.AddRange(parcels);

            var log = new ImportLog
            {
                BatchId          = batchId,
                FileName         = file.FileName,
                TotalRows        = parcels.Count + errors.Count,
                SuccessRows      = parcels.Count,
                ErrorRows        = errors.Count,
                ErrorDetails     = errors.Count > 0 ? JsonSerializer.Serialize(errors) : null,
                ImportedByUserId = GetCurrentUserId()
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
    }
}
