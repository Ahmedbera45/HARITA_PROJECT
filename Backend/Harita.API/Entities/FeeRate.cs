namespace Harita.API.Entities
{
    /// <summary>Harç tarife kalemleri — arayüzden düzenlenebilir.</summary>
    public class FeeRate : BaseEntity
    {
        public Guid? CategoryId { get; set; }
        public FeeCategory? Category { get; set; }
        public string HarcTuru { get; set; } = string.Empty;   // Yeni Yapı Ruhsatı vb.
        public double BirimHarc { get; set; }                     // TL/m²
        public double? Katsayi { get; set; }                      // Opsiyonel çarpan (örn. 0.3)
        public string? Aciklama { get; set; }
        public bool IsActive { get; set; } = true;
        public int SiraNo { get; set; } = 0;                      // Sıralama
    }
}
