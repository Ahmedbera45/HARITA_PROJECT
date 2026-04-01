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
        public string? ImportBatchId { get; set; }
    }
}
