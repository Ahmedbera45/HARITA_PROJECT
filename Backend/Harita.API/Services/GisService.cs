using System.Security.Claims;
using Harita.API.Data;
using Harita.API.DTOs;
using Harita.API.Entities;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Harita.API.Services;

public class GisTableInfo
{
    public string TableName { get; set; } = "";
    public string SchemaName { get; set; } = "";
    public List<string> Columns { get; set; } = new();
    public long RowCount { get; set; }
}

public class GisParcelRow
{
    public Dictionary<string, object?> Fields { get; set; } = new();
}

public class GisImportResult
{
    public int Imported { get; set; }
    public int Skipped { get; set; }
    public string BatchId { get; set; } = "";
    public List<string> Errors { get; set; } = new();
}

public interface IGisService
{
    Task<bool> TestConnectionAsync();
    Task<List<GisTableInfo>> GetTablesAsync();
    Task<(List<Dictionary<string, object?>> Rows, int Total)> PreviewTableAsync(string schema, string table, string? mahalleFilter, string? adaFilter, string? parselFilter, int page, int pageSize);
    Task<GisImportResult> ImportToLocalAsync(GisImportDto dto, Guid importedByUserId, AppDbContext context);
    Task<object> GetGeoJsonAsync(string schema, string table, int limit);
}

public class GisService : IGisService
{
    private readonly string _connStr;

