using System.Security.Claims;
using System.Text.Json;
using ClosedXML.Excel;
using Harita.API.Data;
using Harita.API.DTOs;
using Harita.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Harita.API.Services
{
    public class DynamicPageService : IDynamicPageService
    {
        private readonly AppDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public DynamicPageService(AppDbContext context, IHttpContextAccessor httpContextAccessor)
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

        private static string ToSlug(string title)
        {
            var s = title.ToLowerInvariant()
                .Replace('ı', 'i').Replace('ğ', 'g').Replace('ü', 'u')
                .Replace('ş', 's').Replace('ö', 'o').Replace('ç', 'c')
                .Replace('İ', 'i').Replace('Ğ', 'g').Replace('Ü', 'u')
                .Replace('Ş', 's').Replace('Ö', 'o').Replace('Ç', 'c');
            return System.Text.RegularExpressions.Regex.Replace(s, @"[^a-z0-9]+", "-").Trim('-');
        }

        // ── Sayfa CRUD ────────────────────────────────────────────────────

        public async Task<DynamicPageDto> CreatePageAsync(CreateDynamicPageDto dto)
        {
            var userId = GetCurrentUserId();

            var page = new DynamicPage
            {
                Title = dto.Title,
                Slug = ToSlug(dto.Title),
                Description = dto.Description,
                ParcelMatching = dto.ParcelMatching,
                CreatedByUserId = userId,
            };

            for (int i = 0; i < dto.Columns.Count; i++)
            {
                page.Columns.Add(new DynamicColumn
                {
                    Name = dto.Columns[i].Name,
                    Type = dto.Columns[i].Type,
                    Order = dto.Columns[i].Order > 0 ? dto.Columns[i].Order : i,
                });
            }

            _context.DynamicPages.Add(page);
            await _context.SaveChangesAsync();

            var user = await _context.Users.FindAsync(userId);
            return MapPage(page, user?.Name ?? "", 0);
        }

        public async Task<List<DynamicPageDto>> GetAllPagesAsync()
        {
            var pages = await _context.DynamicPages
                .Where(p => !p.IsDeleted)
                .Include(p => p.Columns)
                .Include(p => p.CreatedByUser)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            return pages.Select(p =>
            {
                var rowCount = _context.DynamicRows.Count(r => r.PageId == p.Id && !r.IsDeleted);
                return MapPage(p, p.CreatedByUser?.Name ?? "", rowCount);
            }).ToList();
        }

        public async Task<DynamicPageDetailDto?> GetPageAsync(Guid id, string? search, string? column)
        {
            var page = await _context.DynamicPages
                .Where(p => p.Id == id && !p.IsDeleted)
                .Include(p => p.Columns)
                .Include(p => p.CreatedByUser)
                .FirstOrDefaultAsync();

            if (page == null) return null;

            var rowsQuery = _context.DynamicRows
                .Where(r => r.PageId == id && !r.IsDeleted);

            var rows = await rowsQuery.ToListAsync();

            // Filtreleme: belirli sütun veya tüm sütunlarda arama
            if (!string.IsNullOrWhiteSpace(search))
            {
                var lower = search.ToLowerInvariant();
                rows = rows.Where(r =>
                {
                    try
                    {
                        var dict = JsonSerializer.Deserialize<Dictionary<string, string>>(r.Data) ?? new();
                        if (!string.IsNullOrWhiteSpace(column))
                            return dict.TryGetValue(column, out var v) && (v ?? "").ToLowerInvariant().Contains(lower);
                        return dict.Values.Any(v => (v ?? "").ToLowerInvariant().Contains(lower));
                    }
                    catch { return false; }
                }).ToList();
            }

            var rowCount = await _context.DynamicRows.CountAsync(r => r.PageId == id && !r.IsDeleted);

            var detail = new DynamicPageDetailDto
            {
                Id = page.Id,
                Title = page.Title,
                Slug = page.Slug,
                Description = page.Description,
                Columns = page.Columns.OrderBy(c => c.Order).Select(MapColumn).ToList(),
                RowCount = rowCount,
                CreatedBy = page.CreatedByUser?.Name ?? "",
                CreatedAt = page.CreatedAt,
                Rows = rows.Select(r =>
                {
                    var dict = new Dictionary<string, string>();
                    try { dict = JsonSerializer.Deserialize<Dictionary<string, string>>(r.Data) ?? dict; } catch { }
                    return new DynamicRowDto { Id = r.Id, Data = dict };
                }).ToList(),
            };

            return detail;
        }

        public async Task<bool> DeletePageAsync(Guid id)
        {
            var page = await _context.DynamicPages.FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);
            if (page == null) return false;
            page.IsDeleted = true;
            await _context.SaveChangesAsync();
            return true;
        }

        // ── Satır işlemleri ───────────────────────────────────────────────

        public async Task<DynamicRowDto> AddRowAsync(Guid pageId, UpsertRowDto dto)
        {
            var page = await _context.DynamicPages.FirstOrDefaultAsync(p => p.Id == pageId && !p.IsDeleted)
                ?? throw new KeyNotFoundException("Sayfa bulunamadı.");

            var row = new DynamicRow
            {
                PageId = pageId,
                Data = JsonSerializer.Serialize(dto.Data),
            };
            _context.DynamicRows.Add(row);
            await _context.SaveChangesAsync();
            return new DynamicRowDto { Id = row.Id, Data = dto.Data };
        }

        public async Task<DynamicRowDto> UpdateRowAsync(Guid rowId, UpsertRowDto dto)
        {
            var row = await _context.DynamicRows.FirstOrDefaultAsync(r => r.Id == rowId && !r.IsDeleted)
                ?? throw new KeyNotFoundException("Satır bulunamadı.");

            row.Data = JsonSerializer.Serialize(dto.Data);
            await _context.SaveChangesAsync();
            return new DynamicRowDto { Id = row.Id, Data = dto.Data };
        }

        public async Task<bool> DeleteRowAsync(Guid rowId)
        {
            var row = await _context.DynamicRows.FirstOrDefaultAsync(r => r.Id == rowId && !r.IsDeleted);
            if (row == null) return false;
            row.IsDeleted = true;
            await _context.SaveChangesAsync();
            return true;
        }

        // ── Kolon işlemleri ───────────────────────────────────────────────

        public async Task<DynamicColumnDto> AddColumnAsync(Guid pageId, AddColumnDto dto)
        {
            var page = await _context.DynamicPages
                .Include(p => p.Columns)
                .FirstOrDefaultAsync(p => p.Id == pageId && !p.IsDeleted)
                ?? throw new KeyNotFoundException("Sayfa bulunamadı.");

            var maxOrder = page.Columns.Any() ? page.Columns.Max(c => c.Order) : -1;

            var col = new DynamicColumn
            {
                PageId = pageId,
                Name = dto.Name,
                Type = dto.Type,
                Order = maxOrder + 1,
            };
            _context.DynamicColumns.Add(col);
            await _context.SaveChangesAsync();
            return MapColumn(col);
        }

        // ── Excel import ──────────────────────────────────────────────────

        public async Task<ImportResultDto> ImportRowsFromExcelAsync(Guid pageId, IFormFile file)
        {
            var page = await _context.DynamicPages
                .Include(p => p.Columns)
                .FirstOrDefaultAsync(p => p.Id == pageId && !p.IsDeleted)
                ?? throw new KeyNotFoundException("Sayfa bulunamadı.");

            if (file == null || file.Length == 0)
                throw new Exception("Dosya boş veya seçilmemiş.");

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (ext != ".xlsx" && ext != ".xls")
                throw new Exception("Sadece .xlsx veya .xls dosyaları kabul edilir.");

            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);
            stream.Position = 0;

            using var wb = new XLWorkbook(stream);
            var ws = wb.Worksheets.First();

            var headers = new List<string>();
            for (int c = 1; c <= ws.LastColumnUsed()?.ColumnNumber(); c++)
            {
                var h = ws.Cell(1, c).GetString().Trim();
                if (!string.IsNullOrEmpty(h)) headers.Add(h);
            }

            var existingColumns = page.Columns.Where(c => !c.IsDeleted).OrderBy(c => c.Order).ToList();

            // Senaryo 2: Hiç sütun yok → Excel header'larından otomatik oluştur
            if (existingColumns.Count == 0)
            {
                for (int i = 0; i < headers.Count; i++)
                {
                    _context.DynamicColumns.Add(new DynamicColumn
                    {
                        PageId = pageId,
                        Name = headers[i],
                        Type = "text",
                        Order = i + 1,
                    });
                }
                await _context.SaveChangesAsync();
                // Reload columns
                existingColumns = await _context.DynamicColumns
                    .Where(c => c.PageId == pageId && !c.IsDeleted)
                    .OrderBy(c => c.Order).ToListAsync();
            }
            else
            {
                // Senaryo 1: Excel'deki sütunlarla mevcut sütunları karşılaştır
                // Excel'de olup DB'de olmayan sütunları otomatik ekle
                var existingNames = existingColumns.Select(c => c.Name.ToLowerInvariant()).ToHashSet();
                var newCols = headers
                    .Where(h => !existingNames.Contains(h.ToLowerInvariant()))
                    .ToList();
                if (newCols.Count > 0)
                {
                    int nextSira = existingColumns.Max(c => c.Order) + 1;
                    foreach (var newCol in newCols)
                    {
                        _context.DynamicColumns.Add(new DynamicColumn
                        {
                            PageId = pageId,
                            Name = newCol,
                            Type = "text",
                            Order = nextSira++,
                            });
                    }
                    await _context.SaveChangesAsync();
                    existingColumns = await _context.DynamicColumns
                        .Where(c => c.PageId == pageId && !c.IsDeleted)
                        .OrderBy(c => c.Order).ToListAsync();
                }
            }

            var columnNames = existingColumns.Select(c => c.Name).ToList();

            var errors = new List<string>();
            var rows = new List<DynamicRow>();
            var lastRow = ws.LastRowUsed()?.RowNumber() ?? 1;

            for (int r = 2; r <= lastRow; r++)
            {
                var dict = new Dictionary<string, string>();
                foreach (var colName in columnNames)
                {
                    var idx = headers.FindIndex(h => h.Equals(colName, StringComparison.OrdinalIgnoreCase));
                    dict[colName] = idx >= 0 ? ws.Cell(r, idx + 1).GetString().Trim() : "";
                }

                // Tamamen boş satırları atla
                if (dict.Values.All(v => string.IsNullOrWhiteSpace(v)))
                    continue;

                rows.Add(new DynamicRow
                {
                    PageId = pageId,
                    Data = JsonSerializer.Serialize(dict),
                });
            }

            _context.DynamicRows.AddRange(rows);
            await _context.SaveChangesAsync();

            return new ImportResultDto
            {
                BatchId = Guid.NewGuid().ToString("N")[..12].ToUpper(),
                TotalRows = rows.Count,
                SuccessRows = rows.Count,
                ErrorRows = 0,
                Errors = errors,
            };
        }

        // ── Yardımcılar ───────────────────────────────────────────────────

        private static DynamicPageDto MapPage(DynamicPage page, string createdBy, int rowCount) =>
            new()
            {
                Id = page.Id,
                Title = page.Title,
                Slug = page.Slug,
                Description = page.Description,
                ParcelMatching = page.ParcelMatching,
                Columns = page.Columns.OrderBy(c => c.Order).Select(MapColumn).ToList(),
                RowCount = rowCount,
                CreatedBy = createdBy,
                CreatedAt = page.CreatedAt,
            };

        private static DynamicColumnDto MapColumn(DynamicColumn c) =>
            new() { Id = c.Id, Name = c.Name, Type = c.Type, Order = c.Order };
    }
}
