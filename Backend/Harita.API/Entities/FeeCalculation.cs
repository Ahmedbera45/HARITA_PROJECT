namespace Harita.API.Entities
{
    public class FeeCalculation : BaseEntity
    {
        public Guid UserId { get; set; }
        public User User { get; set; } = null!;

        public string RuhsatTuru { get; set; } = string.Empty;
        public double AlanM2 { get; set; }
        public double BirimHarc { get; set; }
        public double ToplamHarc { get; set; }

        public string Ada { get; set; } = string.Empty;
        public string Parsel { get; set; } = string.Empty;
        public string Mahalle { get; set; } = string.Empty;

        public string? MalikAdi { get; set; }
        public string? Notlar { get; set; }
    }
}
