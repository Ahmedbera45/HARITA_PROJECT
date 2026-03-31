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
        public string HesaplayanKullanici { get; set; } = string.Empty;
        public DateTime HesaplamaTarihi { get; set; }
    }

    public class FeeRateDto
    {
        public string RuhsatTuru { get; set; } = string.Empty;
        public double BirimHarc { get; set; }
        public string Aciklama { get; set; } = string.Empty;
    }
}
