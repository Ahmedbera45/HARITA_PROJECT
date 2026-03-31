namespace Harita.API.Entities
{
    public class Parcel : BaseEntity
    {
        public string Ada { get; set; } = string.Empty;      // Ada no
        public string Parsel { get; set; } = string.Empty;   // Parsel no
        public string Mahalle { get; set; } = string.Empty;  // Mahalle
        public string? Mevkii { get; set; }                  // Mevkii
        public double? Alan { get; set; }                    // m² cinsinden alan
        public string? Nitelik { get; set; }                 // Arsa / Tarla / Bahçe vb.
        public string? MalikAdi { get; set; }                // Malik adı
        public string? PaftaNo { get; set; }                 // Pafta no
        public string? ImportBatchId { get; set; }           // Hangi import yüklemesinden geldi
    }
}
