namespace Harita.API.Entities
{
    public class TevhidCalculation : BaseEntity
    {
        // Parsel bağlantısı (opsiyonel — DB'den seçilirse dolar)
        public Guid? ParcelId { get; set; }
        public Parcel? Parcel { get; set; }

        // Parsel bilgileri (manuel veya DB'den)
        public string Ada { get; set; } = string.Empty;
        public string ParselNo { get; set; } = string.Empty;
        public string Mahalle { get; set; } = string.Empty;
        public string? EskiAda { get; set; }
        public string? EskiParsel { get; set; }
        public string? MalikAdi { get; set; }
        public string? PlanFonksiyonu { get; set; }

        // Hesaplama girdileri
        public double Katsayi { get; set; }
        public decimal RayicBedel { get; set; }

        // 3 senaryo alanları
        public double ArsaM2 { get; set; }       // Senaryo 1: Arsa m²
        public double TaksM2 { get; set; }        // Senaryo 2: TAKS m²
        public double CekmelerM2 { get; set; }    // Senaryo 3: Çekmelerden kalan m²

        // Hesaplanan harçlar (Katsayi × M2 × RayicBedel)
        public double ArsaHarc { get; set; }
        public double TaksHarc { get; set; }
        public double CekmelerHarc { get; set; }

        // İş akışı
        public string Status { get; set; } = "Bekliyor";
        // Bekliyor | Onaylandı | Reddedildi | Düzeltme İstendi
        public int? OnaylananSenaryo { get; set; }   // 1, 2 veya 3
        public double? OnaylananHarc { get; set; }
        public string? ReviewNote { get; set; }
        public string? Notlar { get; set; }

        // Kullanıcı takibi
        public Guid CreatedByUserId { get; set; }
        public User CreatedByUser { get; set; } = null!;
        public Guid? ReviewedByUserId { get; set; }
        public User? ReviewedByUser { get; set; }
        public DateTime? ReviewedAt { get; set; }

        // Çoklu parsel
        public ICollection<TevhidParsel> Parseller { get; set; } = new List<TevhidParsel>();

        // Ekli dosya
        public string? DosyaYolu { get; set; }
    }
}
