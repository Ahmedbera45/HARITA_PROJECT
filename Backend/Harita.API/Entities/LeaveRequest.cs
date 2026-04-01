namespace Harita.API.Entities
{
    public class LeaveRequest : BaseEntity
    {
        public Guid UserId { get; set; }
        public User User { get; set; }

        public string LeaveType { get; set; } = "Yıllık İzin";
        // Yıllık İzin | Hastalık İzni | Mazeret İzni | Ücretsiz İzin | Saatlik İzin

        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int DaysCount { get; set; }

        // Saatlik izin alanları
        public bool IsSaatlik { get; set; } = false;
        public string? BaslangicSaati { get; set; }   // "HH:mm" formatı
        public string? BitisSaati { get; set; }        // "HH:mm" formatı

        public string? Description { get; set; }

        public string Status { get; set; } = "Bekliyor";
        // Bekliyor | Onaylandı | Reddedildi

        public Guid? ReviewedByUserId { get; set; }
        public User? ReviewedByUser { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public string? ReviewNote { get; set; }
    }
}
