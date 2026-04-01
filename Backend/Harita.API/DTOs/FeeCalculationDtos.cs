namespace Harita.API.DTOs
{
    public class CreateFeeCalculationDto
    {
        public string RuhsatTuru { get; set; } = string.Empty;
        public double AlanM2 { get; set; }
        public string Ada { get; set; } = string.Empty;
        public string Parsel { get; set; } = string.Empty;
        public string Mahalle { get; set; } = string.Empty;
        public string? MalikAdi { get; set; }
        public string? Notlar { get; set; }
    }

    public class FeeCalculationDto
    {
        public Guid Id { get; set; }
        public string RuhsatTuru { get; set; } = string.Empty;
        public double AlanM2 { get; set; }
        public double BirimHarc { get; set; }
        public double ToplamHarc { get; set; }
        public string Ada { get; set; } = string.Empty;
        public string Parsel { get; set; } = string.Empty;
        public string Mahalle { get; set; } = string.Empty;
        public string? MalikAdi { get; set; }
        public string? Notlar { get; set; }
        public Guid HesaplayanKullaniciId { get; set; }
        public string HesaplayanKullanici { get; set; } = string.Empty;
        public DateTime HesaplamaTarihi { get; set; }
    }

    // Harç kalemleri — DB'den geliyor (artık statik değil)
    public class FeeRateDto
    {
        public Guid Id { get; set; }
        public string RuhsatTuru { get; set; } = string.Empty;
        public double BirimHarc { get; set; }
        public double? Katsayi { get; set; }
        public string? Aciklama { get; set; }
        public bool IsActive { get; set; }
        public int SiraNo { get; set; }
    }

    public class CreateFeeRateDto
    {
        public required string RuhsatTuru { get; set; }
        public double BirimHarc { get; set; }
        public double? Katsayi { get; set; }
        public string? Aciklama { get; set; }
        public int SiraNo { get; set; } = 0;
    }

    public class UpdateFeeRateDto : CreateFeeRateDto
    {
        public bool IsActive { get; set; } = true;
    }
}
