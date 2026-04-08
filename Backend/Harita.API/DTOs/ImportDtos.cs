namespace Harita.API.DTOs
{
    public class ImportResultDto
    {
        public string BatchId { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public int TotalRows { get; set; }
        public int SuccessRows { get; set; }
        public int ErrorRows { get; set; }
        public List<string> Errors { get; set; } = new();
    }

    public class ImportLogDto
    {
        public Guid Id { get; set; }
        public string BatchId { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public int TotalRows { get; set; }
        public int SuccessRows { get; set; }
        public int ErrorRows { get; set; }
        public string ImportedBy { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class ParcelDto
    {
        public Guid Id { get; set; }
        public string Ada { get; set; } = string.Empty;
        public string Parsel { get; set; } = string.Empty;
        public string Mahalle { get; set; } = string.Empty;
        public string? Mevkii { get; set; }
        public double? Alan { get; set; }
        public string? Nitelik { get; set; }
        public string? MalikAdi { get; set; }
        public string? PaftaNo { get; set; }
        public decimal? RayicBedel { get; set; }
        public string? YolGenisligi { get; set; }
        public string? EskiAda { get; set; }
        public string? EskiParsel { get; set; }
        public string? PlanFonksiyonu { get; set; }
        public string? Geometry { get; set; }
        public string? ImportBatchId { get; set; }
        public string? ExtraData { get; set; }
    }

    public class UpdateParcelDto
    {
        public required string Ada { get; set; }
        public required string Parsel { get; set; }
        public required string Mahalle { get; set; }
        public string? Mevkii { get; set; }
        public double? Alan { get; set; }
        public string? Nitelik { get; set; }
        public string? MalikAdi { get; set; }
        public string? PaftaNo { get; set; }
        public decimal? RayicBedel { get; set; }
        public string? YolGenisligi { get; set; }
        public string? EskiAda { get; set; }
        public string? EskiParsel { get; set; }
        public string? PlanFonksiyonu { get; set; }
        public string? ExtraData { get; set; }
    }

    public class CustomFieldDto
    {
        public string? FieldKey { get; set; }
        public string? DisplayName { get; set; }
        public string? FieldType { get; set; }
        public int? SortOrder { get; set; }
        public bool? IsActive { get; set; }
    }

    public class MergeImportResultDto
    {
        public string BatchId { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public int TotalRows { get; set; }
        public int Inserted { get; set; }
        public int Updated { get; set; }
        public int Skipped { get; set; }
        public List<string> Errors { get; set; } = new();
    }
}
