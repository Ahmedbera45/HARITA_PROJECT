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
        public string? ImportBatchId { get; set; }
    }
}