    // Sütun adı eşleştirme: GIS kolonunun olası adları → local alan adı
    private static readonly Dictionary<string, string[]> ColumnAliases = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Ada"]          = new[] { "ada_no", "ada", "adano", "ada_numarasi" },
        ["Parsel"]       = new[] { "parsel_no", "parsel", "parselno", "parsel_numarasi" },
        ["Mahalle"]      = new[] { "mahalle_adi", "mahalle", "mahalle_ad", "mahalle_name" },
        ["Mevkii"]       = new[] { "mevki", "mevkii", "mevki_adi" },
        ["Alan"]         = new[] { "alan", "yuzolcum", "yuzolcumu", "alan_m2", "parsel_alan" },
        ["Nitelik"]      = new[] { "nitelik", "nitelik_adi", "arazi_nitelik" },
        ["MalikAdi"]     = new[] { "malik_adi", "malikadi", "sahip", "owner", "tapu_sahibi" },
        ["PaftaNo"]      = new[] { "pafta_no", "paftano", "pafta", "pafta_numarasi" },
        ["EskiAda"]      = new[] { "eski_ada", "eskiada", "eski_ada_no" },
        ["EskiParsel"]   = new[] { "eski_parsel", "eskiparsel", "eski_parsel_no" },
        ["YolGenisligi"] = new[] { "yol_genisligi", "yolgenisligi", "yol_genislik", "yol_en" },
        ["PlanFonks"]    = new[] { "plan_fonksiyonu", "planfonksiyonu", "imar_durumu", "imar_fonksiyon" },
    };

    public GisService(IConfiguration configuration)
    {
        _connStr = configuration["GisDatabase:ConnectionString"]
            ?? throw new InvalidOperationException("GisDatabase:ConnectionString ayarı bulunamadı.");
    }

    public async Task<bool> TestConnectionAsync()
    {
        try
        {
            await using var conn = new NpgsqlConnection(_connStr);
            await conn.OpenAsync();
            await using var cmd = new NpgsqlCommand("SELECT 1", conn);
            await cmd.ExecuteScalarAsync();
            return true;
        }
        catch { return false; }
    }

    public async Task<List<GisTableInfo>> GetTablesAsync()
    {
        var result = new List<GisTableInfo>();
        await using var conn = new NpgsqlConnection(_connStr);
        await conn.OpenAsync();

        // Parsel ile ilgili olası tabloları bul (küçük tablolar önce)
        var sql = @"
            SELECT t.table_schema, t.table_name
            FROM information_schema.tables t
            WHERE t.table_type = 'BASE TABLE'
              AND t.table_schema NOT IN ('pg_catalog','information_schema','topology')
            ORDER BY t.table_schema, t.table_name";

        await using var cmd = new NpgsqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();
        var tables = new List<(string schema, string table)>();
        while (await reader.ReadAsync())
            tables.Add((reader.GetString(0), reader.GetString(1)));
        await reader.CloseAsync();

        foreach (var (schema, tableName) in tables)
        {
            // Her tablo için sütunları al
            var colSql = @"
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = @s AND table_name = @t
                ORDER BY ordinal_position";
            await using var colCmd = new NpgsqlCommand(colSql, conn);
            colCmd.Parameters.AddWithValue("s", schema);
            colCmd.Parameters.AddWithValue("t", tableName);

            var cols = new List<string>();
            await using var colReader = await colCmd.ExecuteReaderAsync();
            while (await colReader.ReadAsync())
                cols.Add(colReader.GetString(0));
            await colReader.CloseAsync();

            // Satır sayısını al (yaklaşık — pg_class'tan hızlı)
            long rowCount = 0;
            try
            {
                await using var countCmd = new NpgsqlCommand(
                    $"SELECT reltuples::bigint FROM pg_class WHERE relname = @t", conn);
                countCmd.Parameters.AddWithValue("t", tableName);
                var cnt = await countCmd.ExecuteScalarAsync();
                rowCount = cnt is long l ? l : cnt is float f ? (long)f : 0;
            }
            catch { }

            result.Add(new GisTableInfo
            {
                SchemaName = schema,
                TableName  = tableName,
                Columns    = cols,
                RowCount   = rowCount,
            });
        }

        return result;
    }

    public async Task<(List<Dictionary<string, object?>> Rows, int Total)> PreviewTableAsync(
        string schema, string table, string? mahalleFilter, string? adaFilter, string? parselFilter,
        int page, int pageSize)
    {
        await using var conn = new NpgsqlConnection(_connStr);
        await conn.OpenAsync();

        // Kolon adlarını al ve geometri/büyük sütunları hariç tut
        var colSql = @"
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = @s AND table_name = @t
              AND data_type NOT IN ('USER-DEFINED','bytea')
            ORDER BY ordinal_position
            LIMIT 30";
        await using var colCmd = new NpgsqlCommand(colSql, conn);
        colCmd.Parameters.AddWithValue("s", schema);
        colCmd.Parameters.AddWithValue("t", table);

        var selectCols = new List<string>();
        await using var colReader = await colCmd.ExecuteReaderAsync();
        while (await colReader.ReadAsync())
            selectCols.Add(colReader.GetString(0));
        await colReader.CloseAsync();

        if (selectCols.Count == 0) return (new(), 0);

        // WHERE koşullarını oluştur (sütun adları bilinmiyorsa filtreleme yapma)
        var where = BuildWhere(selectCols, mahalleFilter, adaFilter, parselFilter, out var parms);

        var quotedTable = $"\"{schema}\".\"{table}\"";
        var colList = string.Join(",", selectCols.Select(c => $"\"{c}\""));

        // Toplam sayı
        await using var countCmd = new NpgsqlCommand($"SELECT COUNT(*) FROM {quotedTable}{where}", conn);
        foreach (var (pName, pVal) in parms)
            countCmd.Parameters.AddWithValue(pName, pVal);
        var total = Convert.ToInt32(await countCmd.ExecuteScalarAsync() ?? 0);

        // Sayfalı veri
        var offset = (page - 1) * pageSize;
        var dataSql = $"SELECT {colList} FROM {quotedTable}{where} LIMIT {pageSize} OFFSET {offset}";
        await using var dataCmd = new NpgsqlCommand(dataSql, conn);
        foreach (var (pName, pVal) in parms)
            dataCmd.Parameters.AddWithValue(pName, pVal);

        var rows = new List<Dictionary<string, object?>>();
        await using var dataReader = await dataCmd.ExecuteReaderAsync();
        while (await dataReader.ReadAsync())
        {
            var row = new Dictionary<string, object?>();
            for (int i = 0; i < dataReader.FieldCount; i++)
                row[dataReader.GetName(i)] = dataReader.IsDBNull(i) ? null : dataReader.GetValue(i);
            rows.Add(row);
        }

        return (rows, total);
    }

    public async Task<GisImportResult> ImportToLocalAsync(
        GisImportDto dto, Guid importedByUserId, AppDbContext context)
    {
        var schema       = dto.Schema;
        var table        = dto.Table;
        var batchPrefix  = dto.BatchPrefix;

        await using var conn = new NpgsqlConnection(_connStr);
        await conn.OpenAsync();

        // Geometri sütununu bul (varsa WKT olarak çekeceğiz)
        var geomColSql = @"
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = @s AND table_name = @t AND data_type = 'USER-DEFINED'
            ORDER BY ordinal_position LIMIT 1";
        await using var geomColCmd = new NpgsqlCommand(geomColSql, conn);
        geomColCmd.Parameters.AddWithValue("s", schema);
        geomColCmd.Parameters.AddWithValue("t", table);
        string? geomCol = null;
        await using var geomColReader = await geomColCmd.ExecuteReaderAsync();
        if (await geomColReader.ReadAsync()) geomCol = geomColReader.GetString(0);
        await geomColReader.CloseAsync();

        // Kolon adlarını al (geometri ve bytea hariç)
        var colSql = @"
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = @s AND table_name = @t
              AND data_type NOT IN ('USER-DEFINED','bytea')
            ORDER BY ordinal_position LIMIT 40";
        await using var colCmd = new NpgsqlCommand(colSql, conn);
        colCmd.Parameters.AddWithValue("s", schema);
        colCmd.Parameters.AddWithValue("t", table);

        var allCols = new List<string>();
        await using var colReader = await colCmd.ExecuteReaderAsync();
        while (await colReader.ReadAsync())
            allCols.Add(colReader.GetString(0));
        await colReader.CloseAsync();

        // Kolon eşleştirmesi:
        // Kullanıcı mapping gönderdiyse onu kullan (local alan → gis sütun)
        // Yoksa otomatik alias mantığı
        Dictionary<string, string> mapping;
        if (dto.ColumnMapping.Count > 0)
        {
            // Gelen: { "ada_no": "Ada", "parsel_no": "Parsel", ... }
            // İstenen: { "Ada": "ada_no", "Parsel": "parsel_no", ... }
            mapping = dto.ColumnMapping
                .Where(kv => !string.IsNullOrEmpty(kv.Value))
                .GroupBy(kv => kv.Value, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.First().Key, StringComparer.OrdinalIgnoreCase);
        }
        else
        {
            mapping = BuildColumnMapping(allCols);
        }

        if (!mapping.ContainsKey("Ada") || !mapping.ContainsKey("Parsel") || !mapping.ContainsKey("Mahalle"))
            throw new InvalidOperationException(
                "Ada, Parsel ve Mahalle alanları eşleştirilmelidir. " +
                $"GIS tablosundaki sütunlar: {string.Join(", ", allCols.Take(20))}");

        var where = BuildWhere(allCols, dto.Mahalle, dto.Ada, dto.Parsel, out var parms);
        var quotedTable = $"\"{schema}\".\"{table}\"";
        var colList = string.Join(",", allCols.Select(c => $"\"{c}\""));

        // Geometri sütunu varsa WKT olarak ekle
        var geomExpr = geomCol != null
            ? $", ST_AsText(CASE WHEN ST_SRID(\"{geomCol}\")=0 THEN ST_SetSRID(\"{geomCol}\",4326) ELSE ST_Transform(\"{geomCol}\",4326) END) AS __geom__"
            : "";

        var dataSql = $"SELECT {colList}{geomExpr} FROM {quotedTable}{where}";
        await using var dataCmd = new NpgsqlCommand(dataSql, conn);
        foreach (var (pName, pVal) in parms)
            dataCmd.Parameters.AddWithValue(pName, pVal);

        var batchId = $"{batchPrefix}-{Guid.NewGuid().ToString("N")[..8].ToUpper()}";
        var result = new GisImportResult { BatchId = batchId };
        var parcelsToAdd = new List<Parcel>();

        await using var dataReader = await dataCmd.ExecuteReaderAsync();
        while (await dataReader.ReadAsync())
        {
            var row = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
            for (int i = 0; i < dataReader.FieldCount; i++)
                row[dataReader.GetName(i)] = dataReader.IsDBNull(i) ? null : dataReader.GetValue(i);

            var ada    = GetMapped(row, mapping, "Ada");
            var parsel = GetMapped(row, mapping, "Parsel");
            var mah    = GetMapped(row, mapping, "Mahalle");

            if (string.IsNullOrWhiteSpace(ada) || string.IsNullOrWhiteSpace(parsel) || string.IsNullOrWhiteSpace(mah))
            {
                result.Skipped++;
                continue;
            }

            // Geometri (WKT)
            string? geomWkt = null;
            if (geomCol != null && row.TryGetValue("__geom__", out var geomVal))
                geomWkt = geomVal?.ToString();

            parcelsToAdd.Add(new Parcel
            {
                Ada            = ada,
                Parsel         = parsel,
                Mahalle        = mah,
                Mevkii         = GetMapped(row, mapping, "Mevkii"),
                Alan           = TryDouble(GetMapped(row, mapping, "Alan")),
                Nitelik        = GetMapped(row, mapping, "Nitelik"),
                MalikAdi       = GetMapped(row, mapping, "MalikAdi"),
                PaftaNo        = GetMapped(row, mapping, "PaftaNo"),
                EskiAda        = GetMapped(row, mapping, "EskiAda"),
                EskiParsel     = GetMapped(row, mapping, "EskiParsel"),
                YolGenisligi   = GetMapped(row, mapping, "YolGenisligi"),
                PlanFonksiyonu = GetMapped(row, mapping, "PlanFonksiyonu"),
                Geometry       = geomWkt,
                ImportBatchId  = batchId,
            });
        }

        // Batch insert (500'erli gruplar)
        foreach (var batch in parcelsToAdd.Chunk(500))
        {
            await context.Parcels.AddRangeAsync(batch);
            await context.SaveChangesAsync();
            result.Imported += batch.Length;
        }

        // Import log kaydet
        context.ImportLogs.Add(new ImportLog
        {
            FileName         = $"GIS:{schema}.{table}",
            TotalRows        = result.Imported + result.Skipped,
            SuccessRows      = result.Imported,
            ErrorRows        = result.Skipped,
            BatchId          = batchId,
            ImportedByUserId = importedByUserId,
        });
        await context.SaveChangesAsync();

        return result;
    }

    public async Task<object> GetGeoJsonAsync(string schema, string table, int limit)
    {
        await using var conn = new NpgsqlConnection(_connStr);
        await conn.OpenAsync();

        // Geometri sütununu bul (USER-DEFINED tipindeki ilk sütun)
        var geomSql = @"
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = @s AND table_name = @t
              AND data_type = 'USER-DEFINED'
            ORDER BY ordinal_position
            LIMIT 1";
        await using var geomCmd = new NpgsqlCommand(geomSql, conn);
        geomCmd.Parameters.AddWithValue("s", schema);
        geomCmd.Parameters.AddWithValue("t", table);

        string? geomCol = null;
        await using var geomReader = await geomCmd.ExecuteReaderAsync();
        if (await geomReader.ReadAsync()) geomCol = geomReader.GetString(0);
        await geomReader.CloseAsync();

        if (geomCol == null)
            throw new InvalidOperationException("Tabloda geometri (PostGIS) sütunu bulunamadı.");

        // Özellik sütunları — geometri ve büyük tipler hariç
        var colSql = @"
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = @s AND table_name = @t
              AND data_type NOT IN ('USER-DEFINED','bytea')
            ORDER BY ordinal_position
            LIMIT 20";
        await using var colCmd = new NpgsqlCommand(colSql, conn);
        colCmd.Parameters.AddWithValue("s", schema);
        colCmd.Parameters.AddWithValue("t", table);

        var propCols = new List<string>();
        await using var colReader = await colCmd.ExecuteReaderAsync();
        while (await colReader.ReadAsync()) propCols.Add(colReader.GetString(0));
        await colReader.CloseAsync();

        var quotedTable = $"\"{schema}\".\"{table}\"";
        var propList = propCols.Count > 0
            ? ", " + string.Join(", ", propCols.Select(c => $"\"{c}\"::text as \"{c}\""))
            : "";

        // SRID 0 ise WGS84 varsay, yoksa dönüştür
        var geomExpr = $"ST_AsGeoJSON(CASE WHEN ST_SRID(\"{geomCol}\") = 0 THEN ST_SetSRID(\"{geomCol}\", 4326) ELSE ST_Transform(\"{geomCol}\", 4326) END)::text";

        var dataSql = $"SELECT {geomExpr} as __geom__{propList} FROM {quotedTable} WHERE \"{geomCol}\" IS NOT NULL LIMIT {limit}";
        await using var dataCmd = new NpgsqlCommand(dataSql, conn);

        var features = new List<object>();
        await using var reader = await dataCmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            if (reader.IsDBNull(0)) continue;
            var geomJson = reader.GetString(0);
            var props = new Dictionary<string, object?>();
            for (int i = 1; i < reader.FieldCount; i++)
                props[reader.GetName(i)] = reader.IsDBNull(i) ? null : (object)reader.GetString(i);
            features.Add(new
            {
                type = "Feature",
                geometry = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(geomJson),
                properties = props
            });
        }

        return new { type = "FeatureCollection", features };
    }

    // ── Yardımcılar ──────────────────────────────────────────────────────────

    private static Dictionary<string, string> BuildColumnMapping(List<string> columns)
    {
        var map = new Dictionary<string, string>();
        foreach (var (localField, aliases) in ColumnAliases)
        {
            var found = aliases.FirstOrDefault(a => columns.Any(c => c.Equals(a, StringComparison.OrdinalIgnoreCase)));
            if (found != null)
            {
                var actualCol = columns.First(c => c.Equals(found, StringComparison.OrdinalIgnoreCase));
                map[localField] = actualCol;
            }
        }
        return map;
    }

    private static string? GetMapped(Dictionary<string, object?> row, Dictionary<string, string> mapping, string field)
    {
        if (!mapping.TryGetValue(field, out var colName)) return null;
        return row.TryGetValue(colName, out var val) ? val?.ToString() : null;
    }

    private static double? TryDouble(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return null;
        return double.TryParse(s, System.Globalization.NumberStyles.Any,
            System.Globalization.CultureInfo.InvariantCulture, out var d) ? d : null;
    }

    private static string BuildWhere(
        List<string> columns, string? mahalle, string? ada, string? parsel,
        out List<(string name, object val)> parms)
    {
        parms = new();
        var conditions = new List<string>();

        TryAddFilter(columns, ColumnAliases["Mahalle"], mahalle, "p_mah", conditions, parms);
        TryAddFilter(columns, ColumnAliases["Ada"],     ada,     "p_ada", conditions, parms);
        TryAddFilter(columns, ColumnAliases["Parsel"],  parsel,  "p_prs", conditions, parms);

        return conditions.Count > 0 ? " WHERE " + string.Join(" AND ", conditions) : "";
    }

    private static void TryAddFilter(
        List<string> columns, string[] aliases, string? value, string pName,
        List<string> conditions, List<(string, object)> parms)
    {
        if (string.IsNullOrWhiteSpace(value)) return;
        var col = aliases.FirstOrDefault(a => columns.Any(c => c.Equals(a, StringComparison.OrdinalIgnoreCase)));
        if (col == null) return;
        var actualCol = columns.First(c => c.Equals(col, StringComparison.OrdinalIgnoreCase));
        conditions.Add($"CAST(\"{actualCol}\" AS text) ILIKE @{pName}");
        parms.Add((pName, $"%{value}%"));
    }
}
