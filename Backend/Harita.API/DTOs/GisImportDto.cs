namespace Harita.API.DTOs;

public class GisImportDto
{
    public string Schema { get; set; } = "public";
    public string Table { get; set; } = "";
    public string? Mahalle { get; set; }
    public string? Ada { get; set; }
    public string? Parsel { get; set; }
    public string BatchPrefix { get; set; } = "GIS";

    /// <summary>
    /// Key: GIS sütun adı (kaynak tablodaki gerçek isim)
    /// Value: yerel Parcel alan adı ("Ada","Parsel","Mahalle","Alan",... )
    /// Value boş string ise bu sütun aktarımda atlanır.
    /// Boş Dictionary ise otomatik alias eşleştirmesi kullanılır.
    /// </summary>
    public Dictionary<string, string> ColumnMapping { get; set; } = new();
}
