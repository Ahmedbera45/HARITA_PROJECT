namespace Harita.API.Entities
{
    public class Parcel : BaseEntity
    {
        public string Ada { get; set; } = string.Empty;
        public string Parsel { get; set; } = string.Empty;
        public string Mahalle { get; set; } = string.Empty;
        public string? Mevkii { get; set; }
        public double? Alan { get; set; }
        public string? Nitelik { get; set; }
        public string? MalikAdi { get; set; }
        public string? PaftaNo { get; set; }
        public decimal? RayicBedel { get; set; }      // TL cinsinden rayiç bedel
        public string? YolGenisligi { get; set; }     // Örn: "15+", "10-15", "7m"
        public string? EskiAda { get; set; }
        public string? EskiParsel { get; set; }
        public string? PlanFonksiyonu { get; set; }   // İmar planı fonksiyonu
        public string? Geometry { get; set; }         // WKT formatında geometri (SHP'den)
        public string? ImportBatchId { get; set; }
    }
}
