namespace Harita.API.DTOs
{
    public class TevhidParselDto
    {
        public Guid? Id { get; set; }
        public Guid? ParcelId { get; set; }
        public string Ada { get; set; } = string.Empty;
        public string ParselNo { get; set; } = string.Empty;
        public string? Mahalle { get; set; }
        public string? EskiAda { get; set; }
        public string? EskiParsel { get; set; }
        public string? MalikAdi { get; set; }
        public string? PlanFonksiyonu { get; set; }
        public int SiraNo { get; set; }
    }

    public class CreateTevhidDto
    {
        public Guid? ParcelId { get; set; }
        public required string Ada { get; set; }
        public required string ParselNo { get; set; }
        public required string Mahalle { get; set; }
        public string? EskiAda { get; set; }
        public string? EskiParsel { get; set; }
        public string? MalikAdi { get; set; }
        public string? PlanFonksiyonu { get; set; }
        public double Katsayi { get; set; }
        public decimal RayicBedel { get; set; }
        public double ArsaM2 { get; set; }
        public double TaksM2 { get; set; }
        public double CekmelerM2 { get; set; }
        public string? Notlar { get; set; }
        public List<TevhidParselDto> Parseller { get; set; } = new();
    }

    public class UpdateTevhidDto : CreateTevhidDto { }

    public class ReviewTevhidDto
    {
        public required string Decision { get; set; }  // Onaylandı | Reddedildi | Düzeltme İstendi
        public int? OnaylananSenaryo { get; set; }     // 1, 2 veya 3 (Onaylandı ise zorunlu)
        public string? ReviewNote { get; set; }
    }

    public class TevhidDto
    {
        public Guid Id { get; set; }
        public Guid? ParcelId { get; set; }
        public string Ada { get; set; } = string.Empty;
        public string ParselNo { get; set; } = string.Empty;
        public string Mahalle { get; set; } = string.Empty;
        public string? EskiAda { get; set; }
        public string? EskiParsel { get; set; }
        public string? MalikAdi { get; set; }
        public string? PlanFonksiyonu { get; set; }
        public double Katsayi { get; set; }
        public decimal RayicBedel { get; set; }

        // 3 senaryo
        public double ArsaM2 { get; set; }
        public double ArsaHarc { get; set; }
        public double TaksM2 { get; set; }
        public double TaksHarc { get; set; }
        public double CekmelerM2 { get; set; }
        public double CekmelerHarc { get; set; }

        // İş akışı
        public string Status { get; set; } = string.Empty;
        public int? OnaylananSenaryo { get; set; }
        public double? OnaylananHarc { get; set; }
        public string? ReviewNote { get; set; }
        public string? ReviewedBy { get; set; }
        public Guid? ReviewedByUserId { get; set; }
        public DateTime? ReviewedAt { get; set; }

        // Kullanıcı
        public string OlusturanKullanici { get; set; } = string.Empty;
        public Guid CreatedByUserId { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? Notlar { get; set; }

        // Çoklu parsel
        public List<TevhidParselDto> Parseller { get; set; } = new();

        // Dosya
        public string? DosyaYolu { get; set; }
    }
}
