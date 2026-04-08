namespace Harita.API.Entities
{
    public class HourlyLeaveCompensation : BaseEntity
    {
        public Guid UserId { get; set; }
        public User? User { get; set; }

        public DateTime TelafTarihi { get; set; }
        public string BaslangicSaati { get; set; } = ""; // "08:00"
        public string BitisSaati { get; set; } = "";     // "10:00"
        public decimal TelafSaati { get; set; }           // örn: 2.0

        public string? Aciklama { get; set; }

        public Guid EkleyenId { get; set; }
        public User? Ekleyen { get; set; }
    }
}
