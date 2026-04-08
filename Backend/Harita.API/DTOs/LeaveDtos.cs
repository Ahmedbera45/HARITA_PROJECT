namespace Harita.API.DTOs
{
    public class LeaveRequestDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string UserFullName { get; set; } = string.Empty;
        public string UserDepartment { get; set; } = string.Empty;
        public string LeaveType { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int DaysCount { get; set; }
        public bool IsSaatlik { get; set; }
        public string? BaslangicSaati { get; set; }
        public string? BitisSaati { get; set; }
        public string? Description { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? ReviewNote { get; set; }
        public string? ReviewedByFullName { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateLeaveRequestDto
    {
        public required string LeaveType { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IsSaatlik { get; set; } = false;
        public string? BaslangicSaati { get; set; }
        public string? BitisSaati { get; set; }
        public string? Description { get; set; }
    }

    public class ReviewLeaveRequestDto
    {
        public required string Decision { get; set; } // Onaylandı | Reddedildi
        public string? ReviewNote { get; set; }
    }

    // Kalan izin özeti (tüm kullanıcılar)
    public class LeaveBalanceSummaryDto
    {
        public Guid UserId { get; set; }
        public string UserFullName { get; set; } = string.Empty;
        public string? Department { get; set; }
        public int KalanIzinGunu { get; set; }
        public int PlanlananIzin { get; set; }  // onaylı gelecek tarihli izin gün toplamı
        public int BekleyenIzin { get; set; }   // Bekliyor statüsündeki izin gün toplamı
    }

    // Saatlik izin özeti
    public class HourlyLeaveSummaryDto
    {
        public Guid UserId { get; set; }
        public string UserFullName { get; set; } = string.Empty;
        public string? Department { get; set; }
        public decimal ToplamSaatlikIzin { get; set; }   // onaylanan saatlik izinlerin toplam saat sayısı
        public decimal TelafEdilen { get; set; }
        public decimal TelafEdilmesiGereken { get; set; }
    }

    // Saatlik izin telafi girişi
    public class CreateHourlyCompensationDto
    {
        public Guid UserId { get; set; }
        public DateTime TelafTarihi { get; set; }
        public required string BaslangicSaati { get; set; }
        public required string BitisSaati { get; set; }
        public decimal TelafSaati { get; set; }
        public string? Aciklama { get; set; }
    }

    // Saatlik izin telafi kaydı
    public class HourlyCompensationDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string UserFullName { get; set; } = string.Empty;
        public DateTime TelafTarihi { get; set; }
        public string BaslangicSaati { get; set; } = string.Empty;
        public string BitisSaati { get; set; } = string.Empty;
        public decimal TelafSaati { get; set; }
        public string? Aciklama { get; set; }
        public string EkleyenFullName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
